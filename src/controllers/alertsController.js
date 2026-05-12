import config from "../config/env.js";
import { analyzeAuditLogFile } from "../utils/suspiciousLoginDetector.js";

export async function getAlerts(_req, res, next) {
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

export default { getAlerts };
