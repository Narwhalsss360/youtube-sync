from __future__ import annotations

import time
from dataclasses import dataclass, field, is_dataclass
from enum import Enum
from json import JSONDecodeError, loads
from typing import Any, Callable, Optional, Self, Type, TypeGuard, cast, get_args

from websockets.asyncio.server import ServerConnection


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
        value = value_type(value)  # type: ignore
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
class QueuedVideoInfo:
    videoId: str
    title: str
    channel: str

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

        return parsed


@dataclass
class VideoQueue:
    videos: list[QueuedVideoInfo]
    currentIndex: int
    list: str | None

    @classmethod
    def from_data(cls: type[Self], data: dict[str, Any] | Self) -> Self:
        if isinstance(data, cls):
            return data
        assert isinstance(data, dict)

        try:
            parsed: Self = cls(**data)
        except TypeError as e:
            raise DataParseError(cls, *e.args)

        for i, value in zip(range(len(parsed.videos)), parsed.videos):
            parsed.videos[i] = well_defined(ensure_constructed_rethrow_type_or_value_error(
                cls,
                QueuedVideoInfo,
                f"videos[{i}]",
                value,
                False
            ))

        parsed.currentIndex = well_defined(ensure_constructed_rethrow_type_or_value_error(
            cls,
            int,
            "currentIndex",
            parsed.currentIndex,
            False
        ))

        parsed.list = ensure_constructed_rethrow_type_or_value_error(
            cls,
            str,
            "list",
            parsed.list,
            True
        )

        return parsed


@dataclass
class VideoInfo:
    videoId: str
    title: str
    channel: str
    channelImageUrl: str
    duration: float
    isLive: bool
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

        parsed.isLive = well_defined(ensure_constructed_rethrow_type_or_value_error(
            cls,
            bool,
            "isLive",
            parsed.isLive,
            False
        ))

        parsed.playbackInfo = PlaybackInfo.from_data(parsed.playbackInfo)

        return parsed


@dataclass
class UserHostingOptions:
    cohostsUUID: list[str]
    waitForBufferingFollowers: bool
    shareQueue: bool

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
            raise DataParseError(cls, "cohostsUUID must be a list")

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

        parsed.shareQueue = well_defined(ensure_constructed_rethrow_type_or_value_error(
            cls,
            bool,
            "shareQueue",
            parsed.shareQueue,
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
    videoQueue: VideoQueue | None = field(hash=False)

    def __post_init__(self) -> None:
        self.connection: ServerConnection
        self.last_communication_time: float = time.time()
        self.last_video_info_update: float | None = None
        self.video_info_update_time_delta: float | None = None
        self.waiting_for_acknowledge: list[Message] = []

    def apply_video_info_timing_updates(self, newVideoInfo: VideoInfo | None) -> None:
        if newVideoInfo is None:
            self.video_info_update_time_delta = None
            self.last_video_info_update = None
        else:
            self.video_info_update_time_delta = time.time() - self.last_video_info_update if self.last_video_info_update else 0
            self.last_video_info_update = time.time()

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

        parsed.videoQueue = ensure_constructed_rethrow_type_or_value_error(
            cls,
            VideoQueue,
            "videoQueue",
            parsed.videoQueue,
            True
        )

        return parsed

    def update(self, new_data: User) -> User:
        if self.uuid != new_data.uuid:
            raise ValueError("Cannot update data, uuid mismatch")

        self.apply_video_info_timing_updates(new_data.videoInfo)
        self.videoInfo = new_data.videoInfo
        self.followingUUID = new_data.followingUUID
        self.followerUUIDs = new_data.followerUUIDs
        self.hostingOptions = new_data.hostingOptions
        self.followingOptions = new_data.followingOptions
        self.reconnectToServerOnLoss = new_data.reconnectToServerOnLoss
        return self


@dataclass
class Notification:
    epoch: int
    sender: str
    message: str
    dismissed: bool

    @classmethod
    def from_data(cls: type[Self], data: dict[str, Any] | Self) -> Self:
        if isinstance(data, cls):
            return data
        assert isinstance(data, dict)

        try:
            parsed: Self = cls(**data)
        except TypeError as e:
            raise DataParseError(cls, *e.args)

        parsed.epoch = well_defined(ensure_constructed_rethrow_type_or_value_error(
            cls,
            int,
            "epoch",
            parsed.epoch,
            False
        ))

        parsed.sender = well_defined(ensure_constructed_rethrow_type_or_value_error(
            cls,
            str,
            "sender",
            parsed.sender,
            False
        ))

        parsed.message = well_defined(ensure_constructed_rethrow_type_or_value_error(
            cls,
            str,
            "message",
            parsed.message,
            False
        ))

        parsed.dismissed = well_defined(ensure_constructed_rethrow_type_or_value_error(
            cls,
            bool,
            "dismissed",
            parsed.dismissed,
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
    Notify = "notify"


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


@dataclass
class NotifyMessage:
    MESSAGE_TYPE_VALUE = MessageTypes.Notify.value
    notification: Notification
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

        parsed.notification = Notification.from_data(parsed.notification)

        return parsed


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
    KeepAliveMessage |
    NotifyMessage
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
        raise DataParseError(GenericMessage, "Message type required for every message.")
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

