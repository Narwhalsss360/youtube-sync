from __future__ import annotations
from typing import TypeGuard, Type, Any, Callable, Optional, Self, get_args, cast
from enum import Enum
from dataclasses import dataclass, field, is_dataclass
from websockets.asyncio.server import Server, serve, ServerConnection
from websockets import ConnectionClosed
from json import loads, dumps, JSONDecodeError
from sys import argv
from npycli import Command
from asyncio import run, Task, create_task
import logging


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

        value = from_data(for_cls, value)
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
    reconnectToServerOnLoss: bool = field(hash=False)
    connectionQuality: ConnectionQuality | None = field(hash=None)
    videoInfo: VideoInfo | None = field(hash=False)
    followingUUID: str | None = field(hash=False)
    followerUUIDs: list[str] = field(hash=False)

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

def parse_message(data: Any) -> Any:
    if not isinstance(data, dict):
        raise DataParseError(GenericMessage, "Data must be a dictionary/JSON object.")
    elif isinstance(data, str):
        try:
            return parse_message(loads(data))
        except JSONDecodeError as e:
            raise DataParseError(GenericMessage, *e.args)
    assert isinstance(data, dict)

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


class LevelNames(str, Enum):
    critical = 50
    fatal = 50
    error = 40
    warning = 30
    warn = 30
    info = 20
    debug = 10
    notset = 0


async def send_to(user: ServerConnection | User, message: ReceivableMessage, log_level: int) -> None:
    ...


async def connection_handler(connection: ServerConnection) -> None:
    ...


async def main(
    host: str,
    port: int,
    log_level: LevelNames = LevelNames.notset
) -> None:
    if log_level != LevelNames.notset:
        logger.setLevel(log_level.value)

    async with serve(connection_handler, host, port, logger=logger) as server:
        serve_task: Task[None] = create_task(server.serve_forever())
        await serve_task


if __name__ == "__main__":
    cmd: Command = Command.create(main) # type: ignore
    if len(argv) == 1:
        print(cmd.extended_command_help())
    else:
        run(cmd(argv[1:]))