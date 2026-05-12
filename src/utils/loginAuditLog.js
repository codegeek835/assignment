import fs from "node:fs/promises";
import path from "node:path";
import config from "../config/env.js";
import { getClientIp } from "./getClientIp.js";
import { safeFragment } from "./safeFragment.js";

/**
 * Append one failed-login line (same shape as Assignment 1 log analyzer).
 * Swallows disk errors so a full disk does not block authentication responses.
 * @param {import('express').Request} req
 * @param {{ identifier?: string; reason: string }} meta
 */
export async function appendFailedLogin(req, meta) {
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
