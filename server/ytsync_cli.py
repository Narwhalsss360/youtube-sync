from __future__ import annotations

import asyncio
import datetime
import logging
import subprocess
from asyncio import (
    AbstractEventLoop,
    CancelledError,
    Task,
    create_task,
    gather,
    get_event_loop,
    iscoroutine,
    run,
    to_thread,
    wait_for,
)
from dataclasses import Field, asdict, dataclass, field, fields, is_dataclass
from enum import Enum
from functools import partial
from io import StringIO
from json import dumps, loads
from logging import Handler, LogRecord
from multiprocessing import Process, Queue
from os import get_terminal_size, kill
from pathlib import Path
from shlex import split
from signal import SIGINT
from socket import IPPROTO_TCP, AddressFamily, SocketKind, socket
from sys import argv, stderr, stdout
from typing import Annotated, Any, Callable, Coroutine, Literal, Optional, TextIO

import npycli  # pyright: ignore[reportMissingTypeStubs]

from npycli import (  # pyright: ignore[reportMissingTypeStubs]
    CLI,
    Alias,
    CLIError,
    Command,
    DefaultPreview,
    Description,
    EmptyEntriesError,
    ParsingError,
)
from npycli.ansi import (  # pyright: ignore[reportMissingTypeStubs]
    BACKGROUND_BLUE,
    BACKGROUND_RED,
    BACKGROUND_YELLOW,
    CURSOR_DOWN,
    CURSOR_UP,
    INSERT_NEW_LINE,
    RESTORE_SAVED_CURSOR_POSITION,
    SAVE_CURRENT_CURSOR_POSITION,
    SCR_RESET,
    SELECT_CHARACTER_RENDITION,
    SET_BOLD_MODE,
    send_ansi,
    strip_ansi,
)
from npycli.errors import causes
from npycli.parameters import (  # pyright: ignore[reportMissingTypeStubs]
    BypassParse,
    CommandParameter,
)
from npycli.parsing import (  # pyright: ignore[reportMissingTypeStubs]
    create_enum_parser,
    create_literal_parser,
)
from websockets.asyncio.server import Server
from configuration import (
    DEFAULT_LOG_PATH,
    MESSAGE_DELIMITER,
    REMOTE_CLI_STEP_TIMEOUT,
    REMOTE_PORT,
)
from core import connected_users_by_uuid, send_to, ytsync, YouTubeSyncServer
from ytsync_types import Notification, NotifyMessage, User

logger = logging.getLogger()
logger.setLevel(logging.DEBUG)


class LevelNames(int, Enum):
    critical = 50
    fatal = 50
    error = 40
    warning = 30
    warn = 30
    info = 20
    debug = 10
    notset = 0


def input_async_process_target(queue: Queue[str]) -> None:
    with open(0, "r") as stdin:
        try:
            queue.put(stdin.readline().rsplit("\n", 1)[0])
        except KeyboardInterrupt:
            return


async def input_async(prompt: object = None) -> str:
    user_input_queue: Queue[str] = Queue(1)

    proc: Process = Process(target=input_async_process_target, args=(user_input_queue,), name="server:input", daemon=True)
    print(prompt, end="", flush=True)
    proc.start()
    assert proc.pid is not None

    try:
        join_task: Task[None] = create_task(to_thread(proc.join))
        while user_input_queue.empty() and not join_task.done():
            await asyncio.sleep(0.02)
    except CancelledError:
        kill(proc.pid, SIGINT)
        raise

    if user_input_queue.empty():
        raise EOFError

    return user_input_queue.get()


def print_above(*args: Any, max_columns: int, sep: str | None = " ", file: TextIO = stdout, current_is_empty: bool = False, lines_above: int = 1) -> None:
    if lines_above == 0:
        print(*args, sep=sep)
        return

    # Use print with file=buffer so this function can be used just like regular print
    buffer: StringIO = StringIO()
    print(*args, sep=sep, end="", file=buffer, flush=True)
    output: str = buffer.getvalue()

    line_count: int = 1
    line_length: int = 0
    for c in strip_ansi(output):
        line_length += 1
        if line_length == max_columns or c == "\n":
            line_count += 1
            line_length = 0

    send_ansi(SAVE_CURRENT_CURSOR_POSITION, flush=True)
    if current_is_empty:
        print("\n" * lines_above, file=file, end="", flush=True)
        send_ansi(CURSOR_UP.with_args(lines_above), file=file, flush=True)

    # These ansi control commands may be supplied with arguments
    print("\n" * line_count, file=file, end="", flush=True)
    send_ansi(CURSOR_UP.with_args(line_count + lines_above - (0 if current_is_empty else 1)), file=file, flush=True)
    # This one doesn't have argument, so we just repeat the command
    send_ansi(INSERT_NEW_LINE, repeat=line_count, file=file, flush=True)

    # Flush, just in case current cursor position gets moved after output
    print(output, end='', file=file, flush=True)
    send_ansi(RESTORE_SAVED_CURSOR_POSITION, file=file, flush=True)
    send_ansi(CURSOR_DOWN.with_args(line_count), file=file, flush=True)


def emit_record_fmt(ansi: bool, record: LogRecord) -> str:
    scr: str
    scr_reset: str = str(SELECT_CHARACTER_RENDITION.with_args(SCR_RESET)) if ansi else ""
    if record.levelno <= LevelNames.info:
        scr = str(SELECT_CHARACTER_RENDITION.with_args(BACKGROUND_BLUE)) if ansi else ""
    elif record.levelno <= LevelNames.warning:
        scr = str(SELECT_CHARACTER_RENDITION.with_args(SET_BOLD_MODE, BACKGROUND_YELLOW)) if ansi else ""
    else:
        scr = str(SELECT_CHARACTER_RENDITION.with_args(SET_BOLD_MODE, BACKGROUND_RED)) if ansi else ""

    msg = (
        f"{scr}{datetime.datetime.now().isoformat()} {record.levelname}:{scr_reset} "
        f"{record.getMessage()}"
    )

    return msg


class CommandLineInterfaceHandler(Handler):
    def __init__(self) -> None:
        super().__init__(logging.NOTSET)
        self.command_result_logging: bool = False

    def emit(self, record: LogRecord) -> None:
        try:
            file: TextIO
            if record.levelno <= LevelNames.info:
                file = stdout
            elif record.levelno <= LevelNames.warning:
                file = stdout
            else:
                file = stderr

            msg: str = emit_record_fmt(file.isatty(), record)
            printer = print if self.command_result_logging else partial(print_above, max_columns=get_terminal_size().columns)
            printer(msg, file=file)
        except Exception:
            self.handleError(record)


def format_exc(e: BaseException, tabstr: str = "  ", inner_exc_tabs: int = 1) -> str:
    return (
        f"{e.__class__.__name__}: {f"\n{tabstr * inner_exc_tabs}".join(str(arg) for arg in e.args)}"
        f"{format_exc(e.__cause__, tabstr, inner_exc_tabs + 1) if e.__cause__ else ""}"
    )


cli_handler: CommandLineInterfaceHandler = CommandLineInterfaceHandler()
file_handler: Optional[logging.FileHandler] = None
ytsync_cli: CLI = CLI("server")


@ytsync_cli.retvals()
def retvals(command: Command, return_value: Optional[Any]) -> Optional[Any]:
    return command, return_value


def cli_retval_return_value(retval_unsafe: Any) -> tuple[Command, Any]:
    assert isinstance(retval_unsafe, tuple)
    assert len(retval_unsafe) == 2
    assert isinstance(retval_unsafe[0], Command)
    return retval_unsafe


@dataclass
class RemoteInitialization:
    stdout_isatty: bool
    stderr_isatty: bool


@dataclass
class UserInputRequest:
    prompt: str


@dataclass
class UserInput:
    args: list[str]


class OutputDirection(str, Enum):
    stdout = "stdout"
    stderr = "stderr"


@dataclass
class Output:
    direction: OutputDirection
    output: str
    end: str = field(default="\n")


@dataclass
class CommandResult:
    logs: list[LogRecord] = field(default_factory=lambda: [])
    outputs: list[Output] = field(default_factory=lambda: [])


class UserError(Exception):
    def __init__(self, command: Command, message: str) -> None:
        super().__init__(message, command)
        self.command: Command = command
        self.message: str = message


def _get_server() -> Server:
    assert (server := ytsync_cli.env.get("server", None)) is not None, "This method is to invoked from this module"
    return server


type LogHandlerName = Literal["console", "file"]
ytsync_cli.parsers[LogHandlerName] = create_literal_parser(LogHandlerName)


@ytsync_cli.cmd(help="Set/See the level of the console, or of the file log. To see, do not supply a value for level.")
def level(handler_name: LogHandlerName, level: Optional[LevelNames] = None) -> None:
    assert file_handler is not None
    handler: Handler = cli_handler if handler_name == "console" else file_handler
    if level is None:
        print(LevelNames(handler.level))
    else:
        logger.info(f"Log level for {handler_name} changing to {level.name}")
        handler.setLevel(level.value)


type UserSpec = User


def user_from_user_spec(string: str) -> UserSpec:
    if string in connected_users_by_uuid:
        return connected_users_by_uuid[string]

    try:
        return next(filter(lambda user: user.username == string, connected_users_by_uuid.values()))
    except StopIteration:
        raise ParsingError(user_from_user_spec.__name__, "Could not find user by id or by username")


ytsync_cli.parsers[UserSpec] = user_from_user_spec


def wrap_dc_str(instance: Any, tabs: int = 0, repr_function: Callable[[Any], str] | None = None, tab_chars: str = "    ") -> str:
    repr_function = repr_function or repr
    out: str = f"{type(instance).__name__}(\n"
    instance_fields: tuple[Field[Any], ...] = tuple(filter(lambda f: f.repr, fields(instance)))
    tabstr: str = tab_chars * (tabs + 1)
    for i, instance_field in enumerate(instance_fields):
        out += f"{tabstr}{instance_field.name}="
        value = getattr(instance, instance_field.name)

        if isinstance(value, list):
            if not value:
                out += "[]"
            else:
                out += "[\n"
                for j, item in enumerate(value):
                    out += f"{tabstr}{tab_chars}{wrap_dc_str(item, tabs + 2, repr_function) if is_dataclass(item) else repr_function(item)}"
                    if j != len(value) - 1:
                        out += ","
                    out += "\n"
                out += f"{tabstr}]"
        elif isinstance(value, dict):
            if not value:
                out += "{}"
            else:
                out += "{\n"
                for j, (k, v) in enumerate(value.items()):
                    out += f"{tabstr}{tab_chars}{k}: "
                    out += wrap_dc_str(v, tabs + 2, repr_function) if is_dataclass(v) else f"{tabstr}{tab_chars}{repr_function(v)}"
                    if j != len(value) - 1:
                        out += ","
                    out += "\n"
                out += f"{tabstr}}}"
        else:
            out += wrap_dc_str(value, tabs + 1, repr_function) if is_dataclass(value) else repr_function(value)

        if i != len(instance_fields) - 1:
            out += ","
        out += "\n"
    out += f"{tab_chars * tabs})"
    return out


@ytsync_cli.cmd(help="See a list of the currently connected users.")
def users(uuids: bool = False) -> CommandResult:
    result: CommandResult = CommandResult()
    for user in connected_users_by_uuid.values():
        result.outputs.append(Output(OutputDirection.stdout, f"{(f"{user.uuid}: " if uuids else "")}{user.username}"))

    return result


@ytsync_cli.cmd(help="See user details")
def details(user: UserSpec) -> CommandResult:
    return CommandResult(outputs=[Output(OutputDirection.stdout, wrap_dc_str(user))])


@ytsync_cli.cmd(help="Send a notification to a user.")
async def notify(user: UserSpec, message: str) -> CommandResult:
    await send_to(user, NotifyMessage(Notification(
        int(datetime.datetime.now().timestamp() * 1000),
        "Server Administrator",
        message,
        False
    )), logging.INFO)
    return CommandResult([], [Output(OutputDirection.stdout, "Sent!")])


@ytsync_cli.cmd(help="Kick a user")
async def kick(user: UserSpec) -> None:
    await send_to(user, NotifyMessage(Notification(
        int(datetime.datetime.now().timestamp() * 1000),
        "Server",
        "You are being kicked",
        False
    )), logging.WARNING)
    await user.connection.close()


@ytsync_cli.cmd(names=("quit", "q", "exit", "stop"), help="Stop serving and exit program.")
async def quit() -> None:
    server: Server = _get_server()
    server.close()
    await server.closed_waiter


@ytsync_cli.cmd("!", help="Start a subprocess")
async def shell_cmd(*args: BypassParse) -> None:
    await to_thread(subprocess.run, args, shell=True)


@ytsync_cli.cmd(names=("cat", "type", "logs"), help="Dump the contents of the log file")
def cat_logs(lines: int) -> CommandResult:
    assert file_handler is not None
    with open(file_handler.baseFilename, "r") as log:
        readlines: list[str] = log.readlines()
        if lines >= 0:
            readlines = readlines[-min(lines, len(readlines)):]
        return CommandResult(outputs=[Output(
            OutputDirection.stdout,
            "".join(readlines)
        )])


@ytsync_cli.cmd(names=("help", "h"))
def help_cmd(command_name: Optional[str] = None, parameter_name: Optional[str] = None, extended: bool = False) -> CommandResult:
    if extended:
        command_help, parameter_help = Command.extended_command_help, CommandParameter.extended_parameter_help
    else:
        command_help, parameter_help = Command.basic_command_help, CommandParameter.basic_parameter_help

    if command_name is None:
        return CommandResult(outputs=[Output(OutputDirection.stdout, "\n\n".join(command_help(cmd) for cmd in ytsync_cli.commands))])

    if (command := ytsync_cli.get_command(command_name)) is None:
        raise UserError(npycli.command.cmd(help_cmd), f"{command_name} is not a command.")

    if parameter_name is not None:
        if (parameter := next(filter(lambda p: parameter_name in p.names, command.parameters)), None) is None:  # type: ignore
            raise UserError(npycli.command.cmd(help_cmd), f"'{parameter_name}' is not a parameter")
        return CommandResult(outputs=[Output(OutputDirection.stdout, parameter_help(parameter))])

    return CommandResult(outputs=[Output(OutputDirection.stdout, f"{command_help(command)}; {command.help}")])


ytsync_cli.parsers[LevelNames] = create_enum_parser(LevelNames)


async def local_cli(ytsync_server: YouTubeSyncServer) -> int:
    while ytsync_server.websocket_server.is_serving():
        user_input_task: Task[str] = create_task(input_async(ytsync_cli.prompt_entry_marker))
        ytsync_server.websocket_server.closed_waiter.add_done_callback(lambda _: user_input_task.cancel())
        try:
            user_input: str = await user_input_task
        except EOFError:
            await asyncio.sleep(30)
            continue

        try:
            entries: list[str] = split(user_input)
        except Exception as exc:
            print(f"{"\n".join(f"{e.__class__.__name__}: {e}" for e in causes(exc, True))}", file=stderr)
            continue

        try:
            cli_handler.command_result_logging = True
            retval = cli_retval_return_value(ytsync_cli.exec(entries))[1]
        except EmptyEntriesError:
            cli_handler.command_result_logging = False
            continue
        except (CLIError, UserError) as err:
            if isinstance(err, CLIError) and err.__cause__:
                err = err.__cause__
            logger.error(format_exc(err))
            cli_handler.command_result_logging = False
            continue
        finally:
            cli_handler.command_result_logging = False

        if iscoroutine(retval):
            retval = await retval

        if isinstance(retval, CommandResult):
            for log in retval.logs:
                logger.handle(log)
            for output in retval.outputs:
                print(output.output, end=output.end, file=stdout if output.direction == OutputDirection.stdout else stderr)

    return 0


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


async def remote_cli(ytsync_server: YouTubeSyncServer) -> int:

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

# This is done so that npycli sees a generic alias, and stops there at building the parameter, that is, to obfuscate.
type _CLIKindFunctionGenericReturnType[T] = Callable[[YouTubeSyncServer], Coroutine[Any, Any, T]]
type CLIKindFunction = _CLIKindFunctionGenericReturnType[int]


cli_kinds: dict[str, CLIKindFunction] = {
    "local": local_cli,
    "remote": remote_cli
}


type CLIKind = CLIKindFunction


def cli_kind_parser(s: str) -> CLIKind:
    if (cli_kind := cli_kinds.get(s, None)) is not None:
        return cli_kind
    raise ParsingError(s, f"{s} is not a cli kind. Valid are {", ".join([kind for kind in cli_kinds.keys()])}")


ytsync_cli.parsers[CLIKind] = cli_kind_parser


async def ytsync_cli_serve(
    host: str,
    port: int,
    log_level: Annotated[
        LevelNames,
        Alias("log-level", private=True),
        Description(f"Log levels: {", ".join([level.name for level in LevelNames])}")
    ] = LevelNames.notset,
    log_file: Annotated[
        Optional[Path],
        Alias("log-file", private=True),
        DefaultPreview(DEFAULT_LOG_PATH)
    ] = None,
    cli_kind: Annotated[
        CLIKind,
        Alias("cli-kind", private=True),
        Description(f"CLI kind, some of which are {", ".join([kind for kind in cli_kinds.keys()])}."),
        DefaultPreview("local")
    ] = local_cli
) -> int:
    log_level = LevelNames.debug if log_level == LevelNames.notset else log_level
    log_file = log_file or Path(__file__).parent.joinpath(Path(DEFAULT_LOG_PATH))
    logger.setLevel(log_level.value)

    cli_handler.setLevel(log_level)
    logger.addHandler(cli_handler)

    global file_handler
    file_handler = logging.FileHandler(str(log_file))
    file_handler.setLevel(log_level)
    logger.addHandler(file_handler)

    cli_handler.command_result_logging = True

    async with ytsync(host, port, logger) as ytsync_server:
        ytsync_cli.env["server"] = ytsync_server.websocket_server
        cli_task: Task[int] = create_task(cli_kind(ytsync_server))

        try:
            _, cli_result = await gather(ytsync_server.ytsync_serve_task, cli_task)
            return cli_result
        except (CancelledError, KeyboardInterrupt):
            return 1


ytsync_cli_serve_cmd: Command = Command.create(
    ytsync_cli_serve,
    name="ytsync-server-cli",
    help="Serve the YouTube Sync server. Specify a host and port, logging level, log file and CLI kind.",
)


def main() -> None:
    try:
        if len(argv) == 1:
            print(ytsync_cli_serve_cmd.extended_command_help())
        else:
            exit(run(ytsync_cli_serve_cmd(argv[1:], ytsync_cli.parsers)))
    except KeyboardInterrupt:
        print("\n^C")


if __name__ == "__main__":
    main()
