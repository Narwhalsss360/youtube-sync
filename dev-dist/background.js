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
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it uses a non-standard name for the exports (exports).
(() => {
var exports = __webpack_exports__;
var __webpack_unused_export__;

__webpack_unused_export__ = ({ value: true });
const errors_1 = __webpack_require__(725);
var browser = chrome;
const types_1 = __webpack_require__(613);
const acknowledgeMessage = Object.freeze({
    type: types_1.MessageTypes.Acknowledge
});
const serviceState = {
    user: structuredClone(types_1.userDefaults),
    users: [],
    activeTabPort: null,
    serverConnection: null,
    reconnectToTab: null,
    pendingServerRequests: [],
    contentPorts: [],
    notifications: []
};
function packageServiceState() {
    return {
        user: serviceState.user,
        users: serviceState.users,
        activeTabId: serviceState.activeTabPort?.sender?.tab?.id ?? null,
        serverAddress: serviceState.serverConnection?.url ?? null,
        pendingServerRequests: serviceState.pendingServerRequests,
        availableTabIds: Array.from(serviceState.contentPorts).map(port => (0, types_1.wellDefined)(port.sender?.tab?.id, new Error("Every content port must have a tab id"))),
        notifications: serviceState.notifications
    };
}
function broadcastPackagedStateToRuntime(requireReceiver = false) {
    const packagedServiceStateMessage = {
        type: types_1.MessageTypes.PackagedServiceState,
        packagedServiceState: packageServiceState()
    };
    browser.runtime.sendMessage(packagedServiceStateMessage).catch((err) => {
        if (requireReceiver) {
            throw err;
        }
    });
    return packagedServiceStateMessage;
}
function processSelfUpdateFromServer(user, broadcast = false) {
    if (user.uuid !== serviceState.user.uuid) {
        throw new Error("This function is only valid for self");
    }
    if (serviceState.serverConnection?.readyState !== WebSocket.OPEN) {
        throw new Error("This function requires a connection to the server.");
    }
    const updates = (0, types_1.detectUserUpdates)(serviceState.user, user);
    const pendingFollowingChangesIndex = serviceState.pendingServerRequests.findIndex(pending => [types_1.MessageTypes.Follow, types_1.MessageTypes.StopFollowing].includes(pending.type));
    if (pendingFollowingChangesIndex !== -1) {
        serviceState.pendingServerRequests.splice(pendingFollowingChangesIndex, 1);
    }
    if (updates.find(update => [
        "uuid",
        "username",
        "hostingOptions",
        "followingOptions",
        "reconnectToServerOnLoss",
        "videoInfo"
    ].includes(update))) {
        console.error(`Received self user update from server which is not allowed. Updates from server: ${updates.join(", ")}`);
        const errorMessage = {
            type: types_1.MessageTypes.Error,
            message: "Received self user update from server which is not allowed.",
            sender: `${serviceState.user.uuid}: Background Service Worker`
        };
        serviceState.serverConnection.send(JSON.stringify(errorMessage));
    }
    serviceState.user.connectionQuality = user.connectionQuality;
    serviceState.user.followerUUIDs = user.followerUUIDs;
    serviceState.user.followingUUID = user.followingUUID;
    if (broadcast) {
        const packagedServiceStateMessage = broadcastPackagedStateToRuntime();
        serviceState.activeTabPort?.postMessage(packagedServiceStateMessage);
        serviceState.serverConnection.send(JSON.stringify(acknowledgeMessage));
    }
}
function insertNotification(notification) {
    serviceState.notifications.push(notification);
}
let openingPopup = false;
async function openNotifications(retry = true) {
    const openNotificationsMessage = {
        type: types_1.MessageTypes.OpenNotifications
    };
    try {
        await browser.runtime.sendMessage(openNotificationsMessage);
        return;
    }
    catch { }
    if (openingPopup) {
        return;
    }
    const windowId = (0, types_1.wellDefined)((await browser.windows.getCurrent()).id, new Error("Background Service State: Unexpected undefined current window."));
    const window = await chrome.windows.get(windowId);
    if (!window.focused) {
        return;
    }
    try {
        await browser.action.openPopup({
            windowId
        });
    }
    catch (err) {
        console.warn(`Assuming Popup is open: ${err}, will trying once more...`);
        setTimeout(async () => openNotifications(false), 250);
        return;
    }
    openingPopup = true;
    let i = 0;
    const id = setInterval(async () => {
        try {
            await browser.runtime.sendMessage(openNotificationsMessage);
            clearInterval(id);
            openingPopup = false;
        }
        catch (err) {
            i++;
            if (i == 200) {
                clearInterval(id);
                openingPopup = false;
                throw new Error("Timed out sending open notifications message.");
            }
        }
    }, 20);
}
function clearNotifications() {
    serviceState.notifications = [];
    const packagedServiceStateMessage = broadcastPackagedStateToRuntime();
    serviceState.activeTabPort?.postMessage(packagedServiceStateMessage);
}
function notifyServerOfVideoInfo() {
    if (serviceState.serverConnection?.readyState !== WebSocket.OPEN) {
        return;
    }
    const videoInfoMessage = {
        type: types_1.MessageTypes.VideoInfo,
        videoInfo: serviceState.user.videoInfo,
        uuid: serviceState.user.uuid
    };
    serviceState.serverConnection.send(JSON.stringify(videoInfoMessage));
}
function notifyServerOfSelf() {
    if (serviceState.serverConnection?.readyState !== WebSocket.OPEN) {
        return;
    }
    const userMessage = {
        type: types_1.MessageTypes.User,
        user: serviceState.user
    };
    serviceState.serverConnection.send(JSON.stringify(userMessage));
}
function cleanupServerConnection() {
    if (serviceState.serverConnection === null) {
        throw new Error("Can only cleanup server connection if serverConnection object exists");
    }
    if (serviceState.serverConnection.readyState === WebSocket.OPEN) {
        serviceState.serverConnection.close();
    }
    serviceState.user.uuid = null;
    serviceState.user.followingUUID = null;
    serviceState.user.followerUUIDs = [];
    serviceState.users = [];
    serviceState.serverConnection = null;
    serviceState.pendingServerRequests = [];
    broadcastPackagedStateToRuntime();
}
function processServerMessage(message) {
    if (serviceState.serverConnection === null) {
        throw new Error("Cannot process server message if serverConnection object does not exist.");
    }
    if (!(0, types_1.isGenericMessage)(message)) {
        throw new Error("Received unkown message from server");
    }
    if (serviceState.user.uuid === null) {
        if ((0, types_1.isErrorMessage)(message)) {
            throw new errors_1.ErrorMessageReceived(message);
        }
        const serverHandshakeMessage = (0, types_1.asType)(types_1.isServerHandshakeMessage, message);
        if (serverHandshakeMessage === undefined) {
            cleanupServerConnection();
            throw Error("Did not receive server handshake message first before other messages");
        }
        serviceState.user.uuid = serverHandshakeMessage.uuid;
        serviceState.users = serverHandshakeMessage.users;
        serviceState.serverConnection.send(JSON.stringify(acknowledgeMessage));
        ;
        const packagedServiceStateMessage = broadcastPackagedStateToRuntime();
        serviceState.activeTabPort?.postMessage(packagedServiceStateMessage);
        return;
    }
    switch (message.type) {
        case types_1.MessageTypes.Error: {
            if (serviceState.pendingServerRequests.length > 0) {
                console.error("The following pending request returned an error");
                console.error(serviceState.pendingServerRequests.pop());
            }
            throw new errors_1.ErrorMessageReceived((0, types_1.wellDefinedMessage)(types_1.isErrorMessage, types_1.MessageTypes.Error, message));
        }
        case types_1.MessageTypes.User: {
            const userMessage = (0, types_1.wellDefinedMessage)(types_1.isUserMessage, types_1.MessageTypes.User, message);
            if (serviceState.user.uuid === userMessage.user.uuid) {
                processSelfUpdateFromServer(userMessage.user, true);
            }
            else {
                const existingIndex = serviceState.users.findIndex(user => user.uuid === userMessage.user.uuid);
                if (existingIndex === -1) {
                    serviceState.users.push(userMessage.user);
                }
                else {
                    serviceState.users[existingIndex] = userMessage.user;
                }
            }
            const packagedServiceStateMessage = broadcastPackagedStateToRuntime();
            serviceState.activeTabPort?.postMessage(packagedServiceStateMessage);
            break;
        }
        case types_1.MessageTypes.VideoInfo: {
            const videoInfoMessage = (0, types_1.wellDefinedMessage)(types_1.isVideoInfoMessage, types_1.MessageTypes.VideoInfo, message);
            if (videoInfoMessage.uuid === null) {
                console.error("Received self video update from server which without uuid.");
                const errorMessage = {
                    type: types_1.MessageTypes.Error,
                    message: "Received self video update from server which without uuid.",
                    sender: `${serviceState.user.uuid}: Background Service Worker`
                };
                serviceState.serverConnection.send(JSON.stringify(errorMessage));
                break;
            }
            if (videoInfoMessage.uuid === serviceState.user.uuid) {
                console.error("Received self video update for self, from server.");
                const errorMessage = {
                    type: types_1.MessageTypes.Error,
                    message: "Received self video update for self, from server.",
                    sender: `${serviceState.user.uuid}: Background Service Worker`
                };
                serviceState.serverConnection.send(JSON.stringify(errorMessage));
                break;
            }
            const user = serviceState.users.find(user => user.uuid === videoInfoMessage.uuid);
            if (user === undefined) {
                console.error(`Background service worker-server user(${videoInfoMessage.uuid}) state mismatch.`);
                const errorMessage = {
                    type: types_1.MessageTypes.Error,
                    message: `Background service worker-server user(${videoInfoMessage.uuid}) state mismatch.`,
                    sender: `${serviceState.user.uuid}: Background Service Worker`
                };
                serviceState.serverConnection.send(JSON.stringify(errorMessage));
                break;
            }
            user.videoInfo = videoInfoMessage.videoInfo;
            const packagedServiceStateMessage = broadcastPackagedStateToRuntime();
            serviceState.activeTabPort?.postMessage(packagedServiceStateMessage);
            break;
        }
        case types_1.MessageTypes.UserDisconnect: {
            const userDisconnectMessage = (0, types_1.wellDefinedMessage)(types_1.isUserDisconnectMessage, types_1.MessageTypes.UserDisconnect, message);
            if (userDisconnectMessage.uuid === serviceState.user.uuid) {
                throw new Error("User disconnect message for self is undefined.");
            }
            serviceState.users = serviceState.users.filter(user => user.uuid !== userDisconnectMessage.uuid);
            const packagedServiceStateMessage = broadcastPackagedStateToRuntime();
            serviceState.activeTabPort?.postMessage(packagedServiceStateMessage);
            break;
        }
        case types_1.MessageTypes.Users: {
            const usersMessage = (0, types_1.wellDefinedMessage)(types_1.isUsersMessage, types_1.MessageTypes.Users, message);
            serviceState.users = [];
            for (const user of usersMessage.users) {
                if (user.uuid === serviceState.user.uuid) {
                    processSelfUpdateFromServer(user, false);
                }
                else {
                    serviceState.users.push(user);
                }
            }
            const packagedServiceStateMessage = broadcastPackagedStateToRuntime();
            serviceState.activeTabPort?.postMessage(packagedServiceStateMessage);
            serviceState.serverConnection.send(JSON.stringify(acknowledgeMessage));
            break;
        }
        case types_1.MessageTypes.RequestVideoInfo: {
            (0, types_1.wellDefinedMessage)(types_1.isRequestVideoInfoMessage, types_1.MessageTypes.RequestVideoInfo, message);
            if (serviceState.activeTabPort === null) {
                if (serviceState.user.videoInfo !== null) {
                    serviceState.user.videoInfo = null;
                }
                broadcastPackagedStateToRuntime();
                notifyServerOfVideoInfo();
                return;
            }
            serviceState.activeTabPort.postMessage(message);
            break;
        }
        case types_1.MessageTypes.KeepAlive: {
            (0, types_1.wellDefinedMessage)(types_1.isKeepAliveMessage, types_1.MessageTypes.KeepAlive, message);
            break;
        }
        case types_1.MessageTypes.Notify: {
            const notifyMessage = (0, types_1.wellDefinedMessage)(types_1.isNotifyMessage, types_1.MessageTypes.Notify, message);
            insertNotification(notifyMessage.notification);
            openNotifications();
            const packagedServiceStateMessage = broadcastPackagedStateToRuntime();
            serviceState.activeTabPort?.postMessage(packagedServiceStateMessage);
            break;
        }
        case types_1.MessageTypes.NotificationDismissed: {
            console.error(`Server may not send a ${types_1.MessageTypes.NotificationDismissed} message.`);
            const errorMessage = {
                type: types_1.MessageTypes.Error,
                message: `Server may not send a ${types_1.MessageTypes.NotificationDismissed} message.`,
                sender: `${serviceState.user.uuid}: Background Service Worker`
            };
            serviceState.serverConnection.send(JSON.stringify(errorMessage));
            break;
        }
        default: {
            console.group("Dropped message:");
            console.warn("Sender:");
            console.warn(`Server at ${serviceState.serverConnection.url}`);
            console.warn("Message:");
            console.warn(message);
            console.warn(JSON.stringify(message));
            console.groupEnd();
            break;
        }
    }
}
function processActiveTabMessage(message, port) {
    if (!(0, types_1.isGenericMessage)(message)) {
        throw new Error("Recieved unknown message from active tab");
    }
    switch (message.type) {
        case types_1.MessageTypes.Error: {
            throw new errors_1.ErrorMessageReceived((0, types_1.wellDefinedMessage)(types_1.isErrorMessage, types_1.MessageTypes.Error, message));
        }
        case types_1.MessageTypes.VideoInfo: {
            const videoInfoMessage = (0, types_1.wellDefinedMessage)(types_1.isVideoInfoMessage, types_1.MessageTypes.VideoInfo, message);
            serviceState.user.videoInfo = videoInfoMessage.videoInfo;
            notifyServerOfVideoInfo();
            const packagedServiceStateMessage = broadcastPackagedStateToRuntime();
            serviceState.activeTabPort?.postMessage(packagedServiceStateMessage);
            break;
        }
        case types_1.MessageTypes.Notify: {
            const notifyMessage = (0, types_1.wellDefinedMessage)(types_1.isNotifyMessage, types_1.MessageTypes.Notify, message);
            insertNotification(notifyMessage.notification);
            openNotifications();
            const packagedServiceStateMessage = broadcastPackagedStateToRuntime();
            serviceState.activeTabPort?.postMessage(packagedServiceStateMessage);
            break;
        }
        case types_1.MessageTypes.NotificationDismissed: {
            const notificationDismissedMessage = (0, types_1.wellDefinedMessage)(types_1.isNotificationDismissedMessage, types_1.MessageTypes.NotificationDismissed, message);
            const notification = serviceState.notifications.find(notification => notification.epoch == notificationDismissedMessage.notification.epoch && notification.sender == notificationDismissedMessage.notification.sender);
            if (notification === undefined) {
                console.error("Unknown notification dismissed.");
                const errorMessage = {
                    type: types_1.MessageTypes.Error,
                    message: "Unknown notification dismissed.",
                    sender: `${serviceState.user.uuid}: Background Service Worker`
                };
                serviceState.activeTabPort?.postMessage(errorMessage);
                break;
            }
            if (notification.dismissed) {
                console.error("Notification already dismissed.");
                const errorMessage = {
                    type: types_1.MessageTypes.Error,
                    message: "Notification already dismissed.",
                    sender: `${serviceState.user.uuid}: Background Service Worker`
                };
                serviceState.activeTabPort?.postMessage(errorMessage);
                break;
            }
            notification.dismissed = true;
            const packagedServiceStateMessage = broadcastPackagedStateToRuntime();
            serviceState.activeTabPort?.postMessage(packagedServiceStateMessage);
            break;
        }
        default: {
            console.group("Dropped message:");
            console.warn("Sender:");
            console.warn(port);
            console.warn("Message:");
            console.warn(message);
            console.warn(JSON.stringify(message));
            console.groupEnd();
            return;
        }
    }
}
function processRuntimeMessage(message, sender, sendResponse) {
    if (!(0, types_1.isGenericMessage)(message)) {
        throw new Error("Recieved unknown runtime message");
    }
    switch (message.type) {
        case types_1.MessageTypes.Error: {
            throw new errors_1.ErrorMessageReceived((0, types_1.wellDefinedMessage)(types_1.isErrorMessage, types_1.MessageTypes.Error, message));
        }
        case types_1.MessageTypes.RequestPackagedServiceState: {
            const packagedServiceStateMessage = {
                type: types_1.MessageTypes.PackagedServiceState,
                packagedServiceState: packageServiceState()
            };
            sendResponse(packagedServiceStateMessage);
            return;
        }
        case types_1.MessageTypes.SetActiveTab: {
            const setActiveTabMessage = (0, types_1.wellDefinedMessage)(types_1.isSetActiveTabMessage, types_1.MessageTypes.SetActiveTab, message);
            if (serviceState.activeTabPort?.sender?.tab?.id === setActiveTabMessage.tabId) {
                break;
            }
            if (setActiveTabMessage.tabId === null) {
                if (serviceState.activeTabPort !== null) {
                    serviceState.activeTabPort.onMessage.removeListener(processActiveTabMessage);
                    serviceState.activeTabPort.postMessage(setActiveTabMessage);
                    serviceState.activeTabPort = null;
                    serviceState.user.videoInfo = null;
                    console.log("Active tab unset");
                    broadcastPackagedStateToRuntime();
                    notifyServerOfVideoInfo();
                }
                break;
            }
            if (setActiveTabMessage.tabId === browser.tabs.TAB_ID_NONE) {
                const errorMessage = {
                    type: types_1.MessageTypes.Error,
                    message: "This tab does not host content.",
                    sender: "Background Service Worker"
                };
                sendResponse(errorMessage);
                return;
            }
            const port = serviceState.contentPorts.find(port => port.sender?.tab?.id === setActiveTabMessage.tabId);
            if (port === undefined) {
                const errorMessage = {
                    type: types_1.MessageTypes.Error,
                    message: `Tab ${setActiveTabMessage.tabId} is not available.`,
                    sender: "Background Service Worker"
                };
                sendResponse(errorMessage);
                return;
            }
            port.onMessage.addListener(processActiveTabMessage);
            serviceState.activeTabPort = port;
            console.log(`Active tab set: ${(0, types_1.wellDefined)(port.sender?.tab?.id, new Error("Every content port must have a tab id."))}`);
            port.postMessage(setActiveTabMessage);
            broadcastPackagedStateToRuntime();
            notifyServerOfVideoInfo();
            break;
        }
        case types_1.MessageTypes.ConnectToServerAs: {
            if (serviceState.serverConnection !== null) {
                const alreadyConnectedError = {
                    type: types_1.MessageTypes.Error,
                    message: "Cannot connect to two server at the same time. Disconnect from current server to switch.",
                    sender: "Background Service Worker"
                };
                sendResponse(alreadyConnectedError);
            }
            const connectToServerAsMessage = (0, types_1.wellDefinedMessage)(types_1.isConnectToServerAsMessage, types_1.MessageTypes.ConnectToServerAs, message);
            let url;
            try {
                url = new URL(connectToServerAsMessage.url);
            }
            catch (err) {
                const invalidURLErrorMessage = {
                    type: types_1.MessageTypes.Error,
                    message: `The supplied URL was invalid: ${err}`,
                    sender: "Background Service Worker"
                };
                sendResponse(invalidURLErrorMessage);
                return;
            }
            let serverConnection;
            try {
                serverConnection = new WebSocket(url);
            }
            catch (err) {
                const openErrorMessage = {
                    type: types_1.MessageTypes.Error,
                    message: `There was an error opening the websocket: ${err}`,
                    sender: "Background Service Worker"
                };
                sendResponse(openErrorMessage);
                return;
            }
            serviceState.user.username = connectToServerAsMessage.username;
            serviceState.serverConnection = serverConnection;
            serverConnection.addEventListener("open", (evt) => {
                if (evt.currentTarget !== serviceState.serverConnection) {
                    throw new Error("Event registered for a websocket whose reference is old");
                }
                const serverHandshakeRequestMessage = {
                    type: types_1.MessageTypes.ServerHandshakeRequest,
                    user: serviceState.user
                };
                serverConnection.send(JSON.stringify(serverHandshakeRequestMessage));
            });
            serverConnection.addEventListener("error", (evt) => {
                if (evt.currentTarget !== serviceState.serverConnection) {
                    throw new Error("Event registered for a websocket whose reference is old");
                }
                console.error(evt);
                cleanupServerConnection();
            });
            serverConnection.addEventListener("message", (evt) => {
                if (evt.currentTarget !== serviceState.serverConnection) {
                    throw new Error("Event registered for a websocket whose reference is old");
                }
                processServerMessage(JSON.parse(evt.data));
            });
            serverConnection.addEventListener("close", (evt) => {
                if (evt.currentTarget !== serviceState.serverConnection) {
                    throw new Error("Event registered for a websocket whose reference is old");
                }
                cleanupServerConnection();
            });
            break;
        }
        case types_1.MessageTypes.DisconnectFromServer: {
            (0, types_1.wellDefinedMessage)(types_1.isDisconnectFromServerMessage, types_1.MessageTypes.DisconnectFromServer, message);
            if (serviceState.serverConnection === null) {
                const errorMessage = {
                    type: types_1.MessageTypes.Error,
                    message: "Not connected to a server",
                    sender: "Background Service Worker"
                };
                sendResponse(errorMessage);
                return;
            }
            serviceState.serverConnection.close();
            break;
        }
        case types_1.MessageTypes.Follow: {
            const followMessage = (0, types_1.wellDefinedMessage)(types_1.isFollowMessage, types_1.MessageTypes.Follow, message);
            if (serviceState.serverConnection?.readyState !== WebSocket.OPEN) {
                const errorMessage = {
                    type: types_1.MessageTypes.Error,
                    message: "A connection to the server is required for this request",
                    sender: "Background Service Worker"
                };
                sendResponse(errorMessage);
                return;
            }
            if (serviceState.user.followingUUID !== null) {
                const errorMessage = {
                    type: types_1.MessageTypes.Error,
                    message: "Already following, to switch stop following first",
                    sender: "Background Service Worker"
                };
                sendResponse(errorMessage);
                return;
            }
            if (serviceState.user.followingUUID === serviceState.user.uuid) {
                const errorMessage = {
                    type: types_1.MessageTypes.Error,
                    message: "Cannot follow self.",
                    sender: "Background Service Worker"
                };
                sendResponse(errorMessage);
                return;
            }
            if (serviceState.pendingServerRequests.find(pending => [types_1.MessageTypes.Follow, types_1.MessageTypes.StopFollowing].includes(pending.type))) {
                const errorMessage = {
                    type: types_1.MessageTypes.Error,
                    message: "Request to follow/stop following already pending.",
                    sender: "Background Service Worker"
                };
                sendResponse(errorMessage);
                return;
            }
            const packagedServiceStateMessage = broadcastPackagedStateToRuntime();
            serviceState.activeTabPort?.postMessage(packagedServiceStateMessage);
            serviceState.serverConnection.send(JSON.stringify(followMessage));
            serviceState.pendingServerRequests.push(followMessage);
            const pendingMessage = {
                type: types_1.MessageTypes.Pending
            };
            sendResponse(pendingMessage);
            break;
        }
        case types_1.MessageTypes.StopFollowing: {
            const stopFollowingMessage = (0, types_1.wellDefinedMessage)(types_1.isStopFollowingMessage, types_1.MessageTypes.StopFollowing, message);
            if (serviceState.serverConnection?.readyState !== WebSocket.OPEN) {
                const errorMessage = {
                    type: types_1.MessageTypes.Error,
                    message: "A connection to the server is required for this request",
                    sender: "Background Service Worker"
                };
                sendResponse(errorMessage);
                return;
            }
            if (serviceState.user.followingUUID === null) {
                const errorMessage = {
                    type: types_1.MessageTypes.Error,
                    message: "Already not following",
                    sender: "Background Service Worker"
                };
                sendResponse(errorMessage);
                return;
            }
            if (serviceState.pendingServerRequests.find(pending => [types_1.MessageTypes.Follow, types_1.MessageTypes.StopFollowing].includes(pending.type))) {
                const errorMessage = {
                    type: types_1.MessageTypes.Error,
                    message: "Request to follow/stop following already pending.",
                    sender: "Background Service Worker"
                };
                sendResponse(errorMessage);
                return;
            }
            const packagedServiceStateMessage = broadcastPackagedStateToRuntime();
            serviceState.activeTabPort?.postMessage(packagedServiceStateMessage);
            serviceState.serverConnection.send(JSON.stringify(stopFollowingMessage));
            serviceState.pendingServerRequests.push(stopFollowingMessage);
            const pendingMessage = {
                type: types_1.MessageTypes.Pending
            };
            sendResponse(pendingMessage);
            break;
        }
        case types_1.MessageTypes.Notify: {
            const notifyMessage = (0, types_1.wellDefinedMessage)(types_1.isNotifyMessage, types_1.MessageTypes.Notify, message);
            insertNotification(notifyMessage.notification);
            openNotifications();
            const packagedServiceStateMessage = broadcastPackagedStateToRuntime();
            serviceState.activeTabPort?.postMessage(packagedServiceStateMessage);
            break;
        }
        case types_1.MessageTypes.NotificationDismissed: {
            const notificationDismissedMessage = (0, types_1.wellDefinedMessage)(types_1.isNotificationDismissedMessage, types_1.MessageTypes.NotificationDismissed, message);
            const notification = serviceState.notifications.find(notification => notification.epoch == notificationDismissedMessage.notification.epoch && notification.sender == notificationDismissedMessage.notification.sender);
            if (notification === undefined) {
                console.error("Unknown notification dismissed.");
                const errorMessage = {
                    type: types_1.MessageTypes.Error,
                    message: "Unknown notification dismissed.",
                    sender: `${serviceState.user.uuid}: Background Service Worker`
                };
                sendResponse(errorMessage);
                break;
            }
            if (notification.dismissed) {
                console.error("Notification already dismissed.");
                const errorMessage = {
                    type: types_1.MessageTypes.Error,
                    message: "Notification already dismissed.",
                    sender: `${serviceState.user.uuid}: Background Service Worker`
                };
                sendResponse(errorMessage);
                break;
            }
            notification.dismissed = true;
            const packagedServiceStateMessage = broadcastPackagedStateToRuntime();
            serviceState.activeTabPort?.postMessage(packagedServiceStateMessage);
            break;
        }
        default: {
            console.group("Dropped message:");
            console.warn("Sender:");
            console.warn(sender);
            console.warn("Message:");
            console.warn(message);
            console.warn(JSON.stringify(message));
            console.groupEnd();
            return;
        }
    }
}
function portConnect(port) {
    if (port.name !== "content-tab") {
        throw new Error(`Port with unknown name (${port.name}) connect request.`);
    }
    if (port.sender?.tab?.id === undefined) {
        throw new Error(`Non-tab port connect request.`);
    }
    const tabId = port.sender.tab.id;
    if (tabId === serviceState.reconnectToTab) {
        serviceState.reconnectToTab = null;
        port.onMessage.addListener(processActiveTabMessage);
        serviceState.activeTabPort = port;
        const setActiveTabMessage = {
            type: types_1.MessageTypes.SetActiveTab,
            tabId: tabId
        };
        port.postMessage(setActiveTabMessage);
        console.log(`Reconnecting to: ${tabId}...`);
        broadcastPackagedStateToRuntime();
        notifyServerOfVideoInfo();
    }
    port.onDisconnect.addListener(disconnected => {
        serviceState.contentPorts = serviceState.contentPorts.filter(p => p !== disconnected);
        broadcastPackagedStateToRuntime();
        if (serviceState.activeTabPort !== disconnected) {
            return;
        }
        serviceState.activeTabPort.onMessage.removeListener(processActiveTabMessage);
        serviceState.activeTabPort = null;
        serviceState.user.videoInfo = null;
        broadcastPackagedStateToRuntime();
        notifyServerOfVideoInfo();
        browser.tabs.get(tabId).then(tab => {
            if (tab.status !== "loading") {
                return;
            }
            if (tab.url === undefined) {
                return;
            }
            if (new URL(tab.url).origin !== "https://www.youtube.com") {
                console.log("Active tab closed.");
                return;
            }
            const TIMEOUT_INTERVAL = 120000;
            console.log(`Will reconnect to ${tabId}...`);
            serviceState.reconnectToTab = tabId;
            setTimeout(() => {
                if (serviceState.reconnectToTab === null) {
                    return;
                }
                serviceState.reconnectToTab = null;
                console.log(`Failed to reconnect to tab ${serviceState.reconnectToTab}`);
            }, TIMEOUT_INTERVAL);
        });
    });
    serviceState.contentPorts.push(port);
    broadcastPackagedStateToRuntime();
}
async function setCurrentTabAsActiveTab() {
    const candidates = await browser.tabs.query({
        active: true,
    });
    for (const candidate of candidates) {
        if (!candidate.id || !candidate.url) {
            continue;
        }
        if (new URL(candidate.url).origin !== "https://www.youtube.com") {
            continue;
        }
        if (candidate.status !== "complete") {
            console.warn(`The tab ${candidate.title} is not completely loaded`);
            continue;
        }
        const setActiveTabMessage = {
            type: types_1.MessageTypes.SetActiveTab,
            tabId: candidate.id
        };
        processRuntimeMessage(setActiveTabMessage, {}, () => { });
        return;
    }
    throw Error("There were no candidate tabs to be set as active tabs.");
}
function main() {
    browser.runtime.onMessage.addListener(processRuntimeMessage);
    browser.runtime.onConnect.addListener(portConnect);
    globalThis.backgroundService = Object.freeze({
        serviceState,
        processRuntimeMessage,
        setCurrentTabAsActiveTab,
        getAllTabs: () => browser.tabs.query({}),
        broadcastPackagedStateToRuntime,
        openNotifications,
        clearNotifications
    });
}
main();

})();

/******/ })()
;