/** Thrown for invalid byte sizes or options. The message says what went wrong and how to fix it. */
export class ByteSizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ByteSizeError";
  }
}

/** Options for {@link parseBytes}. */
export interface ParseBytesOptions {
  /**
   * Read `KB`, `MB`, `GB`... as powers of 1024, like Windows and many older tools.
   * Default: `false`, so `1 MB` is 1,000,000 bytes (SI). `KiB`, `MiB`... are always powers of 1024.
   */
  binary?: boolean;
}

/** Options for {@link formatBytes}. */
export interface FormatBytesOptions {
  /** Use powers of 1024 and `KiB`, `MiB`... Default: `false` (powers of 1000, `kB`, `MB`...). */
  binary?: boolean;
  /** Most digits after the decimal point; trailing zeros are dropped. Default: `2`. */
  decimals?: number;
  /** Long unit names: `"1.5 megabytes"`. Default: `false`. */
  long?: boolean;
}

const PREFIXES = ["", "k", "m", "g", "t", "p", "e"] as const;
const LONG_PREFIXES = ["", "kilo", "mega", "giga", "tera", "peta", "exa"] as const;
const LONG_BINARY = ["", "kibi", "mebi", "gibi", "tebi", "pebi", "exbi"] as const;

/** unit name → [power, binary?]; `undefined` binary means "decimal unless the binary option is set". */
const UNITS = new Map<string, [number, boolean | undefined]>();
for (const [power, prefix] of PREFIXES.entries()) {
  if (power === 0) {
    for (const name of ["b", "byte", "bytes"]) UNITS.set(name, [0, false]);
    continue;
  }
  UNITS.set(`${prefix}b`, [power, undefined]);
  UNITS.set(prefix, [power, undefined]);
  UNITS.set(`${prefix}ib`, [power, true]);
  UNITS.set(`${LONG_PREFIXES[power]}byte`, [power, undefined]);
  UNITS.set(`${LONG_PREFIXES[power]}bytes`, [power, undefined]);
  UNITS.set(`${LONG_BINARY[power]}byte`, [power, true]);
  UNITS.set(`${LONG_BINARY[power]}bytes`, [power, true]);
}

const TOKEN = /(\d+(?:\.\d+)?|\.\d+)\s*([a-z]*)\s*(?:,\s*)?/y;
const EXAMPLES = `Try something like "20MB", "1.5 GiB" or "512kb".`;

/** Byte units that can't be mistaken for anything else (used by the CLI to tell sizes from durations). */
export const UNAMBIGUOUS_BYTE_UNIT = /^(?:b|bytes?|[kmgtpe]i?b|(?:kilo|mega|giga|tera|peta|exa|kibi|mebi|gibi|tebi|pebi|exbi)bytes?)$/i;

/**
 * Parse a human-readable size into bytes.
 *
 * Units: `B`, `kB`/`KB`, `MB`, `GB`, `TB`, `PB`, `EB` (powers of 1000, or 1024 with
 * `{ binary: true }`), `KiB`, `MiB`, `GiB`, `TiB`, `PiB`, `EiB` (always 1024), the
 * short forms `k`, `m`, `g`... and long names (`megabytes`, `gibibytes`). Case and
 * spacing don't matter, decimals work (`"1.5GB"`), parts can be combined (`"1GB 512MB"`),
 * and a bare number is bytes. The result is rounded to whole bytes.
 *
 * @throws {@link ByteSizeError} if the input is empty, malformed or uses an unknown unit.
 */
export function parseBytes(input: string | number, options: ParseBytesOptions = {}): number {
  if (typeof input === "number") {
    if (!Number.isFinite(input)) throw new ByteSizeError(`Expected a finite number of bytes, got ${input}.`);
    return Math.round(input);
  }
  if (typeof input !== "string") {
    throw new ByteSizeError(`Expected a size string like "20MB" or a number of bytes, got ${input === null ? "null" : typeof input}.`);
  }
  let text = input.trim().toLowerCase();
  if (text === "") throw new ByteSizeError(`Cannot parse an empty string as a size. ${EXAMPLES}`);
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
    if (!match) throw new ByteSizeError(`Cannot parse ${quote(input)} as a size: unexpected ${quote(text.slice(start))}. ${EXAMPLES}`);
    const value = Number(match[1]);
    const unit = match[2] ?? "";
    if (unit === "") {
      if (start !== 0 || TOKEN.lastIndex !== text.length) {
        throw new ByteSizeError(`Missing unit after ${match[1]} in ${quote(input)}. Add one, e.g. "${match[1]}MB".`);
      }
      total += value;
      continue;
    }
    const found = UNITS.get(unit);
    if (found === undefined) {
      throw new ByteSizeError(`Unknown unit ${quote(unit)} in ${quote(input)}. Use B, kB, MB, GB, TB, PB, or KiB, MiB, GiB, TiB, PiB.`);
    }
    const [power, binary] = found;
    const base = (binary ?? options.binary === true) ? 1024 : 1000;
    total += value * base ** power;
  }
  const bytes = Math.round(total);
  if (!Number.isFinite(bytes)) throw new ByteSizeError(`${quote(input)} is too large to represent.`);
  return bytes === 0 ? 0 : sign * bytes;
}

/**
 * Format a number of bytes, like `"20 MB"`, `"19.07 MiB"` or `"1.5 kilobytes"`.
 *
 * @throws {@link ByteSizeError} if `bytes` is not a finite number or `decimals` is invalid.
 */
export function formatBytes(bytes: number, options: FormatBytesOptions = {}): string {
  if (typeof bytes !== "number" || !Number.isFinite(bytes)) {
    throw new ByteSizeError(`formatBytes() expects a finite number of bytes, got ${String(bytes)}. Use parseBytes() first if you have a string.`);
  }
  const { binary = false, decimals = 2, long = false } = options;
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 20) {
    throw new ByteSizeError(`Option "decimals" must be a whole number from 0 to 20, got ${String(decimals)}.`);
  }
  const base = binary ? 1024 : 1000;
  const sign = bytes < 0 ? "-" : "";
  let value = Math.abs(bytes);
  let power = 0;
  while (value >= base && power < PREFIXES.length - 1) {
    value /= base;
    power++;
  }
  let rounded = Number(value.toFixed(power === 0 ? 0 : decimals));
  // 999.999 kB rounds to 1000 kB: move up a unit.
  if (rounded >= base && power < PREFIXES.length - 1) {
    power++;
    rounded = Number((rounded / base).toFixed(decimals));
  }
  const number = String(rounded);
  if (long) {
    const name = power === 0 ? "byte" : `${(binary ? LONG_BINARY : LONG_PREFIXES)[power]}byte`;
    return `${sign}${number} ${name}${rounded === 1 ? "" : "s"}`;
  }
  const unit = power === 0 ? "B" : binary ? `${PREFIXES[power]!.toUpperCase()}iB` : `${power === 1 ? "k" : PREFIXES[power]!.toUpperCase()}B`;
  return `${sign}${number} ${unit}`;
}

function quote(text: string): string {
  return JSON.stringify(text.length > 40 ? `${text.slice(0, 40)}...` : text);
}
