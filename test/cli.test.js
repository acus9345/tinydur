import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const cli = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });

test("cli: converts both ways", () => {
  const cases = [
    [["1h30m"], "5400000"],
    [["1h", "30m"], "5400000"],
    [["2 days 4 hours"], "187200000"],
    [["-5m"], "-300000"],
    [["5400000"], "1h 30m"],
    [["5400000", "--long"], "1 hour 30 minutes"],
    [["90061001", "--units", "4"], "1d 1h 1m 1s"],
    [["--units=4", "90061001"], "1d 1h 1m 1s"],
    [["-u", "1", "-l", "90061001"], "1 day"],
  ];
  for (const [args, expected] of cases) {
    const result = run(...args);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, `${expected}\n`, args.join(" "));
  }
});

test("cli: --help and --version", () => {
  const help = run("--help");
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Usage:/);
  assert.match(help.stdout, /Examples:/);
  const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(run("-v").stdout, `${version}\n`);
});

test("cli: user mistakes print a short message, not a stack trace", () => {
  const cases = [
    [[], /Missing duration/],
    [["abc"], /Cannot parse "abc"/],
    [["5 parsecs"], /Unknown unit "parsecs"/],
    [["--bogus"], /Unknown option "--bogus"/],
    [["1000", "--units"], /--units needs a whole number/],
    [["1000", "--units", "x"], /got "x"/],
    [["1000", "--units", "0"], /at least 1/],
  ];
  for (const [args, message] of cases) {
    const result = run(...args);
    assert.equal(result.status, 1, args.join(" "));
    assert.match(result.stderr, message);
    assert.match(result.stderr, /tinydur --help/);
    assert.doesNotMatch(result.stderr, /\n\s+at /);
  }
});
