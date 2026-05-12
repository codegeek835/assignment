import fs from "node:fs/promises";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

describe("User API", () => {
  let mongod;
  let db;
  /** @type {import("express").Express} */
  let app;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();
    db = await import("../src/db/database.js");
    ({ app } = await import("../src/app.js"));
    await db.initDatabase();
  });

  afterAll(async () => {
    await db.closeDatabase();
    await mongod.stop();
  });

  it("creates a user", async () => {
    const res = await request(app)
      .post("/createUser")
      .send({
        username: "alice",
        email: "alice@example.com",
        password: "secretpass1",
      });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ msg: "user created" });
  });

  it("rejects duplicate username", async () => {
    const res = await request(app)
      .post("/createUser")
      .send({
        username: "alice",
        email: "other@example.com",
        password: "othersecret1",
      });
    expect(res.status).toBe(409);
    expect(res.body.msg).toBe("Username already exists");
  });

  it("rejects duplicate email", async () => {
    const res = await request(app)
      .post("/createUser")
      .send({
        username: "bob",
        email: "alice@example.com",
        password: "bobsecret1!",
      });
    expect(res.status).toBe(409);
    expect(res.body.msg).toBe("Email already registered");
  });

  it("rejects invalid email format", async () => {
    const res = await request(app)
      .post("/createUser")
      .send({
        username: "carol",
        email: "not-an-email",
        password: "secretpass1",
      });
    expect(res.status).toBe(400);
    expect(res.body.msg).toBe("Validation failed");
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it("logs in with username and correct password", async () => {
    const res = await request(app)
      .post("/login")
      .send({ username: "alice", password: "secretpass1" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ msg: "Welcome back!" });
  });

  it("logs in with email and correct password", async () => {
    const res = await request(app)
      .post("/login")
      .send({ email: "alice@example.com", password: "secretpass1" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ msg: "Welcome back!" });
  });

  it("rejects wrong password", async () => {
    const res = await request(app)
      .post("/login")
      .send({ username: "alice", password: "wrongpassword" });
    expect(res.status).toBe(401);
    expect(res.body.msg).toBe("Invalid credentials");
  });

  it("lists users without password field", async () => {
    const res = await request(app).get("/users");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    const alice = res.body.find((u) => u.username === "alice");
    expect(alice).toMatchObject({
      username: "alice",
      email: "alice@example.com",
    });
    expect(alice.id).toEqual(expect.any(String));
    expect(alice.password).toBeUndefined();
  });

  it("validates missing fields on login", async () => {
    const res = await request(app).post("/login").send({});
    expect(res.status).toBe(400);
    expect(res.body.msg).toBe("Validation failed");
  });

  it("rejects login with both username and email", async () => {
    const res = await request(app).post("/login").send({
      username: "alice",
      email: "alice@example.com",
      password: "secretpass1",
    });
    expect(res.status).toBe(400);
    expect(res.body.msg).toBe("Validation failed");
  });

  it("requires email on createUser", async () => {
    const res = await request(app)
      .post("/createUser")
      .send({ username: "dave", password: "secretpass1" });
    expect(res.status).toBe(400);
    expect(res.body.msg).toBe("Validation failed");
  });

  describe("Login audit / GET /alerts", () => {
    beforeEach(async () => {
      await fs.writeFile(process.env.LOGIN_AUDIT_LOG_PATH, "", "utf8");
    });

    it("returns empty array when log has no qualifying failures", async () => {
      const res = await request(app).get("/alerts");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("returns suspicious IP after more than threshold failures in window", async () => {
      const pwd = "wrongpass1";
      for (let i = 0; i < 6; i += 1) {
        const r = await request(app)
          .post("/login")
          .send({ username: "ghost", password: pwd });
        expect(r.status).toBe(401);
      }
      const res = await request(app).get("/alerts");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      const entry = res.body.find((row) => row.total_failed_attempts >= 6);
      expect(entry).toBeDefined();
      expect(entry.ip).toEqual(expect.any(String));
      expect(entry.suspicious_windows.length).toBeGreaterThanOrEqual(1);
    });
  });
});
