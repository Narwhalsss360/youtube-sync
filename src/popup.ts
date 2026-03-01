import { ErrorMessageReceived } from "./errors";
import browser = chrome;
import { asType, ConnectToServerAsMessage, detectUserUpdates, detectVideoInfoUpdates, DisconnectFromServerMessage, FollowMessage, isErrorMessage, isGenericMessage, isPackagedServiceStateMessage, isUser, Message, MessageTypes, PackagedServiceState, PlaybackState, SetActiveTabMessage, StopFollowingMessage, User, userDefaults,wellDefined,wellDefinedMessage } from "./types";

function constructBadDOMError(message: string, element: HTMLElement | null | undefined = undefined): Error {
  return element ?
    new Error(`Bad DOM Error: ${element.tagName}#${element.id}`) :
    new Error("Bad DOM Error");
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

const popupState : {
  usersDiv: HTMLDivElement,
  packagedServiceState: PackagedServiceState
  usersWithSelf: () => Array<User>
} = {
  usersDiv: wellDefined(
    asType<HTMLDivElement>(
      (element: HTMLElement) => element instanceof HTMLDivElement,
      document.getElementById("users")
    ),
    constructBadDOMError("This element must exist in the DOM.")
  ),
  packagedServiceState: {
    user: userDefaults,
    users: [],
    activeTabId: null,
    serverAddress: null,
    pendingServerRequests: [],
    availableTabIds: []
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
    div.innerHTML = String.raw
   `<div id="${userElementIdPrefix(user.uuid, "username")}" class="text-div username">${user.username}</div>
    <div id="${userElementIdPrefix(user.uuid, "no-current-video")}" class="text-div no-current-video">No current video</div>`;
    return div;
  }

  const isThisUser = user.uuid === popupState.packagedServiceState.user.uuid;

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
    wellDefined<HTMLDivElement>(
      asType(
        (element: any) => element instanceof HTMLDivElement,
        document.getElementById(userElementIdPrefix(user.uuid, "status"))
      ),
      constructBadDOMError("user status.")
    ).innerHTML = constructUserStatusInnerHTML(user);
  }

  ensureEventsAreRegistered(div, user);
}

function applyState(newState: PackagedServiceState) {
  const withSelf = popupState.usersWithSelf();
  popupState.packagedServiceState = newState;
  if (newState.serverAddress !== null) {
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
  } else {
    popupState.usersDiv.replaceChildren();
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
}

function processRuntimeMessage(
  message: Message,
  sender: browser.runtime.MessageSender,
  sendResponse: (response?: any) => void
): boolean | Promise<any> | undefined {
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
    default: {
      console.group("Dropped message:");
      console.warn("Sender:");
      console.warn(sender);
      console.warn("Message:");
      console.warn(message);
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

async function main() {
  applyState(wellDefinedMessage(
    isPackagedServiceStateMessage,
    MessageTypes.PackagedServiceState,
    await browser.runtime.sendMessage({ type: MessageTypes.RequestPackagedServiceState })
  ).packagedServiceState);

  browser.runtime.onMessage.addListener(processRuntimeMessage);
  activeTabToggle.addEventListener("click", activeTabToggleActivated);
  connectAsForm.addEventListener("submit", connectAsFormSubmitted);
  disconnectForm.addEventListener("submit", disconnectFormSubmitted);

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