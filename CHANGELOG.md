# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project uses [Semantic Versioning](https://semver.org/).

## [0.2.0] - 2026-10-18

### Added

- `parseBytes()` turns sizes such as `"20MB"`, `"1.5 GiB"` or `"512kb"` into bytes. `KB`, `MB`... are powers of 1000 (or 1024 with `{ binary: true }`); `KiB`, `MiB`... are always powers of 1024.
- `formatBytes()` turns bytes into `"20 MB"`, `"19.07 MiB"` or `"1.5 megabytes"`, with `binary`, `decimals` and `long` options.
- `ByteSizeError` with messages that explain how to fix bad input.
- The CLI converts sizes too: `tinydur 20MB`, `tinydur bytes 20000000`, and `--binary`.

## [0.1.0] - 2026-10-16

### Added

- `parse()` turns durations such as `"1h 30m"`, `"1.5h"` or `"2 days"` into milliseconds.
- `format()` turns milliseconds into `"1h 30m"` or `"1 hour 30 minutes"`, with a `units` option.
- `DurationError` with messages that explain how to fix bad input.
- `tinydur` CLI with `--long`, `--units`, `--help` and `--version`.
