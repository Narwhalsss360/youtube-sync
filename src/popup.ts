import { ErrorMessageReceived } from "./errors";
import browser = chrome;
import { asType, detectUserUpdates, detectVideoInfoUpdates, isErrorMessage, isGenericMessage, isPackagedServiceStateMessage, isUser, Message, MessageTypes, PackagedServiceState, PlaybackState, User, userDefaults,wellDefined,wellDefinedMessage } from "./types";

const badDOMError = Error("Bad DOM.");

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
    badDOMError
  ),
  packagedServiceState: {
    user: userDefaults,
    users: [],
    activeTabId: null,
    serverAddress: null
  },
  usersWithSelf: () => [popupState.packagedServiceState.user, ...popupState.packagedServiceState.users],
};

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
    innerHTML = (
      `<details id="${userElementIdPrefix(user.uuid, "followed-by-details")}">
        <summary>Followed by &#708;</summary>
        <div class="text-div">${user.followerUUIDs.join(", ")}</div>
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
    `<div id="${userElementIdPrefix(user.uuid, "timestamp")}">${getPlaybackStateIcon(user.videoInfo.playbackInfo.state)} ${secondsToTimestamp(user.videoInfo.playbackInfo.currentTime)}/${secondsToTimestamp(user.videoInfo.duration)} @ ${Math.round(user.videoInfo.playbackInfo.playbackRate * 1000) / 1000}x</div>`
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
   `<div id="${userElementIdPrefix(user.uuid, "username")}" class="text-div" style="grid-column: span 2;">${user.username}</div>
    <div id="${userElementIdPrefix(user.uuid, "no-current-video")}" class="text-div no-current-video">No current video</div>`;
    return div;
  }

  const isThisUser = user.uuid === popupState.packagedServiceState.user.uuid;

  div.innerHTML = String.raw
 `<div id="${userElementIdPrefix(user.uuid, "username")}" class="text-div" style="grid-column: span 2;">${user.username}</div>
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

function updateUserData(previousUserData: User | undefined, user: User): void {
  if (user.uuid === null) {
    return;
  }

  if (previousUserData === undefined) {
    popupState.usersDiv.appendChild(constructUserDataContainer(user));
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
    badDOMError
  );

  const updates = detectUserUpdates(previousUserData, user);

  if (updates.includes("username")) {
    wellDefined<HTMLDivElement>(
      asType(
        (element: any) => element instanceof HTMLDivElement,
        document.getElementById(userElementIdPrefix(user.uuid, "username"))
      ),
      badDOMError
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
          badDOMError
        ).innerHTML = constructVideoInfoInnerHTML(user);
      } else if (videoInfoUpdates.includes("playbackInfo")) {
        wellDefined(
          asType<HTMLDivElement>(
            (element: HTMLElement) => element instanceof HTMLDivElement,
            document.getElementById(userElementIdPrefix(user.uuid, "timestamps"))
          ),
          badDOMError
        ).innerHTML = constructUserTimestampsInnerHTML(user);
        wellDefined(
          asType<HTMLDivElement>(
            (element: HTMLElement) => element instanceof HTMLDivElement,
            document.getElementById(userElementIdPrefix(user.uuid, "watch-progress-container"))
          ),
          badDOMError
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
      badDOMError
    ).innerHTML = constructUserStatusInnerHTML(user);
  }
}

function applyState(newState: PackagedServiceState) {
  const withSelf = popupState.usersWithSelf();
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

async function main() {
  applyState(wellDefinedMessage(
    isPackagedServiceStateMessage,
    MessageTypes.PackagedServiceState,
    await browser.runtime.sendMessage({ type: MessageTypes.RequestPackagedServiceState })
  ).packagedServiceState);

  browser.runtime.onMessage.addListener(processRuntimeMessage);

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