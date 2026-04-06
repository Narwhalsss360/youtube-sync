from asyncio import (
    AbstractEventLoop,
    Task,
    create_task,
    get_event_loop,
    iscoroutine,
    wait_for,
)
from dataclasses import asdict
from json import dumps, loads
from logging import Logger
from socket import IPPROTO_TCP, AddressFamily, SocketKind, socket
from sys import stderr, stdout
from typing import Any

from cli_core import (
    CLIContext,
    CommandResult,
    Output,
    OutputDirection,
    RemoteInitialization,
    UserError,
    UserInput,
    UserInputRequest,
    cli_retval_return_value,
    format_exc,
)
from configuration import MESSAGE_DELIMITER, REMOTE_CLI_STEP_TIMEOUT, REMOTE_PORT
from core import YouTubeSyncServer
from npycli import CLI, CLIError, EmptyEntriesError


async def recv_line(sock: socket) -> bytearray:
    received: bytearray = bytearray()
    loop: AbstractEventLoop = get_event_loop()

    while True:
        b: bytes = await loop.sock_recv(sock, 1)
        if not b:
            raise EOFError()

        if b[0] == ord('\n'):
            break
        received.append(b[0])

    return received


async def remote_cli(cli_context: CLIContext) -> int:
    ytsync_cli: CLI = cli_context.ytsync_cli
    ytsync_server: YouTubeSyncServer = cli_context.ytsync_server
    logger: Logger = cli_context.logger

    def log_prefix(s: Any) -> str:
        return f"[{remote_cli.__name__}] {s}"

    loop: AbstractEventLoop = get_event_loop()

    with socket(AddressFamily.AF_INET, SocketKind.SOCK_STREAM, IPPROTO_TCP) as listener:
        listener.setblocking(False)
        listener.bind(("127.0.0.1", REMOTE_PORT))
        listener.listen(1)

        while ytsync_server.websocket_server.is_serving():
            accept_task = create_task(loop.sock_accept(listener))
            ytsync_server.websocket_server.closed_waiter.add_done_callback(lambda _: accept_task.cancel())
            client, client_addr = await accept_task
            logger.info(f"{client_addr} connected.")

            try:
                initialization_json: str = (await wait_for(recv_line(client), timeout=REMOTE_CLI_STEP_TIMEOUT)).decode()
            except EOFError:
                logger.info(log_prefix("Disconnected"))
                client.close()
                continue
            except TimeoutError:
                logger.error(log_prefix("Timed our waiting for initialization"))
                continue

            try:
                initialization: RemoteInitialization = RemoteInitialization(**loads(initialization_json))
            except TypeError as e:
                logger.error(log_prefix(e))
                client.close()
                continue
            logger.info(log_prefix(f"{remote_cli.__name__}> {initialization}"))

            request: UserInputRequest = UserInputRequest(prompt=ytsync_cli.prompt_entry_marker)
            client.send(dumps(asdict(request)).encode() + MESSAGE_DELIMITER)
            logger.info(log_prefix(f"{remote_cli.__name__}> {request}"))

            try:
                user_input_json: str = (await wait_for(recv_line(client), timeout=REMOTE_CLI_STEP_TIMEOUT)).decode()
            except EOFError:
                logger.info(log_prefix("Disconnected"))
                client.close()
                continue
            except TimeoutError:
                logger.error(log_prefix("Timed our waiting for user input"))
                continue

            try:
                user_input: UserInput = UserInput(**loads(user_input_json))
            except TypeError as e:
                logger.error(log_prefix(e))
                client.close()
                continue

            return_value: Any = None
            try:
                command, return_value = cli_retval_return_value(ytsync_cli.exec(user_input.args))
                if iscoroutine(return_value):
                    task: Task[Any] = create_task(return_value)
                    ytsync_server.websocket_server.closed_waiter.add_done_callback(lambda _: task.cancel())
                    return_value = await task
                outputs: list[Output]
                if isinstance(return_value, CommandResult):
                    outputs = return_value.outputs
                    for log in return_value.logs:
                        logger.handle(log)
                    for output in return_value.outputs:
                        print(output.output, end=output.end, file=stdout if output.direction == OutputDirection.stdout else stderr)
                elif return_value is not None:
                    outputs = [Output(OutputDirection.stdout, str(return_value))]
                else:
                    outputs = []

                response: list[dict[str, str]] = [asdict(output) for output in outputs]
                client.send(dumps(response).encode() + MESSAGE_DELIMITER)
                logger.info(log_prefix(f"< ({command.name}) {response}"))
            except EmptyEntriesError as err:
                response = [asdict(Output(
                    OutputDirection.stderr,
                    f"{err.__class__.__name__}: {err.args[0]}"
                ))]
                logger.info(log_prefix(f"< {response}"))
                client.send(dumps(response).encode() + MESSAGE_DELIMITER)
            except (CLIError, UserError) as err:
                response = [asdict(Output(
                    OutputDirection.stderr,
                    f"{err.__class__.__name__}: {err.args[0]}"
                ))]
                logger.error(format_exc(err))
                logger.info(log_prefix(f"< {response}"))
                client.send(dumps(response).encode() + MESSAGE_DELIMITER)
            finally:
                client.close()

    return 0
