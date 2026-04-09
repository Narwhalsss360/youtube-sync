import { ErrorMessageReceived } from "./errors";
import browser = chrome;
import {
  asType,
  ConnectToServerAsMessage,
  detectUserUpdates,
  detectVideoInfoUpdates,
  DisconnectFromServerMessage,
  FollowMessage,
  isErrorMessage,
  isGenericMessage,
  isPackagedServiceStateMessage,
  isUser,
  Message,
  MessageTypes,
  PackagedServiceState,
  PlaybackState,
  SetActiveTabMessage,
  StopFollowingMessage,
  User,
  userDefaults,
  wellDefined,
  wellDefinedMessage,
  Notification,
  NotificationDismissedMessage,
  isOpenNotificationsMessage,
  UserMessage,
  ServiceSettingsUpdatesMessage,
  ServiceSettingsUpdates,
  isEnumValue,
  ContinuationOption
} from "./types";
import "./accordions";
import { accordionHeaderAndContent, requireContainerKind, findParent, isAccordionContainer, isExpanded, accordionExpand } from "./accordions";

function constructBadDOMError(message: string, element: HTMLElement | null | undefined = undefined): Error {
  return element ?
    new Error(`Bad DOM Error (${element.tagName}#${element.id}): ${message}`) :
    new Error(`Bad DOM Error: ${message}`);
}

const activeTabToggle: HTMLButtonElement = wellDefined(
    asType<HTMLButtonElement>(
    (element: HTMLElement) => element instanceof HTMLButtonElement,
    document.getElementById("active-tab-toggle")
  ),
  constructBadDOMError("Bad active-tab-toggle")
);

const connectAsForm: HTMLFormElement = wellDefined(
  asType<HTMLFormElement>(
    (element: HTMLElement) => element instanceof HTMLFormElement,
    document.getElementById("connect-as-form")
  ),
  constructBadDOMError("Bad connect-as-form")
);

const usernameInput: HTMLInputElement = wellDefined(
  asType<HTMLInputElement>(
    (element: HTMLElement) => element instanceof HTMLInputElement,
    document.getElementById("username-input")
  ),
  constructBadDOMError("bad username-input")
);

const serverAddressInput: HTMLInputElement = wellDefined(
  asType<HTMLInputElement>(
    (element: HTMLElement) => element instanceof HTMLInputElement,
    document.getElementById("server-address-input")
  ),
  constructBadDOMError("Bad server-address-input")
)

const connectButton: HTMLButtonElement = wellDefined(
    asType<HTMLButtonElement>(
    (element: HTMLElement) => element instanceof HTMLButtonElement,
    document.getElementById("connect-button")
  ),
  constructBadDOMError("Bad connect-button")
);

const disconnectForm: HTMLFormElement = wellDefined(
  asType<HTMLFormElement>(
    (element: HTMLElement) => element instanceof HTMLFormElement,
    document.getElementById("disconnect-form")
  ),
  constructBadDOMError("Bad disconnect-form")
);

const disconnectServerAddress: HTMLInputElement = wellDefined(
  asType<HTMLInputElement>(
    (element: HTMLElement) => element instanceof HTMLInputElement,
    document.getElementById("disconnect-server-address")
  ),
  constructBadDOMError("Bad disconnect-server-address")
);

const connectionAccordionHeaderText: HTMLDivElement = wellDefined(
  asType<HTMLDivElement>(
    (element: HTMLElement) => element instanceof HTMLDivElement,
    document.getElementById("connection-accordion-header-text")
  ),
  constructBadDOMError("Bad connection accordion header text")
);

const connectionAccordionContainer: HTMLDivElement = wellDefined(
  asType<HTMLDivElement>(
    (element: HTMLElement) => element instanceof HTMLDivElement,
    document.getElementById("connection-accordion-container")
  ),
  constructBadDOMError("Bad connection accordion container")
);

const settingsAccordionHeaderText: HTMLDivElement = wellDefined(
  asType<HTMLDivElement>(
    (element: HTMLElement) => element instanceof HTMLDivElement,
    document.getElementById("settings-accordion-header-text")
  ),
  constructBadDOMError("Bad settings accordion header text")
);

const usersAccordionHeaderText: HTMLDivElement = wellDefined(
  asType<HTMLDivElement>(
    (element: HTMLElement) => element instanceof HTMLDivElement,
    document.getElementById("users-accordion-header-text")
  ),
  constructBadDOMError("Bad users accordion header text")
);

const usersAccordionContainer: HTMLDivElement = wellDefined(
  asType<HTMLDivElement>(
    (element: HTMLElement) => element instanceof HTMLDivElement,
    document.getElementById("users-accordion-container")
  ),
  constructBadDOMError("Bad users accordion containerxt")
);

const notificationsAccordionHeaderText: HTMLDivElement = wellDefined(
  asType<HTMLDivElement>(
    (element: HTMLElement) => element instanceof HTMLDivElement,
    document.getElementById("notifications-accordion-header-text")
  ),
  constructBadDOMError("Bad notifications accordion header text")
);

const notificationsAccordionContainer: HTMLDivElement = wellDefined(
  asType<HTMLDivElement>(
    (element: HTMLElement) => element instanceof HTMLDivElement,
    document.getElementById("notifications-accordion-container")
  ),
  constructBadDOMError("Bad notifications accordion containerxt")
);

const popupNotificationsCheckbox: HTMLInputElement = wellDefined(
  asType<HTMLInputElement>(
    (element: HTMLElement) => element instanceof HTMLInputElement,
    document.getElementById("popup-notifications-checkbox"),
  ),
  constructBadDOMError("Bad popup notifications checkbox")
);

const waitForBufferingFollowersCheckbox: HTMLInputElement = wellDefined(
  asType<HTMLInputElement>(
    (element: HTMLElement) => element instanceof HTMLInputElement,
    document.getElementById("wait-for-buffering-followers-checkbox"),
  ),
  constructBadDOMError("Bad wait for buffering followers checkbox")
);

const shareQueueCheckbox: HTMLInputElement = wellDefined(
  asType<HTMLInputElement>(
    (element: HTMLElement) => element instanceof HTMLInputElement,
    document.getElementById("share-queue-checkbox"),
  ),
  constructBadDOMError("Bad share queue checkbox")
);

const waitOnDeviationInput: HTMLInputElement = wellDefined(
  asType<HTMLInputElement>(
    (element: HTMLElement) => element instanceof HTMLInputElement,
    document.getElementById("wait-on-deviation-input"),
  ),
  constructBadDOMError("Bad wait on deviation input")
);

const onDegradedConnectionContinuationOptionSelect: HTMLSelectElement = wellDefined(
  asType<HTMLSelectElement>(
    (element: HTMLElement) => element instanceof HTMLSelectElement,
    document.getElementById("on-degraded-connection-continuation-option-select"),
  ),
  constructBadDOMError("Bad on degraded connection continuation option select")
);

const onHostDegradedConnectionContinuationOptionSelect: HTMLSelectElement = wellDefined(
  asType<HTMLSelectElement>(
    (element: HTMLElement) => element instanceof HTMLSelectElement,
    document.getElementById("on-host-degraded-connection-continuation-option-select"),
  ),
  constructBadDOMError("Bad on host degraded connection continuation option select")
);

const popupState : {
  usersDiv: HTMLDivElement,
  notificationsDiv: HTMLDivElement,
  packagedServiceState: PackagedServiceState
  usersWithSelf: () => Array<User>
} = {
  usersDiv: wellDefined(
    asType<HTMLDivElement>(
      (element: HTMLElement) => element instanceof HTMLDivElement,
      document.getElementById("users")
    ),
    constructBadDOMError("The 'users' element must exist in the DOM.")
  ),
  notificationsDiv: wellDefined(
    asType<HTMLDivElement>(
      (element: HTMLElement) => element instanceof HTMLDivElement,
      document.getElementById("notifications")
    ),
    constructBadDOMError("The 'notifications' element must exist in the DOM.")
  ),
  packagedServiceState: {
    user: userDefaults,
    users: [],
    activeTabId: null,
    serverAddress: null,
    pendingServerRequests: [],
    availableTabIds: [],
    notifications: [],
    settings: { popupNotifications: false, waitOnDeviation: 0 }
  },
  usersWithSelf: () => [popupState.packagedServiceState.user, ...popupState.packagedServiceState.users],
};

async function getActiveTab(): Promise<browser.tabs.Tab> {
  return wellDefined((await browser.tabs.query({
    currentWindow: true,
    active: true
  })).at(0), Error(`Bad implementation of ${getActiveTab.name}`));
}

function setHidden(element: HTMLElement, hidden: boolean): void {
  if (hidden) {
    element.hidden = true;
    if (!element.classList.contains("hidden")) {
      element.classList.add("hidden");
    }
  } else {
    element.hidden = false;
    if (element.classList.contains("hidden")) {
      element.classList.remove("hidden");
    }
  }
}

function secondsToHoursMinutesAndSeconds(totalSeconds: number): [number, number, number] {
  return [
    Math.floor(totalSeconds / (60 * 60)),
    Math.floor(totalSeconds / 60) % 60,
    Math.floor(totalSeconds) % 60
  ];
}

function secondsToTimestamp(totalSeconds: number): string {
  const [hours, minutes, seconds] = secondsToHoursMinutesAndSeconds(totalSeconds);
  return `${(hours !== 0 ? `${String(hours).padStart(2, "0")}:` : "")}${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

function userElementIdPrefix(uuid: string | null, text: string | undefined = undefined): string {
  if (uuid === null) {
    throw new Error("User uuid cannot be null.");
  }

  if (text === undefined) {
    return `user-${uuid}`;
  }

  return `user-${uuid}-${text}`
}

function getUserUUIDForDiv(div: HTMLDivElement): string {
  const uuid = div.getAttribute("user-uuid");
  if (uuid === null) {
    throw new Error("This div element is not associated with user uuid");
  }
  return uuid;
}

function getPlaybackStateIcon(state: PlaybackState): string {
  switch (state) {
    case PlaybackState.Playing:
      return "&#9654;";
    case PlaybackState.Paused:
      return "&#9208;";
    case PlaybackState.Waiting:
      return "&#11119;";
    default:
      throw Error(`Invalid state ${state}`);
  }
}

function constructVideoInfoInnerHTML(user: User): string {
  if (user.videoInfo === null) {
    throw Error("This function requires video info to exist");
  }

  return (
    `<div class="image-container">
      <img id="${userElementIdPrefix(user.uuid, "channel-image")}" src="${user.videoInfo.channelImageUrl}">
    </div>
    <div class="video-title-and-channel">
      <div id="${userElementIdPrefix(user.uuid, "title")}" class="text-div video-title">${user.videoInfo.title}</div>
      <div id="${userElementIdPrefix(user.uuid, "channel")}" class="text-div channel">${user.videoInfo.channel}</div>
    </div>`
  )
}

function constructUserStatusInnerHTML(user: User): string {
  if (user.followingUUID) {
    return `<div class="text-div">Following ${wellDefined(asType(isUser, popupState.usersWithSelf().find(otherUser => otherUser.uuid === user.followingUUID)), Error("Cannot follow a non-existent user.")).username}</div>`
  }

  let innerHTML = "";

  if (user.followerUUIDs.length > 0) {
    const followerUsernames: Array<string> = user.followerUUIDs.map(uuid => wellDefined(
      popupState.usersWithSelf().find(user => user.uuid === uuid),
      new Error("Bad state, every followerUUID must exist")
    ).username);
    innerHTML = (
      `<details id="${userElementIdPrefix(user.uuid, "followed-by-details")}">
        <summary>Followed by &#708;</summary>
        <div class="text-div">${followerUsernames.join(", ")}</div>
      </details>`
    );
  }

  if (user.uuid !== popupState.packagedServiceState.user.uuid && user.videoInfo?.isLive !== true) {
    if (popupState.packagedServiceState.user.followingUUID === user.uuid) {
      innerHTML += (
        `<button id="${userElementIdPrefix(user.uuid, "toggle-follow-button")}" value="stop">Stop following</button>`
      );
    } else {
      innerHTML += (
        `<button id="${userElementIdPrefix(user.uuid, "toggle-follow-button")}" value="start">Follow</button>`
      );
    }
  }

  return innerHTML;
}

function constructUserWatchProgressContainerInnerHTML(user: User): string {
  if (user.videoInfo === null) {
    throw Error("This function requires video info to exist");
  }

  return (
    `<div id="${userElementIdPrefix(user.uuid, "watch-progress")}" class="watch-progress-bar" style="width: ${user.videoInfo.playbackInfo.currentTime * 100 / user.videoInfo.duration}%;"></div>`
  );
}

function constructUserTimestampsInnerHTML(user: User): string {
  if (user.videoInfo === null) {
    throw Error("This function requires video info to exist");
  }

  return (
    `<div id="${userElementIdPrefix(user.uuid, "timestamp")}" class="timestamps text-div">${getPlaybackStateIcon(user.videoInfo.playbackInfo.state)} ${secondsToTimestamp(user.videoInfo.playbackInfo.currentTime)}/${secondsToTimestamp(user.videoInfo.duration)} @ ${Math.round(user.videoInfo.playbackInfo.playbackRate * 1000) / 1000}x</div>`
  )
}

function constructPlaybackStatus(user: User): string {
  return (
    `<div id="${userElementIdPrefix(user.uuid, "timestamps")}" class="timestamps">
      ${constructUserTimestampsInnerHTML(user)}
    </div>
    <div id="${userElementIdPrefix(user.uuid, "status")}" class="user-status">
      ${constructUserStatusInnerHTML(user)}
    </div>`
  )
}

function attachDataToUserContainer(div: HTMLDivElement, user: User): HTMLDivElement {
  if (div.id !== userElementIdPrefix(user.uuid) || div.getAttribute("user-uuid") !== user.uuid) {
    throw new Error("Cannot attach data to user div, div does not exist in DOM.");
  }

  if (user.videoInfo === null) {
    let innerHTML: string = String.raw
   `<div id="${userElementIdPrefix(user.uuid, "username")}" class="text-div username">${user.username}</div>
    <div id="${userElementIdPrefix(user.uuid, "no-current-video")}" class="text-div no-current-video">No current video</div>`;

    if (user.uuid !== popupState.packagedServiceState.user.uuid) {
      if (popupState.packagedServiceState.user.followingUUID === user.uuid) {
        innerHTML += (
          `<button id="${userElementIdPrefix(user.uuid, "toggle-follow-button")}" value="stop">Stop following</button>`
        );
      } else {
        innerHTML += (
          `<button id="${userElementIdPrefix(user.uuid, "toggle-follow-button")}" value="start">Follow</button>`
        );
      }
    }

    div.innerHTML = innerHTML;
    return div;
  }

  div.innerHTML = String.raw
 `<div id="${userElementIdPrefix(user.uuid, "username")}" class="text-div username">${user.username}</div>
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

function constructUserDataContainer(user: User): HTMLDivElement {
  if (user.uuid === null) {
    throw new Error("Cannot construct data container for user, no uuid.");
  }

  const div = document.createElement("div");
  div.id = userElementIdPrefix(user.uuid);
  div.classList.add("user");
  div.setAttribute("user-uuid", user.uuid);
  return attachDataToUserContainer(div, user);
}

function userFollowedByDetailsToggled(followedByDetails: HTMLDetailsElement): void {
  const summary = wellDefined(
    followedByDetails.children[0],
    constructBadDOMError("The first element of details must be summary", followedByDetails)
  );
  summary.innerHTML = `Followed By ${(followedByDetails.open ? "&#709;" : "&#708;")}`;
}

function userToggleFollowButtonClicked(button: HTMLButtonElement, user: User): void {
  if (user.uuid === null) {
    throw constructBadDOMError("Every user in DOM must have a uuid.");
  }

  if (button.value === "start") {
    const followMessage: FollowMessage = {
      type: MessageTypes.Follow,
      followingUUID: user.uuid
    }
    browser.runtime.sendMessage(followMessage);
  } else if (button.value === "stop") {
    const stopFollowingMessage: StopFollowingMessage = {
      type: MessageTypes.StopFollowing,
      followingUUID: user.uuid
    };
    browser.runtime.sendMessage(stopFollowingMessage);
  } else {
    throw constructBadDOMError("The toggle follow button must have a value of either 'start' or 'stop'", button);
  }
}

function ensureEventsAreRegistered(div: HTMLDivElement, user: User): HTMLDivElement {
  const followedByDetails: HTMLDetailsElement | undefined = asType<HTMLDetailsElement | undefined>(
    (element: HTMLElement) => element instanceof HTMLDetailsElement,
    div.querySelector(`#${userElementIdPrefix(user.uuid, "followed-by-details")}`)
  );

  if (followedByDetails && followedByDetails.getAttribute("event-registered") !== "true") {
    followedByDetails.setAttribute("event-registered", "true");
    followedByDetails.addEventListener("toggle", () => userFollowedByDetailsToggled(followedByDetails));
  }

  const toggleFollowButton: HTMLButtonElement | undefined =asType<HTMLButtonElement | undefined>(
    (element: HTMLElement) => element instanceof HTMLButtonElement,
    div.querySelector(`#${userElementIdPrefix(user.uuid, "toggle-follow-button")}`)
  );

  if (toggleFollowButton && toggleFollowButton.getAttribute("event-registered") !== "true") {
    toggleFollowButton.setAttribute("event-registered", "true");
    toggleFollowButton.addEventListener("click", () => userToggleFollowButtonClicked(toggleFollowButton, user))
  }

  return div;
}

function updateUserData(previousUserData: User | undefined, user: User): void {
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

  const div = wellDefined(
    asType<HTMLDivElement>(
      (element: HTMLElement) => element instanceof HTMLDivElement,
      document.getElementById(userElementIdPrefix(user.uuid))
    ),
    constructBadDOMError("If previousUserData was defined, then it was expected that, that previousUserData has updated the DOM to conatin the user's data div.")
  );

  const updates = detectUserUpdates(previousUserData, user);

  if (updates.includes("username")) {
    wellDefined<HTMLDivElement>(
      asType(
        (element: any) => element instanceof HTMLDivElement,
        document.getElementById(userElementIdPrefix(user.uuid, "username"))
      ),
      constructBadDOMError("Every user in DOM must have a username.")
    ).innerText = user.username;
  }

  if (updates.includes("videoInfo")) {
    if ([previousUserData.videoInfo, user.videoInfo].includes(null)) {
      attachDataToUserContainer(div, user);
    } else {
      const videoInfoUpdates = detectVideoInfoUpdates(previousUserData.videoInfo, user.videoInfo);
      if (videoInfoUpdates.includes("videoId")) {
        wellDefined(
          asType<HTMLDivElement>(
            (element: HTMLElement) => element instanceof HTMLDivElement,
            document.getElementById(userElementIdPrefix("video-info"))
          ),
          constructBadDOMError("If neither video info is not null for previous and new data, then watch-progress-container is expected to exist.")
        ).innerHTML = constructVideoInfoInnerHTML(user);
      } else if (videoInfoUpdates.includes("playbackInfo")) {
        wellDefined(
          asType<HTMLDivElement>(
            (element: HTMLElement) => element instanceof HTMLDivElement,
            document.getElementById(userElementIdPrefix(user.uuid, "timestamps"))
          ),
          constructBadDOMError("If neither video info is not null for previous and new data, then watch-progress-container is expected to exist.")
        ).innerHTML = constructUserTimestampsInnerHTML(user);
        wellDefined(
          asType<HTMLDivElement>(
            (element: HTMLElement) => element instanceof HTMLDivElement,
            document.getElementById(userElementIdPrefix(user.uuid, "watch-progress-container"))
          ),
          constructBadDOMError("If neither video info is not null for previous and new data, then watch-progress-container is expected to exist.")
        ).innerHTML = constructUserWatchProgressContainerInnerHTML(user);
      }
    }
  }

  if (updates.includes("followerUUIDs") || updates.includes("followingUUID")) {
    const status = asType(
      (element: any) => element instanceof HTMLDivElement,
      document.getElementById(userElementIdPrefix(user.uuid, "status"))
    )

    if (status) {
      status.innerHTML = constructUserStatusInnerHTML(user);
    }
  }

  ensureEventsAreRegistered(div, user);
}

function notificationElementIdPrefix(notification: Notification): string {
  return `notification-${notification.epoch}-${notification.sender}`;
}

function constructNotificationDataElement(notification: Notification): HTMLDivElement {
  const prefix: string = notificationElementIdPrefix(notification);
  const notificationDiv: HTMLDivElement = document.createElement("div");
  notificationDiv.classList.add("notification");
  notificationDiv.id = prefix;

  const controlButton: string = notification.dismissed ?
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

  const dismissButton: HTMLButtonElement | null = notificationDiv.querySelector(`button`);
  if (dismissButton !== null) {
    dismissButton.addEventListener("click", () => {
      dismissButton.disabled = true;
      const notificationDismissedMessage: NotificationDismissedMessage = {
        type: MessageTypes.NotificationDismissed,
        notification
      };
      browser.runtime.sendMessage(notificationDismissedMessage);
    });
  }

  return notificationDiv;
}

function updateNotificationData(notification: Notification): void {
  const prefix: string = notificationElementIdPrefix(notification);
  const constructed: HTMLDivElement = constructNotificationDataElement(notification);
  let existing: HTMLElement | undefined = asType<HTMLDivElement>(
    (element) => element instanceof HTMLDivElement,
    document.getElementById(prefix)
  );

  if (existing == undefined) {
    existing = constructed;
    popupState.notificationsDiv.appendChild(existing);
  } else {
    existing.innerHTML = constructed.innerHTML;
  }
}

function applyState(newState: PackagedServiceState): void {
  const withSelf = popupState.usersWithSelf();
  if (newState.serverAddress !== null) {
    if (popupState.packagedServiceState.user.username !== newState.user.username) {
      browser.storage.local.set({ lastUsername: newState.user.username });
    }
    if (popupState.packagedServiceState.serverAddress !== newState.serverAddress) {
      browser.storage.local.set({ lastServerAddress: newState.serverAddress });
    }

    popupState.packagedServiceState = newState;
    for (const newUserInfo of [newState.user, ...newState.users]) {
      updateUserData(withSelf.find(user => user.uuid === newUserInfo.uuid), newUserInfo);
    };

    if (popupState.usersDiv.children.length !== 0) {
      for (const userDivAnyElement of Array.from(popupState.usersDiv.children).slice(1)) {
        const userDiv: HTMLDivElement = userDivAnyElement as HTMLDivElement;
        const uuidOfDiv = getUserUUIDForDiv(userDiv);
        if (!newState.users.find(user => user.uuid === uuidOfDiv)) {
          userDiv.remove()
        }
      }
    }
    connectionAccordionHeaderText.innerText = newState.serverAddress;

  } else {
    popupState.packagedServiceState = newState;
    popupState.usersDiv.replaceChildren();
    connectionAccordionHeaderText.innerText = "Connection";
  }

  for (const newNotificationInfo of newState.notifications.toReversed()) {
    updateNotificationData(newNotificationInfo);
  }

  if (popupState.notificationsDiv.children.length !== 0) {
    for (const noitificationDivAsAnyElement of Array.from(popupState.notificationsDiv.children)) {
      const notificationDiv = noitificationDivAsAnyElement as HTMLDivElement;
      if (!newState.notifications.find(notification => notificationElementIdPrefix(notification) === notificationDiv.id)) {
        notificationDiv.remove()
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
    } else if (newState.availableTabIds.includes(tab.id)) {
      activeTabToggle.disabled = false;
    }
  });

  if (newState.serverAddress === null) {
    setHidden(connectAsForm, false);
    usernameInput.disabled = false;
    serverAddressInput.disabled = false;
    connectButton.disabled = false;
    setHidden(disconnectForm, true);
  } else {
    setHidden(connectAsForm, true)
    setHidden(disconnectForm, false);
    disconnectServerAddress.value = newState.serverAddress;
  }

  popupNotificationsCheckbox.checked = newState.settings.popupNotifications;
  waitForBufferingFollowersCheckbox.checked = newState.user.hostingOptions.waitForBufferingFollowers;
  shareQueueCheckbox.checked = newState.user.hostingOptions.shareQueue;
  waitOnDeviationInput.value = newState.settings.waitOnDeviation.toString();
  onDegradedConnectionContinuationOptionSelect.value = newState.user.followingOptions.onDegradedConnectionContinuationOption;
  onHostDegradedConnectionContinuationOptionSelect.value = newState.user.followingOptions.onHostDegradedConnectionContinuationOption;

  enableAllSettings();
}

function processRuntimeMessage(
  message: Message,
  sender: browser.runtime.MessageSender,
  sendResponse: (response?: any) => void
): boolean | Promise<any> | undefined {
  sendResponse as unknown as void;

  if (!isGenericMessage(message)) {
    throw new Error("Recieved unknown message");
  }

  switch (message.type) {
    case MessageTypes.Error: {
      throw new ErrorMessageReceived(
        wellDefinedMessage(
          isErrorMessage,
          MessageTypes.Error,
          message
        )
      );
    }
    case MessageTypes.PackagedServiceState: {
      applyState(wellDefinedMessage(
        isPackagedServiceStateMessage,
        MessageTypes.PackagedServiceState,
        message
      ).packagedServiceState);
      break;
    }
    case MessageTypes.OpenNotifications: {
      wellDefinedMessage(isOpenNotificationsMessage, MessageTypes.OpenNotifications, message);
      if (!isExpanded(notificationsAccordionContainer)) {
        accordionExpand(notificationsAccordionContainer);
      }
      break;
    }
    case MessageTypes.Notify: {
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

async function activeTabToggleActivated(): Promise<void> {
  if (activeTabToggle.value === "set") {
    const setActiveTabMessage: SetActiveTabMessage = {
      type: MessageTypes.SetActiveTab,
      tabId: wellDefined((await getActiveTab()).id, Error("Expected tab to have an id"))
    };
    browser.runtime.sendMessage(setActiveTabMessage);
  } else if (activeTabToggle.value === "unset") {
    const setActiveTabMessage: SetActiveTabMessage = {
      type: MessageTypes.SetActiveTab,
      tabId: null
    };
    browser.runtime.sendMessage(setActiveTabMessage);
  } else {
    throw constructBadDOMError("Active tab  toggle button must have a value of either 'set' or 'unset'", activeTabToggle);
  }
  activeTabToggle.disabled = true;
}

function connectAsFormSubmitted(evt: SubmitEvent): void {
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
  } catch (err) {
    if (typeof err === "object" && err !== null && "message" in err) {
      serverAddressInput.placeholder = `\u26A0 ${err.message}`;
    } else {
      serverAddressInput.placeholder = "\u26A0 Invalid URL";
    }
    return;
  }

  const connectToServerAsMessage: ConnectToServerAsMessage = {
    type: MessageTypes.ConnectToServerAs,
    username: usernameInput.value,
    url: serverAddressInput.value
  };
  browser.runtime.sendMessage(connectToServerAsMessage);
  serverAddressInput.disabled = true;
  usernameInput.disabled = true;
  connectButton.disabled = true;
}

function disconnectFormSubmitted(evt: SubmitEvent): void {
  evt.preventDefault();
  const disconnectFromServerMessage: DisconnectFromServerMessage = {
    type: MessageTypes.DisconnectFromServer
  };
  browser.runtime.sendMessage(disconnectFromServerMessage);
}

function applyAccordionHeaderPrefixes(textDiv: HTMLDivElement, collapsedPrefix: string, expandedPrefix: string): void {
  const container: HTMLElement | null = findParent(textDiv, element => isAccordionContainer(element));
  if (!(container instanceof HTMLDivElement)) {
    throw new Error(`The function ${accordionHeaderAndContent.name} is to only be invoked from accordion header target trees with accordion container parent`);
  }
  requireContainerKind(container);

  const update = () => {
    if (isExpanded(container)) {
      if (!textDiv.innerText.startsWith(expandedPrefix)) {
        textDiv.innerText = textDiv.innerText.replace(collapsedPrefix, "")
        textDiv.innerText = `${expandedPrefix}${textDiv.innerText}`;
      }
    } else {
      if (!textDiv.innerText.startsWith(collapsedPrefix)) {
        textDiv.innerText = textDiv.innerText.replace(expandedPrefix, "")
        textDiv.innerText = `${collapsedPrefix}${textDiv.innerText}`;
      }
    }
  }

  container.addEventListener("accordionexpand", update);
  container.addEventListener("accordioncollapse", update);
  update();
  new MutationObserver(update).observe(textDiv, { childList: true });
}

function disableAllSettings(): void {
  popupNotificationsCheckbox.disabled = true;
  waitForBufferingFollowersCheckbox.disabled = true;
  shareQueueCheckbox.disabled = true;
  waitOnDeviationInput.disabled = true;
  onDegradedConnectionContinuationOptionSelect.disabled = true;
  onHostDegradedConnectionContinuationOptionSelect.disabled = true;
}

function enableAllSettings(): void {
  popupNotificationsCheckbox.disabled = false;
  waitForBufferingFollowersCheckbox.disabled = false;
  shareQueueCheckbox.disabled = false;
  waitOnDeviationInput.disabled = false;
  onDegradedConnectionContinuationOptionSelect.disabled = false;
  onHostDegradedConnectionContinuationOptionSelect.disabled = false;
}

function applyNewUserSettings(): void {
  disableAllSettings();
  browser.runtime.sendMessage({
    type: MessageTypes.User,
    user: popupState.packagedServiceState.user
  } satisfies UserMessage);
}

function applyNewSettings(settingsUpdates: ServiceSettingsUpdates): void {
  disableAllSettings();
  browser.runtime.sendMessage({
    type: MessageTypes.ServiceSettingsUpdates,
    serviceSettingsUpdates: settingsUpdates
  } satisfies ServiceSettingsUpdatesMessage);
}

async function main(): Promise<void> {
  applyState(wellDefinedMessage(
    isPackagedServiceStateMessage,
    MessageTypes.PackagedServiceState,
    await browser.runtime.sendMessage({ type: MessageTypes.RequestPackagedServiceState })
  ).packagedServiceState);

  if (popupState.packagedServiceState.serverAddress === null) {
    accordionExpand(connectionAccordionContainer);

    const lastUsername: string | undefined = asType<string>(
      (o) => typeof o === "string",
      (await browser.storage.local.get("lastUsername")).lastUsername
    );
    if (lastUsername !== undefined) {
      usernameInput.value = lastUsername;
    }

    const lastServerAddress: string | undefined = asType<string>(
      (o) => typeof o === "string",
      (await browser.storage.local.get("lastServerAddress")).lastServerAddress
    );
    if (lastServerAddress !== undefined) {
      serverAddressInput.value = lastServerAddress;
    }
  }

  browser.runtime.onMessage.addListener(processRuntimeMessage);
  const collapsedPrefix = "⏵";
  const expandedPrefix = "⏷";
  applyAccordionHeaderPrefixes(connectionAccordionHeaderText, collapsedPrefix, expandedPrefix);
  applyAccordionHeaderPrefixes(usersAccordionHeaderText, collapsedPrefix, expandedPrefix);
  applyAccordionHeaderPrefixes(notificationsAccordionHeaderText, collapsedPrefix, expandedPrefix);
  applyAccordionHeaderPrefixes(settingsAccordionHeaderText, collapsedPrefix, expandedPrefix);
  activeTabToggle.addEventListener("click", activeTabToggleActivated);
  connectAsForm.addEventListener("submit", connectAsFormSubmitted);
  disconnectForm.addEventListener("submit", disconnectFormSubmitted);

  popupNotificationsCheckbox.addEventListener("click", () => {
    applyNewSettings({
      popupNotifications: popupNotificationsCheckbox.checked
    });
  });
  waitForBufferingFollowersCheckbox.addEventListener("click", () => {
    popupState.packagedServiceState.user.hostingOptions.waitForBufferingFollowers = waitForBufferingFollowersCheckbox.checked;
    applyNewUserSettings();
  });
  shareQueueCheckbox.addEventListener("click", () => {
    popupState.packagedServiceState.user.hostingOptions.shareQueue = shareQueueCheckbox.checked;
    applyNewUserSettings();
  });
  waitOnDeviationInput.addEventListener("focusout", () => {
    applyNewSettings({
      waitOnDeviation: Number(waitOnDeviationInput.value)
    });
  });
  onDegradedConnectionContinuationOptionSelect.addEventListener("change", () => {
    popupState.packagedServiceState.user.followingOptions.onDegradedConnectionContinuationOption = wellDefined(
      asType<ContinuationOption>(
        (s) => isEnumValue(ContinuationOption, s),
        onDegradedConnectionContinuationOptionSelect.value
      ),
      constructBadDOMError("Select option did not match enum value.")
    );
    console.log(isEnumValue<ContinuationOption>(ContinuationOption, onDegradedConnectionContinuationOptionSelect.value));
    applyNewUserSettings();
  });
  onHostDegradedConnectionContinuationOptionSelect.addEventListener("change", () => {
    popupState.packagedServiceState.user.followingOptions.onHostDegradedConnectionContinuationOption = wellDefined(
      asType<ContinuationOption>(
        (s) => isEnumValue(ContinuationOption, s),
        onHostDegradedConnectionContinuationOptionSelect.value
      ),
      constructBadDOMError("Select option did not match enum value.")
    );
    applyNewUserSettings();
  });

  (globalThis as any).popup = {
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
