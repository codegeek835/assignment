import { createRequire } from "node:module";
import swaggerUi from "swagger-ui-express";
import config from "../config/env.js";

const require = createRequire(import.meta.url);
const openapiBase = require("./openapi.json");

/**
 * Serves Swagger UI at `/api-docs` and the raw OpenAPI document at `/openapi.json`.
 */
export function attachSwagger(app) {
  const spec = JSON.parse(JSON.stringify(openapiBase));
  spec.servers = [
    {
      url: `http://127.0.0.1:${config.port}`,
      description: "Local server (see PORT in .env)",
    },
  ];

  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(spec, {
      customSiteTitle: "Basic API — Swagger",
    })
  );

  app.get("/openapi.json", (_req, res) => {
    res.json(spec);
  });
}
