import logging
from asyncio import CancelledError, Task, create_task, sleep, to_thread
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from functools import partial
from io import StringIO
from logging import Handler, Logger, LogRecord
from multiprocessing import Process, Queue
from os import get_terminal_size, kill
from signal import SIGINT
from sys import stderr, stdout
from typing import Any, TextIO

from core import YouTubeSyncServer
from npycli import CLI, Command
from npycli.ansi import (
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


def input_async_process_target(queue: Queue) -> None:
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
            await sleep(0.02)
    except CancelledError:
        kill(proc.pid, SIGINT)
        raise

    if user_input_queue.empty():
        raise EOFError

    return user_input_queue.get()


class LevelNames(int, Enum):
    critical = 50
    fatal = 50
    error = 40
    warning = 30
    warn = 30
    info = 20
    debug = 10
    notset = 0


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
        f"{scr}{datetime.now().isoformat()} {record.levelname}:{scr_reset} "
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


@dataclass
class CLIContext:
    ytsync_cli: CLI
    ytsync_server: YouTubeSyncServer
    cli_handler: CommandLineInterfaceHandler
    logger: Logger


def cli_retval_return_value(retval_unsafe: Any) -> tuple[Command, Any]:
    assert isinstance(retval_unsafe, tuple)
    assert len(retval_unsafe) == 2
    assert isinstance(retval_unsafe[0], Command)
    return retval_unsafe

