# tinydur

Tiny, zero-dependency duration and byte-size parser and formatter: `"1h 30m"` ⇄ `5400000` and `"20MB"` ⇄ `20000000`, with a CLI.

A small replacement for `ms`, `parse-duration`, `humanize-duration`, `bytes` and `pretty-bytes`. Fully typed, ESM, no dependencies.

## Install

```bash
npm install @acus9345/tinydur
```

Requires Node.js 22 or newer.

## Quick start

Save this as `example.mjs`:

```js
import { parse, format, parseBytes, formatBytes } from "@acus9345/tinydur";

console.log(parse("1h 30m"));                    // 5400000
console.log(format(5400000));                    // 1h 30m
console.log(format(5400000, { long: true }));    // 1 hour 30 minutes
console.log(parseBytes("20MB"));                 // 20000000
console.log(formatBytes(1610612736, { binary: true })); // 1.5 GiB
```

Run it:

```bash
node example.mjs
```

Or use the CLI without installing anything:

```bash
npx @acus9345/tinydur 1h30m
```

## API

### `parse(input: string | number): number`

Turns a duration into milliseconds.

| Input                     | Result       |
| ------------------------- | ------------ |
| `"1h 30m"`, `"1h30m"`     | `5400000`    |
| `"1 hour and 30 minutes"` | `5400000`    |
| `"1.5h"`                  | `5400000`    |
| `"90s"`                   | `90000`      |
| `"2 days"`                | `172800000`  |
| `"-5m"`                   | `-300000`    |
| `"100"` or `100`          | `100`        |

Units: `ms`, `s`, `m`, `h`, `d`, `w`, `y`, plus long forms such as `sec`, `mins`, `hours`, `days`, `weeks`, `years`. Case and spacing don't matter. A year is 365.25 days.

### `format(ms: number, options?): string`

Turns milliseconds into a readable duration, using days, hours, minutes, seconds and milliseconds.

| Option  | Default | Meaning                                                          |
| ------- | ------- | ---------------------------------------------------------------- |
| `long`  | `false` | `"1 hour 30 minutes"` instead of `"1h 30m"`                      |
| `units` | `2`     | Maximum number of units, counting from the largest; the rest is rounded |

```js
format(90061001);                // "1d 1h"
format(90061001, { units: 4 });  // "1d 1h 1m 1s"
format(59999, { units: 1 });     // "1m"
```

### `parseBytes(input: string | number, options?): number`

Turns a size into bytes.

| Input                    | Result          |
| ------------------------ | --------------- |
| `"20MB"`, `"20 mb"`      | `20000000`      |
| `"1.5GB"`                | `1500000000`    |
| `"1.5 GiB"`              | `1610612736`    |
| `"512 KiB"`              | `524288`        |
| `"1GB 512MB"`            | `1512000000`    |
| `"2 megabytes"`          | `2000000`       |
| `"100"` or `100`         | `100`           |

`kB`, `MB`, `GB`, `TB`, `PB` and `EB` are powers of 1000, as in the SI standard and on macOS and Linux. Pass `{ binary: true }` to read them as powers of 1024, like Windows does. `KiB`, `MiB`, `GiB`... are always powers of 1024. Short forms (`k`, `m`, `g`) and long names (`kilobytes`, `gibibytes`) work too, case doesn't matter, and the result is rounded to whole bytes.

### `formatBytes(bytes: number, options?): string`

| Option     | Default | Meaning                                                    |
| ---------- | ------- | ---------------------------------------------------------- |
| `binary`   | `false` | Powers of 1024 with `KiB`, `MiB`... instead of `kB`, `MB`  |
| `decimals` | `2`     | Most digits after the decimal point; trailing zeros dropped |
| `long`     | `false` | `"20 megabytes"` instead of `"20 MB"`                      |

```js
formatBytes(20000000);                    // "20 MB"
formatBytes(20000000, { binary: true });  // "19.07 MiB"
formatBytes(1536);                        // "1.54 kB"
formatBytes(1500000, { long: true });     // "1.5 megabytes"
```

Bad input throws a `ByteSizeError` that explains the fix, just like `DurationError` below.

### `DurationError`

Both functions throw a `DurationError` (a subclass of `Error`) for bad input. Its message says what was wrong and how to fix it:

```js
import { parse, DurationError } from "@acus9345/tinydur";

try {
  parse("5 parsecs");
} catch (error) {
  if (error instanceof DurationError) console.log(error.message);
  // Unknown unit "parsecs" in "5 parsecs". Use one of: ms, s, m, h, d, w, y (long names like "minutes" work too).
}
```

## CLI

```bash
npx @acus9345/tinydur 1h30m
npx @acus9345/tinydur "2 days 4 hours"
npx @acus9345/tinydur 5400000 --long
npx @acus9345/tinydur 90061001 --units 4
```

Prints `5400000`, `187200000`, `1 hour 30 minutes` and `1d 1h 1m 1s`. A plain number is formatted; anything else is parsed to milliseconds.

Sizes work the same way. Anything with a byte unit is converted to bytes, and `bytes` formats a number of bytes:

```bash
npx @acus9345/tinydur 20MB                    # 20000000
npx @acus9345/tinydur 1.5GiB                  # 1610612736
npx @acus9345/tinydur bytes 20000000          # 20 MB
npx @acus9345/tinydur bytes 20000000 --binary # 19.07 MiB
```

`20m` on its own still means 20 minutes; write `20MB`, or `tinydur bytes 20m`, for megabytes.

| Option            | Meaning                                      |
| ----------------- | -------------------------------------------- |
| `-l`, `--long`    | Long unit names                              |
| `-u`, `--units N` | Maximum number of units when formatting      |
| `-b`, `--binary`  | Sizes in powers of 1024 (`KiB`, `MiB`...)    |
| `-h`, `--help`    | Show help                                    |
| `-v`, `--version` | Show version                                 |

Works the same in PowerShell, cmd and POSIX shells. Quote durations that contain spaces, or pass the parts as separate arguments (`npx @acus9345/tinydur 1h 30m`). After `npm install`, the command is also available as `tinydur` in npm scripts.

## Troubleshooting

- **`ERR_REQUIRE_ESM` or `require() of ES Module`**: tinydur is an ES module. Use `import`, or upgrade to Node.js 22.12+ where `require("@acus9345/tinydur")` works.
- **`Missing unit after 30`**: every number in a multi-part duration needs a unit, e.g. `"1h 30m"` rather than `"1h 30"`. A single bare number is read as milliseconds.
- **`m` means minutes**: there is no month unit because months vary in length. Use days or weeks.
- **`format("5000")` throws**: `format` takes a number. Call `parse` first if you have a string.
- **PowerShell treats `-5m` oddly in scripts**: quote it: `npx @acus9345/tinydur "-5m"`.

## License

MIT
