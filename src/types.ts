export enum PlaybackState {
  Playing = "playing",
  Paused = "paused",
  Waiting = "waiting"
};

export enum ConnectionQuality {
  Degraded = "degraded",
  Bad = "bad",
  Good = "good"
};

export enum ContinuationOption {
  Nothing = "nothing",
  Pause = "pause",
  BreakFollow = "break"
};

export function isEnumValue<T>(
  enumType: Record<string | number | symbol, T>,
  value: unknown
): value is T {
    return (Object.values(enumType) as unknown[]).includes(value);
}

export interface PlaybackInfo {
  state: PlaybackState,
  currentTime: number,
  playbackRate: number
};

export function isPlaybackInfo(object: any | null | undefined): object is PlaybackInfo {
  if (typeof object !== "object") {
    return false;
  }

  if (object === null) {
    return false;
  }

  if (!Object.values(PlaybackState).includes(object.state)) {
    return false;
  }

  if (typeof object.currentTime !== "number") {
    return false;
  }

  if (object.currentTime < 0) {
    return false;
  }

  if (typeof object.playbackRate !== "number") {
    return false;
  }

  if (object.playbackRate <= 0) {
    return false;
  }

  return true;
}

export interface VideoInfo {
  videoId: string,
  title: string,
  channel: string,
  channelImageUrl: string,
  duration: number,
  playbackInfo: PlaybackInfo
};

export function isVideoInfo(object: any | null | undefined): object is VideoInfo {
  if (typeof object !== "object") {
    return false;
  }

  if (object === null) {
    return false;
  }

  if (typeof object.videoId !== "string") {
    return false;
  }

  if (object.videoId.length === 0) {
    return false;
  }

  if (typeof object.title !== "string") {
    return false;
  }

  if (object.title.length === 0) {
    return false;
  }

  if (typeof object.channel !== "string") {
    return false;
  }

  if (object.channel.length === 0) {
    return false;
  }

  if (typeof object.channelImageUrl !== "string") {
    return false;
  }

  if (object.channelImageUrl.length === 0) {
    return false;
  }

  if (typeof object.duration !== "number") {
    return false;
  }

  if (object.duration < 0) {
    return false;
  }

  if (!isPlaybackInfo(object.playbackInfo)) {
    return false;
  }

  return true;
}

export interface UserHostingOptions {
  cohostsUUID: Array<string>,
  waitForBufferingFollowers: boolean
};

export function isUserHostingOptions(object: any | null | undefined): object is UserHostingOptions {
  if (typeof object !== "object") {
    return false;
  }

  if (object === null) {
    return false;
  }

  if (!Array.isArray(object.cohostsUUID)) {
    return false;
  }

  if (typeof object.waitForBufferingFollowers !== "boolean") {
    return false;
  }

  return true;
}

export const userHostingOptionsDefaults: Readonly<UserHostingOptions> = Object.freeze({
  cohostsUUID: [],
  waitForBufferingFollowers: true
});

export interface UserFollowingOptions {
  onDegradedConnectionContinuationOption: ContinuationOption,
  onHostDegradedConnectionContinuationOption: ContinuationOption
};

export function isUserFollowingOptions(object: any | null | undefined): object is UserFollowingOptions {
  if (typeof object !== "object") {
    return false;
  }

  if (object === null) {
    return false;
  }

  if (!isEnumValue(ContinuationOption, object.onDegradedConnectionContinuationOption)) {
    return false;
  }

  if (!isEnumValue(ContinuationOption, object.onHostDegradedConnectionContinuationOption)) {
    return false;
  }

  return true;
}

export const userFollowingOptionsDefaults: Readonly<UserFollowingOptions> = Object.freeze({
  onDegradedConnectionContinuationOption: ContinuationOption.Nothing,
  onHostDegradedConnectionContinuationOption: ContinuationOption.Nothing
});

export interface User {
  uuid: string | null,
  username: string,
  hostingOptions: UserHostingOptions,
  followingOptions: UserFollowingOptions,
  reconnectToServerOnLoss: boolean,
  videoInfo: VideoInfo | null,
  followingUUID: string | null
};

export function isUser(object: any | null | undefined): object is User {
  if (typeof object !== "object") {
    return false;
  }

  if (object === null) {
    return false;
  }

  if (typeof object.uuid === "string") {
    if (object.uuid.length === 0) {
      return false;
    }
  } else if (object.uuid !== null) {
    return false;
  }

  if (typeof object.username !== "string") {
    return false;
  }

  if (!isUserHostingOptions(object.hostingOptions)) {
    return false;
  }

  if (!isUserFollowingOptions(object.followingOptions)) {
    return false;
  }

  if (typeof object.reconnectToServerOnLoss !== "boolean") {
    return false;
  }

  if (object.videoInfo !== null) {
    if (!isVideoInfo(object.videoInfo)) {
      return false;
    }
  }

  if (typeof object.followingUUID === "string") {
    if (object.followingUUID.length === 0) {
      return false;
    }
  } else if (object.followingUUID !== null) {
    return false;
  }

  return true;
}

export const userDefaults: Readonly<User> = Object.freeze({
  uuid: null,
  username: "",
  hostingOptions: userHostingOptionsDefaults,
  followingOptions: userFollowingOptionsDefaults,
  reconnectToServerOnLoss: true,
  videoInfo: null,
  followingUUID: null
});

export interface PackagedServiceState {
  user: User,
  users: Array<User>,
  activeTabId: number | null,
  serverAddress: string | null
};

export function isPackagedServiceState(object: any | null | undefined): object is PackagedServiceState {
  if (typeof object !== "object") {
    return false;
  }

  if (object === null) {
    return false;
  }

  if (!isUser(object.user)) {
    return false;
  }

  if (!Array.isArray(object.users)) {
    return false;
  }

  for (const user of object.users) {
    if (!isUser(user)) {
      return false;
    }
  }

  if (typeof object.activeTabId === "number") {
    if (object.activeTab < 0) {
      return false;
    }
  } else if (object.activeTabId !== null) {
    return false;
  }

  if (typeof object.serverAddress === "string") {
    if (object.serverAddress.length === 0) {
      return false;
    }
  } else if (object.serverAddress !== null) {
    return false;
  }

  return true;
}

export function asType<T>(
  typeChecker: (object: any | null | undefined) => object is T,
  object: any | null | undefined
): T | undefined {
  if (!typeChecker(object)) {
    return undefined;
  }

  return (object as T);
}

export function propertyAsType<T>(
  typeChecker: (object: any | null | undefined) => object is T,
  object: any,
  property: any
): T | undefined {
  if (!typeChecker(object[property])) {
    return undefined;
  }

  return (object[property] as T);
}

export enum MessageTypes {
  Error = "message",
  RequestPackagedServiceState = "request-packaged-service-state",
  PackagedServiceState = "packaged-service-state"
};

export interface GenericMessage {
  type: string
};

export interface ErrorMessage {
  type: MessageTypes.Error,
  message: string,
  sender: string
};

export interface RequestPackagedServiceStateMessage {
  type: MessageTypes.RequestPackagedServiceState
};

export interface PackagedServiceStateMessage {
  type: MessageTypes.PackagedServiceState,
  packagedServiceState: PackagedServiceState
};

export type Message = (
  GenericMessage |
  RequestPackagedServiceStateMessage |
  PackagedServiceStateMessage
);