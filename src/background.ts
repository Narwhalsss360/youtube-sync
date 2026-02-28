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
  isPortAvailableMessage,
  isUsersMessage,
  FollowMessage,
  isFollowMessage,
  PendingMessage,
  GenericMessage,
  StopFollowingMessage,
  isStopFollowingMessage,
  isRequestVideoInfoMessage,
  isDisconnectFromServerMessage,
  wellDefined,
  isKeepAliveMessage
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
  reconnectToTab: number | null,
  pendingServerRequests: Array<GenericMessage>,
  availableTabIds: Set<number>
} = {
  user: structuredClone(userDefaults),
  users: [],
  activeTab: null,
  activeTabPort: null,
  serverConnection: null,
  reconnectToTab: null,
  pendingServerRequests: [],
  availableTabIds: new Set()
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
    serverAddress: serviceState.serverConnection?.url ?? null,
    pendingServerRequests: serviceState.pendingServerRequests,
    availableTabIds: Array.from(serviceState.availableTabIds)
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

function processSelfUpdateFromServer(user: User, broadcast: boolean = false): void {
  if (user.uuid !== serviceState.user.uuid) {
    throw new Error("This function is only valid for self");
  }

  if (serviceState.serverConnection?.readyState !== WebSocket.OPEN) {
    throw new Error("This function requires a connection to the server.");
  }

  const updates = detectUserUpdates(serviceState.user, user);
  const pendingFollowingChangesIndex = serviceState.pendingServerRequests.findIndex(pending => [MessageTypes.Follow, MessageTypes.StopFollowing].includes(pending.type));
  if (pendingFollowingChangesIndex !== -1) {
    serviceState.pendingServerRequests.splice(pendingFollowingChangesIndex, 1);
  }

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
  }

  serviceState.user.connectionQuality = user.connectionQuality;
  serviceState.user.followerUUIDs = user.followerUUIDs;
  serviceState.user.followingUUID = user.followingUUID;

  if (broadcast) {
    const packagedServiceStateMessage = broadcastPackagedStateToRuntime();
    serviceState.activeTabPort?.postMessage(packagedServiceStateMessage);
    serviceState.serverConnection.send(JSON.stringify(acknowledgeMessage));
  }
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
  serviceState.user.followingUUID = null;
  serviceState.user.followerUUIDs = [];
  serviceState.users = [];
  serviceState.serverConnection = null;
  serviceState.pendingServerRequests = [];
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
    const packagedServiceStateMessage = broadcastPackagedStateToRuntime();
    serviceState.activeTabPort?.postMessage(packagedServiceStateMessage);
    return;
  }

  switch (message.type) {
    case MessageTypes.Error: {
      if (serviceState.pendingServerRequests.length > 0) {
        console.error("The following pending request returned an error");
        console.error(serviceState.pendingServerRequests.pop());
      }
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


      if (serviceState.user.uuid === userMessage.user.uuid) {
        processSelfUpdateFromServer(userMessage.user, true);
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
    case MessageTypes.Users: {
      const usersMessage = wellDefinedMessage(
        isUsersMessage,
        MessageTypes.Users,
        message
      );

      serviceState.users = [];
      for (const user of usersMessage.users) {
        if (user.uuid === serviceState.user.uuid) {
          processSelfUpdateFromServer(user, false);
        } else {
          serviceState.users.push(user);
        }
      }
      const packagedServiceStateMessage = broadcastPackagedStateToRuntime();
      serviceState.activeTabPort?.postMessage(packagedServiceStateMessage);
      serviceState.serverConnection.send(JSON.stringify(acknowledgeMessage));
      break;
    }
    case MessageTypes.RequestVideoInfo: {
      wellDefinedMessage(isRequestVideoInfoMessage, MessageTypes.RequestVideoInfo, message);
      if (serviceState.activeTabPort === null) {
        if (serviceState.user.videoInfo !== null) {
          serviceState.user.videoInfo = null;
        }
        broadcastPackagedStateToRuntime();
        notifyServerOfVideoInfo();
        return;
      }

      serviceState.activeTabPort.postMessage(message);
      break;
    }
    case MessageTypes.KeepAlive: {
      wellDefinedMessage(isKeepAliveMessage, MessageTypes.KeepAlive, message);
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
      const packagedServiceStateMessage = broadcastPackagedStateToRuntime();
      serviceState.activeTabPort?.postMessage(packagedServiceStateMessage);
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
            return;
          }
        }

        if (serviceState.activeTab) {
          serviceState.activeTabPort = serviceState.activeTabPort as browser.runtime.Port;
          serviceState.activeTabPort.disconnect();
        }

        if (tab === undefined) {
          serviceState.activeTab = null;
          serviceState.activeTabPort = null;
          broadcastPackagedStateToRuntime();
          return;
        }
        setActiveTabMessage.tabId = wellDefined(
          setActiveTabMessage.tabId,
          Error("tab === undefined is used as a sentinel value to represent whether setActiveTabMessage.tabId was null")
        );

        if (tab.url === undefined) {
          console.error("Invalid tab.");
          return;
        }

        if (new URL(tab.url).origin !== "https://www.youtube.com") {
          const errorMessage: ErrorMessage = {
            type: MessageTypes.Error,
            message: "Cannot set as active tab, not a youtube tab.",
            sender: "Background Service Worker"
          };
          sendResponse(errorMessage);
          return;
        }

        if (tab.status !== "complete") {
          const errorMessage: ErrorMessage = {
            type: MessageTypes.Error,
            message: "Cannot set as active tab, loading not complete.",
            sender: "Background Service Worker"
          };
          sendResponse(errorMessage);
          return;
        }

        if (tab.id === browser.tabs.TAB_ID_NONE) {
          const errorMessage: ErrorMessage = {
            type: MessageTypes.Error,
            message: "Cannot set as active tab, this tab does not host content.",
            sender: "Background Service Worker"
          };
          sendResponse(errorMessage);
          return;
        }

        if (!serviceState.availableTabIds.has(setActiveTabMessage.tabId)) {
          const errorMessage: ErrorMessage = {
            type: MessageTypes.Error,
            message: "Cannot set as active tab, this tab does not host content.",
            sender: "Background Service Worker"
          };
          sendResponse(errorMessage);
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
          notifyServerOfVideoInfo();
        });
        broadcastPackagedStateToRuntime();
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
    case MessageTypes.DisconnectFromServer: {
      wellDefinedMessage(isDisconnectFromServerMessage, MessageTypes.DisconnectFromServer, message);
      if (serviceState.serverConnection === null) {
        const errorMessage: ErrorMessage = {
          type: MessageTypes.Error,
          message: "Not connected to a server",
          sender: "Background Service Worker"
        }
        sendResponse(errorMessage);
        return
      }
      serviceState.serverConnection.close();
      break;
    }
    case MessageTypes.PortAvailable: {
      wellDefinedMessage(isPortAvailableMessage, MessageTypes.PortAvailable, message);
      if (sender.tab?.id === undefined) {
        return;
      }

      serviceState.availableTabIds.add(sender.tab.id);
      broadcastPackagedStateToRuntime();

      if (serviceState.reconnectToTab === null) {
        return;
      }

      if (sender.tab === undefined) {
        console.warn(`The following console warning message is a sender which is not a tab that presented as a tab with a port available:`);
        console.warn(sender);
        return;
      }

      if (sender.tab.id === undefined) {
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
    case MessageTypes.Follow: {
      const followMessage: FollowMessage = wellDefinedMessage(
        isFollowMessage,
        MessageTypes.Follow,
        message
      );

      if (serviceState.serverConnection?.readyState !== WebSocket.OPEN) {
        const errorMessage: ErrorMessage = {
          type: MessageTypes.Error,
          message: "A connection to the server is required for this request",
          sender: "Background Service Worker"
        }
        sendResponse(errorMessage);
        return;
      }

      if (serviceState.user.followingUUID !== null) {
        const errorMessage: ErrorMessage = {
          type: MessageTypes.Error,
          message: "Already following, to switch stop following first",
          sender: "Background Service Worker"
        }
        sendResponse(errorMessage);
        return;
      }

      if (serviceState.user.followingUUID === serviceState.user.uuid) {
        const errorMessage: ErrorMessage = {
          type: MessageTypes.Error,
          message: "Cannot follow self.",
          sender: "Background Service Worker"
        }
        sendResponse(errorMessage);
        return;
      }

      if (serviceState.pendingServerRequests.find(pending => [MessageTypes.Follow, MessageTypes.StopFollowing].includes(pending.type))) {
        const errorMessage: ErrorMessage = {
          type: MessageTypes.Error,
          message: "Request to follow/stop following already pending.",
          sender: "Background Service Worker"
        }
        sendResponse(errorMessage);
        return;
      }

      const packagedServiceStateMessage = broadcastPackagedStateToRuntime();
      serviceState.activeTabPort?.postMessage(packagedServiceStateMessage);
      serviceState.serverConnection.send(JSON.stringify(followMessage));
      serviceState.pendingServerRequests.push(followMessage);
      const pendingMessage: PendingMessage = {
        type: MessageTypes.Pending
      };
      sendResponse(pendingMessage);
      break;
    }
    case MessageTypes.StopFollowing: {
      const stopFollowingMessage: StopFollowingMessage = wellDefinedMessage(
        isStopFollowingMessage,
        MessageTypes.StopFollowing,
        message
      );

      if (serviceState.serverConnection?.readyState !== WebSocket.OPEN) {
        const errorMessage: ErrorMessage = {
          type: MessageTypes.Error,
          message: "A connection to the server is required for this request",
          sender: "Background Service Worker"
        }
        sendResponse(errorMessage);
        return;
      }

      if (serviceState.user.followingUUID === null) {
        const errorMessage: ErrorMessage = {
          type: MessageTypes.Error,
          message: "Already not following",
          sender: "Background Service Worker"
        }
        sendResponse(errorMessage);
        return;
      }

      if (serviceState.pendingServerRequests.find(pending => [MessageTypes.Follow, MessageTypes.StopFollowing].includes(pending.type))) {
        const errorMessage: ErrorMessage = {
          type: MessageTypes.Error,
          message: "Request to follow/stop following already pending.",
          sender: "Background Service Worker"
        }
        sendResponse(errorMessage);
        return;
      }

      const packagedServiceStateMessage = broadcastPackagedStateToRuntime();
      serviceState.activeTabPort?.postMessage(packagedServiceStateMessage);
      serviceState.serverConnection.send(JSON.stringify(stopFollowingMessage));
      serviceState.pendingServerRequests.push(stopFollowingMessage);
      const pendingMessage: PendingMessage = {
        type: MessageTypes.Pending
      };
      sendResponse(pendingMessage);
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

function tabUpdated(tabId: number, changeInfo: any, tab: browser.tabs.Tab): void {
  if (!serviceState.availableTabIds.has(tabId)) {
    return;
  }

  function isStillAvailable() {
    if (tab.status !== "complete") {
      return false;
    }

    if (tab.url === undefined) {
      return false;
    }

    if (new URL(tab.url).origin !== "https://www.youtube.com") {
      return false;
    }

    return true;
  }

  if (isStillAvailable()) {
    return;
  }

  serviceState.availableTabIds.delete(tabId);
  broadcastPackagedStateToRuntime();
}

function tabRemoved(tabId: number, removeInfo: any): void {
  if (serviceState.availableTabIds.has(tabId)) {
    serviceState.availableTabIds.delete(tabId);
    broadcastPackagedStateToRuntime();
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
  browser.tabs.onUpdated.addListener(tabUpdated);
  browser.tabs.onRemoved.addListener(tabRemoved);

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