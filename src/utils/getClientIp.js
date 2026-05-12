/**
 * Best-effort client IPv4/IPv6 for audit logs. Prefer X-Forwarded-For when present.
 * @param {import('express').Request} req
 */
function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim().length > 0) {
    return xff.split(",")[0].trim();
  }
  const raw = req.socket?.remoteAddress || req.ip || "0.0.0.0";
  if (raw === "::1") {
    return "127.0.0.1";
  }
  const v4mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(raw);
  return v4mapped ? v4mapped[1] : raw;
}

module.exports = { getClientIp };
