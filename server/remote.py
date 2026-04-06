from asyncio import AbstractEventLoop, get_event_loop, run, wait_for
from dataclasses import asdict
from json import dumps, loads
from socket import IPPROTO_TCP, AddressFamily, SocketKind, socket
from sys import argv, stderr, stdout
from typing import Any, cast

from cli_core import (
    Output,
    OutputDirection,
    RemoteInitialization,
    UserInput,
    UserInputRequest,
)
from configuration import MESSAGE_DELIMITER, REMOTE_CLI_STEP_TIMEOUT, REMOTE_PORT
from remote_cli import recv_line


async def main() -> int:
    loop: AbstractEventLoop = get_event_loop()
    with socket(AddressFamily.AF_INET, SocketKind.SOCK_STREAM, IPPROTO_TCP) as client:
        client.setblocking(False)
        await loop.sock_connect(client, ("127.0.0.1", REMOTE_PORT))

        client.send(dumps(asdict(RemoteInitialization(
            stdout_isatty=stdout.isatty(),
            stderr_isatty=stderr.isatty()
        ))).encode() + MESSAGE_DELIMITER)

        try:
            user_input_request_json: str = (await wait_for(recv_line(client), timeout=REMOTE_CLI_STEP_TIMEOUT)).decode()
        except EOFError:
            print(":Disconncted waiting for user input request", file=stderr)
            return 1
        except TimeoutError:
            print(":Timed our waiting for user input request", file=stderr)
            return 1

        try:
            UserInputRequest(**loads(user_input_request_json))
        except TypeError as e:
            print(f":BAD RESPONSE, {e.__class__.__name__}: {e}", file=stderr)
            return 1

        user_input: UserInput = UserInput(args=argv[1:])
        client.send(dumps(asdict(user_input)).encode() + MESSAGE_DELIMITER)

        try:
            outputs_json: str = (await wait_for(recv_line(client), timeout=REMOTE_CLI_STEP_TIMEOUT)).decode()
        except EOFError:
            print(":Disconncted waiting for user output", file=stderr)
            return 1
        except TimeoutError:
            print(":Timed our waiting for user output", file=stderr)
            return 1

        outputs_unsafe: Any = loads(outputs_json)
        if not isinstance(outputs_unsafe, list):
            print(":Did not receive a list of outputs", file=stderr)
            return 1

        for i in range(len(outputs_unsafe)):
            if not isinstance(outputs_unsafe[i], dict) or any(not isinstance(key, str) for key in outputs_unsafe[i]):
                print(":Did not receive a list of outputs", file=stderr)
                return 1

            try:
                outputs_unsafe[i] = Output(**outputs_unsafe[i])
            except TypeError as e:
                print(f":BAD RESPONSE, {e.__class__.__name__}: {e}", file=stderr)
                return 1
        outputs: list[Output] = cast(list[Output], outputs_unsafe)

        for output in outputs:
            print(output.output, end=output.end, file=stdout if output.direction == OutputDirection.stdout else stderr)

    return 0


if __name__ == "__main__":
    exit(run(main()))
