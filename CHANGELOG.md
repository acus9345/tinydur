# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project uses [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-10-16

### Added

- `parse()` turns durations such as `"1h 30m"`, `"1.5h"` or `"2 days"` into milliseconds.
- `format()` turns milliseconds into `"1h 30m"` or `"1 hour 30 minutes"`, with a `units` option.
- `DurationError` with messages that explain how to fix bad input.
- `tinydur` CLI with `--long`, `--units`, `--help` and `--version`.
