import jwt from "jsonwebtoken";
import config from "../config/env.js";

export function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const m = /^Bearer\s+(.+)$/i.exec(header);
  if (!m) {
    return res.status(401).json({ msg: "Missing or invalid Authorization header" });
  }
  try {
    req.user = jwt.verify(m[1], config.jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ msg: "Invalid or expired token" });
  }
}
