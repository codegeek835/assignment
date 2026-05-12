# Assignment 1 — Log Analyzer

Detects IPv4 addresses with **more than 5** failed login attempts inside any **10-minute** sliding window (configurable).

**Integrated mode:** The same log line format and sliding-window rules are implemented inside [`basic-api`](../basic-api/) — failed **`POST /login`** responses append to `data/failed-logins.log`, and **`GET /alerts`** returns suspicious IPs. Use this folder for the standalone Python CLI or to analyze exported log files.

## Supported log lines

Each line must:

1. Contain a failure hint such as `failed password`, `failed login`, `authentication failure`, or `invalid user`.
2. Contain an IPv4 address.
3. Start with a parseable timestamp:
   - `YYYY-MM-DD HH:MM:SS` or `YYYY-MM-DDTHH:MM:SS`
   - Syslog-style `May 31 14:09:01` — use `--default-year` if the year is omitted.

## Usage

```bash
python analyze_logs.py --log-file sample_logs.log
```

JSON output:

```bash
python analyze_logs.py --log-file sample_logs.log --json
```

Syslog-style example:

```bash
python analyze_logs.py --log-file auth.log --default-year 2025
```

### Parameters

| Flag | Default | Meaning |
|------|---------|---------|
| `--window-minutes` | 10 | Sliding window length |
| `--threshold` | 5 | Alert when failures **exceed** this count in the window (i.e. need **6+**) |

## Bonus: REST `/alerts` (Python)

Prefer **`GET /alerts`** on the Node [`basic-api`](../basic-api/) when you want alerts from live failed logins. Use this Python server only for ad-hoc demos without the API:

Stdlib HTTP server (no extra deps):

```bash
cd log-analyzer
export LOG_ANALYZER_FILE=sample_logs.log
python alerts_api.py
# curl http://127.0.0.1:8080/alerts
```

Environment variables: `LOG_ANALYZER_HOST`, `LOG_ANALYZER_PORT`, `LOG_ANALYZER_THRESHOLD`, `LOG_ANALYZER_WINDOW_MINUTES`, `LOG_ANALYZER_DEFAULT_YEAR`.

## Design notes

- **Parsing**: Regex-based; extend `FAILED_HINT` or `TS_PATTERNS` in `log_parser_core.py` for vendor formats.
- **Detection**: Per-IP sorted timestamps + two-pointer sweep — **O(n log n)** overall, **O(1)** amortized per event per IP.
- **Output**: Lists each suspicious IP with every sliding window where the threshold was exceeded, plus total failed attempts for that IP in the file.

## Security

The analyzer only reads files locally; the bonus API binds to `127.0.0.1` by default. Do not expose it publicly without authentication.
