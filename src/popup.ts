import browser = chrome;
import { UnexpectedMessageDataError, UnexpectedMessageTypeError } from "./errors";
import { GenericMessage, isPackagedServiceState, MessageTypes, PackagedServiceState, PackagedServiceStateMessage, propertyAsType } from "./types";

let packagedServiceState: PackagedServiceState;

async function main() {
  const packagedServiceStateMessage: GenericMessage = await browser.runtime.sendMessage({
    type: MessageTypes.RequestPackagedServiceState
  });

  if (packagedServiceStateMessage.type !== MessageTypes.PackagedServiceState) {
    throw new UnexpectedMessageTypeError(MessageTypes.PackagedServiceState, packagedServiceStateMessage.type);
  }

  packagedServiceState =
    propertyAsType(isPackagedServiceState, packagedServiceStateMessage, "packagedServiceState") ??
    (() => { throw new UnexpectedMessageDataError("Expected packagedServiceState"); })();

  console.log(packagedServiceStateMessage);
}

const i = setInterval(
  () => {
    clearInterval(i);
    main();
  },
  4000
)