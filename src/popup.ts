import browser = chrome;
import { UnexpectedMessageTypeError } from "./errors";
import { GenericMessage, MessageTypes, PackagedServiceState, PackagedServiceStateMessage } from "./types";

let packagedServiceState: PackagedServiceState;

async function main() {
  const packagedServiceStateMessage: GenericMessage = await browser.runtime.sendMessage({
    type: MessageTypes.RequestPackagedServiceState
  });

  if (packagedServiceStateMessage.type !== MessageTypes.PackagedServiceState) {
    throw new UnexpectedMessageTypeError(MessageTypes.PackagedServiceState, packagedServiceStateMessage.type);
  }

  packagedServiceState = (packagedServiceStateMessage as PackagedServiceStateMessage).packagedServiceState;

  console.log(packagedServiceStateMessage);
}

main()