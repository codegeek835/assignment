const config = require("../config/env");
const { analyzeAuditLogFile } = require("../services/suspiciousLoginDetector");

async function getAlerts(_req, res, next) {
  try {
    const data = await analyzeAuditLogFile(config.loginAuditLogPath, {
      windowMinutes: config.auditWindowMinutes,
      threshold: config.auditFailureThreshold,
    });
    return res.status(200).json(data);
  } catch (err) {
    return next(err);
  }
}

module.exports = { getAlerts };
