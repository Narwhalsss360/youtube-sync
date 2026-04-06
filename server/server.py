from sys import argv
from asyncio import run
from ytsync_cli import cmd, ytsync_cli

if __name__ == "__main__":
    try:
        if len(argv) == 1:
            print(cmd.extended_command_help())
        else:
            exit(run(cmd(argv[1:], ytsync_cli.parsers)))
    except KeyboardInterrupt:
        print("\n^C")
