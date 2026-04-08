from asyncio import run
from sys import argv
from remote import remote_with
from ytsync_cli import serve_with


def main() -> int:
    if len(argv) == 1:
        print("Start serving by specfiying `serve` as first argument else start the remote script.")
        return 1

    if argv[1] == "serve":
        return run(serve_with(argv[2:]))
    else:
        return run(remote_with(argv[1:]))


if __name__ == "__main__":
    exit(main())

