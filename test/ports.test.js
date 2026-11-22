import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePort, parseNetstat } from "../src/ports.js";

test("parsePort validates range", () => {
  assert.equal(parsePort("3000"), 3000);
  assert.equal(parsePort("0"), null);
  assert.equal(parsePort("70000"), null);
  assert.equal(parsePort("abc"), null);
  assert.equal(parsePort("30a"), null);
});

test("parseNetstat finds LISTENING pids for the port only", () => {
  const out = [
    "  TCP    0.0.0.0:3000     0.0.0.0:0      LISTENING       4242",
    "  TCP    [::]:3000        [::]:0         LISTENING       4242",
    "  TCP    0.0.0.0:30001    0.0.0.0:0      LISTENING       999",
    "  TCP    127.0.0.1:3000   127.0.0.1:5000 ESTABLISHED     777",
  ].join("\r\n");
  assert.deepEqual(parseNetstat(out, 3000), [4242]);
});
