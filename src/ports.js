import { execFileSync } from "node:child_process";

const isWin = process.platform === "win32";

const run = (cmd, args) =>
  execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });

export function parsePort(value) {
  if (!/^\d+$/.test(String(value))) return null;
  const n = Number(value);
  return n >= 1 && n <= 65535 ? n : null;
}

/** Parse `netstat -ano` output (Windows) and return PIDs LISTENING on port. */
export function parseNetstat(output, port) {
  const pids = new Set();
  for (const line of output.split(/\r?\n/)) {
    const cols = line.trim().split(/\s+/);
    // Proto Local Foreign State PID
    if (cols.length < 5 || !/^TCP/i.test(cols[0]) || cols[3] !== "LISTENING") continue;
    if (cols[1].endsWith(`:${port}`)) pids.add(Number(cols[4]));
  }
  return [...pids].filter((p) => p > 0);
}

export function findPids(port) {
  try {
    if (isWin) return parseNetstat(run("netstat", ["-ano", "-p", "tcp"]), port);
    const out = run("lsof", ["-ti", `tcp:${port}`, "-sTCP:LISTEN"]);
    return [...new Set(out.split("\n").filter(Boolean).map(Number))];
  } catch (err) {
    if (err.code === "ENOENT" && !isWin) {
      throw new Error("`lsof` is not installed. Install it and try again.");
    }
    return []; // lsof exits 1 when nothing matches
  }
}

export function processName(pid) {
  try {
    if (isWin) {
      const out = run("tasklist", ["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"]);
      return out.split(",")[0]?.replace(/"/g, "").trim() || "unknown";
    }
    return run("ps", ["-p", String(pid), "-o", "comm="]).trim().split("/").pop() || "unknown";
  } catch {
    return "unknown";
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === "EPERM";
  }
}

/** Returns "killed" | "gone" | "denied" | "failed" */
export async function killPid(pid, { force = false } = {}) {
  try {
    process.kill(pid, force || isWin ? "SIGKILL" : "SIGTERM");
  } catch (e) {
    if (e.code === "ESRCH") return "gone";
    if (e.code === "EPERM") return "denied";
    return "failed";
  }
  if (!force && !isWin) {
    for (let i = 0; i < 10; i++) {
      await sleep(200);
      if (!alive(pid)) return "killed";
    }
    return "failed"; // still alive: suggest --force
  }
  await sleep(100);
  return alive(pid) ? "failed" : "killed";
}
