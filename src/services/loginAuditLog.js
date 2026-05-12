const fs = require("fs/promises");
const path = require("path");
const config = require("../config/env");
const { getClientIp } = require("../utils/getClientIp");

function safeFragment(value, maxLen = 128) {
  if (value == null) return "unknown";
  return String(value).replace(/[\r\n\t]/g, " ").slice(0, maxLen);
}

/**
 * Append one failed-login line (same shape as Assignment 1 log analyzer).
 * Swallows disk errors so a full disk does not block authentication responses.
 * @param {import('express').Request} req
 * @param {{ identifier?: string; reason: string }} meta
 */
async function appendFailedLogin(req, meta) {
  try {
    const ip = getClientIp(req);
    const ts = new Date().toISOString();
    const user = safeFragment(meta.identifier);
    const reason = safeFragment(meta.reason, 64);
    const line = `${ts} FAILED LOGIN ip=${ip} user=${user} reason=${reason}\n`;
    const filePath = config.loginAuditLogPath;
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.appendFile(filePath, line, "utf8");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[loginAuditLog] append failed:", err.message || err);
  }
}

module.exports = { appendFailedLogin };
