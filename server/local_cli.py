from asyncio import Task, create_task, iscoroutine, sleep
from logging import Logger
from shlex import split
from sys import stderr, stdout

from npycli import CLI, CLIError, EmptyEntriesError
from npycli.errors import causes
from cli_core import (
    CommandLineInterfaceHandler,
    CommandResult,
    OutputDirection,
    UserError,
    cli_retval_return_value,
    format_exc,
    input_async,
    CLIContext
)
from core import YouTubeSyncServer


async def local_cli(cli_context: CLIContext) -> int:
    ytsync_cli: CLI = cli_context.ytsync_cli
    ytsync_server: YouTubeSyncServer = cli_context.ytsync_server
    cli_handler: CommandLineInterfaceHandler = cli_context.cli_handler
    logger: Logger = cli_context.logger

    while ytsync_server.websocket_server.is_serving():
        user_input_task: Task[str] = create_task(input_async(ytsync_cli.prompt_entry_marker))
        ytsync_server.websocket_server.closed_waiter.add_done_callback(lambda _: user_input_task.cancel())
        try:
            user_input: str = await user_input_task
        except EOFError:
            await sleep(30)
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

