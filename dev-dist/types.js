/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 725
(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UnexpectedMessageDataError = exports.UnexpectedMessageTypeError = exports.ErrorMessageReceived = void 0;
const types_1 = __webpack_require__(613);
class ErrorMessageReceived extends Error {
    constructor(errorMessage, options) {
        super(`Recieved error message from ${errorMessage.sender}: ${errorMessage.message}`, options);
    }
}
exports.ErrorMessageReceived = ErrorMessageReceived;
class UnexpectedMessageTypeError extends Error {
    constructor(expected, received, options) {
        if (received === types_1.MessageTypes.Error) {
            throw new Error(`Unprocessed error message expecting ${expected}.`);
        }
        super(`Expected '${expected}' message type but received '${received}'.`, options);
    }
}
exports.UnexpectedMessageTypeError = UnexpectedMessageTypeError;
class UnexpectedMessageDataError extends Error {
    constructor(message, options) {
        super(message, options);
    }
}
exports.UnexpectedMessageDataError = UnexpectedMessageDataError;


/***/ },

/***/ 613
(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MessageTypes = exports.userDefaults = exports.userFollowingOptionsDefaults = exports.userHostingOptionsDefaults = exports.ContinuationOption = exports.ConnectionQuality = exports.PlaybackState = void 0;
exports.isEnumValue = isEnumValue;
exports.arrayEquals = arrayEquals;
exports.propertyEquals = propertyEquals;
exports.isPlaybackInfo = isPlaybackInfo;
exports.detectPlaybackInfoUpdates = detectPlaybackInfoUpdates;
exports.isVideoInfo = isVideoInfo;
exports.detectVideoInfoUpdates = detectVideoInfoUpdates;
exports.isUserHostingOptions = isUserHostingOptions;
exports.detectUserHostingOptionsUpdates = detectUserHostingOptionsUpdates;
exports.isUserFollowingOptions = isUserFollowingOptions;
exports.detectUserFollowingOptionsUpdates = detectUserFollowingOptionsUpdates;
exports.isUser = isUser;
exports.detectUserUpdates = detectUserUpdates;
exports.isNotification = isNotification;
exports.isPackagedServiceState = isPackagedServiceState;
exports.asType = asType;
exports.propertyAsType = propertyAsType;
exports.wellDefined = wellDefined;
exports.isGenericMessage = isGenericMessage;
exports.isErrorMessage = isErrorMessage;
exports.isPackagedServiceStateMessage = isPackagedServiceStateMessage;
exports.isVideoInfoMessage = isVideoInfoMessage;
exports.isSetActiveTabMessage = isSetActiveTabMessage;
exports.isAcknowledgeMessage = isAcknowledgeMessage;
exports.isConnectToServerAsMessage = isConnectToServerAsMessage;
exports.isDisconnectFromServerMessage = isDisconnectFromServerMessage;
exports.isServerHandshakeRequestMessage = isServerHandshakeRequestMessage;
exports.isServerHandshakeMessage = isServerHandshakeMessage;
exports.isUserMessage = isUserMessage;
exports.isUserDisconnectMessage = isUserDisconnectMessage;
exports.isUsersMessage = isUsersMessage;
exports.isFollowMessage = isFollowMessage;
exports.isStopFollowingMessage = isStopFollowingMessage;
exports.isPendingMessage = isPendingMessage;
exports.isRequestVideoInfoMessage = isRequestVideoInfoMessage;
exports.isKeepAliveMessage = isKeepAliveMessage;
exports.isNotifyMessage = isNotifyMessage;
exports.isNotificationDismissedMessage = isNotificationDismissedMessage;
exports.isOpenNotificationsMessage = isOpenNotificationsMessage;
exports.wellDefinedMessage = wellDefinedMessage;
const errors_1 = __webpack_require__(725);
var PlaybackState;
(function (PlaybackState) {
    PlaybackState["Playing"] = "playing";
    PlaybackState["Paused"] = "paused";
    PlaybackState["Waiting"] = "waiting";
})(PlaybackState || (exports.PlaybackState = PlaybackState = {}));
;
var ConnectionQuality;
(function (ConnectionQuality) {
    ConnectionQuality["Degraded"] = "degraded";
    ConnectionQuality["Bad"] = "bad";
    ConnectionQuality["Good"] = "good";
})(ConnectionQuality || (exports.ConnectionQuality = ConnectionQuality = {}));
;
var ContinuationOption;
(function (ContinuationOption) {
    ContinuationOption["Nothing"] = "nothing";
    ContinuationOption["Pause"] = "pause";
    ContinuationOption["BreakFollow"] = "break";
})(ContinuationOption || (exports.ContinuationOption = ContinuationOption = {}));
;
function isEnumValue(enumType, value) {
    return Object.values(enumType).includes(value);
}
;
function arrayEquals(a, b, compare = undefined) {
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
    compare = compare ?? ((a, b) => a === b);
    for (let i = 0; i < a.length; i++) {
        if (!compare(a[i], b[i])) {
            return false;
        }
    }
    return true;
}
function propertyEquals(a, b, property, compare = undefined) {
    if (compare !== undefined) {
        return compare(a[property], b[property]);
    }
    return a[property] === b[property];
}
;
function isPlaybackInfo(object) {
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
function detectPlaybackInfoUpdates(playbackInfo, newPlaybackInfo) {
    if (playbackInfo === undefined) {
        return Object.keys(newPlaybackInfo);
    }
    return Object.keys(playbackInfo)
        .filter(key => !propertyEquals(playbackInfo, newPlaybackInfo, key));
}
;
function isVideoInfo(object) {
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
function detectVideoInfoUpdates(videoInfo, newVideoInfo) {
    if (videoInfo === undefined || videoInfo === null || newVideoInfo === null) {
        if (videoInfo === newVideoInfo) {
            return [];
        }
        return ["videoId", "title", "channel", "channelImageUrl", "duration", "playbackInfo"];
    }
    const comparers = {
        playbackInfo: (a, b) => detectPlaybackInfoUpdates(a, b).length === 0
    };
    return Object.keys(newVideoInfo)
        .filter(key => !propertyEquals(videoInfo, newVideoInfo, key, comparers[key]));
}
;
function isUserHostingOptions(object) {
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
function detectUserHostingOptionsUpdates(userHostingOptions, newUserHostingOptions) {
    if (userHostingOptions === undefined) {
        return Object.keys(newUserHostingOptions);
    }
    const comparers = {
        cohostsUUID: arrayEquals
    };
    return Object.keys(newUserHostingOptions)
        .filter(key => !propertyEquals(userHostingOptions, newUserHostingOptions, key, comparers[key]));
}
exports.userHostingOptionsDefaults = Object.freeze({
    cohostsUUID: [],
    waitForBufferingFollowers: true
});
;
function isUserFollowingOptions(object) {
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
function detectUserFollowingOptionsUpdates(userFollowingOptions, newUserFollowingOptions) {
    if (userFollowingOptions === undefined) {
        return Object.keys(newUserFollowingOptions);
    }
    return Object.keys(newUserFollowingOptions)
        .filter(key => !propertyEquals(userFollowingOptions, newUserFollowingOptions, key));
}
exports.userFollowingOptionsDefaults = Object.freeze({
    onDegradedConnectionContinuationOption: ContinuationOption.Nothing,
    onHostDegradedConnectionContinuationOption: ContinuationOption.Nothing
});
;
function isUser(object) {
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
    }
    else if (object.uuid !== null) {
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
    }
    else if (object.followingUUID !== null) {
        return false;
    }
    if (!Array.isArray(object.followerUUIDs)) {
        return false;
    }
    return true;
}
exports.userDefaults = Object.freeze({
    uuid: null,
    username: "",
    hostingOptions: exports.userHostingOptionsDefaults,
    followingOptions: exports.userFollowingOptionsDefaults,
    reconnectToServerOnLoss: true,
    connectionQuality: null,
    videoInfo: null,
    followingUUID: null,
    followerUUIDs: []
});
function detectUserUpdates(user, newUser) {
    if (user === undefined) {
        return Object.keys(newUser);
    }
    const comparers = {
        hostingOptions: (a, b) => detectUserHostingOptionsUpdates(a, b).length === 0,
        followingOptions: (a, b) => detectUserFollowingOptionsUpdates(a, b).length === 0,
        videoInfo: (a, b) => detectVideoInfoUpdates(a, b).length === 0,
        followerUUIDs: arrayEquals
    };
    return Object.keys(newUser)
        .filter(key => !propertyEquals(user, newUser, key, comparers[key]));
}
;
function isNotification(object) {
    if (typeof object !== "object") {
        return false;
    }
    if (object === null) {
        return false;
    }
    if (typeof object.epoch !== "number") {
        return false;
    }
    if (typeof object.sender !== "string") {
        return false;
    }
    if (typeof object.message !== "string") {
        return false;
    }
    if (typeof object.dismissed !== "boolean") {
        return false;
    }
    return true;
}
;
function isPackagedServiceState(object) {
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
    }
    else if (object.activeTabId !== null) {
        return false;
    }
    if (typeof object.serverAddress === "string") {
        if (object.serverAddress.length === 0) {
            return false;
        }
    }
    else if (object.serverAddress !== null) {
        return false;
    }
    if (!Array.isArray(object.pendingServerRequests)) {
        return false;
    }
    for (const pending of object.pendingServerRequests) {
        if (!isGenericMessage(pending)) {
            return false;
        }
    }
    if (!Array.isArray(object.availableTabIds)) {
        return false;
    }
    for (const id of object.availableTabIds) {
        if (typeof id !== "number") {
            return false;
        }
    }
    if (!Array.isArray(object.notifications)) {
        return false;
    }
    for (const notification of object.notifications) {
        if (!isNotification(notification)) {
            return false;
        }
    }
    return true;
}
function asType(typeChecker, object) {
    if (!typeChecker(object)) {
        return undefined;
    }
    return object;
}
function propertyAsType(typeChecker, object, property) {
    if (!typeChecker(object[property])) {
        return undefined;
    }
    return object[property];
}
function wellDefined(object, error) {
    if (!object) {
        throw error;
    }
    return object;
}
var MessageTypes;
(function (MessageTypes) {
    MessageTypes["Error"] = "error";
    MessageTypes["RequestPackagedServiceState"] = "request-packaged-service-state";
    MessageTypes["PackagedServiceState"] = "packaged-service-state";
    MessageTypes["VideoInfo"] = "video-info";
    MessageTypes["SetActiveTab"] = "set-active-tab";
    MessageTypes["Acknowledge"] = "acknowledge";
    MessageTypes["ConnectToServerAs"] = "connect-to-server-as";
    MessageTypes["DisconnectFromServer"] = "disconnect-from-server";
    MessageTypes["ServerHandshakeRequest"] = "server-handshake-request";
    MessageTypes["ServerHandshake"] = "server-handshake";
    MessageTypes["User"] = "user";
    MessageTypes["UserDisconnect"] = "user-disconnect";
    MessageTypes["Users"] = "users";
    MessageTypes["Follow"] = "follow";
    MessageTypes["StopFollowing"] = "stop-following";
    MessageTypes["Pending"] = "pending";
    MessageTypes["RequestVideoInfo"] = "request-video-info";
    MessageTypes["KeepAlive"] = "keep-alive";
    MessageTypes["Notify"] = "notify";
    MessageTypes["NotificationDismissed"] = "notification-dismissed";
    MessageTypes["OpenNotifications"] = "open-notifications";
})(MessageTypes || (exports.MessageTypes = MessageTypes = {}));
;
;
function isGenericMessage(object) {
    if (typeof object !== "object") {
        return false;
    }
    if (object === null) {
        return false;
    }
    if (!isEnumValue(MessageTypes, object.type)) {
        return false;
    }
    return true;
}
;
function isErrorMessage(object) {
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
;
;
function isPackagedServiceStateMessage(object) {
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
;
function isVideoInfoMessage(object) {
    if (typeof object !== "object") {
        return false;
    }
    if (object === null) {
        return false;
    }
    if (object.type !== MessageTypes.VideoInfo) {
        return false;
    }
    if (object.videoInfo !== null) {
        if (!isVideoInfo(object.videoInfo)) {
            return false;
        }
    }
    return true;
}
;
function isSetActiveTabMessage(object) {
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
    }
    else if (object.tabId !== null) {
        return false;
    }
    return true;
}
;
function isAcknowledgeMessage(object) {
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
;
function isConnectToServerAsMessage(object) {
    if (typeof object !== "object") {
        return false;
    }
    if (object === null) {
        return false;
    }
    if (object.type !== MessageTypes.ConnectToServerAs) {
        return false;
    }
    if (typeof object.username !== "string") {
        return false;
    }
    if (object.username.length === 0) {
        return false;
    }
    if (typeof object.url !== "string") {
        return false;
    }
    if (object.url.length === 0) {
        return false;
    }
    return true;
}
;
function isDisconnectFromServerMessage(object) {
    if (typeof object !== "object") {
        return false;
    }
    if (object === null) {
        return false;
    }
    if (object.type !== MessageTypes.DisconnectFromServer) {
        return false;
    }
    return true;
}
function isServerHandshakeRequestMessage(object) {
    if (typeof object !== "object") {
        return false;
    }
    if (object === null) {
        return false;
    }
    if (object.type !== MessageTypes.ServerHandshakeRequest) {
        return false;
    }
    if (!isUser(object.user)) {
        return false;
    }
    return true;
}
;
function isServerHandshakeMessage(object) {
    if (typeof object !== "object") {
        return false;
    }
    if (object === null) {
        return false;
    }
    if (object.type !== MessageTypes.ServerHandshake) {
        return false;
    }
    if (typeof object.uuid !== "string") {
        return false;
    }
    if (object.uuid.length === 0) {
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
    return true;
}
;
function isUserMessage(object) {
    if (typeof object !== "object") {
        return false;
    }
    if (object === null) {
        return false;
    }
    if (object.type !== MessageTypes.User) {
        return false;
    }
    if (!isUser(object.user)) {
        return false;
    }
    return true;
}
;
function isUserDisconnectMessage(object) {
    if (typeof object !== "object") {
        return false;
    }
    if (object === null) {
        return false;
    }
    if (object.type !== MessageTypes.UserDisconnect) {
        return false;
    }
    if (typeof object.uuid !== "string") {
        return false;
    }
    if (object.uuid.length === 0) {
        return false;
    }
    return true;
}
;
;
function isUsersMessage(object) {
    if (typeof object !== "object") {
        return false;
    }
    if (object === null) {
        return false;
    }
    if (object.type !== MessageTypes.Users) {
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
    return true;
}
;
function isFollowMessage(object) {
    if (typeof object !== "object") {
        return false;
    }
    if (object === null) {
        return false;
    }
    if (object.type !== MessageTypes.Follow) {
        return false;
    }
    if (typeof object.followingUUID !== "string") {
        return false;
    }
    if (object.followingUUID.length === 0) {
        return false;
    }
    return true;
}
;
function isStopFollowingMessage(object) {
    if (typeof object !== "object") {
        return false;
    }
    if (object === null) {
        return false;
    }
    if (object.type !== MessageTypes.StopFollowing) {
        return false;
    }
    if (typeof object.followingUUID !== "string") {
        return false;
    }
    if (object.followingUUID.length === 0) {
        return false;
    }
    return true;
}
;
function isPendingMessage(object) {
    if (typeof object !== "object") {
        return false;
    }
    if (object === null) {
        return false;
    }
    if (object.type !== MessageTypes.Pending) {
        return false;
    }
    return true;
}
;
function isRequestVideoInfoMessage(object) {
    if (typeof object !== "object") {
        return false;
    }
    if (object === null) {
        return false;
    }
    if (object.type !== MessageTypes.RequestVideoInfo) {
        return false;
    }
    return true;
}
;
function isKeepAliveMessage(object) {
    if (typeof object !== "object") {
        return false;
    }
    if (object === null) {
        return false;
    }
    if (object.type !== MessageTypes.KeepAlive) {
        return false;
    }
    return true;
}
;
function isNotifyMessage(object) {
    if (typeof object !== "object") {
        return false;
    }
    if (object === null) {
        return false;
    }
    if (object.type !== MessageTypes.Notify) {
        return false;
    }
    if (!isNotification(object.notification)) {
        return false;
    }
    return true;
}
;
function isNotificationDismissedMessage(object) {
    if (typeof object !== "object") {
        return false;
    }
    if (object === null) {
        return false;
    }
    if (object.type !== MessageTypes.NotificationDismissed) {
        return false;
    }
    if (!isNotification(object.notification)) {
        return false;
    }
    return true;
}
;
function isOpenNotificationsMessage(object) {
    if (typeof object !== "object") {
        return false;
    }
    if (object === null) {
        return false;
    }
    if (object.type !== MessageTypes.OpenNotifications) {
        return false;
    }
    return true;
}
function wellDefinedMessage(typeChecker, expectedMessageType, object, notAMessageError = null) {
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
        throw new errors_1.UnexpectedMessageTypeError(expectedMessageType, object.type);
    }
    if (!typeChecker(object)) {
        throw new errors_1.UnexpectedMessageDataError(`The message has unexpected data layout for it's type (${expectedMessageType})`);
    }
    return object;
}


/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(613);
/******/ 	
/******/ })()
;