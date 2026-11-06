# Changelog

## 0.3.3 - 2026-11-06

### Features

- Add a user-column eye toggle to hide usernames.
- Shift the panel title clear of the sidebar controls when the sidebar is collapsed.
- Add a README preview image.

## 0.3.2 - 2026-11-06

### Documentation

- Simplify the README to user-facing sections only.

## 0.3.0 - 2026-11-06

### Features

- Rename the package to `dsh-sys-monitor` for npm and GitHub releases.
- btop-style system monitor panel with CPU, memory, disk, and network cards.
- Per-core CPU meters, 1/5/15-minute load averages, and 90-point history charts.
- Memory and swap breakdown with used / cached / free segments.
- Disk capacity, live read/write throughput, and disk I/O history.
- Network download/upload throughput, session totals, active interfaces, and history.
- Process table with app icons, sortable columns, search, and user/active filters.
- Process detail panel with parent PID, user, state, memory, CPU time, and full command line.
- Force-quit action with a confirmation dialog and Host-side protection for Harness processes.
- Adjustable refresh interval (0.5s / 1s / 2s / 5s) and pause control.
