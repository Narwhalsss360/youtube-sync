import { UnexpectedMessageDataError, UnexpectedMessageTypeError } from "./errors";

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

export interface ComparersDefinitions {
  [key: string]: (a: any, b: any) => boolean
};

export function arrayEquals(a: Array<any> | null | undefined, b: Array<any> | null | undefined, compare: undefined | ((a: any, b: any) => boolean) = undefined): boolean {
  if (a === undefined && b !== undefined) {
    return false;
  }
  if (a !== undefined && b === undefined) {
    return false;
  }

  if (a === null && b !== null) {
    return false;
  }
  if (a !== null && b === null) {
    return false;
  }

  if (a === null || a === undefined) {
    return false;
  }
  if (b === null || b === undefined) {
    return false;
  }

  if (a.length !== b.length) {
    return false;
  }
  compare = compare ?? ((a: any, b: any) => a === b);
  for (let i = 0; i < a.length; i++) {
    if (!compare(a[i], b[i])) {
      return false;
    }
  }
  return true;
}

export function propertyEquals(a: any, b: any, property: string, compare: undefined | ((a: any, b: any) => boolean) = undefined): boolean {
  if (compare !== undefined) {
    return compare(a[property], b[property]);
  }
  return a[property] === b[property];
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

export function detectPlaybackInfoUpdates(playbackInfo: PlaybackInfo | undefined, newPlaybackInfo: PlaybackInfo): Array<keyof PlaybackInfo> {
  if (playbackInfo === undefined) {
    return Object.keys(newPlaybackInfo) as Array<keyof PlaybackInfo>;
  }

  return Object.keys(playbackInfo)
    .filter(key => !propertyEquals(playbackInfo, newPlaybackInfo, key)) as Array<keyof PlaybackInfo>;
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

export function detectVideoInfoUpdates(videoInfo: VideoInfo | null | undefined, newVideoInfo: VideoInfo | null): Array<keyof VideoInfo> {
  if (videoInfo === undefined || videoInfo === null || newVideoInfo === null) {
    return ["videoId", "title", "channel", "channelImageUrl", "duration", "playbackInfo"];
  }

  const comparers: ComparersDefinitions = {
    playbackInfo: (a: PlaybackInfo, b: PlaybackInfo) => detectPlaybackInfoUpdates(a, b).length === 0
  };

  return Object.keys(newVideoInfo)
    .filter(key => !propertyEquals(videoInfo, newVideoInfo, key, comparers[key])) as Array<keyof VideoInfo>;
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

export function detectUserHostingOptionsUpdates(userHostingOptions: UserHostingOptions | undefined, newUserHostingOptions: UserHostingOptions): Array<keyof UserHostingOptions> {
  if (userHostingOptions === undefined) {
    return Object.keys(newUserHostingOptions) as Array<keyof UserHostingOptions>;
  }

  const comparers: ComparersDefinitions = {
    cohostsUUID: arrayEquals
  };

  return Object.keys(newUserHostingOptions)
    .filter(key => !propertyEquals(userHostingOptions, newUserHostingOptions, key, comparers[key])) as Array<keyof UserHostingOptions>;
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

export function detectUserFollowingOptionsUpdates(userFollowingOptions: UserFollowingOptions | undefined, newUserFollowingOptions: UserFollowingOptions): Array<keyof UserFollowingOptions> {
  if (userFollowingOptions === undefined) {
    return Object.keys(newUserFollowingOptions) as Array<keyof UserFollowingOptions>;
  }

  return Object.keys(newUserFollowingOptions)
    .filter(key => !propertyEquals(userFollowingOptions, newUserFollowingOptions, key)) as Array<keyof UserFollowingOptions>;
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
  connectionQuality: ConnectionQuality | null,
  videoInfo: VideoInfo | null,
  followingUUID: string | null,
  followerUUIDs: Array<string>
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

  if (object.connectionQuality === undefined) {
    return false;
  }

  if (object.connectionQuality !== null && !isEnumValue(ConnectionQuality, object.connectionQuality)) {
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

  if (!Array.isArray(object.followerUUIDs)) {
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
  connectionQuality: null,
  videoInfo: null,
  followingUUID: null,
  followerUUIDs: []
});

export function detectUserUpdate(user: User | undefined, newUser: User): Array<keyof User> {
  if (user === undefined) {
    return Object.keys(newUser) as Array<keyof User>;
  }

  const comparers: ComparersDefinitions = {
    hostingOptions: (a: UserHostingOptions, b: UserHostingOptions) => detectUserHostingOptionsUpdates(a, b).length === 0,
    followingOptions: (a: UserFollowingOptions, b: UserFollowingOptions) => detectUserFollowingOptionsUpdates(a, b).length === 0,
    videoInfo: (a: VideoInfo, b: VideoInfo) => detectVideoInfoUpdates(a, b).length === 0,
    followerUUIDs: arrayEquals
  };

  return Object.keys(newUser)
    .filter(key => !propertyEquals(user, newUser, key, comparers[key])) as Array<keyof User>;
}

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

export function wellDefined<T>(object: T | null | undefined, error: Error): T {
  if (!object) {
    throw error;
  }
  return object;
}

export enum MessageTypes {
  Error = "error",
  RequestPackagedServiceState = "request-packaged-service-state",
  PackagedServiceState = "packaged-service-state",
  VideoInfo = "video-info",
  SetActiveTab = "set-active-tab",
  Acknowledge = "acknowledge"
};

export interface GenericMessage {
  type: string
};

export function isGenericMessage(object: any | null | undefined): object is GenericMessage {
  if (typeof object !== "object") {
    return false;
  }

  if (object === null) {
    return false;
  }

  if (typeof object.type !== "string") {
    return false;
  }

  if (object.type.length === 0) {
    return false;
  }

  return true;
}

export interface ErrorMessage {
  type: MessageTypes.Error,
  message: string,
  sender: string
};

export function isErrorMessage(object: any | null | undefined): object is ErrorMessage {
  if (typeof object !== "object") {
    return false;
  }

  if (object === null) {
    return false;
  }

  if (object.type !== MessageTypes.Error) {
    return false;
  }

  if (typeof object.message !== "string") {
    return false;
  }

  if (typeof object.sender !== "string") {
    return false;
  }

  return true;
}

export interface RequestPackagedServiceStateMessage {
  type: MessageTypes.RequestPackagedServiceState
};

export interface PackagedServiceStateMessage {
  type: MessageTypes.PackagedServiceState,
  packagedServiceState: PackagedServiceState
};

export function isPackagedServiceStateMessage(object: any | null | undefined): object is PackagedServiceStateMessage {
  if (typeof object !== "object") {
    return false;
  }

  if (object === null) {
    return false;
  }

  if (object.type !== MessageTypes.PackagedServiceState) {
    return false;
  }

  if (!isPackagedServiceState(object.packagedServiceState)) {
    return false;
  }

  return true;
}

export interface VideoInfoMessage {
  type: MessageTypes.VideoInfo,
  videoInfo: VideoInfo
};

export function isVideoInfoMessage(object: any | null | undefined): object is VideoInfoMessage {
  if (typeof object !== "object") {
    return false;
  }

  if (object === null) {
    return false;
  }

  if (object.type !== MessageTypes.VideoInfo) {
    return false;
  }

  if (!isVideoInfo(object.videoInfo)) {
    return false;
  }

  return true;
}

export interface SetActiveTabMessage {
  type: MessageTypes.SetActiveTab,
  tabId: number | null
};

export function isSetActiveTabMessage(object: any | null | undefined): object is SetActiveTabMessage {
  if (typeof object !== "object") {
    return false;
  }

  if (object === null) {
    return false;
  }

  if (object.type !== MessageTypes.SetActiveTab) {
    return false;
  }

  if (typeof object.tabId === "number") {
    if (object.tabId <= 0) {
      return false;
    }
  } else if (object !== null) {
    return false;
  }

  return true;
}

export interface AcknowledgeMessage {
  type: MessageTypes.Acknowledge
};

export function isAcknowledgeMessage(object: any | null | undefined): object is AcknowledgeMessage {
  if (typeof object !== "object") {
    return false;
  }

  if (object === null) {
    return false;
  }

  if (object.type !== MessageTypes.Acknowledge) {
    return false;
  }

  return true;
}

export type Message = (
  GenericMessage |
  ErrorMessage |
  RequestPackagedServiceStateMessage |
  PackagedServiceStateMessage |
  VideoInfoMessage |
  SetActiveTabMessage |
  AcknowledgeMessage
);

export function wellDefinedMessage<T extends Message>(
  typeChecker: (object: any | null | undefined) => object is T,
  expectedMessageType: MessageTypes,
  object: GenericMessage | null | undefined,
  notAMessageError: Error | null = null
): T {
  notAMessageError = notAMessageError ?? new Error("Received a non-message type message.");
  if (typeof object !== "object") {
    throw notAMessageError;
  }

  if (object === null) {
    throw notAMessageError;
  }

  if (!("type" in object)) {
    throw notAMessageError;
  }

  if (typeof object.type !== "string") {
    throw notAMessageError;
  }

  if (object.type !== expectedMessageType) {
    throw new UnexpectedMessageTypeError(expectedMessageType, object.type);
  }

  if (!typeChecker(object)) {
    throw new UnexpectedMessageDataError(`The message has unexpected data layout for it's type (${expectedMessageType})`);
  }

  return object
}