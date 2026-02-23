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
  SetActiveTabMessage,
  ConnectToServerAsMessage,
  isConnectToServerAsMessage,
  ErrorMessage,
  ServerHandshakeRequestMessage,
  isServerHandshakeMessage,
  ServerHandshakeMessage,
  asType,
  AcknowledgeMessage,
  VideoInfoMessage,
  UserMessage,
  isUserMessage,
  UserDisconnectMessage,
  isUserDisconnectMessage,
  detectUserUpdates,
  isPortAvailableMessage
} from "./types"

const acknowledgeMessage: Readonly<AcknowledgeMessage> = Object.freeze({
  type: MessageTypes.Acknowledge
});

const serviceState: {
  user: User,
  users: Array<User>,
  activeTab: browser.tabs.Tab | null,
  activeTabPort: browser.runtime.Port | null,
  serverConnection: WebSocket | null,
  reconnectToTab: number | null
} = {
  user: structuredClone(userDefaults),
  users: [],
  activeTab: null,
  activeTabPort: null,
  serverConnection: null,
  reconnectToTab: null
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

function broadcastPackagedStateToRuntime(requireReceiver: boolean = false): PackagedServiceStateMessage {
  const packagedServiceStateMessage: PackagedServiceStateMessage = {
    type: MessageTypes.PackagedServiceState,
    packagedServiceState: packageServiceState()
  };
  browser.runtime.sendMessage(packagedServiceStateMessage).catch((err) => {
    if (requireReceiver) {
      throw err;
    }
  });
  return packagedServiceStateMessage;
}

function notifyServerOfVideoInfo() {
  if (serviceState.serverConnection?.readyState !== WebSocket.OPEN) {
    return;
  }

  const videoInfoMessage: VideoInfoMessage = {
    type: MessageTypes.VideoInfo,
    videoInfo: serviceState.user.videoInfo,
    uuid: serviceState.user.uuid
  };
  serviceState.serverConnection.send(JSON.stringify(videoInfoMessage));
}

function notifyServerOfSelf() {
  if (serviceState.serverConnection?.readyState !== WebSocket.OPEN) {
    return;
  }

  const userMessage: UserMessage = {
    type: MessageTypes.User,
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
  serviceState.users = [];
  serviceState.serverConnection = null;
  broadcastPackagedStateToRuntime();
}

function processServerMessage(message: Message) {
  if (serviceState.serverConnection === null) {
    throw new Error("Cannot process server message if serverConnection object does not exist.");
  }

  if (!isGenericMessage(message)) {
    throw new Error("Received unkown message from server");
  }

  if (serviceState.user.uuid === null) {
    if (isErrorMessage(message)) {
      throw new ErrorMessageReceived(message);
    }

    const serverHandshakeMessage: ServerHandshakeMessage | undefined = asType(isServerHandshakeMessage, message);
    if (serverHandshakeMessage === undefined) {
      cleanupServerConnection();
      throw Error("Did not receive server handshake message first before other messages");
    }

    serviceState.user.uuid = serverHandshakeMessage.uuid;
    serviceState.users = serverHandshakeMessage.users;
    serviceState.serverConnection.send(JSON.stringify(acknowledgeMessage));;
    broadcastPackagedStateToRuntime();
    return;
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
    case MessageTypes.User: {
      const userMessage: UserMessage = wellDefinedMessage(
        isUserMessage,
        MessageTypes.User,
        message
      );

      if (userMessage.user.uuid === serviceState.user.uuid) {
        const updates = detectUserUpdates(serviceState.user, userMessage.user);
        if (updates.find(update => [
            "uuid",
            "username",
            "hostingOptions",
            "followingOptions",
            "reconnectToServerOnLoss",
            "videoInfo"
          ].includes(update))
        ) {
          console.error(`Received self user update from server which is not allowed. Updates from server: ${updates.join(", ")}`);
          const errorMessage: ErrorMessage = {
            type: MessageTypes.Error,
            message: "Received self user update from server which is not allowed.",
            sender: `${serviceState.user.uuid}: Background Service Worker`
          };
          serviceState.serverConnection.send(JSON.stringify(errorMessage));
          break;
        }

        serviceState.user = userMessage.user;
        serviceState.serverConnection.send(JSON.stringify(acknowledgeMessage));
      } else {
        const existingIndex = serviceState.users.findIndex(user => user.uuid === userMessage.user.uuid);
        if (existingIndex === -1) {
          serviceState.users.push(userMessage.user);
        } else {
          serviceState.users[existingIndex] = userMessage.user;
        }
      }

      const packagedServiceStateMessage = broadcastPackagedStateToRuntime();
      serviceState.activeTabPort?.postMessage(packagedServiceStateMessage);
      break;
    }
    case MessageTypes.VideoInfo: {
      const videoInfoMessage: VideoInfoMessage = wellDefinedMessage(
        isVideoInfoMessage,
        MessageTypes.VideoInfo,
        message
      );

      if (videoInfoMessage.uuid === null) {
        console.error("Received self video update from server which without uuid.");
        const errorMessage: ErrorMessage = {
          type: MessageTypes.Error,
          message: "Received self video update from server which without uuid.",
          sender: `${serviceState.user.uuid}: Background Service Worker`
        };
        serviceState.serverConnection.send(JSON.stringify(errorMessage));
        break;
      }

      if (videoInfoMessage.uuid === serviceState.user.uuid) {
        console.error("Received self video update for self, from server.");
        const errorMessage: ErrorMessage = {
          type: MessageTypes.Error,
          message: "Received self video update for self, from server.",
          sender: `${serviceState.user.uuid}: Background Service Worker`
        };
        serviceState.serverConnection.send(JSON.stringify(errorMessage));
        break;
      }

      const user = serviceState.users.find(user => user.uuid === videoInfoMessage.uuid);
      if (user === undefined) {
        console.error(`Background service worker-server user(${videoInfoMessage.uuid}) state mismatch.`);
        const errorMessage: ErrorMessage = {
          type: MessageTypes.Error,
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
    case MessageTypes.UserDisconnect: {
      const userDisconnectMessage: UserDisconnectMessage = wellDefinedMessage(
        isUserDisconnectMessage,
        MessageTypes.UserDisconnect,
        message
      );

      if (userDisconnectMessage.uuid === serviceState.user.uuid) {
        throw new Error("User disconnect message for self is undefined.");
      }

      serviceState.users = serviceState.users.filter(user => user.uuid !== userDisconnectMessage.uuid);
      const packagedServiceStateMessage = broadcastPackagedStateToRuntime();
      serviceState.activeTabPort?.postMessage(packagedServiceStateMessage);
      break;
    }
    default: {
      console.group("Dropped message:");
      console.warn("Sender:");
      console.warn(`Server at ${serviceState.serverConnection.url}`);
      console.warn("Message:");
      console.warn(message);
      console.groupEnd();
      break;
    }
  }
}

function processActiveTabMessage(message: Message, port: browser.runtime.Port) {
  if (!isGenericMessage(message)) {
    throw new Error("Recieved unknown message from active tab");
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
      notifyServerOfVideoInfo();
      broadcastPackagedStateToRuntime();
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
    throw new Error("Recieved unknown runtime message");
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

        serviceState.reconnectToTab = null;
        serviceState.activeTab = tab;
        serviceState.activeTabPort = browser.tabs.connect(getTabId(tab), { name: "active-tab" });
        serviceState.activeTabPort.onMessage.addListener(processActiveTabMessage);
        serviceState.activeTabPort.onDisconnect.addListener(() => {
          browser.tabs.get(getTabId(tab)).then(tab => {
            if (tab.url === undefined) {
              return;
            }

            if (new URL(tab.url).origin !== "https://www.youtube.com") {
              console.log("Active tab closed");
              return;
            }

            console.log("Will reconnect to tab soon...");
            serviceState.reconnectToTab = getTabId(tab);
            const TIMEOUT = 30 * 1000;
            const timeoutIntervalId = setInterval(() => {
              clearInterval(timeoutIntervalId);
              if (serviceState.reconnectToTab === null) {
                return;
              }
              serviceState.reconnectToTab = null;
              console.error("Did not reconnect to tab, timed out.");
            }, TIMEOUT);
          }).catch(err => {
            console.log(`Active tab closed: ${err}`);
          });
          serviceState.activeTab = null;
          serviceState.activeTabPort = null;
          serviceState.user.videoInfo = null;
          broadcastPackagedStateToRuntime();
        });
      })();
    }
    case MessageTypes.ConnectToServerAs: {
      if (serviceState.serverConnection !== null) {
        const alreadyConnectedError: ErrorMessage = {
          type: MessageTypes.Error,
          message: "Cannot connect to two server at the same time. Disconnect from current server to switch.",
          sender: "Background Service Worker"
        };
        sendResponse(alreadyConnectedError);
      }

      const connectToServerAsMessage: ConnectToServerAsMessage = wellDefinedMessage(
        isConnectToServerAsMessage,
        MessageTypes.ConnectToServerAs,
        message
      );

      let url: URL;
      try {
        url = new URL(connectToServerAsMessage.url);
      } catch (err) {
        const invalidURLErrorMessage: ErrorMessage = {
          type: MessageTypes.Error,
          message: `The supplied URL was invalid: ${err}`,
          sender: "Background Service Worker"
        }
        sendResponse(invalidURLErrorMessage);
        return;
      }

      let serverConnection: WebSocket;
      try {
        serverConnection = new WebSocket(url);
      } catch (err) {
        const openErrorMessage: ErrorMessage = {
          type: MessageTypes.Error,
          message: `There was an error opening the websocket: ${err}`,
          sender: "Background Service Worker"
        }
        sendResponse(openErrorMessage);
        return;
      }

      serviceState.user.username = connectToServerAsMessage.username;
      serviceState.serverConnection = serverConnection;
      serverConnection.addEventListener("open", (evt) => {
        if (evt.currentTarget !== serviceState.serverConnection) {
          throw new Error("Event registered for a websocket whose reference is old");
        }
        const serverHandshakeRequestMessage: ServerHandshakeRequestMessage = {
          type: MessageTypes.ServerHandshakeRequest,
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
    case MessageTypes.PortAvailable: {
      wellDefinedMessage(isPortAvailableMessage, MessageTypes.PortAvailable, message);
      if (serviceState.reconnectToTab === null) {
        return;
      }

      if (sender.tab === undefined) {
        console.warn(`The following console warning message is a sender which is not a tab that presented as a tab with a port available:`);
        console.warn(sender);
        return;
      }

      if (sender.tab.id !== serviceState.reconnectToTab) {
        return;
      }

      const setActiveTabMessage: SetActiveTabMessage = {
        type: MessageTypes.SetActiveTab,
        tabId: serviceState.reconnectToTab
      };
      serviceState.reconnectToTab = null;
      console.log(`Reconnecting to tab...`);
      processRuntimeMessage(setActiveTabMessage, sender, sendResponse);
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

  /*
  serviceState.user.uuid = "test-uuid";
  serviceState.user.username = "this user";

  serviceState.users.push({
    ...serviceState.user,
    uuid: "test-mimic-uuuid",
    username: "this user mimic",
    followingUUID: serviceState.user.uuid
  });
  serviceState.user.followerUUIDs = ["test-mimic-uuid"];
  */

  (globalThis as any).backgroundSerivce = Object.freeze({
    serviceState,
    processRuntimeMessage,
    setCurrentTabAsActiveTab,
    getAllTabs: () => browser.tabs.query({})
  });
}

main();