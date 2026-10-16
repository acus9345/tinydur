# tinydur

Tiny, zero-dependency duration parser and formatter: `"1h 30m"` ⇄ `5400000`, with a CLI.

A small replacement for `ms`, `parse-duration` and `humanize-duration`. Fully typed, ESM, no dependencies.

## Install

```bash
npm install tinydur
```

Requires Node.js 22 or newer.

## Quick start

Save this as `example.mjs`:

```js
import { parse, format } from "tinydur";

console.log(parse("1h 30m"));                    // 5400000
console.log(format(5400000));                    // 1h 30m
console.log(format(5400000, { long: true }));    // 1 hour 30 minutes
```

Run it:

```bash
node example.mjs
```

Or use the CLI without installing anything:

```bash
npx tinydur 1h30m
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

### `DurationError`

Both functions throw a `DurationError` (a subclass of `Error`) for bad input. Its message says what was wrong and how to fix it:

```js
import { parse, DurationError } from "tinydur";

try {
  parse("5 parsecs");
} catch (error) {
  if (error instanceof DurationError) console.log(error.message);
  // Unknown unit "parsecs" in "5 parsecs". Use one of: ms, s, m, h, d, w, y (long names like "minutes" work too).
}
```

## CLI

```bash
npx tinydur 1h30m
npx tinydur "2 days 4 hours"
npx tinydur 5400000 --long
npx tinydur 90061001 --units 4
```

Prints `5400000`, `187200000`, `1 hour 30 minutes` and `1d 1h 1m 1s`. A plain number is formatted; anything else is parsed to milliseconds.

| Option            | Meaning                                      |
| ----------------- | -------------------------------------------- |
| `-l`, `--long`    | Long unit names                              |
| `-u`, `--units N` | Maximum number of units when formatting      |
| `-h`, `--help`    | Show help                                    |
| `-v`, `--version` | Show version                                 |

Works the same in PowerShell, cmd and POSIX shells. Quote durations that contain spaces, or pass the parts as separate arguments (`tinydur 1h 30m`).

## Troubleshooting

- **`ERR_REQUIRE_ESM` or `require() of ES Module`**: tinydur is an ES module. Use `import`, or upgrade to Node.js 22.12+ where `require("tinydur")` works.
- **`Missing unit after 30`**: every number in a multi-part duration needs a unit, e.g. `"1h 30m"` rather than `"1h 30"`. A single bare number is read as milliseconds.
- **`m` means minutes**: there is no month unit because months vary in length. Use days or weeks.
- **`format("5000")` throws**: `format` takes a number. Call `parse` first if you have a string.
- **PowerShell treats `-5m` oddly in scripts**: quote it: `npx tinydur "-5m"`.

## License

MIT
