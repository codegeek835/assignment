const { app } = require("./app");
const config = require("./config/env");
const db = require("./db/database");

async function main() {
  await db.initDatabase();
  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on port ${config.port}`);
    console.log(`MongoDB URI: ${config.mongoUri}`);
    console.log(`API documentation: http://127.0.0.1:${config.port}/api-docs`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
