import fs from "node:fs";
import path from "node:path";
import config from "../config/env.js";
import { getClientIp } from "../utils/getClientIp.js";

let fileReady = false;
function ensureFileReady() {
  if (fileReady) return;
  const filePath = config.loginAuditLogPath;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  // If the existing file doesn't end with a newline, pad one so our first
  // append doesn't fuse onto the previous line.
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > 0) {
      const fd = fs.openSync(filePath, "r");
      try {
        const buf = Buffer.alloc(1);
        fs.readSync(fd, buf, 0, 1, stat.size - 1);
        if (buf[0] !== 0x0a) {
          fs.appendFileSync(filePath, "\n", "utf8");
        }
      } finally {
        fs.closeSync(fd);
      }
    }
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
  fileReady = true;
}

function isoSecondsZ(d) {
  return d.toISOString().replace(/\.\d+Z$/, "Z");
}

/**
 * Append one access-log line per response in the shape:
 *   [2025-10-25T12:00:01Z] IP=1.2.3.4 METHOD=GET PATH=/admin STATUS=403
 */
// Skip logging the alerts endpoint itself — it reads the log file.
const SKIP_PATHS = new Set(["/alerts"]);

export function accessLog(req, res, next) {
  const pathOnly = (req.originalUrl || req.url || "").split("?")[0];
  if (SKIP_PATHS.has(pathOnly)) {
    return next();
  }
  const origEnd = res.end.bind(res);
  res.end = function patchedEnd(...args) {
    try {
      ensureFileReady();
      const ts = isoSecondsZ(new Date());
      const ip = getClientIp(req);
      const line = `[${ts}] IP=${ip} METHOD=${req.method} PATH=${pathOnly} STATUS=${res.statusCode}\n`;
      fs.appendFileSync(config.loginAuditLogPath, line, "utf8");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[accessLog] append failed:", err.message || err);
    }
    return origEnd(...args);
  };
  next();
}
