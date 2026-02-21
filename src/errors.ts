import { ErrorMessage, MessageTypes } from "./types";

export class ErrorMessageReceived extends Error {
  constructor(errorMessage: ErrorMessage, options?: ErrorOptions) {
    super(`Recieved error message from ${errorMessage.sender}: ${errorMessage.message}`, options);
  }
}

export class UnexpectedMessageTypeError extends Error {
  constructor(expected: string, received: string, options?: ErrorOptions) {
    if (received === MessageTypes.Error) {
      throw new Error(`Unprocessed error message expecting ${expected}.`);
    }
    super(`Expected '${expected}' message type but received '${received}'.`, options);
  }
}