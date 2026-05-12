#!/usr/bin/env python3
"""
Optional bonus: minimal REST API exposing suspicious IPs as JSON (GET /alerts).

Usage:
  set LOG_ANALYZER_FILE=path/to/log.log
  python alerts_api.py
"""

from __future__ import annotations

import json
import os
from datetime import timedelta
from pathlib import Path

from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse

from log_parser_core import detect_suspicious_ips, iter_failed_attempts


def load_summaries(
    log_path: Path,
    *,
    window_minutes: float = 10.0,
    threshold: int = 5,
    default_year: int | None = None,
):
    text = log_path.read_text(encoding="utf-8", errors="replace").splitlines()
    attempts = list(iter_failed_attempts(text, default_year=default_year))
    window = timedelta(minutes=window_minutes)
    return detect_suspicious_ips(attempts, window=window, threshold=threshold)


def summaries_to_json_payload(summaries) -> list:
    return [
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
        for s in summaries
    ]


def make_handler(log_file: Path, threshold: int, window_minutes: float, default_year):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, fmt, *args):
            # Quieter default server logging
            return

        def do_GET(self):
            parsed = urlparse(self.path)
            if parsed.path != "/alerts":
                self.send_error(404, "Not Found")
                return
            try:
                summaries = load_summaries(
                    log_file,
                    window_minutes=window_minutes,
                    threshold=threshold,
                    default_year=default_year,
                )
                body = json.dumps(summaries_to_json_payload(summaries)).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            except FileNotFoundError:
                self.send_error(500, "Log file missing")

    return Handler


def main():
    log_file = Path(os.environ.get("LOG_ANALYZER_FILE", "sample_logs.log")).resolve()
    host = os.environ.get("LOG_ANALYZER_HOST", "127.0.0.1")
    port = int(os.environ.get("LOG_ANALYZER_PORT", "8080"))
    threshold = int(os.environ.get("LOG_ANALYZER_THRESHOLD", "5"))
    window_minutes = float(os.environ.get("LOG_ANALYZER_WINDOW_MINUTES", "10"))
    dy = os.environ.get("LOG_ANALYZER_DEFAULT_YEAR")
    default_year = int(dy) if dy else None

    Handler = make_handler(log_file, threshold, window_minutes, default_year)
    server = HTTPServer((host, port), Handler)
    print(f"Serving GET /alerts from {log_file} on http://{host}:{port}/alerts")
    server.serve_forever()


if __name__ == "__main__":
    main()
