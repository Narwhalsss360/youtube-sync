from __future__ import annotations

import asyncio
import logging
import time
from asyncio import Future, Task, create_task, gather
from contextlib import asynccontextmanager
from dataclasses import asdict, dataclass
from json import dumps
from typing import AsyncIterator, cast
from uuid import uuid4

from configuration import (
    BAD_CONNECTION_INTERVAL,
    DEGRADED_CONNECTION_INTERVAL,
    HEARTBEAT_INTERVAL,
    INITIAL_HEARTBEAT_DELAY,
    KEEP_ALIVE_INTERVAL,
)
from websockets import ConnectionClosed, ConnectionClosedOK, LoggerLike
from websockets.asyncio.server import Server, ServerConnection, serve
from ytsync_types import (
    AcknowledgeMessage,
    ConnectionQuality,
    DataParseError,
    ErrorMessage,
    FollowMessage,
    KeepAliveMessage,
    Message,
    PlaybackState,
    ReceivableMessage,
    ServerHandshakeMessage,
    ServerHandshakeRequestMessage,
    StopFollowingMessage,
    User,
    UserDisconnectMessage,
    UserMessage,
    UsersMessage,
    VideoInfoMessage,
    parse_message,
)


_logger: logging.Logger | None = None


def get_logger() -> logging.Logger:
    if _logger is None:
        return logging.getLogger()
    return _logger


connected_users_by_uuid: dict[str, User] = {}


def update_following_info() -> None:
    for user in connected_users_by_uuid.values():
        user.followerUUIDs = []

    for user in connected_users_by_uuid.values():
        user.waiting_for_acknowledge.append(UsersMessage([]))
        if user.followingUUID is None:
            continue

        if (
            following := connected_users_by_uuid.get(user.followingUUID, None)
        ) is not None:
            following.followerUUIDs.append(user.uuid)
        else:
            user.followingUUID = None


async def send_to(
    user: User, message: Message, log_level: int, log_message: str | None = None
) -> None:
    if log_level != logging.NOTSET:
        get_logger().log(
            log_level,
            f"SEND({user.uuid} <- {message}){f', {log_message}' if log_message is not None else ''}",
        )

    await user.connection.send(dumps(asdict(message)))
    user.last_communication_time = time.time()


async def broadcast(
    message: Message,
    except_for: User | None,
    log_level: int,
    log_message: str | None = None,
) -> None:
    broadcast_to: list[User] = list(
        filter(lambda u: u != except_for, connected_users_by_uuid.values())
        if except_for is not None
        else connected_users_by_uuid.values()
    )
    send_results = gather(
        *[send_to(user, message, logging.NOTSET) for user in broadcast_to]
    )

    if log_level != logging.NOTSET:
        get_logger().log(
            log_level,
            f"BROADCAST({len(broadcast_to)} user(s)) <- {message}){f', {log_message}' if log_message is not None else ''}",
        )

    await send_results
    for user, result in zip(broadcast_to, send_results):
        if isinstance(result, ConnectionClosedOK):
            await handle_disconnect(user)
            continue

        if isinstance(result, ConnectionClosed):
            get_logger().error(result)
            await handle_disconnect(user)
            continue

        user.last_communication_time = time.time()


async def handle_disconnect(user: User) -> None:
    if user.uuid in connected_users_by_uuid:
        del connected_users_by_uuid[user.uuid]

    get_logger().info(f"User {user} disconnect is being handled.")
    if user.connection:
        await user.connection.close()

    if user.followingUUID or user.followerUUIDs:
        update_following_info()
        await broadcast(
            UsersMessage(users=list(connected_users_by_uuid.values())),
            None,
            logging.DEBUG,
            f"User {user.uuid} disconnected",
        )
    else:
        await broadcast(
            UserDisconnectMessage(user.uuid),
            None,
            logging.DEBUG,
            f"User {user.uuid} disconnected",
        )


async def handle_non_clerical_message(
    this_user: User, message: ReceivableMessage
) -> None:
    if isinstance(message, VideoInfoMessage):
        log_level: int = (
            logging.DEBUG
            if getattr(this_user.videoInfo, "videoId", None) == getattr(message.videoInfo, "videoId", None)
            else logging.INFO
        )
        this_user.apply_video_info_timing_updates(message.videoInfo)
        this_user.videoInfo = message.videoInfo
        await broadcast(message, this_user, log_level)
        return

    if isinstance(message, UserMessage):
        this_user.update(message.user)
        await broadcast(message, this_user, logging.INFO)
        return

    if isinstance(message, FollowMessage):
        if this_user.followingUUID is not None:
            await send_to(
                this_user,
                ErrorMessage(f"Already following: {this_user.followingUUID}", "Server"),
                logging.ERROR,
            )
            return
        if this_user.uuid == message.followingUUID:
            await send_to(
                this_user, ErrorMessage("Cannot follow self.", "Server"), logging.ERROR
            )
            return
        if (
            following := next(
                filter(
                    lambda u: u.uuid == message.followingUUID,
                    connected_users_by_uuid.values(),
                ),
                None,
            )
        ) is None:
            await send_to(
                this_user,
                ErrorMessage(
                    f"User uuid {message.followingUUID} does not exist.", "Server"
                ),
                logging.ERROR,
            )
            return
        if following.videoInfo is not None and following.videoInfo.isLive:
            await send_to(
                this_user,
                ErrorMessage("Cannot follow someone watching a live video", "Server"),
                logging.ERROR,
            )
            return
        this_user.followingUUID = message.followingUUID
        update_following_info()
        await broadcast(
            UsersMessage(list(connected_users_by_uuid.values())),
            None,
            logging.INFO,
            f"{this_user.username} is following {following.username}",
        )
        return

    if isinstance(message, StopFollowingMessage):
        if this_user.followingUUID != message.followingUUID:
            await send_to(
                this_user,
                ErrorMessage(
                    f"Cannot stop following {message.followingUUID} if following {this_user.uuid}",
                    "Server",
                ),
                logging.ERROR,
            )
            return
        this_user.followingUUID = None
        update_following_info()
        await broadcast(
            UsersMessage(list(connected_users_by_uuid.values())),
            None,
            logging.INFO,
            f"{this_user.username} is no longer following.",
        )
        return

    get_logger().error(f"Dropped message from {this_user}: {message}")


async def connection_handler(connection: ServerConnection) -> None:
    this_user: User | None = None
    try:
        async for recv in connection:
            try:
                message: ReceivableMessage = parse_message(recv)
            except DataParseError as e:
                if this_user is None:
                    error_message: ErrorMessage = ErrorMessage(e.message, "Server")
                    await connection.send(dumps(asdict(error_message)))
                    get_logger().error(f"Bad data from {connection.remote_address}: {error_message}")
                    await connection.close()
                    return
                else:
                    await send_to(this_user, ErrorMessage(e.message, "Server"), logging.ERROR)
                    continue

            if this_user is None:
                if not isinstance(message, ServerHandshakeRequestMessage):
                    error_message: ErrorMessage = ErrorMessage(f"First message must be '{ServerHandshakeRequestMessage.MESSAGE_TYPE_VALUE}'.", "Server")
                    await connection.send(dumps(asdict(error_message)))
                    get_logger().error(f"Did not get a handshake request from {connection.remote_address}: {error_message}")
                    await connection.close()
                    return

                while (uuid := uuid4().hex) in connected_users_by_uuid:
                    continue
                this_user = message.user
                this_user.uuid = uuid
                this_user.connection = connection
                this_user.last_communication_time = time.time()
                server_handshake_message: ServerHandshakeMessage = ServerHandshakeMessage(uuid, list(connected_users_by_uuid.values()))
                this_user.waiting_for_acknowledge.append(server_handshake_message)
                await send_to(this_user, server_handshake_message, logging.INFO)
                continue

            this_user.last_communication_time = time.time()
            if isinstance(message, ErrorMessage):
                get_logger().error(f"Error message from {this_user.uuid}: {message}")
                continue

            if isinstance(message, AcknowledgeMessage):
                if this_user.waiting_for_acknowledge:
                    this_user.waiting_for_acknowledge.pop()
                    if this_user.uuid not in connected_users_by_uuid:
                        this_user.apply_video_info_timing_updates(this_user.videoInfo)
                        connected_users_by_uuid[this_user.uuid] = this_user
                        await broadcast(UserMessage(user=this_user), this_user, logging.DEBUG, "Providing users to new user")
                    continue
                else:
                    await send_to(this_user, ErrorMessage("Was not expecting acknowledge message. Disconnecting...", "Server"), logging.ERROR)
                    await handle_disconnect(this_user)
                    return
            elif this_user.waiting_for_acknowledge:
                await send_to(this_user, ErrorMessage("Was expecting acknowledge message. Disconnecting...", "Server"), logging.ERROR)
                await handle_disconnect(this_user)
                return

            if hasattr(message, "uuid") and getattr(message, "uuid") != this_user.uuid:
                await send_to(this_user, ErrorMessage("Received wrong uuid.", "Server"), logging.ERROR)
                await handle_disconnect(this_user)
                return

            await handle_non_clerical_message(this_user, message)
    except ConnectionClosedOK:
        get_logger().info(f"Connection closed by user {connection.remote_address}.")
    except ConnectionClosed as e:
        get_logger().error(e)
    finally:
        if this_user is not None:
            await handle_disconnect(this_user)


def update_connection_quality(user: User) -> list[Task]:
    if user.videoInfo is None:
        if user.connectionQuality is None:
            return []
        user.connectionQuality = None
        user_message: UserMessage = UserMessage(user)
        user.waiting_for_acknowledge.append(user_message)
        return [create_task(broadcast(user_message, None, logging.WARNING))]
    assert user.last_video_info_update is not None and user.video_info_update_time_delta is not None, "expected to not be None if videoInfo is not None"

    if user.videoInfo.playbackInfo.state != PlaybackState.Playing:
        return []

    new_connection_quality: ConnectionQuality
    time_delta: float = time.time() - user.last_video_info_update
    if user.connectionQuality == ConnectionQuality.Good:
        if time_delta > BAD_CONNECTION_INTERVAL:
            new_connection_quality = ConnectionQuality.Bad
        elif time_delta > DEGRADED_CONNECTION_INTERVAL:
            new_connection_quality = ConnectionQuality.Degraded
        else:
            return []
    elif user.connectionQuality == ConnectionQuality.Degraded:
        if time_delta > BAD_CONNECTION_INTERVAL:
            new_connection_quality = ConnectionQuality.Bad
        elif time_delta < DEGRADED_CONNECTION_INTERVAL and user.video_info_update_time_delta < DEGRADED_CONNECTION_INTERVAL:
            new_connection_quality = ConnectionQuality.Good
        else:
            return []
    elif user.connectionQuality == ConnectionQuality.Bad:
        if time_delta < DEGRADED_CONNECTION_INTERVAL and user.video_info_update_time_delta < DEGRADED_CONNECTION_INTERVAL:
            new_connection_quality = ConnectionQuality.Good
        elif time_delta < BAD_CONNECTION_INTERVAL and user.video_info_update_time_delta < BAD_CONNECTION_INTERVAL:
            new_connection_quality = ConnectionQuality.Degraded
        else:
            return []
    elif user.connectionQuality is None:
        new_connection_quality = ConnectionQuality.Good
    else:
        assert False, "Unreachable, matched all connection qualities"

    if new_connection_quality == user.connectionQuality:
        return []

    user.connectionQuality = new_connection_quality
    user_message: UserMessage = UserMessage(user)
    user.waiting_for_acknowledge.append(user_message)
    return [create_task(broadcast(user_message, None, logging.WARNING))]


def keep_connection_alive(user: User) -> list[Task]:
    if time.time() - user.last_communication_time < KEEP_ALIVE_INTERVAL:
        return []
    return [create_task(send_to(user, KeepAliveMessage(), logging.DEBUG))]


async def heartbeat(server: Server) -> None:
    await asyncio.sleep(INITIAL_HEARTBEAT_DELAY)
    while server.is_serving():
        tasks: list[Task[None]] = []
        for user in connected_users_by_uuid.values():
            tasks.extend(update_connection_quality(user))
            tasks.extend(keep_connection_alive(user))

        await gather(*tasks)
        await asyncio.sleep(HEARTBEAT_INTERVAL)


@dataclass
class YouTubeSyncServer:
    websocket_server: Server
    ytsync_serve_task: Future[None]


@asynccontextmanager
async def ytsync(
    host: str,
    port: int,
    logger: logging.Logger | None = None,
) -> AsyncIterator[YouTubeSyncServer]:
    global _logger
    _logger = logger
    async with serve(connection_handler, host, port, logger=logger) as server:
        serve_task: Task[None] = create_task(server.serve_forever())
        heartbeat_task: Task[None] = create_task(heartbeat(server))
        server.closed_waiter.add_done_callback(lambda _: heartbeat_task.cancel())
        ytsync_server: YouTubeSyncServer = YouTubeSyncServer(
            server,
            cast(Future[None], gather(serve_task, heartbeat_task))
        )

        try:
            yield ytsync_server
        finally:
            if server.is_serving():
                server.close()
            if not serve_task.done():
                await serve_task

