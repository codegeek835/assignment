const userService = require("../services/userService");
const { appendFailedLogin } = require("../services/loginAuditLog");

async function createUser(req, res, next) {
  try {
    const { username, email, password } = req.body;
    await userService.createUser(username, email, password);
    return res.status(201).json({ msg: "user created" });
  } catch (err) {
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const { username, email, password } = req.body;
    const identity =
      email != null && String(email).trim() !== ""
        ? { email }
        : { username: String(username).trim() };
    const result = await userService.verifyLogin(identity, password);
    if (!result.ok) {
      const identifier =
        email != null && String(email).trim() !== ""
          ? String(email).trim()
          : String(username ?? "").trim();
      await appendFailedLogin(req, {
        identifier,
        reason: result.reason,
      });
      return res.status(401).json({ msg: "Invalid credentials" });
    }
    return res.status(200).json({ msg: "Welcome back!" });
  } catch (err) {
    return next(err);
  }
}

async function listUsers(req, res, next) {
  try {
    const rows = await userService.listUsers();
    return res.status(200).json(rows);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createUser,
  login,
  listUsers,
};
