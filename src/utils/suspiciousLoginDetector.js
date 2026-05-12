import fs from "node:fs/promises";

const IP_PATTERN =
  /\b((?:25[0-5]|2[0-4]\d|[01]?\d\d?)(?:\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)){3})\b/;
const FAILED_HINT =
  /failed\s+(?:password|login)|authentication\s+failure|invalid\s+user|login\s+incorrect|bad\s+password|STATUS=(?:400|401|403|409)/i;
const TS_PREFIX =
  /^\[?(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})?)\]?/;

/**
 * @typedef {{ ts: Date; ip: string; rawLine: string }} FailedAttempt
 * @typedef {{ windowStart: Date; windowEnd: Date; failuresInWindow: number }} SuspiciousWindow
 * @typedef {{ ip: string; suspiciousWindows: SuspiciousWindow[]; totalFailedAttempts: number }} SuspiciousSummary
 */

/** @param {string} line */
function parseTimestamp(line) {
  const m = line.trim().match(TS_PREFIX);
  if (!m) return null;
  const normalized = m[1].replace(" ", "T");
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** @param {string[]} lines */
export function iterFailedAttempts(lines) {
  /** @type {FailedAttempt[]} */
  const out = [];
  for (const raw of lines) {
    const line = raw.replace(/\r$/, "");
    if (!line.trim()) continue;
    if (!FAILED_HINT.test(line)) continue;
    const ipM = line.match(IP_PATTERN);
    if (!ipM) continue;
    const ts = parseTimestamp(line);
    if (!ts) continue;
    out.push({ ts, ip: ipM[1], rawLine: line });
  }
  return out;
}

/** @param {SuspiciousWindow[]} windows */
function mergeOverlappingWindows(windows) {
  if (windows.length === 0) return [];
  const sorted = [...windows].sort(
    (a, b) => a.windowStart - b.windowStart || a.windowEnd - b.windowEnd
  );
  /** @type {SuspiciousWindow[]} */
  const merged = [];
  let cur = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const w = sorted[i];
    if (w.windowStart <= cur.windowEnd) {
      cur = {
        windowStart:
          cur.windowStart < w.windowStart ? cur.windowStart : w.windowStart,
        windowEnd: cur.windowEnd > w.windowEnd ? cur.windowEnd : w.windowEnd,
        failuresInWindow: Math.max(cur.failuresInWindow, w.failuresInWindow),
      };
    } else {
      merged.push(cur);
      cur = w;
    }
  }
  merged.push(cur);
  return merged;
}

/**
 * @param {FailedAttempt[]} attempts
 * @param {{ windowMs: number; threshold: number }} opts
 * @returns {SuspiciousSummary[]}
 */
export function detectSuspiciousIps(attempts, opts) {
  const { windowMs, threshold } = opts;
  /** @type {Map<string, Date[]>} */
  const byIp = new Map();
  for (const a of attempts) {
    if (!byIp.has(a.ip)) byIp.set(a.ip, []);
    byIp.get(a.ip).push(a.ts);
  }

  /** @type {SuspiciousSummary[]} */
  const summaries = [];
  const sortedIps = [...byIp.keys()].sort();
  for (const ip of sortedIps) {
    const times = byIp.get(ip);
    if (!times) continue;
    times.sort((a, b) => a - b);
    /** @type {SuspiciousWindow[]} */
    const rawWindows = [];
    let left = 0;
    for (let right = 0; right < times.length; right++) {
      const tEnd = times[right];
      while (left <= right && tEnd.getTime() - times[left].getTime() > windowMs) {
        left += 1;
      }
      const cnt = right - left + 1;
      if (cnt > threshold) {
        rawWindows.push({
          windowStart: times[left],
          windowEnd: tEnd,
          failuresInWindow: cnt,
        });
      }
    }
    const suspiciousWindows = mergeOverlappingWindows(rawWindows);
    if (suspiciousWindows.length > 0) {
      summaries.push({
        ip,
        suspiciousWindows,
        totalFailedAttempts: times.length,
      });
    }
  }
  return summaries;
}

/** @param {SuspiciousSummary[]} summaries */
function toApiJson(summaries) {
  return summaries.map((s) => ({
    ip: s.ip,
    total_failed_attempts: s.totalFailedAttempts,
    suspicious_windows: s.suspiciousWindows.map((w) => ({
      window_start: w.windowStart.toISOString(),
      window_end: w.windowEnd.toISOString(),
      failures_in_window: w.failuresInWindow,
    })),
  }));
}

/**
 * Read audit log from disk and compute suspicious IPs (same rules as Assignment 1).
 * @param {string} filePath
 * @param {{ windowMinutes?: number; threshold?: number }} [opts]
 */
export async function analyzeAuditLogFile(filePath, opts = {}) {
  const windowMinutes = opts.windowMinutes ?? 10;
  const threshold = opts.threshold ?? 5;
  let text = "";
  try {
    text = await fs.readFile(filePath, "utf8");
  } catch (e) {
    if (e && e.code === "ENOENT") return [];
    throw e;
  }
  const lines = text.split("\n");
  const attempts = iterFailedAttempts(lines);
  const windowMs = windowMinutes * 60 * 1000;
  const summaries = detectSuspiciousIps(attempts, { windowMs, threshold });
  return toApiJson(summaries);
}
