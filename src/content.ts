import { PlaybackState, VideoInfo } from "./types";

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
    PlaybackState.Waiting;
  }

  return video.currentTime > 0 && !video.paused, !video.ended ?
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
            reject("timed out");
          }, TIMEOUT);
        } else {
          videoElement.addEventListener("loadeddata", () => {
            const interval = setInterval(() => {
              clearInterval(interval);
              reject("timed out");
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

let video = document.querySelector("video");
function detectVideoInfo(onVideoInfoChanged: (videoInfo: VideoInfo | null) => void) {
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

function main() {
  detectVideoInfo(videoInfo => console.log(videoInfo));
}

(globalThis as any).contentMain = main;