#!/usr/bin/env python3
"""
CLI: analyze login logs for bursts of failed attempts per IP.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import timedelta
from pathlib import Path

from log_parser_core import detect_suspicious_ips, iter_failed_attempts


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Detect IPs with more than N failed logins within a time window."
    )
    parser.add_argument(
        "--log-file",
        "-f",
        type=Path,
        required=True,
        help="Path to log file",
    )
    parser.add_argument(
        "--window-minutes",
        type=float,
        default=10.0,
        help="Sliding window length in minutes (default: 10)",
    )
    parser.add_argument(
        "--threshold",
        type=int,
        default=5,
        help="More than this many failures in the window triggers alert (default: 5 => need 6+)",
    )
    parser.add_argument(
        "--default-year",
        type=int,
        default=None,
        help="Year for syslog-style timestamps without year (e.g. May 31 14:09:01)",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print machine-readable JSON instead of human text",
    )
    args = parser.parse_args()

    if not args.log_file.is_file():
        print(f"Error: file not found: {args.log_file}", file=sys.stderr)
        return 1

    window = timedelta(minutes=args.window_minutes)
    text = args.log_file.read_text(encoding="utf-8", errors="replace").splitlines()
    attempts = list(iter_failed_attempts(text, default_year=args.default_year))
    summaries = detect_suspicious_ips(
        attempts, window=window, threshold=args.threshold
    )

    if args.json:
        out = []
        for s in summaries:
            out.append(
                {
                    "ip": s.ip,
                    "total_failed_attempts": s.total_failed_attempts,
                    "suspicious_windows": [
                        {
                            "window_start": w.window_start.isoformat(),
                            "window_end": w.window_end.isoformat(),
                            "failures_in_window": w.failures_in_window,
                        }
                        for w in s.suspicious_windows
                    ],
                }
            )
        print(json.dumps(out, indent=2))
        return 0

    if not summaries:
        print(
            f"No suspicious IPs (>{args.threshold} failures within {args.window_minutes} minutes)."
        )
        return 0

    print(
        f"Suspicious IPs (>{args.threshold} failed attempts within {args.window_minutes} min):\n"
    )
    for s in summaries:
        print(f"IP: {s.ip}")
        print(f"  Total failed attempts (entire log): {s.total_failed_attempts}")
        print("  Sliding windows where threshold exceeded:")
        for w in s.suspicious_windows:
            print(
                f"    {w.window_start.isoformat(sep=' ')} .. {w.window_end.isoformat(sep=' ')} "
                f"({w.failures_in_window} failures)"
            )
        print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
