"""
Parse login failure lines and detect IPs exceeding the failure threshold within a sliding window.
Supports common log shapes; extend FAILED_LINE regexes if your vendor format differs.
"""

from __future__ import annotations

import re
from collections import defaultdict
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import Iterable, Iterator, Sequence

# IPv4
IP_PATTERN = re.compile(
    r"\b(?P<ip>(?:25[0-5]|2[0-4]\d|[01]?\d\d?)(?:\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)){3})\b"
)

# Lines considered failed login attempts (case-insensitive substring match after IP extraction)
FAILED_HINT = re.compile(
    r"(failed\s+(?:password|login)|authentication\s+failure|invalid\s+user|"
    r"login\s+incorrect|bad\s+password)",
    re.IGNORECASE,
)

# Timestamp patterns tried in order (first match wins per line)
TS_PATTERNS = [
    (
        re.compile(
            r"^(?P<ts>\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?)"
        ),
        "%Y-%m-%d %H:%M:%S",
    ),
    (
        re.compile(
            r"^(?P<ts>[A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})"
        ),
        "%b %d %H:%M:%S",
    ),
]


@dataclass(frozen=True)
class FailedAttempt:
    ts: datetime
    ip: str
    raw_line: str


def parse_timestamp(line: str, default_year: int | None) -> datetime | None:
    for rx, fmt in TS_PATTERNS:
        m = rx.match(line.strip())
        if not m:
            continue
        ts_str = m.group("ts").replace("T", " ")
        try:
            if fmt.startswith("%b"):  # syslog-style without year
                dt = datetime.strptime(ts_str, fmt)
                if default_year is not None:
                    dt = dt.replace(year=default_year)
                return dt
            base = ts_str.split(".")[0]
            return datetime.strptime(base, "%Y-%m-%d %H:%M:%S")
        except ValueError:
            continue
    return None


def iter_failed_attempts(
    lines: Iterable[str], default_year: int | None = None
) -> Iterator[FailedAttempt]:
    for raw in lines:
        line = raw.rstrip("\n\r")
        if not line.strip():
            continue
        if not FAILED_HINT.search(line):
            continue
        ip_m = IP_PATTERN.search(line)
        if not ip_m:
            continue
        ts = parse_timestamp(line, default_year)
        if ts is None:
            continue
        yield FailedAttempt(ts=ts, ip=ip_m.group("ip"), raw_line=line)


@dataclass
class SuspiciousWindow:
    ip: str
    window_start: datetime
    window_end: datetime
    failures_in_window: int


@dataclass
class SuspiciousSummary:
    ip: str
    suspicious_windows: list[SuspiciousWindow]
    total_failed_attempts: int


def _merge_overlapping_windows(
    windows: list[SuspiciousWindow],
) -> list[SuspiciousWindow]:
    """Collapse overlapping [window_start, window_end] ranges; keep max failure count."""
    if not windows:
        return []
    windows = sorted(windows, key=lambda w: (w.window_start, w.window_end))
    merged: list[SuspiciousWindow] = []
    cur = windows[0]
    for w in windows[1:]:
        if w.window_start <= cur.window_end:
            cur = SuspiciousWindow(
                ip=cur.ip,
                window_start=min(cur.window_start, w.window_start),
                window_end=max(cur.window_end, w.window_end),
                failures_in_window=max(cur.failures_in_window, w.failures_in_window),
            )
        else:
            merged.append(cur)
            cur = w
    merged.append(cur)
    return merged


def detect_suspicious_ips(
    attempts: Sequence[FailedAttempt],
    *,
    window: timedelta,
    threshold: int,
) -> list[SuspiciousSummary]:
    """
    Flag an IP when it has *more than* `threshold` failures inside any sliding `window`.
    Uses two-pointer sweep per IP on sorted timestamps — O(n log n) total.
    """
    by_ip: dict[str, list[datetime]] = defaultdict(list)
    for a in attempts:
        by_ip[a.ip].append(a.ts)

    summaries: list[SuspiciousSummary] = []
    for ip, times in sorted(by_ip.items()):
        times.sort()
        raw_windows: list[SuspiciousWindow] = []
        total_failures = len(times)
        left = 0
        for right, t_end in enumerate(times):
            while times[left] < t_end - window:
                left += 1
            cnt = right - left + 1
            if cnt > threshold:
                w_start = times[left]
                raw_windows.append(
                    SuspiciousWindow(
                        ip=ip,
                        window_start=w_start,
                        window_end=t_end,
                        failures_in_window=cnt,
                    )
                )
        windows = _merge_overlapping_windows(raw_windows)
        if windows:
            summaries.append(
                SuspiciousSummary(
                    ip=ip,
                    suspicious_windows=windows,
                    total_failed_attempts=total_failures,
                )
            )
    return summaries
