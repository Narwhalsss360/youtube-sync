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

export interface PlaybackInfo {
  state: PlaybackState,
  currentTime: number,
  playbackRate: number
};

export interface VideoInfo {
  videoId: string,
  title: string,
  channel: string,
  channel_image_url: string,
  duration: number,
  playbackInfo: PlaybackInfo
};

export interface UserHostingOptions {
  cohostsUUID: Array<string>,
  waitForBufferingFollowers: boolean
};

export const userHostingOptionsDefaults: Readonly<UserHostingOptions> = Object.freeze({
  cohostsUUID: [],
  waitForBufferingFollowers: true
});

export interface UserFollowingOptions {
  onDegradedConnectionContinuationOption: ContinuationOption,
  onHostDegradedConnectionContinuationOption: ContinuationOption
};

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