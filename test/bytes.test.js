import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ByteSizeError, formatBytes, parseBytes } from "../dist/index.js";

test("parseBytes: common inputs", () => {
  const cases = {
    "20MB": 20_000_000,
    "20 mb": 20_000_000,
    "20M": 20_000_000,
    "1.5GB": 1_500_000_000,
    "1.5 GiB": 1_610_612_736,
    "512kb": 512_000,
    "512 KiB": 524_288,
    "1kB": 1000,
    "1 megabyte": 1_000_000,
    "2 mebibytes": 2_097_152,
    "1GB 512MB": 1_512_000_000,
    "100": 100,
    "100 bytes": 100,
    "1B": 1,
    "0.5B": 1,
    "-1KB": -1000,
    "1TB": 1e12,
    "1 PiB": 1024 ** 5,
  };
  for (const [input, expected] of Object.entries(cases)) assert.equal(parseBytes(input), expected, input);
  assert.equal(parseBytes(1234.4), 1234);
});

test("parseBytes: binary option makes KB/MB powers of 1024", () => {
  assert.equal(parseBytes("1KB", { binary: true }), 1024);
  assert.equal(parseBytes("20MB", { binary: true }), 20_971_520);
  assert.equal(parseBytes("1KiB", { binary: false }), 1024, "KiB is always 1024");
  assert.equal(parseBytes("1kB", { binary: true }), 1024);
});

test("parseBytes: bad input throws a helpful ByteSizeError", () => {
  const cases = [
    ["", /empty string/],
    ["20 parsecs", /Unknown unit "parsecs".*Use B, kB, MB/],
    ["1GB 512", /Missing unit after 512/],
    ["abc", /unexpected "abc"/],
    [NaN, /finite number/],
    [null, /got null/],
  ];
  for (const [input, message] of cases) {
    assert.throws(() => parseBytes(input), (error) => error instanceof ByteSizeError && message.test(error.message), String(input));
  }
});

test("formatBytes: decimal, binary, long and rounding", () => {
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(999), "999 B");
  assert.equal(formatBytes(1000), "1 kB");
  assert.equal(formatBytes(1536), "1.54 kB");
  assert.equal(formatBytes(20_000_000), "20 MB");
  assert.equal(formatBytes(20_000_000, { binary: true }), "19.07 MiB");
  assert.equal(formatBytes(1536, { binary: true }), "1.5 KiB");
  assert.equal(formatBytes(1_234_567, { decimals: 0 }), "1 MB");
  assert.equal(formatBytes(999_999), "1 MB", "rounding carries into the next unit");
  assert.equal(formatBytes(-2048, { binary: true }), "-2 KiB");
  assert.equal(formatBytes(1_500_000, { long: true }), "1.5 megabytes");
  assert.equal(formatBytes(1, { long: true }), "1 byte");
  assert.equal(formatBytes(1024 ** 3, { binary: true, long: true }), "1 gibibyte");
  assert.throws(() => formatBytes("5"), ByteSizeError);
  assert.throws(() => formatBytes(5, { decimals: -1 }), /decimals/);
});

test("parseBytes and formatBytes round-trip", () => {
  for (const n of [0, 1, 999, 1000, 20_000_000, 1_500_000_000]) assert.equal(parseBytes(formatBytes(n)), n);
  for (const n of [1024, 1536, 1024 ** 3]) assert.equal(parseBytes(formatBytes(n, { binary: true })), n);
});

const cli = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });

test("cli: sizes", () => {
  const cases = [
    [["20MB"], "20000000"],
    [["1.5", "GiB"], "1610612736"],
    [["bytes", "20000000"], "20 MB"],
    [["bytes", "20000000", "--binary"], "19.07 MiB"],
    [["bytes", "1500000", "--long"], "1.5 megabytes"],
    [["bytes", "20m"], "20000000"],
    [["20m"], "1200000"],
  ];
  for (const [args, expected] of cases) {
    const result = run(...args);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, `${expected}\n`, args.join(" "));
  }
  const bad = run("bytes", "20 parsecs");
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /^tinydur: Unknown unit "parsecs"/);
});
