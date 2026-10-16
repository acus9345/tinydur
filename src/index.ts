/**
 * tinydur: tiny, zero-dependency duration parsing and formatting.
 *
 * @example
 * import { parse, format } from "tinydur";
 * parse("1h 30m");   // 5400000
 * format(5400000);   // "1h 30m"
 *
 * @packageDocumentation
 */

/** Thrown for invalid durations or options. The message says what went wrong and how to fix it. */
export class DurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DurationError";
  }
}

/** Options for {@link format}. */
export interface FormatOptions {
  /** Use long unit names, e.g. `"1 hour 30 minutes"` instead of `"1h 30m"`. Default: `false`. */
  long?: boolean;
  /** Maximum number of units to show, counting from the largest; the rest is rounded. Default: `2`. */
  units?: number;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const YEAR = 365.25 * DAY;

const UNIT_MS = new Map<string, number>();
for (const [ms, names] of [
  [1, "ms msec msecs millisecond milliseconds"],
  [SECOND, "s sec secs second seconds"],
  [MINUTE, "m min mins minute minutes"],
  [HOUR, "h hr hrs hour hours"],
  [DAY, "d day days"],
  [WEEK, "w wk wks week weeks"],
  [YEAR, "y yr yrs year years"],
] as const) {
  for (const name of names.split(" ")) UNIT_MS.set(name, ms);
}

const FORMAT_UNITS = [
  { ms: DAY, short: "d", long: "day" },
  { ms: HOUR, short: "h", long: "hour" },
  { ms: MINUTE, short: "m", long: "minute" },
  { ms: SECOND, short: "s", long: "second" },
  { ms: 1, short: "ms", long: "millisecond" },
] as const;
const LAST_UNIT = FORMAT_UNITS.length - 1;

// One "<number><unit>" pair plus any separator after it (spaces, a comma, "and").
const TOKEN = /(\d+(?:\.\d+)?|\.\d+)\s*([a-z]*)\s*(?:,\s*)?(?:and\s+)?/y;
const EXAMPLES = `Try something like "1h 30m", "90s" or "2 days".`;

/**
 * Parse a human-readable duration into milliseconds.
 *
 * Accepts units `ms`, `s`, `m`, `h`, `d`, `w`, `y` and their long forms ("minutes", "hrs", ...),
 * combined freely: `"1h30m"`, `"1 hour and 30 minutes"`, `"1.5h"`, `"-5m"`.
 * A bare number such as `"100"` is read as milliseconds, and numbers are returned unchanged.
 * A year is 365.25 days.
 *
 * @param input - The duration, e.g. `"1h 30m"`.
 * @returns The duration in milliseconds.
 * @throws {@link DurationError} if the input is empty, malformed or uses an unknown unit.
 */
export function parse(input: string | number): number {
  if (typeof input === "number") {
    if (!Number.isFinite(input)) throw new DurationError(`Expected a finite number of milliseconds, got ${input}.`);
    return input;
  }
  if (typeof input !== "string") {
    throw new DurationError(`Expected a duration string like "1h 30m" or a number of milliseconds, got ${describe(input)}.`);
  }
  let text = input.trim().toLowerCase();
  if (text === "") throw new DurationError(`Cannot parse an empty string as a duration. ${EXAMPLES}`);

  let sign = 1;
  if (text[0] === "-" || text[0] === "+") {
    if (text[0] === "-") sign = -1;
    text = text.slice(1).trimStart();
  }

  let total = 0;
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < text.length) {
    const start = TOKEN.lastIndex;
    const match = TOKEN.exec(text);
    if (!match) {
      throw new DurationError(`Cannot parse ${quote(input)} as a duration: unexpected ${quote(text.slice(start))}. ${EXAMPLES}`);
    }
    const value = Number(match[1]);
    const unit = match[2] ?? "";
    if (unit === "") {
      // A lone number means milliseconds; inside a longer duration it is a missing unit.
      if (start !== 0 || TOKEN.lastIndex !== text.length) {
        throw new DurationError(`Missing unit after ${match[1]} in ${quote(input)}. Add one, e.g. "${match[1]}m" or "${match[1]}s".`);
      }
      total += value;
    } else {
      const ms = UNIT_MS.get(unit);
      if (ms === undefined) {
        throw new DurationError(
          `Unknown unit ${quote(unit)} in ${quote(input)}. Use one of: ms, s, m, h, d, w, y (long names like "minutes" work too).`,
        );
      }
      total += value * ms;
    }
  }

  total = Math.round(total * 1000) / 1000; // drop float noise such as 1.1 * 1000 = 1100.0000000000002
  if (!Number.isFinite(total)) throw new DurationError(`${quote(input)} is too large to represent in milliseconds.`);
  return total === 0 ? 0 : sign * total;
}

/**
 * Format milliseconds as a human-readable duration.
 *
 * Uses days, hours, minutes, seconds and milliseconds. Shows at most `units` units
 * (default 2), starting from the largest, and rounds the rest.
 *
 * @param ms - The duration in milliseconds. May be negative.
 * @param options - See {@link FormatOptions}.
 * @returns For example `"1h 30m"`, or `"1 hour 30 minutes"` with `{ long: true }`.
 * @throws {@link DurationError} if `ms` is not a finite number or `units` is not a whole number of at least 1.
 */
export function format(ms: number, options: FormatOptions = {}): string {
  if (typeof ms !== "number" || !Number.isFinite(ms)) {
    const got = typeof ms === "number" ? String(ms) : describe(ms);
    throw new DurationError(`format() expects a finite number of milliseconds, got ${got}. Use parse() first if you have a string.`);
  }
  const { long = false, units = 2 } = options;
  if (typeof units !== "number" || !Number.isInteger(units) || units < 1) {
    throw new DurationError(`Option "units" must be a whole number of at least 1, got ${String(units)}.`);
  }

  const sign = ms < 0 ? "-" : "";
  let abs = Math.round(Math.abs(ms));
  if (abs === 0) return long ? "0 milliseconds" : "0ms";

  // Round to the smallest shown unit; repeat if rounding carried into a bigger unit (59.9s -> 1m).
  let first = largestUnit(abs);
  for (;;) {
    const step = FORMAT_UNITS[Math.min(first + units - 1, LAST_UNIT)]!.ms;
    abs = Math.round(abs / step) * step;
    const next = largestUnit(abs);
    if (next === first) break;
    first = next;
  }
  const last = Math.min(first + units - 1, LAST_UNIT);

  const parts: string[] = [];
  let rest = abs;
  for (let i = first; i <= last; i++) {
    const unit = FORMAT_UNITS[i]!;
    const count = i === last ? Math.round(rest / unit.ms) : Math.floor(rest / unit.ms);
    rest -= count * unit.ms;
    if (count > 0) parts.push(long ? `${count} ${unit.long}${count === 1 ? "" : "s"}` : `${count}${unit.short}`);
  }
  return sign + parts.join(" ");
}

function largestUnit(ms: number): number {
  const index = FORMAT_UNITS.findIndex((unit) => ms >= unit.ms);
  return index === -1 ? LAST_UNIT : index;
}

function quote(text: string): string {
  return JSON.stringify(text.length > 40 ? `${text.slice(0, 40)}...` : text);
}

function describe(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "an array";
  return typeof value;
}
