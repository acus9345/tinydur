#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { ByteSizeError, DurationError, format, formatBytes, parse, parseBytes } from "./index.js";
import { UNAMBIGUOUS_BYTE_UNIT } from "./bytes.js";

const HELP = `tinydur - convert between readable durations or sizes and numbers

Usage:
  tinydur <duration>            Print the duration in milliseconds
  tinydur <milliseconds>        Print the milliseconds as a readable duration
  tinydur <size>                Print the size in bytes (when it has a byte unit, like 20MB)
  tinydur bytes <size|bytes>    Convert sizes either way

Options:
  -l, --long         Use long unit names ("1 hour 30 minutes", "20 megabytes")
  -u, --units <n>    Maximum number of units when formatting durations (default: 2)
  -b, --binary       Sizes: KB, MB... mean powers of 1024, and output uses KiB, MiB...
  -h, --help         Show this help
  -v, --version      Show the version number

Examples:
  tinydur 1h30m                  5400000
  tinydur "2 days 4 hours"       187200000
  tinydur 5400000                1h 30m
  tinydur 5400000 --long         1 hour 30 minutes
  tinydur 90061001 --units 4     1d 1h 1m 1s
  tinydur 20MB                   20000000
  tinydur 1.5GiB                 1610612736
  tinydur bytes 20000000         20 MB
  tinydur bytes 20000000 -b      19.07 MiB
`;

class UsageError extends Error {}

const NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)$/;

function main(argv: string[]): void {
  const values: string[] = [];
  let long = false;
  let binary = false;
  let units: number | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "-h" || arg === "--help") {
      process.stdout.write(HELP);
      return;
    }
    if (arg === "-v" || arg === "--version") {
      const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string };
      process.stdout.write(`${pkg.version}\n`);
      return;
    }
    if (arg === "-l" || arg === "--long") {
      long = true;
    } else if (arg === "-b" || arg === "--binary") {
      binary = true;
    } else if (arg === "-u" || arg === "--units" || arg.startsWith("--units=")) {
      const raw = arg.startsWith("--units=") ? arg.slice("--units=".length) : argv[++i];
      if (raw === undefined || !/^\d+$/.test(raw) || Number(raw) < 1) {
        throw new UsageError(`--units needs a whole number of at least 1, e.g. "--units 3"${raw === undefined ? "" : `, got "${raw}"`}.`);
      }
      units = Number(raw);
    } else if (/^--?[a-z]/i.test(arg)) {
      throw new UsageError(`Unknown option "${arg}".`);
    } else {
      values.push(arg);
    }
  }

  let bytesMode = false;
  if (values[0]?.toLowerCase() === "bytes" || values[0]?.toLowerCase() === "size") {
    bytesMode = true;
    values.shift();
  }
  if (values.length === 0) throw new UsageError(bytesMode ? `Missing size. Example: tinydur bytes 20MB` : `Missing duration. Example: tinydur 1h30m`);
  const input = values.join(" ").trim();
  // A size with an unmistakable byte unit (20MB, 1.5 GiB) is converted to bytes even without "bytes".
  const units_ = input.toLowerCase().match(/[a-z]+/g) ?? [];
  if (!bytesMode && units_.length > 0 && units_.every((u) => UNAMBIGUOUS_BYTE_UNIT.test(u))) bytesMode = true;

  let output: string;
  if (bytesMode) {
    output = NUMBER.test(input) ? formatBytes(Number(input), { binary, long }) : String(parseBytes(input, { binary }));
  } else {
    output = NUMBER.test(input) ? format(Number(input), { long, units }) : String(parse(input));
  }
  process.stdout.write(`${output}\n`);
}

try {
  main(process.argv.slice(2));
} catch (error) {
  if (!(error instanceof DurationError || error instanceof ByteSizeError || error instanceof UsageError)) throw error;
  process.stderr.write(`tinydur: ${error.message}\nRun "tinydur --help" for usage.\n`);
  process.exitCode = 1;
}
