import browser = chrome;
import { ErrorMessageReceived }  from "./errors";
import {  isErrorMessage, isGenericMessage, isPackagedServiceStateMessage, Message, MessageTypes, PackagedServiceState, PlaybackState, PortAvailableMessage, SetActiveTabMessage, VideoInfo, VideoInfoMessage, wellDefinedMessage } from "./types";

const moduleState: {
  isActiveTab: () => boolean,
  videoInfoCache: VideoInfo | null
  backgroundServicePort: browser.runtime.Port | null,
  packagedServiceState: PackagedServiceState | null
} = {
  isActiveTab: () => moduleState.backgroundServicePort !== null,
  videoInfoCache: null,
  backgroundServicePort: null,
  packagedServiceState: null
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
  return new Promise((resolve, reject) => {
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
        !videoElement
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

function sendVideoInfo() {
  if (!moduleState.isActiveTab() || moduleState.videoInfoCache === null || moduleState.backgroundServicePort == null) {
    return;
  }

  const videoInfoMessage: VideoInfoMessage = {
    type: MessageTypes.VideoInfo,
    videoInfo: moduleState.videoInfoCache,
    uuid: null
  };
  moduleState.backgroundServicePort.postMessage(videoInfoMessage);
}

function getStateAndSend(evt: Event) {
  if (moduleState.videoInfoCache === null) {
    return;
  }

  const video = evt.target as HTMLVideoElement;
  moduleState.videoInfoCache.playbackInfo.state = videoPlaybackState(video);
  moduleState.videoInfoCache.playbackInfo.currentTime = video.currentTime;
  moduleState.videoInfoCache.playbackInfo.playbackRate = video.playbackRate;
  sendVideoInfo();
}

function registerVideoElementEvents(video: HTMLVideoElement): void {
  video.addEventListener("playing", getStateAndSend);
  video.addEventListener("pause", getStateAndSend);
  video.addEventListener("waiting", getStateAndSend);
  video.addEventListener("ratechange", getStateAndSend);
  video.addEventListener("timeupdate", getStateAndSend);
}

function removeVideoElementEvents(video: HTMLVideoElement): void {
  video.removeEventListener("playing", getStateAndSend);
  video.removeEventListener("pause", getStateAndSend);
  video.removeEventListener("waiting", getStateAndSend);
  video.removeEventListener("ratechange", getStateAndSend);
  video.removeEventListener("timeupdate", getStateAndSend);
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
      await onVideoInfoChanged(null);
      return;
    }

    if (isMiniplayer(video)) {
      video.dispatchEvent(expandPlayerKeyboardEvent);
    }

    await onVideoInfoChanged(await waitForMetadata());
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
      break;
    }
    default: {
      console.group("Dropped message:");
      console.warn("Port:");
      console.warn(port);
      console.warn("Message:");
      console.warn(message);
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

  browser.runtime.onMessage.addListener(processRuntimeMessage);
  browser.runtime.onConnect.addListener(port => {
    if (port.name !== "active-tab") {
      throw Error(`Received unknown port connect request: ${port.name}`);
    }
    port.onMessage.addListener(processPortMessage);
    moduleState.backgroundServicePort = port;
    sendVideoInfo();
    waitForVideoElement().then(video => registerVideoElementEvents(video));
    console.log("Is active YouTube Sync tab.");
    port.onDisconnect.addListener(() => {
      waitForVideoElement().then(video => removeVideoElementEvents(video));
      moduleState.backgroundServicePort = null;
      console.log("Is no longer active YouTube Sync tab.");
    });
  });

  const portAvailableMessage: PortAvailableMessage = {
    type: MessageTypes.PortAvailable
  };
  browser.runtime.sendMessage(portAvailableMessage);

  (globalThis as any).contentModule = Object.freeze({
    moduleState,
    processRuntimeMessage,
    processPortMessage
  });
}

(globalThis as any).contentModule = {
  main
};