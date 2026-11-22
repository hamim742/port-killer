#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { findPids, killPid, parsePort, processName } from "../src/ports.js";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const tty = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code) => (s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
const green = c(32), red = c(31), yellow = c(33), dim = c(2), bold = c(1);

const HELP = `
${bold("killport")} - free a stuck port in one command

${bold("Usage")}
  npx killport-cli <port> [port...] [options]

${bold("Options")}
  -f, --force    Kill immediately (SIGKILL) instead of asking nicely
  -l, --list     Only show what is using the port, don't kill
  -h, --help     Show this help
  -v, --version  Show version

${bold("Examples")}
  npx killport-cli 3000
  npx killport-cli 3000 5173 8080
  npx killport-cli 3000 --list
`;

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("-")));
const has = (...names) => names.some((n) => flags.has(n));
const known = ["-f", "--force", "-l", "--list", "-h", "--help", "-v", "--version"];

if (has("-h", "--help") || args.length === 0) {
  console.log(HELP);
  process.exit(args.length === 0 ? 1 : 0);
}
if (has("-v", "--version")) {
  console.log(pkg.version);
  process.exit(0);
}
const unknown = [...flags].filter((f) => !known.includes(f));
if (unknown.length) {
  console.error(red(`Unknown option: ${unknown.join(", ")}`));
  console.log(HELP);
  process.exit(1);
}

const force = has("-f", "--force");
const listOnly = has("-l", "--list");
const ports = args.filter((a) => !a.startsWith("-"));
let exitCode = 0;

for (const raw of ports) {
  const port = parsePort(raw);
  if (!port) {
    console.error(red(`✖ "${raw}" is not a valid port (1-65535)`));
    exitCode = 1;
    continue;
  }

  let pids;
  try {
    pids = findPids(port);
  } catch (e) {
    console.error(red(`✖ ${e.message}`));
    process.exit(1);
  }

  if (pids.length === 0) {
    console.log(yellow(`• Port ${port}: nothing is listening`));
    continue;
  }

  for (const pid of pids) {
    const name = processName(pid);
    if (listOnly) {
      console.log(`• Port ${port}: ${bold(name)} ${dim(`(PID ${pid})`)}`);
      continue;
    }
    const result = await killPid(pid, { force });
    if (result === "killed" || result === "gone") {
      console.log(green(`✔ Port ${port} freed`) + ` - stopped ${bold(name)} ${dim(`(PID ${pid})`)}`);
    } else if (result === "denied") {
      console.error(red(`✖ Port ${port}: permission denied for ${name} (PID ${pid}). Try with sudo.`));
      exitCode = 1;
    } else {
      console.error(red(`✖ Port ${port}: ${name} (PID ${pid}) did not stop.`) + ` Try ${bold("--force")}.`);
      exitCode = 1;
    }
  }
}

process.exit(exitCode);
