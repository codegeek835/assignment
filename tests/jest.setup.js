import path from "node:path";
import os from "node:os";
import { jest } from "@jest/globals";

process.env.NODE_ENV = "test";
process.env.PORT = "3999";
process.env.LOGIN_AUDIT_LOG_PATH = path.join(
  os.tmpdir(),
  "basic-api-jest-audit.log"
);

jest.setTimeout(120000);
