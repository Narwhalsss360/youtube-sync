import browser = chrome;
import { isPackagedServiceStateMessage, MessageTypes, PackagedServiceState, PackagedServiceStateMessage,wellDefinedMessage } from "./types";

let packagedServiceState: PackagedServiceState;

async function main() {
  const packagedServiceState = wellDefinedMessage(
    isPackagedServiceStateMessage,
    MessageTypes.PackagedServiceState,
    await browser.runtime.sendMessage({ type: MessageTypes.RequestPackagedServiceState })
  ).packagedServiceState;

  console.log(packagedServiceState);
}

const i = setInterval(
  () => {
    clearInterval(i);
    main();
  },
  4000
)