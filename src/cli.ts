#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { DurationError, format, parse } from "./index.js";

const HELP = `tinydur - convert between readable durations and milliseconds

Usage:
  tinydur <duration>         Print the duration in milliseconds
  tinydur <milliseconds>     Print the milliseconds as a readable duration

Options:
  -l, --long         Use long unit names ("1 hour 30 minutes")
  -u, --units <n>    Maximum number of units when formatting (default: 2)
  -h, --help         Show this help
  -v, --version      Show the version number

Examples:
  tinydur 1h30m                  5400000
  tinydur "2 days 4 hours"       187200000
  tinydur 5400000                1h 30m
  tinydur 5400000 --long         1 hour 30 minutes
  tinydur 90061001 --units 4     1d 1h 1m 1s
`;

class UsageError extends Error {}

function main(argv: string[]): void {
  const values: string[] = [];
  let long = false;
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

  if (values.length === 0) throw new UsageError(`Missing duration. Example: tinydur 1h30m`);
  const input = values.join(" ").trim();
  const output = /^[+-]?(\d+\.?\d*|\.\d+)$/.test(input) ? format(Number(input), { long, units }) : String(parse(input));
  process.stdout.write(`${output}\n`);
}

try {
  main(process.argv.slice(2));
} catch (error) {
  if (!(error instanceof DurationError || error instanceof UsageError)) throw error;
  process.stderr.write(`tinydur: ${error.message}\nRun "tinydur --help" for usage.\n`);
  process.exitCode = 1;
}
