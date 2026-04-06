from __future__ import annotations

import datetime
import logging
import subprocess
from asyncio import (
    CancelledError,
    Task,
    create_task,
    gather,
    run,
    to_thread,
)
from dataclasses import Field, fields, is_dataclass
from logging import Handler
from pathlib import Path
from sys import argv
from typing import Annotated, Any, Callable, Coroutine, Literal, Optional

import npycli  # pyright: ignore[reportMissingTypeStubs]
from cli_core import (
    CLIContext,
    CommandLineInterfaceHandler,
    CommandResult,
    LevelNames,
    Output,
    OutputDirection,
    UserError,
)
from configuration import (
    DEFAULT_LOG_PATH,
)
from core import connected_users_by_uuid, send_to, ytsync
from local_cli import local_cli
from npycli import (  # pyright: ignore[reportMissingTypeStubs]
    CLI,
    Alias,
    Command,
    DefaultPreview,
    Description,
    ParsingError,
)
from npycli.parameters import (  # pyright: ignore[reportMissingTypeStubs]
    BypassParse,
    CommandParameter,
)
from npycli.parsing import (  # pyright: ignore[reportMissingTypeStubs]
    create_enum_parser,
    create_literal_parser,
)
from remote_cli import remote_cli
from websockets.asyncio.server import Server
from ytsync_types import Notification, NotifyMessage, User

logger = logging.getLogger()
logger.setLevel(logging.DEBUG)


cli_handler: CommandLineInterfaceHandler = CommandLineInterfaceHandler()
file_handler: Optional[logging.FileHandler] = None
ytsync_cli: CLI = CLI("server")


@ytsync_cli.retvals()
def retvals(command: Command, return_value: Optional[Any]) -> Optional[Any]:
    return command, return_value


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


# This is done so that npycli sees a generic alias, and stops there at building the parameter, that is, to obfuscate.
type _CLIKindFunctionGenericReturnType[T] = Callable[[CLIContext], Coroutine[Any, Any, T]]
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
        cli_task: Task[int] = create_task(cli_kind(CLIContext(ytsync_cli, ytsync_server, cli_handler, logger)))

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
