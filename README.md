# killport-cli

Free a stuck port in one command. No install needed.

```bash
npx killport-cli 3000
```

Ever seen `Error: listen EADDRINUSE: address already in use :::3000`? This fixes it.

## Usage

```bash
npx killport-cli <port> [port...] [options]
```

| Option | Description |
| --- | --- |
| `-f, --force` | Kill immediately (SIGKILL) instead of asking nicely |
| `-l, --list` | Only show what is using the port, don't kill |
| `-h, --help` | Show help |
| `-v, --version` | Show version |

### Examples

```bash
npx killport-cli 3000              # free port 3000
npx killport-cli 3000 5173 8080    # free several ports at once
npx killport-cli 3000 --list       # just see who is using it
npx killport-cli 3000 --force      # when a process refuses to stop
```

Install globally for the short `killport` command:

```bash
npm i -g killport-cli
killport 3000
```

## How it works

- macOS / Linux: finds the listener with `lsof`, stops it with SIGTERM (SIGKILL with `--force`).
- Windows: finds the PID with `netstat -ano`, then terminates it.
- Zero dependencies. Node 18+.

## License

MIT
