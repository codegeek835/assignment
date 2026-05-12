import "dotenv/config";
import path from "node:path";

const port = parseInt(process.env.PORT || "3000", 10);
if (Number.isNaN(port) || port < 1) {
  throw new Error("Invalid PORT");
}

const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || "10", 10);
if (Number.isNaN(bcryptRounds) || bcryptRounds < 4) {
  throw new Error("Invalid BCRYPT_ROUNDS");
}

const mongoUri = process.env.MONGODB_URI || "";

const loginAuditLogPath =
  process.env.LOGIN_AUDIT_LOG_PATH ||
  path.join(process.cwd(), "logs", "failed-logins.log");

const auditWindowMinutes = parseFloat(process.env.AUDIT_WINDOW_MINUTES || "10");
if (Number.isNaN(auditWindowMinutes) || auditWindowMinutes <= 0) {
  throw new Error("Invalid AUDIT_WINDOW_MINUTES");
}

const auditFailureThreshold = parseInt(
  process.env.AUDIT_FAILURE_THRESHOLD || "5",
  10
);
if (Number.isNaN(auditFailureThreshold) || auditFailureThreshold < 1) {
  throw new Error("Invalid AUDIT_FAILURE_THRESHOLD");
}

const jwtSecret = process.env.JWT_SECRET || "";
if (!jwtSecret && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET is required in production");
}
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "1h";

export default {
  nodeEnv: process.env.NODE_ENV || "development",
  port,
  mongoUri,
  bcryptRounds,
  loginAuditLogPath,
  auditWindowMinutes,
  auditFailureThreshold,
  jwtSecret: jwtSecret || "dev-only-insecure-secret",
  jwtExpiresIn,
};
