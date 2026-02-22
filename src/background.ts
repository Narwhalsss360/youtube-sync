import { ErrorMessageReceived } from "./errors";
import browser = chrome;
import {
  isErrorMessage,
  MessageTypes,
  PackagedServiceState,
  PackagedServiceStateMessage,
  User,
  userDefaults,
  isGenericMessage,
  Message,
  wellDefinedMessage,
  isSetActiveTabMessage,
  isVideoInfoMessage,
  SetActiveTabMessage
} from "./types"

const serviceState: {
  user: User,
  users: Array<User>,
  activeTab: browser.tabs.Tab | null,
  activeTabPort: browser.runtime.Port | null,
  serverConnection: WebSocket | null
} = {
  user: structuredClone(userDefaults),
  users: [],
  activeTab: null,
  activeTabPort: null,
  serverConnection: null
};

function getTabId(tab: browser.tabs.Tab): number {
  if (!tab.id) {
    throw Error("Tab does not have a ID.");
  }
  return tab.id;
}

function packageServiceState(): PackagedServiceState {
  return {
    user: serviceState.user,
    users: serviceState.users,
    activeTabId: serviceState.activeTab?.id ?? null,
    serverAddress: serviceState.serverConnection?.url ?? null
  };
}

function processActiveTabMessage(message: Message, port: browser.runtime.Port) {
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
    case MessageTypes.VideoInfo: {
      const videoInfoMessage = wellDefinedMessage(
        isVideoInfoMessage,
        MessageTypes.VideoInfo,
        message
      );
      serviceState.user.videoInfo = videoInfoMessage.videoInfo;
      (serviceState.users[0] as User).videoInfo = videoInfoMessage.videoInfo;

      const packagedServiceStateMessage: PackagedServiceStateMessage = {
        type: MessageTypes.PackagedServiceState,
        packagedServiceState: packageServiceState()
      };
      browser.runtime.sendMessage(packagedServiceStateMessage).catch(() => { });
      break;
    }
    default: {
      console.group("Dropped message:");
      console.warn("Sender:");
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
    case MessageTypes.RequestPackagedServiceState: {
      const packagedServiceStateMessage: PackagedServiceStateMessage = {
        type: MessageTypes.PackagedServiceState,
        packagedServiceState: packageServiceState()
      };
      sendResponse(packagedServiceStateMessage);
      return;
    }
    case MessageTypes.SetActiveTab: {
      const setActiveTabMessage = wellDefinedMessage(
        isSetActiveTabMessage,
        MessageTypes.SetActiveTab,
        message
      );

      if (serviceState.activeTab?.id === setActiveTabMessage.tabId) {
        return;
      }

      return (async () => {
        let tab = undefined;
        if (setActiveTabMessage.tabId) {
          try {
            tab = await browser.tabs.get(setActiveTabMessage.tabId);
          } catch (err) {
            console.error(`Tab ${setActiveTabMessage.tabId} does not exist.`);
          }
        }

        if (serviceState.activeTab) {
          serviceState.activeTabPort = serviceState.activeTabPort as browser.runtime.Port;
          serviceState.activeTabPort.disconnect();
        }

        if (tab === undefined) {
          serviceState.activeTab = null;
          serviceState.activeTabPort = null;
          return;
        }

        serviceState.activeTab = tab;
        serviceState.activeTabPort = browser.tabs.connect(getTabId(tab), { name: "active-tab" });
        serviceState.activeTabPort.onMessage.addListener(processActiveTabMessage);
        serviceState.activeTabPort.onDisconnect.addListener(() => {
          serviceState.activeTab = null;
          serviceState.activeTabPort = null;
          serviceState.user.videoInfo = null;
        });
      })();
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

    const setActiveTabMessage: SetActiveTabMessage = {
      type: MessageTypes.SetActiveTab,
      tabId: candidate.id
    };
    processRuntimeMessage(
      setActiveTabMessage,
      {},
      () => {}
    );
    return;
  }

  throw Error("There were no candidate tabs to be set as active tabs.");
}

function main() {
  browser.runtime.onMessage.addListener(processRuntimeMessage);

  serviceState.user.uuid = "test-uuid";
  serviceState.user.username = "this user";

  serviceState.users.push({
    ...serviceState.user,
    uuid: "test-mimic-uuuid",
    username: "this user mimic",
    followingUUID: serviceState.user.uuid
  });
  serviceState.user.followerUUIDs = ["test-mimic-uuid"];

  (globalThis as any).backgroundSerivce = Object.freeze({
    serviceState,
    processRuntimeMessage,
    setCurrentTabAsActiveTab,
    getAllTabs: () => browser.tabs.query({})
  });
}

main();