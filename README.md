# Assignment 2 — Refactored Express API

Secure, modular restructuring of [Cisotronix/basic-api](https://github.com/Cisotronix/basic-api). Same routes:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/signup` | — | Register user (`username`, `email`, `password` JSON body; email validated & normalized). Returns `{ msg, id, username, email, token }`. |
| POST | `/login` | — | Authenticate with `password` and **either** `username` **or** `email` (not both). Returns `{ msg, id, username, email, token }`. |
| GET | `/users` | **Bearer JWT** | List users (`id`, `username`, `email`; no passwords). Requires `Authorization: Bearer <token>`. |
| GET | `/alerts` | — | Suspicious IPs from the access log (Assignment 1 sliding-window logic) |

## Authentication

`POST /signup` and `POST /login` issue a JWT signed with **`JWT_SECRET`** (lifetime **`JWT_EXPIRES_IN`**, default `1h`). Send it on protected routes:

```
Authorization: Bearer <token>
```

`JWT_SECRET` is required in production. In dev/test a fallback is used so the server can boot without configuration.

## Access log (combined with Assignment 1)

Every response is appended to **`LOGIN_AUDIT_LOG_PATH`** (default `./data/failed-logins.log`) in the shape:

```
[2025-10-25T12:00:01Z] IP=203.0.113.42 METHOD=GET PATH=/admin STATUS=403
```

`GET /alerts` is excluded from the log (it reads the same file). The detector treats any line with `STATUS=401` or `STATUS=403` as a failed attempt and returns IPs with **more than `AUDIT_FAILURE_THRESHOLD`** such failures inside any **`AUDIT_WINDOW_MINUTES`** sliding window (defaults **5** / **10**). Tune via `.env` (see [`.env.example`](.env.example)).

## Prerequisites

- **MongoDB** reachable via connection string (local install, Atlas, or Docker).

## Quick start

```bash
npm install
cp .env   # set MONGODB_URI
npm start
```

Server listens on `PORT` (default **3000**). **`MONGODB_URI`** is required (see `.env`).

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

Import [postman/Basic-API.postman_collection.json](postman/Basic-API.postman_collection.json) and [postman/Basic-API.local.postman_environment.json](postman/Basic-API.local.postman_environment.json). Select the **Basic API — Local** environment, start the server (`npm start`), then run **Signup** → **Login** → **List Users** → **Get alerts** (after some failed logins if you want non-empty results). The **Signup** and **Login** requests stash the returned `token` into a collection variable that **List Users** sends as a `Bearer` header.

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
  routes/users.js     User routes
  routes/alerts.js    GET /alerts (suspicious IPs)
  validations/userValidators.js  express-validator chains for /signup & /login
  controllers/        HTTP handlers (thin)
  services/userService.js   Users + bcrypt
  utils/getClientIp.js
  utils/safeFragment.js          Single-line log sanitizer
  utils/suspiciousLoginDetector.js  Sliding-window detection
  middleware/accessLog.js        Per-request access-log append
  middleware/authenticate.js     Bearer-JWT guard for protected routes
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
