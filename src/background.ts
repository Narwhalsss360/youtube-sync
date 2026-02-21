import browser = chrome;
import {
  MessageTypes,
  PackagedServiceState,
  PackagedServiceStateMessage,
  User,
  userDefaults
} from "./types"

const serviceState: {
  user: User,
  users: Array<User>,
  activeTab: browser.tabs.Tab | null,
  serverConnection: WebSocket | null
} = {
  user: structuredClone(userDefaults),
  users: [],
  activeTab: null,
  serverConnection: null
};

function packageServiceState(): PackagedServiceState {
  return {
    user: serviceState.user,
    users: serviceState.users,
    activeTabId: serviceState.activeTab?.id ?? null,
    serverAddress: serviceState.serverConnection?.url ?? null
  };
}

function processRuntimeMessage(
  message: any,
  sender: browser.runtime.MessageSender,
  sendResponse: (response?: any) => void
): boolean | Promise<any> | undefined {
  if (!("type" in message)) {
    throw new Error("Recieved unknown message");
  }

  switch (message.type) {
    case MessageTypes.RequestPackagedServiceState: {
      const packagedServiceStateMessage: PackagedServiceStateMessage = {
        type: MessageTypes.PackagedServiceState,
        packagedServiceState: packageServiceState()
      };
      sendResponse(packagedServiceStateMessage);
      return;
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

chrome.runtime.onMessage.addListener(processRuntimeMessage);

(globalThis as any).backgroundSerivce = Object.freeze({
  serviceState
});