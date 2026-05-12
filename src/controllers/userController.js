import jwt from "jsonwebtoken";
import * as userService from "../services/userService.js";
import config from "../config/env.js";

export async function signup(req, res, next) {
  try {
    const { username, email, password } = req.body;
    const user = await userService.signup(username, email, password);
    const token = jwt.sign(
      { sub: user.id, username: user.username },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );
    return res.status(201).json({
      msg: "user created",
      ...user,
      token,
    });
  } catch (err) {
    return next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { username, email, password } = req.body;
    const identity =
      email != null && String(email).trim() !== ""
        ? { email }
        : { username: String(username).trim() };
    const result = await userService.verifyLogin(identity, password);
    if (!result.ok) {
      return res.status(401).json({ msg: "Invalid credentials" });
    }
    const token = jwt.sign(
      { sub: result.user.id, username: result.user.username },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );
    return res.status(200).json({ 
      msg: "Welcome back!",
      ...result.user,
      token
     });
  } catch (err) {
    return next(err);
  }
}

export async function listUsers(req, res, next) {
  try {
    const rows = await userService.listUsers();
    return res.status(200).json(rows);
  } catch (err) {
    return next(err);
  }
}

export default { signup, login, listUsers };
