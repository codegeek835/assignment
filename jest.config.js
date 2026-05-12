/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/tests/jest.setup.js"],
  testMatch: ["**/tests/**/*.test.js"],
};
