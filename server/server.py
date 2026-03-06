from __future__ import annotations
from typing import Literal, TextIO, TypeGuard, Type, Any, Callable, Optional, Self, get_args, cast, Annotated
from enum import Enum
from dataclasses import dataclass, field, is_dataclass, asdict
from websockets.asyncio.server import serve, Server, ServerConnection
from websockets import ConnectionClosed, ConnectionClosedOK
from json import loads, JSONDecodeError, dumps
from sys import argv, stderr, stdout
from npycli import CLIError, Command, DefaultPreview, CLI, EmptyEntriesError  # pyright: ignore[reportMissingTypeStubs]
from npycli.ansi import BACKGROUND_BLUE, BACKGROUND_RED, BACKGROUND_YELLOW, SCR_RESET, SET_BOLD_MODE, ANSIControl, send_ansi, CURSOR_DOWN, CURSOR_UP, INSERT_NEW_LINE, SAVE_CURRENT_CURSOR_POSITION, RESTORE_SAVED_CURSOR_POSITION, SELECT_CHARACTER_RENDITION  # pyright: ignore[reportMissingTypeStubs]
from npycli.parsing import create_enum_parser, create_literal_parser  # pyright: ignore[reportMissingTypeStubs]
from npycli.parameters import CommandParameter  # pyright: ignore[reportMissingTypeStubs]
from asyncio import iscoroutine, run, Task, create_task, gather, Future, to_thread, CancelledError
from uuid import uuid4
from pathlib import Path
from logging import Handler, LogRecord
from shlex import split
from multiprocessing import Process, Queue
from os import kill, get_terminal_size
from signal import SIGINT
from io import StringIO
from functools import partial
import npycli  # pyright: ignore[reportMissingTypeStubs]
import datetime
import asyncio
import logging
import time


logger = logging.getLogger()
logger.setLevel(logging.DEBUG)


def is_user_uuid(uuid: Any) -> TypeGuard[str]:
    return isinstance(uuid, str) and len(uuid) == 32


class PlaybackState(str, Enum):
    Playing = "playing"
    Paused = "paused"
    Waiting = "waiting"


class ContinuationOption(str, Enum):
    Nothing = "nothing"
    Pause = "pause"
    BreakFollow = "break"


class ConnectionQuality(str, Enum):
    Degraded = "degraded"
    Bad = "bad"
    Good = "good"


class DataParseError(Exception):
    def __init__(self, cls: type, message: str, *args: Any) -> None:
        super().__init__(f"Error parsing message {cls.__name__}: {message}", args)
        self.cls: type = cls
        self.message: str = message


def ensure_constructed_rethrow_type_or_value_error[T](
    for_cls: type,
    value_type: Type[T],
    field_name: str,
    value: Optional[Any],
    optional: bool,
    type_check: Optional[Callable[[Any], bool]] = None
) -> Optional[T]:
    type_check = type_check or (lambda _: True)

    if value is None:
        if optional:
            return value
        else:
            raise DataParseError(for_cls, f"The field {field_name} is not optional")

    if isinstance(value, value_type):
        if not type_check(value):
            raise DataParseError(for_cls, f"Type check failure for the field {field_name}")
        return value

    if is_dataclass(value_type):
        if (from_data := getattr(value_type, "from_data")) is None and not callable(from_data):
            raise NotImplementedError(f"The type {value_type} does not have the 'from_data(cls, data: dict | Self)' class method implemented.")

        value = from_data(value)
        if not type_check(value):
            raise DataParseError(for_cls, f"Type check failure for the field {field_name}")
        return value

    try:
        value = value_type(value) # type: ignore
        if not type_check(value):
            raise DataParseError(for_cls, f"Type check failure for the field {field_name}")
        return value
    except TypeError as e:
        raise DataParseError(for_cls, *e.args)
    except ValueError as e:
        raise DataParseError(for_cls, *e.args)


def undefined_optional(obj: Optional[Any]) -> Optional[Any]:
    return obj


def undefined(obj: Any) -> Any:
    return obj


def well_defined[T](obj: Optional[T]) -> T:
    assert obj is not None
    return obj


@dataclass
class PlaybackInfo:
    state: PlaybackState
    currentTime: float
    playbackRate: float

    @classmethod
    def from_data(cls: type[Self], data: dict[str, Any] | Self) -> Self:
        if isinstance(data, cls):
            return data
        assert isinstance(data, dict)

        try:
            parsed: Self = cls(**data)
        except TypeError as e:
            raise DataParseError(cls, *e.args)

        parsed.state = well_defined(ensure_constructed_rethrow_type_or_value_error(
            cls,
            PlaybackState,
            "state",
            parsed.state,
            False
        ))

        parsed.currentTime = well_defined(ensure_constructed_rethrow_type_or_value_error(
            cls,
            float,
            "currentTime",
            parsed.currentTime,
            False
        ))

        parsed.playbackRate = well_defined(ensure_constructed_rethrow_type_or_value_error(
            cls,
            float,
            "playbackRate",
            parsed.playbackRate,
            False
        ))

        return parsed


@dataclass
class VideoInfo:
    videoId: str
    title: str
    channel: str
    channelImageUrl: str
    duration: float
    playbackInfo: PlaybackInfo

    @classmethod
    def from_data(cls: type[Self], data: dict[str, Any] | Self) -> Self:
        if isinstance(data, cls):
            return data
        assert isinstance(data, dict)

        try:
            parsed: Self = cls(**data)
        except TypeError as e:
            raise DataParseError(cls, *e.args)

        parsed.videoId = well_defined(ensure_constructed_rethrow_type_or_value_error(
            cls,
            str,
            "videoId",
            parsed.videoId,
            False
        ))

        parsed.title = well_defined(ensure_constructed_rethrow_type_or_value_error(
            cls,
            str,
            "title",
            parsed.title,
            False
        ))

        parsed.channel = well_defined(ensure_constructed_rethrow_type_or_value_error(
            cls,
            str,
            "channel",
            parsed.channel,
            False
        ))


        parsed.channelImageUrl = well_defined(ensure_constructed_rethrow_type_or_value_error(
            cls,
            str,
            "channelImageUrl",
            parsed.channelImageUrl,
            False
        ))

        parsed.duration = well_defined(ensure_constructed_rethrow_type_or_value_error(
            cls,
            float,
            "duration",
            parsed.duration,
            False
        ))

        parsed.playbackInfo = PlaybackInfo.from_data(parsed.playbackInfo)

        return parsed


@dataclass
class UserHostingOptions:
    cohostsUUID: list[str]
    waitForBufferingFollowers: bool

    @classmethod
    def from_data(cls: type[Self], data: dict[str, Any] | Self) -> Self:
        if isinstance(data, cls):
            return data
        assert isinstance(data, dict)

        try:
            parsed: Self = cls(**data)
        except TypeError as e:
            raise DataParseError(cls, *e.args)


        if not isinstance(undefined(parsed.cohostsUUID), list):
            raise DataParseError(cls, f"cohostsUUID must be a list")

        for i, value in zip(range(len(parsed.cohostsUUID)), parsed.cohostsUUID):
            parsed.cohostsUUID[i] = well_defined(ensure_constructed_rethrow_type_or_value_error(
                cls,
                str,
                f"cohostosUUID[{i}]",
                value,
                False
            ))

        parsed.waitForBufferingFollowers = well_defined(ensure_constructed_rethrow_type_or_value_error(
            cls,
            bool,
            "waitForBufferingFollowers",
            parsed.waitForBufferingFollowers,
            False
        ))

        return parsed


@dataclass
class UserFollowingOptions:
    onDegradedConnectionContinuationOption: ContinuationOption
    onHostDegradedConnectionContinuationOption: ContinuationOption

    @classmethod
    def from_data(cls: type[Self], data: dict[str, Any] | Self) -> Self:
        if isinstance(data, cls):
            return data
        assert isinstance(data, dict)

        try:
            parsed: Self = cls(**data)
        except TypeError as e:
            raise DataParseError(cls, *e.args)

        parsed.onDegradedConnectionContinuationOption = well_defined(ensure_constructed_rethrow_type_or_value_error(
            cls,
            ContinuationOption,
            "onDegradedConnectionContinuationOption",
            parsed.onDegradedConnectionContinuationOption,
            False
        ))

        parsed.onHostDegradedConnectionContinuationOption = well_defined(ensure_constructed_rethrow_type_or_value_error(
            cls,
            ContinuationOption,
            "onHostDegradedConnectionContinuationOption",
            parsed.onHostDegradedConnectionContinuationOption,
            False
        ))

        return parsed


@dataclass(unsafe_hash=True)
class User:
    uuid: str = field(hash=True)
    username: str = field(hash=False)
    hostingOptions: UserHostingOptions = field(hash=False)
    followingOptions: UserFollowingOptions = field(hash=False)
    reconnectToServerOnLoss: bool = field(hash=False)
    connectionQuality: ConnectionQuality | None = field(hash=None)
    videoInfo: VideoInfo | None = field(hash=False)
    followingUUID: str | None = field(hash=False)
    followerUUIDs: list[str] = field(hash=False)

    def __post_init__(self) -> None:
        self.connection: ServerConnection
        self.last_communication_time: float = time.time()
        self.waiting_for_acknowledge: list[Message] = []

    @classmethod
    def from_data(cls: type[Self], data: dict[str, Any] | Self, require_uuid: bool = True) -> Self:
        if isinstance(data, cls):
            return data
        assert isinstance(data, dict)

        try:
            parsed: Self = cls(**data)
        except TypeError as e:
            raise DataParseError(cls, *e.args)

        if require_uuid:
            parsed.uuid = well_defined(ensure_constructed_rethrow_type_or_value_error(
                cls,
                str,
                "uuid",
                parsed.uuid,
                False,
                is_user_uuid)
            )

        parsed.username = well_defined(ensure_constructed_rethrow_type_or_value_error(
            cls,
            str,
            "username",
            parsed.username,
            False
        ))

        parsed.hostingOptions = well_defined(ensure_constructed_rethrow_type_or_value_error(
            cls,
            UserHostingOptions,
            "hostingOptions",
            parsed.hostingOptions,
            False
        ))
        parsed.followingOptions = well_defined(ensure_constructed_rethrow_type_or_value_error(
            cls,
            UserFollowingOptions,
            "followingOptions",
            parsed.followingOptions,
            False
        ))
        parsed.reconnectToServerOnLoss = well_defined(ensure_constructed_rethrow_type_or_value_error(
            cls,
            bool,
            "reconnectToServerOnLoss",
            parsed.reconnectToServerOnLoss,
            False
        ))
        parsed.connectionQuality = ensure_constructed_rethrow_type_or_value_error(
            cls,
            ConnectionQuality,
            "connectionQuality",
            parsed.connectionQuality,
            True
        )
        parsed.videoInfo = ensure_constructed_rethrow_type_or_value_error(
            cls,
            VideoInfo,
            "videoInfo",
            parsed.videoInfo,
            True
        )
        parsed.followingUUID = ensure_constructed_rethrow_type_or_value_error(
            cls,
            str,
            "followingUUID",
            parsed.followingUUID,
            True,
            is_user_uuid
        )

        for i, value in zip(range(len(parsed.followerUUIDs)), parsed.followerUUIDs):
            parsed.followerUUIDs[i] = well_defined(ensure_constructed_rethrow_type_or_value_error(
                cls,
                str,
                f"followerUUIDs[{i}]",
                value,
                False
            ))

        return parsed

    def update(self, new_data: User) -> User:
        if self.uuid != new_data.uuid:
            raise ValueError("Cannot update data, uuid mismatch")

        self.videoInfo = new_data.videoInfo
        self.followingUUID = new_data.followingUUID
        self.followerUUIDs = new_data.followerUUIDs
        self.hostingOptions = new_data.hostingOptions
        self.followingOptions = new_data.followingOptions
        self.reconnectToServerOnLoss = new_data.reconnectToServerOnLoss
        return self



class MessageTypes(str, Enum):
    Error = "error"
    ServerHandshakeRequest = "server-handshake-request"
    ServerHandshake = "server-handshake"
    Acknowledge = "acknowledge"
    VideoInfo = "video-info"
    User = "user"
    UserDisconnect = "user-disconnect"
    Users = "users"
    Follow = "follow"
    StopFollowing = "stop-following"
    RequestVideoInfo = "request-video-info"
    KeepAlive = "keep-alive"


@dataclass
class GenericMessage:
    type: str


@dataclass
class ErrorMessage:
    MESSAGE_TYPE_VALUE = MessageTypes.Error.value
    message: str
    sender: str
    type: str = field(default=MESSAGE_TYPE_VALUE)

    @classmethod
    def from_data(cls: type[Self], data: dict[str, Any] | Self) -> Self:
        if isinstance(data, cls):
            return data
        assert isinstance(data, dict)

        try:
            parsed: Self = cls(**data)
        except TypeError as e:
            raise DataParseError(cls, *e.args)

        if parsed.type != cls.MESSAGE_TYPE_VALUE:
            raise DataParseError(cls, f"'type' field must be {cls.MESSAGE_TYPE_VALUE}")

        parsed.message = well_defined(ensure_constructed_rethrow_type_or_value_error(
            cls,
            str,
            "message",
            parsed.message,
            False
        ))
        parsed.sender = well_defined(ensure_constructed_rethrow_type_or_value_error(
            cls,
            str,
            "sender",
            parsed.sender,
            False
        ))

        return parsed


@dataclass
class ServerHandshakeRequestMessage:
    MESSAGE_TYPE_VALUE = MessageTypes.ServerHandshakeRequest.value
    user: User
    type: str = field(default=MESSAGE_TYPE_VALUE)

    @classmethod
    def from_data(cls: type[Self], data: dict[str, Any] | Self) -> Self:
        if isinstance(data, cls):
            return data
        assert isinstance(data, dict)

        try:
            parsed: Self = cls(**data)
        except TypeError as e:
            raise DataParseError(cls, *e.args)

        if parsed.type != cls.MESSAGE_TYPE_VALUE:
            raise DataParseError(cls, f"'type' field must be {cls.MESSAGE_TYPE_VALUE}")

        parsed.user = User.from_data(parsed.user, False)

        return parsed

@dataclass
class ServerHandshakeMessage:
    MESSAGE_TYPE_VALUE = MessageTypes.ServerHandshake.value
    uuid: str
    users: list[User]
    type: str = field(default=MESSAGE_TYPE_VALUE)


@dataclass
class AcknowledgeMessage:
    MESSAGE_TYPE_VALUE = MessageTypes.Acknowledge.value
    type: str = field(default=MESSAGE_TYPE_VALUE)

    @classmethod
    def from_data(cls: type[Self], data: dict[str, Any] | Self) -> Self:
        if isinstance(data, cls):
            return data
        assert isinstance(data, dict)

        try:
            parsed: Self = cls(**data)
        except TypeError as e:
            raise DataParseError(cls, *e.args)

        if parsed.type != cls.MESSAGE_TYPE_VALUE:
            raise DataParseError(cls, f"'type' field must be {cls.MESSAGE_TYPE_VALUE}")

        return parsed


@dataclass
class VideoInfoMessage:
    MESSAGE_TYPE_VALUE = MessageTypes.VideoInfo.value
    uuid: str
    videoInfo: Optional[VideoInfo]
    type: str = field(default=MESSAGE_TYPE_VALUE)

    @classmethod
    def from_data(cls: type[Self], data: dict[str, Any] | Self) -> Self:
        if isinstance(data, cls):
            return data
        assert isinstance(data, dict)

        try:
            parsed: Self = cls(**data)
        except TypeError as e:
            raise DataParseError(cls, *e.args)

        if parsed.type != cls.MESSAGE_TYPE_VALUE:
            raise DataParseError(cls, f"'type' field must be {cls.MESSAGE_TYPE_VALUE}")

        parsed.uuid = well_defined(ensure_constructed_rethrow_type_or_value_error(
            cls,
            str,
            "uuid",
            parsed.uuid,
            False
        ))

        parsed.videoInfo = ensure_constructed_rethrow_type_or_value_error(
            cls,
            VideoInfo,
            "videoInfo",
            parsed.videoInfo,
            True
        )

        return parsed


@dataclass
class UserMessage:
    MESSAGE_TYPE_VALUE = MessageTypes.User.value
    user: User
    type: str = field(default=MESSAGE_TYPE_VALUE)

    @classmethod
    def from_data(cls: type[Self], data: dict[str, Any] | Self) -> Self:
        if isinstance(data, cls):
            return data
        assert isinstance(data, dict)

        try:
            parsed: Self = cls(**data)
        except TypeError as e:
            raise DataParseError(cls, *e.args)

        if parsed.type != cls.MESSAGE_TYPE_VALUE:
            raise DataParseError(cls, f"'type' field must be {cls.MESSAGE_TYPE_VALUE}")

        parsed.user = User.from_data(parsed.user)

        return parsed


@dataclass
class UsersMessage:
    MESSAGE_TYPE_VALUE = MessageTypes.Users.value
    users: list[User]
    type: str = field(default=MESSAGE_TYPE_VALUE)


@dataclass
class UserDisconnectMessage:
    MESSAGE_TYPE_VALUE = MessageTypes.UserDisconnect
    uuid: str
    type: str = field(default=MESSAGE_TYPE_VALUE)


@dataclass
class FollowMessage:
    MESSAGE_TYPE_VALUE = MessageTypes.Follow.value
    followingUUID: str
    type: str = field(default=MESSAGE_TYPE_VALUE)

    @classmethod
    def from_data(cls: type[Self], data: dict[str, Any] | Self) -> Self:
        if isinstance(data, cls):
            return data
        assert isinstance(data, dict)

        try:
            parsed: Self = cls(**data)
        except TypeError as e:
            raise DataParseError(cls, *e.args)

        if parsed.type != cls.MESSAGE_TYPE_VALUE:
            raise DataParseError(cls, f"'type' field must be {cls.MESSAGE_TYPE_VALUE}")

        parsed.followingUUID = well_defined(ensure_constructed_rethrow_type_or_value_error(
            cls,
            str,
            "followingUUID",
            parsed.followingUUID,
            False,
            is_user_uuid)
        )

        return parsed


@dataclass
class StopFollowingMessage:
    MESSAGE_TYPE_VALUE = MessageTypes.StopFollowing.value
    followingUUID: str
    type: str = field(default=MESSAGE_TYPE_VALUE)

    @classmethod
    def from_data(cls: type[Self], data: dict[str, Any] | Self) -> Self:
        if isinstance(data, cls):
            return data
        assert isinstance(data, dict)

        try:
            parsed: Self = cls(**data)
        except TypeError as e:
            raise DataParseError(cls, *e.args)

        if parsed.type != cls.MESSAGE_TYPE_VALUE:
            raise DataParseError(cls, f"'type' field must be {cls.MESSAGE_TYPE_VALUE}")

        parsed.followingUUID = well_defined(ensure_constructed_rethrow_type_or_value_error(
            cls,
            str,
            "followingUUID",
            parsed.followingUUID,
            False,
            is_user_uuid)
        )

        return parsed


@dataclass
class RequestVideoInfoMessage:
    MESSAGE_TYPE_VALUE = MessageTypes.RequestVideoInfo.value
    type: str = field(default=MESSAGE_TYPE_VALUE)

    @classmethod
    def from_data(cls: type[Self], data: dict[str, Any] | Self) -> Self:
        if isinstance(data, cls):
            return data
        assert isinstance(data, dict)

        try:
            parsed: Self = cls(**data)
        except TypeError as e:
            raise DataParseError(cls, *e.args)

        if parsed.type != cls.MESSAGE_TYPE_VALUE:
            raise DataParseError(cls, f"'type' field must be {cls.MESSAGE_TYPE_VALUE}")

        return parsed


@dataclass
class KeepAliveMessage:
    MESSAGE_TYPE_VALUE = MessageTypes.KeepAlive.value
    type: str = field(default=MESSAGE_TYPE_VALUE)


type Message = (
    ErrorMessage |
    ServerHandshakeRequestMessage |
    ServerHandshakeMessage |
    AcknowledgeMessage |
    VideoInfoMessage |
    UserMessage |
    UsersMessage |
    UserDisconnectMessage |
    FollowMessage |
    StopFollowingMessage |
    RequestVideoInfoMessage |
    KeepAliveMessage
)

type ReceivableMessage = (
    ErrorMessage |
    ServerHandshakeRequestMessage |
    AcknowledgeMessage |
    VideoInfoMessage |
    UserMessage |
    FollowMessage |
    StopFollowingMessage |
    RequestVideoInfoMessage
)

receiveable_message_classes: tuple[Type[ReceivableMessage]] = get_args(ReceivableMessage.__value__)

def parse_message(data: Any) -> ReceivableMessage:
    if isinstance(data, str):
        try:
            return parse_message(loads(data))
        except JSONDecodeError as e:
            raise DataParseError(GenericMessage, *e.args)
    if not isinstance(data, dict):
        raise DataParseError(GenericMessage, "Data must be a dictionary/JSON object.")

    if "type" not in data or not isinstance(data["type"], str):
        raise DataParseError(GenericMessage, f"Message type required for every message.")
    message_type: str = data["type"]

    cls = next(
        filter(
            lambda t: t.MESSAGE_TYPE_VALUE == message_type,
            receiveable_message_classes
        ),
        None
    )

    if cls is None:
        raise DataParseError(GenericMessage, f"Type '{data["type"]}' is not a message type.")
    return cls.from_data(cast(dict[str, Any], data))


connected_users_by_uuid: dict[str, User] = {}


def update_following_info() -> None:
    for user in connected_users_by_uuid.values():
        user.followerUUIDs = []

    for user in connected_users_by_uuid.values():
        user.waiting_for_acknowledge.append(UsersMessage([]))
        if user.followingUUID is not None:
            connected_users_by_uuid[user.followingUUID].followerUUIDs.append(user.uuid)


async def send_to(user: ServerConnection | User, message: Message, log_level: int) -> None:
    if log_level != logging.NOTSET:
        logger.log(log_level, f"$<- {message}")

    if isinstance(user, User):
        await user.connection.send(dumps(asdict(message)))
        user.last_communication_time = time.time()
    else:
        await user.send(dumps(asdict(message)))


async def broadcast(message: Message, except_for: User | None, log_level: int) -> None:
    broadcast_to: list[User] = list(filter(lambda u: u != except_for, connected_users_by_uuid.values()) if except_for is not None else connected_users_by_uuid.values())
    send_results = gather(*[
        send_to(user, message, logging.NOTSET)
        for user in broadcast_to
    ])

    if log_level != logging.NOTSET:
        logger.log(log_level, f"BROADCAST({len(broadcast_to)} user(s)) <- {message}")

    await send_results
    for user, result in zip(broadcast_to, send_results):
        if isinstance(result, ConnectionClosedOK):
            await handle_disconnect(user)
            continue

        if isinstance(result, ConnectionClosed):
            logger.error(result)
            await handle_disconnect(user)
            continue

        user.last_communication_time = time.time()


async def handle_disconnect(user: User) -> None:
    if user.uuid in connected_users_by_uuid:
        del connected_users_by_uuid[user.uuid]

    logger.info(f"User {user} disconnect is being handled.")
    if user.connection:
        await user.connection.close()

    if user.followingUUID or user.followerUUIDs:
        update_following_info()
        await broadcast(UsersMessage(users=list(connected_users_by_uuid.values())), None, logging.DEBUG)
    else:
        await broadcast(UserDisconnectMessage(user.uuid), None, logging.DEBUG)


async def handle_non_clerical_message(this_user: User, message: ReceivableMessage) -> None:
    if isinstance(message, VideoInfoMessage):
        log_level: int = logging.DEBUG if getattr(this_user.videoInfo, "videoId", None) == getattr(message, "videoId", None) else logging.INFO
        this_user.videoInfo = message.videoInfo
        await broadcast(message, this_user, log_level)
        return

    if isinstance(message, UserMessage):
        this_user.update(message.user)
        await broadcast(message, this_user, logging.INFO)
        return

    if isinstance(message, FollowMessage):
        if this_user.followingUUID is not None:
            await send_to(this_user, ErrorMessage(f"Already following: {this_user.followingUUID}", "Server"), logging.ERROR)
            return
        if this_user.uuid == message.followingUUID:
            await send_to(this_user, ErrorMessage("Cannot follow self.", "Server"), logging.ERROR)
            return
        if next(filter(lambda u: u.uuid == message.followingUUID, connected_users_by_uuid.values()), None) is None:
            await send_to(this_user, ErrorMessage(f"User uuid {message.followingUUID} does not exist.", "Server"), logging.ERROR)
            return
        this_user.followingUUID = message.followingUUID
        update_following_info()
        await broadcast(UsersMessage(list(connected_users_by_uuid.values())), None, logging.INFO)
        return

    if isinstance(message, StopFollowingMessage):
        if this_user.followingUUID != message.followingUUID:
            await send_to(this_user, ErrorMessage(f"Cannot stop following {message.followingUUID} if following {this_user.uuid}", "Server"), logging.ERROR)
            return
        this_user.followingUUID = None
        update_following_info()
        await broadcast(UsersMessage(list(connected_users_by_uuid.values())), None, logging.INFO)
        return

    logger.error(f"Dropped message from {this_user}: {message}")


async def connection_handler(connection: ServerConnection) -> None:
    this_user: User | None = None
    try:
        async for recv in connection:
            try:
                message: ReceivableMessage = parse_message(recv)
            except DataParseError as e:
                await send_to(connection, ErrorMessage(e.message, "Server"), logging.ERROR)
                if this_user is None:
                    return
                continue

            if this_user is None:
                if not isinstance(message, ServerHandshakeRequestMessage):
                    await send_to(connection, ErrorMessage(f"First message must be '{ServerHandshakeRequestMessage.MESSAGE_TYPE_VALUE}'.", "Server"), logging.ERROR)
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
            if isinstance(message, AcknowledgeMessage):
                if this_user.waiting_for_acknowledge:
                    this_user.waiting_for_acknowledge.pop()
                    if this_user.uuid not in connected_users_by_uuid:
                        connected_users_by_uuid[this_user.uuid] = this_user
                        await broadcast(UserMessage(user=this_user), this_user, logging.DEBUG)
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
        logger.info(f"Connection closed by user {connection.remote_address}.")
    except ConnectionClosed as e:
        logger.error(e)
    finally:
        if this_user is not None:
            await handle_disconnect(this_user)


HEARTBEAT_INTERVAL: float = 0.1
KEEP_ALIVE_INTERVAL: float = 20


def heartbeat(server: Server) -> None:
    if not server.is_serving():
        return

    tasks: list[Task[None]] = []
    for user in connected_users_by_uuid.values():
        if time.time() - user.last_communication_time >= KEEP_ALIVE_INTERVAL:
            tasks.append(create_task(send_to(user, KeepAliveMessage(), logging.DEBUG)))


    def tasks_done(future: Future[list[None]]) -> None:
        delay_task: Task[None] = create_task(asyncio.sleep(HEARTBEAT_INTERVAL))
        server.closed_waiter.add_done_callback(lambda _: delay_task.cancel())
        delay_task.add_done_callback(lambda _: heartbeat(server))
    gather(*tasks).add_done_callback(tasks_done)


class LevelNames(int, Enum):
    critical = 50
    fatal = 50
    error = 40
    warning = 30
    warn = 30
    info = 20
    debug = 10
    notset = 0


def input_async_process_target(queue: Queue[str]) -> None:
    with open(0, "r") as stdin:
        try:
            queue.put(stdin.readline().rsplit("\n", 1)[0])
        except KeyboardInterrupt:
            return


async def input_async(prompt: object = None) -> str:
    user_input_queue: Queue[str] = Queue(1)

    proc: Process = Process(target=input_async_process_target, args=(user_input_queue,), name="server:input", daemon=True)
    print(prompt, end="", flush=True)
    proc.start()
    assert proc.pid is not None

    try:
        join_task: Task[None] = create_task(to_thread(proc.join))
        while user_input_queue.empty() and not join_task.done():
            await asyncio.sleep(0.02)
    except CancelledError:
        kill(proc.pid, SIGINT)
        raise

    if user_input_queue.empty():
        raise EOFError

    return user_input_queue.get()


def print_above(*args: Any, max_columns: int, sep: str | None = " ", file: TextIO = stdout, current_is_empty: bool = False, lines_above: int = 1) -> None:
    '''
    Print above the current line.
    '''

    if lines_above == 0:
        print(*args, sep=sep)
        return

    # Use print with file=buffer so this function can be used just like regular print
    buffer: StringIO = StringIO()
    print(*args, sep=sep, end="", file=buffer, flush=True)
    output: str = buffer.getvalue()

    line_count: int = 1
    line_length: int = 0
    for c in output:
        line_length += 1
        if line_length == max_columns or c == "\n":
            line_count += 1
            line_length = 0

    send_ansi(SAVE_CURRENT_CURSOR_POSITION)
    if current_is_empty:
        print("\n" * lines_above, file=file, end="")
        send_ansi(CURSOR_UP.with_args(1 + lines_above), file=file)

    # These ansi control commands may be supplied with arguments
    print("\n" * (line_count), file=file, end="")
    send_ansi(CURSOR_UP.with_args(line_count + lines_above), file=file)
    # This one doesn't have argument, so we just repeat the command
    send_ansi(INSERT_NEW_LINE, repeat=line_count, file=file)

    # Flush, just in case current cursor position gets moved after output
    print(output, end='', file=file, flush=True)
    send_ansi(RESTORE_SAVED_CURSOR_POSITION, file=file)
    send_ansi(CURSOR_DOWN.with_args(line_count), file=file)


class CommandLineInterfaceHandler(Handler):
    def __init__(self) -> None:
        super().__init__(logging.NOTSET)
        self.command_result_logging: bool = False

    def emit(self, record: LogRecord) -> None:
        try:
            file: TextIO
            scr: ANSIControl
            scr_reset: ANSIControl = SELECT_CHARACTER_RENDITION.with_args(SCR_RESET)
            if record.levelno <= LevelNames.info:
                scr = SELECT_CHARACTER_RENDITION.with_args(BACKGROUND_BLUE)
                file = stdout
            elif record.levelno <= LevelNames.warning:
                scr = SELECT_CHARACTER_RENDITION.with_args(SET_BOLD_MODE, BACKGROUND_YELLOW)
                file = stdout
            else:
                scr = SELECT_CHARACTER_RENDITION.with_args(SET_BOLD_MODE, BACKGROUND_RED)

                file = stderr
            msg = (
                f"{scr}{datetime.datetime.now().isoformat()} {record.levelname}:{scr_reset} "
                f"{record.getMessage()}"
            )

            printer = print if self.command_result_logging else partial(print_above, max_columns=get_terminal_size().columns)
            printer(msg, file=file)
        except Exception:
            self.handleError(record)


def format_exc(e: BaseException, tabstr: str = "  ", inner_exc_tabs: int = 1) -> str:
    return (
        f"{e.__class__.__name__}: {f"\n{tabstr * inner_exc_tabs}".join(str(arg) for arg in e.args)}"
        f"{format_exc(e.__cause__, tabstr, inner_exc_tabs + 1) if e.__cause__ else ""}"
    )


cli_handler: CommandLineInterfaceHandler = CommandLineInterfaceHandler()
file_handler: Optional[logging.FileHandler] = None
cli: CLI = CLI("server")


class UserError(Exception):
    def __init__(self, command: Command, message: str) -> None:
        super().__init__(message, command)
        self.command: Command = command
        self.message: str = message

def get_server() -> Server:
    if (server := cli.env.get("server", None)) is None:
        raise NotImplementedError()
    return server


type LogHandlerName = Literal["console", "file"]
cli.parsers[LogHandlerName] = create_literal_parser(LogHandlerName)


@cli.cmd()
def level(handler_name: LogHandlerName, level: Optional[LevelNames] = None) -> None:
    assert file_handler is not None
    handler: Handler = cli_handler if handler_name == "console" else file_handler
    if level is None:
        print(LevelNames(handler.level))
    else:
        logger.info(f"Log level for {handler_name} changing to {level.name}")
        handler.setLevel(level.value)


@cli.cmd()
async def quit() -> None:
    server: Server = get_server()
    server.close()
    await server.closed_waiter


@cli.cmd("help")
def help_cmd(command_name: Optional[str] = None, parameter_name: Optional[str] = None, extended: bool = False) -> None:
    if extended:
        command_help, parameter_help = Command.extended_command_help, CommandParameter.extended_parameter_help
    else:
        command_help, parameter_help = Command.basic_command_help, CommandParameter.basic_parameter_help

    if command_name is None:
        out: str = ""
        for i, command in enumerate(cli.commands):
            out += f"{command_help(command)}"
            if i != len(cli.commands) - 1:
                out += "\n"
        print(out)
        return

    if (command := cli.get_command(command_name)) is None:
        raise UserError(npycli.command.cmd(help), f"{command_name} is not a command.")

    if parameter_name is not None:
        if (parameter := next(filter(lambda p: parameter_name in p.names, command.parameters)), None) is None:  # type: ignore
            raise UserError(npycli.command.cmd(help), f"'{parameter_name}' is not a parameter")
        print(parameter_help(parameter))

    print(command_help(command))


DEFAULT_LOG_PATH: str = "server.log"
cli.parsers[LevelNames] = create_enum_parser(LevelNames)


async def main(
    host: str,
    port: int,
    log_level: LevelNames = LevelNames.notset,
    log_file: Annotated[Optional[Path], DefaultPreview(DEFAULT_LOG_PATH)] = None
) -> int:
    log_level = LevelNames.debug if log_level == LevelNames.notset else log_level
    log_file = log_file or Path(__file__).parent.joinpath(Path(DEFAULT_LOG_PATH))
    logger.setLevel(log_level.value)

    cli_handler.setLevel(log_level)
    logger.addHandler(cli_handler)

    global file_handler
    file_handler = logging.FileHandler(str(log_file))
    file_handler.setLevel(log_level)
    logger.addHandler(file_handler)

    cli_handler.command_result_logging = True
    async with serve(connection_handler, host, port, logger=logger) as server:
        serve_task: Task[None] = create_task(server.serve_forever())
        cli.env["server"] = server

        initial_heartbeat_delay: Task[None] = create_task(asyncio.sleep(3))
        server.closed_waiter.add_done_callback(lambda _: initial_heartbeat_delay.cancel())
        initial_heartbeat_delay.add_done_callback(lambda _: heartbeat(server))

        try:
            while server.is_serving():
                user_input_task: Task[str] = create_task(input_async(cli.prompt_entry_marker))
                server.closed_waiter.add_done_callback(lambda _: user_input_task.cancel())
                try:
                    user_input: str = await user_input_task
                except EOFError:
                    await asyncio.sleep(30)
                    continue


                try:
                    cli_handler.command_result_logging = True
                    retval: Any = cli.exec(split(user_input))
                except EmptyEntriesError:
                    cli_handler.command_result_logging = False
                    continue
                except (CLIError, UserError) as err:
                    logger.error(format_exc(err))
                    cli_handler.command_result_logging = False
                    continue
                finally:
                    cli_handler.command_result_logging = False

                if iscoroutine(retval):
                    await retval
        except (CancelledError, KeyboardInterrupt):
            if server.is_serving():
                server.close()
            if not serve_task.done():
                await serve_task

    return 0


cmd: Command = Command.create(main, name="server", help="Serve the YouTube Sync server. Specify a host and port, logging level and log file.")  # type: ignore
if __name__ == "__main__":
    try:
        if len(argv) == 1:
            print(cmd.extended_command_help())
        else:
            exit(run(cmd(argv[1:], cli.parsers)))
    except KeyboardInterrupt:
        print("\n^C")
