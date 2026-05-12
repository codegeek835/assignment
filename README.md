# Assignment 2 — Refactored Express API

Secure, modular restructuring of [Cisotronix/basic-api](https://github.com/Cisotronix/basic-api). Same routes:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/createUser` | Register user (`username`, `email`, `password` JSON body; email validated & normalized) |
| POST | `/login` | Authenticate with `password` and **either** `username` **or** `email` (not both) |
| GET | `/users` | List users (`id`, `username`, `email`; no passwords) |
| GET | `/alerts` | Suspicious IPs from the in-app failed-login log (Assignment 1 sliding-window logic) |

## Login audit (combined with Assignment 1)

Every **`401`** response from **`POST /login`** appends one line to **`LOGIN_AUDIT_LOG_PATH`** (default `./data/failed-logins.log`). Lines match the Assignment 1 parser shape (`FAILED LOGIN`, client IP, user identifier, reason).

**`GET /alerts`** reads that file and returns JSON in the same style as the Python analyzer: IPs with **more than `AUDIT_FAILURE_THRESHOLD`** failures inside any **`AUDIT_WINDOW_MINUTES`** sliding window (defaults **5** / **10**). Tune via `.env` (see [`.env.example`](.env.example)).

## Prerequisites

- **MongoDB** reachable via connection string (local install, Atlas, or Docker).

## Quick start

```bash
npm install
cp .env.example .env   # set MONGODB_URI
npm start
```

Server listens on `PORT` (default **3000**). **`MONGODB_URI`** is required (see `.env.example`).

### Swagger (OpenAPI)

After starting the server:

- **Swagger UI:** [http://127.0.0.1:3000/api-docs](http://127.0.0.1:3000/api-docs) (port follows `PORT`)
- **OpenAPI JSON:** [http://127.0.0.1:3000/openapi.json](http://127.0.0.1:3000/openapi.json)

The spec file lives at [`src/docs/openapi.json`](src/docs/openapi.json).

Example local MongoDB with Docker:

```bash
docker run -d --name mongo -p 27017:27017 mongo:7
export MONGODB_URI=mongodb://127.0.0.1:27017/basic_api
npm start
```

## Postman

Import [postman/Basic-API.postman_collection.json](postman/Basic-API.postman_collection.json) and [postman/Basic-API.local.postman_environment.json](postman/Basic-API.local.postman_environment.json). Select the **Basic API — Local** environment, start the server (`npm start`), then run **Create User** → **Login** → **List Users** → **Get alerts** (after some failed logins if you want non-empty results).

## Tests

```bash
npm test
```

Uses [`mongodb-memory-server`](https://github.com/nodkz/mongodb-memory-server) (no separate MongoDB install needed).

## Project layout

```
src/
  app.js              Express app + global middleware
  server.js           Bootstraps DB then listens
  config/env.js       Environment variables
  db/database.js      Mongoose connection helpers
  models/User.js      User schema (unique username / email)
  routes/users.js     User routes + validators
  routes/alerts.js    GET /alerts (suspicious IPs)
  controllers/        HTTP handlers (thin)
  services/userService.js   Users + bcrypt
  services/loginAuditLog.js Failed-login file append (401)
  services/suspiciousLoginDetector.js  Sliding-window detection
  utils/getClientIp.js
  middleware/         Validation + error handler
```

## Security improvements

| Issue (original) | Change |
|------------------|--------|
| SQL injection via string interpolation | **MongoDB + Mongoose** (`User.create` / `findOne` with structured queries; avoid `$where` / raw strings from clients) |
| Plaintext passwords | `bcrypt` hashes (`BCRYPT_ROUNDS`, default 10) |
| Weak / missing validation | `express-validator` on bodies |
| Incorrect login flow (unreachable branches) | Single clear path: verify hash, `401` on failure |
| leaking password hashes on `GET /users` | Query selects `username` + `email` only; response maps `id`, `username`, `email` |

**Note:** User IDs are MongoDB **`ObjectId`** values exposed as strings in JSON (`id` field).

## Docker (bonus)

The image only runs the Node app; provide **`MONGODB_URI`** at runtime pointing at your MongoDB service.

```bash
docker build -t basic-api .
docker network create basic-api-net
docker run -d --name mongo --network basic-api-net mongo:7
docker run -p 3000:3000 --network basic-api-net \
  -e MONGODB_URI=mongodb://mongo:27017/basic_api \
  basic-api
```

## Design choices

- **Thin controllers** delegate to services for easier testing and reuse.
- **Centralized `errorHandler`** returns JSON consistently; avoids leaking stack traces in production.
- **201 Created** for successful registration (original returned `200`; both are acceptable—201 is more precise).
