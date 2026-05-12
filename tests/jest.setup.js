const path = require("path");
const os = require("os");

process.env.NODE_ENV = "test";
process.env.PORT = "3999";
process.env.LOGIN_AUDIT_LOG_PATH = path.join(
  os.tmpdir(),
  "basic-api-jest-audit.log"
);

jest.setTimeout(120000);
