import { test } from "node:test";
import assert from "node:assert/strict";
import { DurationError, format, parse } from "../dist/index.js";

test("parse: common inputs", () => {
  const cases = {
    "1h 30m": 5_400_000,
    "1h30m": 5_400_000,
    "1 hour and 30 minutes": 5_400_000,
    "1h, 30m": 5_400_000,
    "1.5h": 5_400_000,
    "90s": 90_000,
    "500ms": 500,
    ".5s": 500,
    "1.1s": 1100,
    "2 days": 172_800_000,
    "  2H  ": 7_200_000,
    "1w": 604_800_000,
    "1y": 31_557_600_000,
    "100": 100,
    "-5m": -300_000,
    "+5m": 300_000,
    "- 5m": -300_000,
  };
  for (const [input, expected] of Object.entries(cases)) assert.equal(parse(input), expected, input);
});

test("parse: numbers pass through, zero is never -0", () => {
  assert.equal(parse(250), 250);
  assert.ok(Object.is(parse("-0s"), 0));
});

test("parse: bad input throws a helpful DurationError", () => {
  const cases = [
    ["", /empty string/],
    ["   ", /empty string/],
    ["abc", /Cannot parse "abc".*Try something like/],
    ["5 parsecs", /Unknown unit "parsecs".*Use one of/],
    ["1h 30", /Missing unit after 30/],
    ["1h xyz", /Cannot parse|Unknown unit/],
    ["1h-", /Cannot parse/],
    ["constructor", /Cannot parse/],
    ["1 constructor", /Unknown unit "constructor"/],
    ["9".repeat(400) + "d", /too large/],
    [NaN, /finite number/],
    [Infinity, /finite number/],
    [null, /got null/],
    [undefined, /got undefined/],
    [{}, /got object/],
    [["1h"], /got an array/],
  ];
  for (const [input, message] of cases) {
    assert.throws(() => parse(input), (error) => error instanceof DurationError && message.test(error.message), String(input));
  }
});

test("parse: long error input is truncated in the message", () => {
  assert.throws(() => parse("x".repeat(10_000)), (error) => error.message.length < 300);
});

test("parse: large input is fast", () => {
  const input = "1s ".repeat(100_000);
  const start = performance.now();
  assert.equal(parse(input), 100_000_000);
  assert.ok(performance.now() - start < 1000);
});

test("format: defaults", () => {
  assert.equal(format(0), "0ms");
  assert.equal(format(0.4), "0ms");
  assert.equal(format(1.4), "1ms");
  assert.equal(format(1000), "1s");
  assert.equal(format(5_400_000), "1h 30m");
  assert.equal(format(90_061_001), "1d 1h");
  assert.equal(format(-300_000), "-5m");
  assert.equal(format(3_605_000), "1h");
});

test("format: rounding carries into bigger units", () => {
  assert.equal(format(59_999, { units: 1 }), "1m");
  assert.equal(format(86_399_999), "1d");
  assert.equal(format(5_430_000), "1h 31m");
});

test("format: options", () => {
  assert.equal(format(5_400_000, { long: true }), "1 hour 30 minutes");
  assert.equal(format(1000, { long: true }), "1 second");
  assert.equal(format(0, { long: true }), "0 milliseconds");
  assert.equal(format(90_061_001, { units: 4 }), "1d 1h 1m 1s");
  assert.equal(format(90_061_001, { units: 5 }), "1d 1h 1m 1s 1ms");
  assert.equal(format(90_061_001, { units: 99 }), "1d 1h 1m 1s 1ms");
});

test("format: bad input throws a helpful DurationError", () => {
  const cases = [
    [[NaN], /finite number/],
    [[Infinity], /finite number/],
    [["5"], /got string.*Use parse\(\)/],
    [[1000, { units: 0 }], /"units" must be a whole number/],
    [[1000, { units: 1.5 }], /"units" must be a whole number/],
  ];
  for (const [args, message] of cases) {
    assert.throws(() => format(...args), (error) => error instanceof DurationError && message.test(error.message), String(args));
  }
});

test("format: very large numbers do not hang or throw", () => {
  assert.match(format(Number.MAX_SAFE_INTEGER), /^\d+d \d+h$/);
  assert.match(format(1e300), /d$/);
});

test("parse and format round-trip", () => {
  for (const ms of [1, 999, 1000, 61_000, 3_600_001, 90_061_001, 1_000_000_000_000, -42_000]) {
    assert.equal(parse(format(ms, { units: 5 })), ms);
    assert.equal(parse(format(ms, { units: 5, long: true })), ms);
  }
});
