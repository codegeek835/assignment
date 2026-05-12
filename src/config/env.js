require("dotenv").config();

const path = require("path");

const port = parseInt(process.env.PORT || "3000", 10);
if (Number.isNaN(port) || port < 1) {
  throw new Error("Invalid PORT");
}

const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || "10", 10);
if (Number.isNaN(bcryptRounds) || bcryptRounds < 4) {
  throw new Error("Invalid BCRYPT_ROUNDS");
}

/** MongoDB connection URI (e.g. mongodb://localhost:27017/basic_api) */
const mongoUri = process.env.MONGODB_URI || "";

const loginAuditLogPath =
  process.env.LOGIN_AUDIT_LOG_PATH ||
  path.join(process.cwd(), "../logs", "failed-logins.log");

const auditWindowMinutes = parseFloat(
  process.env.AUDIT_WINDOW_MINUTES || "10"
);
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

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port,
  mongoUri,
  bcryptRounds,
  loginAuditLogPath,
  auditWindowMinutes,
  auditFailureThreshold,
};
