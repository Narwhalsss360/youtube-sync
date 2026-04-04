import browser = chrome;
import { ErrorMessageReceived }  from "./errors";
import {  isErrorMessage, isGenericMessage, isPackagedServiceStateMessage, isRequestVideoInfoMessage, isSetActiveTabMessage, Message, MessageTypes, NotifyMessage, PackagedServiceState, PlaybackInfo, PlaybackState, SetActiveTabMessage, User, VideoInfo, VideoInfoMessage, wellDefinedMessage } from "./types";

const moduleState: {
  isActiveTab: boolean,
  videoInfoCache: VideoInfo | null
  backgroundServicePort: browser.runtime.Port | null,
  packagedServiceState: PackagedServiceState | null,
  maxDeviation: number,
} = {
  isActiveTab: false,
  videoInfoCache: null,
  backgroundServicePort: null,
  packagedServiceState: null,
  maxDeviation: 1
};

function findParent(elementNode: HTMLElement, predicate: (element: HTMLElement) => boolean): HTMLElement | null {
  const parent = elementNode.parentNode;
  if (parent?.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }
  const parentNode = parent as HTMLElement;

  if (predicate(parentNode)) {
    return parentNode;
  }

  return findParent(parentNode, predicate);
}

function videoPlaybackState(video: HTMLVideoElement): PlaybackState {
  if (video.readyState <= 2) {
    return PlaybackState.Waiting;
  }

  return video.currentTime > 0 && !video.paused && !video.ended ?
    PlaybackState.Playing :
    PlaybackState.Paused;
}

function isMiniplayer(video: HTMLVideoElement): boolean {
  return Boolean(findParent(video, e => e.tagName === "YTD-MINIPLAYER"));
}

function waitForVideoElement(): Promise<HTMLVideoElement> {
  return new Promise((resolve, _) => {
    let video = document.querySelector("video");
    if (video) {
      resolve(video);
      return;
    }

    new MutationObserver((_, observer) => {
      video = document.querySelector("video");
      if (!video) {
        return;
      }
      observer.disconnect();
      resolve(video);
    }).observe(document.body, { childList: true, subtree: true });
  });
}

function waitForMetadata(): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    let videoElement: HTMLVideoElement | null = null;
    let title: string | null = null;
    let channel: string | null = null;
    let channelImageUrl: string | null = null;
    let isLive: boolean | null = null;

    let resolved: boolean = false;

    function watchForAboveTheFold(disconnector: { disconnect: () => void }) {
      const aboveTheFold = document.getElementById("above-the-fold");
      if (!aboveTheFold) {
        return;
      }

      if (!title) {
        title = aboveTheFold.querySelector("h1")?.innerText ?? null;
      }
      if (!channel) {
        channel = document.getElementById("upload-info")?.querySelector("a")?.innerText ?? null;
        if (!channel){
          channel = document.getElementById("attributed-channel-name")?.querySelector("a")?.innerText?.replace(/(\r\n|\n|\r)/g, "") ?? null;
        }
      }
      if (!channelImageUrl) {
        channelImageUrl = document.getElementById("owner")?.querySelector("img")?.src ?? null;
        if (!channelImageUrl) {
           const stack = document.getElementById("avatar-stack")?.querySelectorAll("img") ?? null;
           if (stack) {
            channelImageUrl = stack.values().toArray().at(-1)?.src ?? null;
           }
        }
      }
      if (isLive === null) {
        const badgeWidth: number | undefined = document.querySelector(".ytp-live-badge")?.clientWidth;
        if (badgeWidth !== undefined) {
          isLive = badgeWidth > 0;
        }
      }

      const queriedVideoElement = document.querySelector("video");
      if (queriedVideoElement && !videoElement) {
        const TIMEOUT = 120000;

        videoElement = queriedVideoElement;
        if (videoElement.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
          const interval = setInterval(() => {
            clearInterval(interval);
            reject("timed out getting metadata");
          }, TIMEOUT);
        } else {
          videoElement.addEventListener("loadeddata", () => {
            const interval = setInterval(() => {
              clearInterval(interval);
              reject("timed out getting metadata");
            }, TIMEOUT);
          }, { once: true });
        }
      } else {
        videoElement = queriedVideoElement;
      }

      if (
        !title ||
        !channel ||
        !channelImageUrl ||
        !videoElement ||
        isLive === null
      ) {
        return;
      }

      if (Number.isNaN(videoElement.duration)) {
        return;
      }

      disconnector.disconnect();
      const videoId = new URLSearchParams(document.location.search).get("v");
      if (videoId === null) {
        throw new Error("Metadata unavailable, video id is not available in the URL search params");
      }

      resolve({
        videoId,
        title,
        channel,
        channelImageUrl,
        duration: videoElement.duration,
        isLive,
        playbackInfo: {
          state: videoPlaybackState(videoElement),
          currentTime: videoElement.currentTime,
          playbackRate: videoElement.playbackRate
        }
      });
    }

    function watchForYtdWatchMetadata(_: Array<MutationRecord>, observer: MutationObserver): void {
      const ytdWatchMetadata = document.querySelector("ytd-watch-metadata");
      if (!ytdWatchMetadata) {
        return;
      }

      observer.disconnect();
      watchForAboveTheFold({ disconnect: () => { } });
      if (resolved) {
        return;
      }

      new MutationObserver((_, observer) => watchForAboveTheFold(observer))
        .observe(ytdWatchMetadata, { childList: true, subtree: true });
    }

    const ytdWatchMetadata = document.querySelector("ytd-watch-metadata");
    if (ytdWatchMetadata) {
      new MutationObserver((_, observer) => watchForAboveTheFold(observer)).observe(ytdWatchMetadata, { childList: true, subtree: true });
    } else {
      new MutationObserver(watchForYtdWatchMetadata).observe(document.body, { childList: true, subtree: true });
    }
  });
}

let ensureVideoInfoIsSentIntervalId: ReturnType<typeof setInterval> | null = null;
const ENSURE_VIDEO_INFO_SENT_INTERVAL: number = 10;

function sendVideoInfo() {
  if (!moduleState.isActiveTab || moduleState.backgroundServicePort === null) {
    if (ensureVideoInfoIsSentIntervalId === null) {
      ensureVideoInfoIsSentIntervalId = setInterval(() => {
        sendVideoInfo();
      }, ENSURE_VIDEO_INFO_SENT_INTERVAL);
    }
    return;
  }

  if (ensureVideoInfoIsSentIntervalId !== null) {
    clearInterval(ensureVideoInfoIsSentIntervalId);
  }

  const videoInfoMessage: VideoInfoMessage = {
    type: MessageTypes.VideoInfo,
    videoInfo: moduleState.videoInfoCache,
    uuid: null
  };
  moduleState.backgroundServicePort.postMessage(videoInfoMessage);
}

function getPlaybackInfo(video: HTMLVideoElement): PlaybackInfo {
  return {
    state: videoPlaybackState(video),
    currentTime: video.currentTime,
    playbackRate: video.playbackRate
  }
}

function getPlaybackInfoAndSend(evt: Event) {
  const following = moduleState.packagedServiceState?.users.find(user => moduleState.packagedServiceState?.user.followingUUID === user.uuid && user.videoInfo);
  let followPromise = following ? follow(following) : Promise.resolve();

  followPromise.then(() => {
    if (moduleState.videoInfoCache === null) {
      return;
    }

    const video = evt.target as HTMLVideoElement;
    moduleState.videoInfoCache.playbackInfo = getPlaybackInfo(video);
    sendVideoInfo();
  })
}

function registerVideoElementEvents(video: HTMLVideoElement): void {
  video.addEventListener("playing", getPlaybackInfoAndSend);
  video.addEventListener("pause", getPlaybackInfoAndSend);
  video.addEventListener("waiting", getPlaybackInfoAndSend);
  video.addEventListener("ratechange", getPlaybackInfoAndSend);
  video.addEventListener("timeupdate", getPlaybackInfoAndSend);
}

function removeVideoElementEvents(video: HTMLVideoElement): void {
  video.removeEventListener("playing", getPlaybackInfoAndSend);
  video.removeEventListener("pause", getPlaybackInfoAndSend);
  video.removeEventListener("waiting", getPlaybackInfoAndSend);
  video.removeEventListener("ratechange", getPlaybackInfoAndSend);
  video.removeEventListener("timeupdate", getPlaybackInfoAndSend);
}

function detectVideoInfo(onVideoInfoChanged: (videoInfo: VideoInfo | null) => void) {
  let video = document.querySelector("video");

  const expandPlayerKeyboardEvent = new KeyboardEvent("keydown", {
    key: "i",
    code: "KeyI",
    keyCode: 0x49,
    which: 0x49,
    bubbles: true,
    cancelable: true
  });

  async function videoSrcChanged(): Promise<void> {
    if (!document.contains(video) || video === null) {
      throw new Error("FATAL: Bad implementation of video change detection, video element is not in document.");
    }

    if (!video.src) {
      onVideoInfoChanged(null);
      return;
    }

    if (isMiniplayer(video)) {
      video.dispatchEvent(expandPlayerKeyboardEvent);
    }

    onVideoInfoChanged(await waitForMetadata());
  }

  if (video !== null) {
    videoSrcChanged();
    new MutationObserver(videoSrcChanged)
      .observe(video, { attributes: true, attributeFilter: ["src"] });
    return;
  }

  waitForVideoElement().then((newVideoElement) => {
    video = newVideoElement;
    new MutationObserver(videoSrcChanged)
      .observe(video, { attributes: true, attributeFilter: ["src"] });
    videoSrcChanged();
  });
}

const PLAYBACK_SYNC_NOTIFICATION_INTERVAL: number = 60000;
let notifyOfPlaybackSynchronization: boolean = true;
let mouseX: number = 0;

function follow(user: User): Promise<void> {
  if (user.videoInfo === null) {
    console.log("Following a user that is not watching a video. Doing nothing");
    return Promise.resolve();
  }

  if (user.videoInfo.videoId !== new URLSearchParams(window.location.search).get("v")) {
    window.location.assign(`https://youtube.com/watch?v=${user.videoInfo.videoId}`);
    return Promise.resolve();
  }

  return waitForVideoElement().then(video => {
    const controls: HTMLElement | null = document.querySelector(".ytp-chrome-bottom");
    const showControls = controls === null ? () => {} : () => {
      controls.dispatchEvent(new MouseEvent("mousemove",  { bubbles: true, cancelable: false, clientX: mouseX }));
      mouseX = mouseX === 0 ? 1 : 0;
    };
    if (user.videoInfo === null) {
      return;
    }

    if (video.readyState <= 2) {
      return;
    }

    if (user.videoInfo.playbackInfo.state === PlaybackState.Waiting) {
      if (!video.paused) {
        video.pause();
        video.currentTime = user.videoInfo.playbackInfo.currentTime;
        const notifyMessage: NotifyMessage = {
          type: MessageTypes.Notify,
          notification: {
            epoch: Date.now(),
            sender: "Follower",
            message: `${user.username} is buffering.`,
            dismissed: false
          }
        };
        browser.runtime.sendMessage(notifyMessage);
        showControls();
      }
      notifyOfPlaybackSynchronization = true;
      return
    }

    if (user.videoInfo.playbackInfo.playbackRate !== video.playbackRate) {
      video.playbackRate = user.videoInfo.playbackInfo.playbackRate;
      const notifyMessage: NotifyMessage = {
        type: MessageTypes.Notify,
        notification: {
          epoch: Date.now(),
          sender: "Follower",
          message: `${user.username} playback rate synchronization: ${video.playbackRate}.`,
          dismissed: false
        }
      };
      browser.runtime.sendMessage(notifyMessage);
      showControls();
    }

    if (user.videoInfo.playbackInfo.state === PlaybackState.Paused) {
      if (!video.paused) {
        video.pause();
        const notifyMessage: NotifyMessage = {
          type: MessageTypes.Notify,
          notification: {
            epoch: Date.now(),
            sender: "Follower",
            message: `${user.username} playback rate synchronization: ${video.playbackRate}.`,
            dismissed: false
          }
        };
        browser.runtime.sendMessage(notifyMessage);
        showControls();
      }
      if (video.currentTime !== user.videoInfo.playbackInfo.currentTime) {
        video.currentTime = user.videoInfo.playbackInfo.currentTime;
        const notifyMessage: NotifyMessage = {
          type: MessageTypes.Notify,
          notification: {
            epoch: Date.now(),
            sender: "Follower",
            message: `${user.username} synchronizing paused time.`,
            dismissed: false
          }
        };
        browser.runtime.sendMessage(notifyMessage);
      }
      notifyOfPlaybackSynchronization = true;
      return;
    }

    if (video.paused) {
      video.currentTime = user.videoInfo.playbackInfo.currentTime;
      video.play();
      const notifyMessage: NotifyMessage = {
        type: MessageTypes.Notify,
        notification: {
          epoch: Date.now(),
          sender: "Follower",
          message: `${user.username} playing.`,
          dismissed: false
        }
      };
      showControls();
      browser.runtime.sendMessage(notifyMessage);
      return;
    }

    if (Math.abs(user.videoInfo.playbackInfo.currentTime - video.currentTime) > moduleState.maxDeviation) {
      video.currentTime = user.videoInfo.playbackInfo.currentTime;
      if (notifyOfPlaybackSynchronization) {
        const notifyMessage: NotifyMessage = {
          type: MessageTypes.Notify,
          notification: {
            epoch: Date.now(),
            sender: "Follower",
            message: `${user.username} synchronizing playback time.`,
            dismissed: false
          }
        };
        browser.runtime.sendMessage(notifyMessage);
        notifyOfPlaybackSynchronization = false;
        showControls();
        setTimeout(() => notifyOfPlaybackSynchronization = true, PLAYBACK_SYNC_NOTIFICATION_INTERVAL);
      }
    }
  });
}

function processPortMessage(
  message: Message,
  port: browser.runtime.Port
): void {
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
      moduleState.packagedServiceState = wellDefinedMessage(
        isPackagedServiceStateMessage,
        MessageTypes.PackagedServiceState,
        message
      ).packagedServiceState;
      const following = moduleState.packagedServiceState.users.find(user => moduleState.packagedServiceState?.user.followingUUID === user.uuid);
      if (following?.videoInfo) {
        follow(following);
      }
      break;
    }
    case MessageTypes.RequestVideoInfo: {
      wellDefinedMessage(isRequestVideoInfoMessage, MessageTypes.RequestVideoInfo, message);
      const video = document.querySelector("video");
      if (!video?.src) {
        moduleState.videoInfoCache = null;
      } if (moduleState.videoInfoCache !== null && video) {
        moduleState.videoInfoCache.playbackInfo = getPlaybackInfo(video);
      }
      sendVideoInfo();
      break;
    }
    case MessageTypes.SetActiveTab: {
      const setActiveTabMessage: SetActiveTabMessage = wellDefinedMessage(isSetActiveTabMessage, MessageTypes.SetActiveTab, message);
      if (setActiveTabMessage.tabId === null) {
        if (!moduleState.isActiveTab) {
          throw new Error("Can only be unset as active tab if was already active tab.");
        }
        moduleState.isActiveTab = false;
        waitForVideoElement().then(video => removeVideoElementEvents(video));
        console.log("Is no longer active YouTube Sync tab.");
      } else {
        if (moduleState.isActiveTab) {
          throw new Error("Already set as active tab.");
        }
        moduleState.isActiveTab = true;
        console.log("Is active YouTube Sync tab.");
        waitForVideoElement().then(video => registerVideoElementEvents(video));
      }
      break;
    }
    default: {
      console.group("Dropped message:");
      console.warn("Port:");
      console.warn(port);
      console.warn("Message:");
      console.warn(message);
      console.warn(JSON.stringify(message));
      console.groupEnd();
      return;
    }
  }
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

function main() {
  detectVideoInfo(videoInfo => {
    moduleState.videoInfoCache = videoInfo;
    sendVideoInfo();
    console.log(videoInfo)
  });

  waitForVideoElement().then(video => registerVideoElementEvents(video));
  browser.runtime.onMessage.addListener(processRuntimeMessage);
  const port = browser.runtime.connect(undefined, { name: "content-tab" });
  port.onMessage.addListener(processPortMessage);
  moduleState.backgroundServicePort = port;
  sendVideoInfo();

  (globalThis as any).contentModule = Object.freeze({
    moduleState,
    processRuntimeMessage,
    processPortMessage
  });
}

(globalThis as any).contentModule = {
  main
};
