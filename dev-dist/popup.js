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
function constructBadDOMError(message, element = undefined) {
    return element ?
        new Error(`Bad DOM Error (${element.tagName}#${element.id}): ${message}`) :
        new Error("Bad DOM Error: ${message}");
}
const notificationsToggle = (0, types_1.wellDefined)((0, types_1.asType)((element) => element instanceof HTMLButtonElement, document.getElementById("notifications-toggle")), constructBadDOMError("Bad notifications-toggle"));
const activeTabToggle = (0, types_1.wellDefined)((0, types_1.asType)((element) => element instanceof HTMLButtonElement, document.getElementById("active-tab-toggle")), constructBadDOMError("Bad active-tab-toggle"));
const connectAsForm = (0, types_1.wellDefined)((0, types_1.asType)((element) => element instanceof HTMLFormElement, document.getElementById("connect-as-form")), constructBadDOMError("Bad connect-as-form"));
const usernameInput = (0, types_1.wellDefined)((0, types_1.asType)((element) => element instanceof HTMLInputElement, document.getElementById("username-input")), constructBadDOMError("bad username-input"));
const serverAddressInput = (0, types_1.wellDefined)((0, types_1.asType)((element) => element instanceof HTMLInputElement, document.getElementById("server-address-input")), constructBadDOMError("Bad server-address-input"));
const connectButton = (0, types_1.wellDefined)((0, types_1.asType)((element) => element instanceof HTMLButtonElement, document.getElementById("connect-button")), constructBadDOMError("Bad connect-button"));
const disconnectForm = (0, types_1.wellDefined)((0, types_1.asType)((element) => element instanceof HTMLFormElement, document.getElementById("disconnect-form")), constructBadDOMError("Bad disconnect-form"));
const disconnectServerAddress = (0, types_1.wellDefined)((0, types_1.asType)((element) => element instanceof HTMLInputElement, document.getElementById("disconnect-server-address")), constructBadDOMError("Bad disconnect-server-address"));
const popupState = {
    usersDiv: (0, types_1.wellDefined)((0, types_1.asType)((element) => element instanceof HTMLDivElement, document.getElementById("users")), constructBadDOMError("The 'users' element must exist in the DOM.")),
    notificationsDiv: (0, types_1.wellDefined)((0, types_1.asType)((element) => element instanceof HTMLDivElement, document.getElementById("notifications")), constructBadDOMError("The 'notifications' element must exist in the DOM.")),
    packagedServiceState: {
        user: types_1.userDefaults,
        users: [],
        activeTabId: null,
        serverAddress: null,
        pendingServerRequests: [],
        availableTabIds: [],
        notifications: []
    },
    usersWithSelf: () => [popupState.packagedServiceState.user, ...popupState.packagedServiceState.users],
};
async function getActiveTab() {
    return (0, types_1.wellDefined)((await browser.tabs.query({
        currentWindow: true,
        active: true
    })).at(0), Error(`Bad implementation of ${getActiveTab.name}`));
}
function setHidden(element, hidden) {
    if (hidden) {
        element.hidden = true;
        if (!element.classList.contains("hidden")) {
            element.classList.add("hidden");
        }
    }
    else {
        element.hidden = false;
        if (element.classList.contains("hidden")) {
            element.classList.remove("hidden");
        }
    }
}
function secondsToHoursMinutesAndSeconds(totalSeconds) {
    return [
        Math.floor(totalSeconds / (60 * 60)),
        Math.floor(totalSeconds / 60) % 60,
        Math.floor(totalSeconds) % 60
    ];
}
function secondsToTimestamp(totalSeconds) {
    const [hours, minutes, seconds] = secondsToHoursMinutesAndSeconds(totalSeconds);
    return `${(hours !== 0 ? `${String(hours).padStart(2, "0")}:` : "")}${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
function userElementIdPrefix(uuid, text = undefined) {
    if (uuid === null) {
        throw new Error("User uuid cannot be null.");
    }
    if (text === undefined) {
        return `user-${uuid}`;
    }
    return `user-${uuid}-${text}`;
}
function getUserUUIDForDiv(div) {
    const uuid = div.getAttribute("user-uuid");
    if (uuid === null) {
        throw new Error("This div element is not associated with user uuid");
    }
    return uuid;
}
function getPlaybackStateIcon(state) {
    switch (state) {
        case types_1.PlaybackState.Playing:
            return "&#9654;";
        case types_1.PlaybackState.Paused:
            return "&#9208;";
        case types_1.PlaybackState.Waiting:
            return "&#11119;";
        default:
            throw Error(`Invalid state ${state}`);
    }
}
function constructVideoInfoInnerHTML(user) {
    if (user.videoInfo === null) {
        throw Error("This function requires video info to exist");
    }
    return (`<div class="image-container">
      <img id="${userElementIdPrefix(user.uuid, "channel-image")}" src="${user.videoInfo.channelImageUrl}">
    </div>
    <div class="video-title-and-channel">
      <div id="${userElementIdPrefix(user.uuid, "title")}" class="text-div video-title">${user.videoInfo.title}</div>
      <div id="${userElementIdPrefix(user.uuid, "channel")}" class="text-div channel">${user.videoInfo.channel}</div>
    </div>`);
}
function constructUserStatusInnerHTML(user) {
    if (user.followingUUID) {
        return `<div class="text-div">Following ${(0, types_1.wellDefined)((0, types_1.asType)(types_1.isUser, popupState.usersWithSelf().find(otherUser => otherUser.uuid === user.followingUUID)), Error("Cannot follow a non-existent user.")).username}</div>`;
    }
    let innerHTML = "";
    if (user.followerUUIDs.length > 0) {
        const followerUsernames = user.followerUUIDs.map(uuid => (0, types_1.wellDefined)(popupState.usersWithSelf().find(user => user.uuid === uuid), new Error("Bad state, every followerUUID must exist")).username);
        innerHTML = (`<details id="${userElementIdPrefix(user.uuid, "followed-by-details")}">
        <summary>Followed by &#708;</summary>
        <div class="text-div">${followerUsernames.join(", ")}</div>
      </details>`);
    }
    if (user.uuid !== popupState.packagedServiceState.user.uuid) {
        if (popupState.packagedServiceState.user.followingUUID === user.uuid) {
            innerHTML += (`<button id="${userElementIdPrefix(user.uuid, "toggle-follow-button")}" value="stop">Stop following</button>`);
        }
        else {
            innerHTML += (`<button id="${userElementIdPrefix(user.uuid, "toggle-follow-button")}" value="start">Follow</button>`);
        }
    }
    return innerHTML;
}
function constructUserWatchProgressContainerInnerHTML(user) {
    if (user.videoInfo === null) {
        throw Error("This function requires video info to exist");
    }
    return (`<div id="${userElementIdPrefix(user.uuid, "watch-progress")}" class="watch-progress-bar" style="width: ${user.videoInfo.playbackInfo.currentTime * 100 / user.videoInfo.duration}%;"></div>`);
}
function constructUserTimestampsInnerHTML(user) {
    if (user.videoInfo === null) {
        throw Error("This function requires video info to exist");
    }
    return (`<div id="${userElementIdPrefix(user.uuid, "timestamp")}" class="timestamps text-div">${getPlaybackStateIcon(user.videoInfo.playbackInfo.state)} ${secondsToTimestamp(user.videoInfo.playbackInfo.currentTime)}/${secondsToTimestamp(user.videoInfo.duration)} @ ${Math.round(user.videoInfo.playbackInfo.playbackRate * 1000) / 1000}x</div>`);
}
function constructPlaybackStatus(user) {
    return (`<div id="${userElementIdPrefix(user.uuid, "timestamps")}" class="timestamps">
      ${constructUserTimestampsInnerHTML(user)}
    </div>
    <div id="${userElementIdPrefix(user.uuid, "status")}" class="user-status">
      ${constructUserStatusInnerHTML(user)}
    </div>`);
}
function attachDataToUserContainer(div, user) {
    if (div.id !== userElementIdPrefix(user.uuid) || div.getAttribute("user-uuid") !== user.uuid) {
        throw new Error("Cannot attach data to user div, div does not exist in DOM.");
    }
    if (user.videoInfo === null) {
        div.innerHTML = String.raw `<div id="${userElementIdPrefix(user.uuid, "username")}" class="text-div username">${user.username}</div>
    <div id="${userElementIdPrefix(user.uuid, "no-current-video")}" class="text-div no-current-video">No current video</div>`;
        return div;
    }
    div.innerHTML = String.raw `<div id="${userElementIdPrefix(user.uuid, "username")}" class="text-div username">${user.username}</div>
  <div id="${userElementIdPrefix(user.uuid, "video-info")}" class="video-info">
    ${constructVideoInfoInnerHTML(user)}
  </div>
  <div id="${userElementIdPrefix(user.uuid, "playback-status")}" class="playback-status">
    ${constructPlaybackStatus(user)}
  </div>
  <div id="${userElementIdPrefix(user.uuid, "watch-progress-container")}" class="watch-progress-bar-container">
    ${constructUserWatchProgressContainerInnerHTML(user)}
  </div>`;
    return div;
}
function constructUserDataContainer(user) {
    if (user.uuid === null) {
        throw new Error("Cannot construct data container for user, no uuid.");
    }
    const div = document.createElement("div");
    div.id = userElementIdPrefix(user.uuid);
    div.classList.add("user");
    div.setAttribute("user-uuid", user.uuid);
    return attachDataToUserContainer(div, user);
}
function userFollowedByDetailsToggled(followedByDetails) {
    const summary = (0, types_1.wellDefined)(followedByDetails.children[0], constructBadDOMError("The first element of details must be summary", followedByDetails));
    summary.innerHTML = `Followed By ${(followedByDetails.open ? "&#709;" : "&#708;")}`;
}
function userToggleFollowButtonClicked(button, user) {
    if (user.uuid === null) {
        throw constructBadDOMError("Every user in DOM must have a uuid.");
    }
    if (button.value === "start") {
        const followMessage = {
            type: types_1.MessageTypes.Follow,
            followingUUID: user.uuid
        };
        browser.runtime.sendMessage(followMessage);
    }
    else if (button.value === "stop") {
        const stopFollowingMessage = {
            type: types_1.MessageTypes.StopFollowing,
            followingUUID: user.uuid
        };
        browser.runtime.sendMessage(stopFollowingMessage);
    }
    else {
        throw constructBadDOMError("The toggle follow button must have a value of either 'start' or 'stop'", button);
    }
}
function ensureEventsAreRegistered(div, user) {
    const followedByDetails = (0, types_1.asType)((element) => element instanceof HTMLDetailsElement, div.querySelector(`#${userElementIdPrefix(user.uuid, "followed-by-details")}`));
    if (followedByDetails && followedByDetails.getAttribute("event-registered") !== "true") {
        followedByDetails.setAttribute("event-registered", "true");
        followedByDetails.addEventListener("toggle", () => userFollowedByDetailsToggled(followedByDetails));
    }
    const toggleFollowButton = (0, types_1.asType)((element) => element instanceof HTMLButtonElement, div.querySelector(`#${userElementIdPrefix(user.uuid, "toggle-follow-button")}`));
    if (toggleFollowButton && toggleFollowButton.getAttribute("event-registered") !== "true") {
        toggleFollowButton.setAttribute("event-registered", "true");
        toggleFollowButton.addEventListener("click", () => userToggleFollowButtonClicked(toggleFollowButton, user));
    }
    return div;
}
function updateUserData(previousUserData, user) {
    if (user.uuid === null) {
        return;
    }
    if (previousUserData === undefined) {
        popupState.usersDiv.appendChild(ensureEventsAreRegistered(constructUserDataContainer(user), user));
        return;
    }
    if (previousUserData.uuid !== user.uuid) {
        throw new Error("updateUserData requires uuids to be the same.");
    }
    const div = (0, types_1.wellDefined)((0, types_1.asType)((element) => element instanceof HTMLDivElement, document.getElementById(userElementIdPrefix(user.uuid))), constructBadDOMError("If previousUserData was defined, then it was expected that, that previousUserData has updated the DOM to conatin the user's data div."));
    const updates = (0, types_1.detectUserUpdates)(previousUserData, user);
    if (updates.includes("username")) {
        (0, types_1.wellDefined)((0, types_1.asType)((element) => element instanceof HTMLDivElement, document.getElementById(userElementIdPrefix(user.uuid, "username"))), constructBadDOMError("Every user in DOM must have a username.")).innerText = user.username;
    }
    if (updates.includes("videoInfo")) {
        if ([previousUserData.videoInfo, user.videoInfo].includes(null)) {
            attachDataToUserContainer(div, user);
        }
        else {
            const videoInfoUpdates = (0, types_1.detectVideoInfoUpdates)(previousUserData.videoInfo, user.videoInfo);
            if (videoInfoUpdates.includes("videoId")) {
                (0, types_1.wellDefined)((0, types_1.asType)((element) => element instanceof HTMLDivElement, document.getElementById(userElementIdPrefix("video-info"))), constructBadDOMError("If neither video info is not null for previous and new data, then watch-progress-container is expected to exist.")).innerHTML = constructVideoInfoInnerHTML(user);
            }
            else if (videoInfoUpdates.includes("playbackInfo")) {
                (0, types_1.wellDefined)((0, types_1.asType)((element) => element instanceof HTMLDivElement, document.getElementById(userElementIdPrefix(user.uuid, "timestamps"))), constructBadDOMError("If neither video info is not null for previous and new data, then watch-progress-container is expected to exist.")).innerHTML = constructUserTimestampsInnerHTML(user);
                (0, types_1.wellDefined)((0, types_1.asType)((element) => element instanceof HTMLDivElement, document.getElementById(userElementIdPrefix(user.uuid, "watch-progress-container"))), constructBadDOMError("If neither video info is not null for previous and new data, then watch-progress-container is expected to exist.")).innerHTML = constructUserWatchProgressContainerInnerHTML(user);
            }
        }
    }
    if (updates.includes("followerUUIDs") || updates.includes("followingUUID")) {
        const status = (0, types_1.asType)((element) => element instanceof HTMLDivElement, document.getElementById(userElementIdPrefix(user.uuid, "status")));
        if (status) {
            status.innerHTML = constructUserStatusInnerHTML(user);
        }
    }
    ensureEventsAreRegistered(div, user);
}
function notificationElementIdPrefix(notification) {
    return `notification-${notification.epoch}-${notification.sender}`;
}
function constructNotificationDataElement(notification) {
    const prefix = notificationElementIdPrefix(notification);
    const notificationDiv = document.createElement("div");
    notificationDiv.classList.add("notification");
    notificationDiv.id = prefix;
    const controlButton = notification.dismissed ?
        `` :
        `<button id"${prefix}-dismiss" class="dismiss-notification-button">Dismiss</button>`;
    notificationDiv.innerHTML =
        `<div class="text-div notification-header" ${notification.dismissed ? 'style="text-decoration: line-through"' : ""}>
      ${new Date(notification.epoch).toISOString()}:&nbsp;<b>${notification.sender}</b>
    </div>
    <div class="text-div">
      <p>${notification.message}</p>
    </div>
    <div class="notifications-control">
      ${controlButton}
    </div>`;
    const dismissButton = notificationDiv.querySelector(`button`);
    if (dismissButton !== null) {
        dismissButton.addEventListener("click", () => {
            dismissButton.disabled = true;
            const notificationDismissedMessage = {
                type: types_1.MessageTypes.NotificationDismissed,
                notification
            };
            browser.runtime.sendMessage(notificationDismissedMessage);
        });
    }
    return notificationDiv;
}
function updateNotificationData(notification) {
    const prefix = notificationElementIdPrefix(notification);
    const constructed = constructNotificationDataElement(notification);
    let existing = (0, types_1.asType)((element) => element instanceof HTMLDivElement, document.getElementById(prefix));
    if (existing == undefined) {
        existing = constructed;
        popupState.notificationsDiv.appendChild(existing);
    }
    else {
        existing.innerHTML = constructed.innerHTML;
    }
}
function applyState(newState) {
    const withSelf = popupState.usersWithSelf();
    popupState.packagedServiceState = newState;
    if (newState.serverAddress !== null) {
        for (const newUserInfo of [newState.user, ...newState.users]) {
            updateUserData(withSelf.find(user => user.uuid === newUserInfo.uuid), newUserInfo);
        }
        ;
        if (popupState.usersDiv.children.length !== 0) {
            for (const userDivAnyElement of Array.from(popupState.usersDiv.children).slice(1)) {
                const userDiv = userDivAnyElement;
                const uuidOfDiv = getUserUUIDForDiv(userDiv);
                if (!newState.users.find(user => user.uuid === uuidOfDiv)) {
                    userDiv.remove();
                }
            }
        }
    }
    else {
        popupState.usersDiv.replaceChildren();
    }
    for (const newNotificationInfo of newState.notifications.toReversed()) {
        updateNotificationData(newNotificationInfo);
    }
    if (popupState.notificationsDiv.children.length !== 0) {
        for (const noitificationDivAsAnyElement of Array.from(popupState.notificationsDiv.children)) {
            const notificationDiv = noitificationDivAsAnyElement;
            if (!newState.notifications.find(notification => notificationElementIdPrefix(notification) === notificationDiv.id)) {
                notificationDiv.remove();
            }
        }
    }
    getActiveTab().then(tab => {
        activeTabToggle.disabled = true;
        activeTabToggle.value = "set";
        activeTabToggle.innerText = "Set as active tab";
        if (tab.url === undefined || tab.id === undefined) {
            return;
        }
        if (new URL(tab.url).origin !== "https://www.youtube.com") {
            return;
        }
        if (newState.activeTabId === tab.id) {
            activeTabToggle.disabled = false;
            activeTabToggle.value = "unset";
            activeTabToggle.innerText = "Unset as active tab";
        }
        else if (newState.availableTabIds.includes(tab.id)) {
            activeTabToggle.disabled = false;
        }
    });
    if (newState.serverAddress === null) {
        setHidden(connectAsForm, false);
        usernameInput.disabled = false;
        serverAddressInput.disabled = false;
        connectButton.disabled = false;
        setHidden(disconnectForm, true);
    }
    else {
        setHidden(connectAsForm, true);
        setHidden(disconnectForm, false);
        disconnectServerAddress.value = newState.serverAddress;
    }
}
function processRuntimeMessage(message, sender, sendResponse) {
    sendResponse;
    if (!(0, types_1.isGenericMessage)(message)) {
        throw new Error("Recieved unknown message");
    }
    switch (message.type) {
        case types_1.MessageTypes.Error: {
            throw new errors_1.ErrorMessageReceived((0, types_1.wellDefinedMessage)(types_1.isErrorMessage, types_1.MessageTypes.Error, message));
        }
        case types_1.MessageTypes.PackagedServiceState: {
            applyState((0, types_1.wellDefinedMessage)(types_1.isPackagedServiceStateMessage, types_1.MessageTypes.PackagedServiceState, message).packagedServiceState);
            break;
        }
        case types_1.MessageTypes.OpenNotifications: {
            (0, types_1.wellDefinedMessage)(types_1.isOpenNotificationsMessage, types_1.MessageTypes.OpenNotifications, message);
            if (popupState.notificationsDiv.hidden) {
                notificationsToggle.click();
            }
            break;
        }
        case types_1.MessageTypes.Notify: {
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
function notificationsToggleActivated() {
    if (popupState.notificationsDiv.hidden) {
        setHidden(popupState.usersDiv, true);
        setHidden(popupState.notificationsDiv, false);
        notificationsToggle.style.backgroundColor = "";
    }
    else {
        setHidden(popupState.notificationsDiv, true);
        setHidden(popupState.usersDiv, false);
        notificationsToggle.style.backgroundColor = "darkgray";
    }
}
async function activeTabToggleActivated() {
    if (activeTabToggle.value === "set") {
        const setActiveTabMessage = {
            type: types_1.MessageTypes.SetActiveTab,
            tabId: (0, types_1.wellDefined)((await getActiveTab()).id, Error("Expected tab to have an id"))
        };
        browser.runtime.sendMessage(setActiveTabMessage);
    }
    else if (activeTabToggle.value === "unset") {
        const setActiveTabMessage = {
            type: types_1.MessageTypes.SetActiveTab,
            tabId: null
        };
        browser.runtime.sendMessage(setActiveTabMessage);
    }
    else {
        throw constructBadDOMError("Active tab  toggle button must have a value of either 'set' or 'unset'", activeTabToggle);
    }
    activeTabToggle.disabled = true;
}
function connectAsFormSubmitted(evt) {
    evt.preventDefault();
    usernameInput.value = usernameInput.value.trim();
    if (usernameInput.value.length === 0) {
        usernameInput.placeholder = "\u26A0 Username must not empty.";
        return;
    }
    usernameInput.placeholder = "Username...";
    serverAddressInput.value = serverAddressInput.value.trim();
    if (serverAddressInput.value.length === 0) {
        serverAddressInput.placeholder = "\u26A0 Server address must not empty.";
        return;
    }
    serverAddressInput.placeholder = "Server address...";
    try {
        new URL(serverAddressInput.value);
    }
    catch (err) {
        if (typeof err === "object" && err !== null && "message" in err) {
            serverAddressInput.placeholder = `\u26A0 ${err.message}`;
        }
        else {
            serverAddressInput.placeholder = "\u26A0 Invalid URL";
        }
        return;
    }
    const connectToServerAsMessage = {
        type: types_1.MessageTypes.ConnectToServerAs,
        username: usernameInput.value,
        url: serverAddressInput.value
    };
    browser.runtime.sendMessage(connectToServerAsMessage);
    serverAddressInput.disabled = true;
    usernameInput.disabled = true;
    connectButton.disabled = true;
}
function disconnectFormSubmitted(evt) {
    evt.preventDefault();
    const disconnectFromServerMessage = {
        type: types_1.MessageTypes.DisconnectFromServer
    };
    browser.runtime.sendMessage(disconnectFromServerMessage);
}
async function main() {
    applyState((0, types_1.wellDefinedMessage)(types_1.isPackagedServiceStateMessage, types_1.MessageTypes.PackagedServiceState, await browser.runtime.sendMessage({ type: types_1.MessageTypes.RequestPackagedServiceState })).packagedServiceState);
    browser.runtime.onMessage.addListener(processRuntimeMessage);
    notificationsToggle.addEventListener("click", notificationsToggleActivated);
    activeTabToggle.addEventListener("click", activeTabToggleActivated);
    connectAsForm.addEventListener("submit", connectAsFormSubmitted);
    disconnectForm.addEventListener("submit", disconnectFormSubmitted);
    globalThis.popup = {
        popupState,
        userElementIdPrefix,
        attachDataToUserContainer,
        constructUserDataContainer
    };
}
const debugInterval = setInterval(() => {
    clearInterval(debugInterval);
    debugger;
    main();
}, 500);
// main();

})();

/******/ })()
;