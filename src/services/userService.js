import bcrypt from "bcrypt";
import config from "../config/env.js";
import User from "../models/User.js";

export async function signup(username, email, password) {
  const hash = await bcrypt.hash(password, config.bcryptRounds);
  const doc = await User.create({ username, email, password: hash });
  return {
    id: String(doc._id),
    username: doc.username,
    email: doc.email,
  };
}

/**
 * @param {{ username?: string; email?: string }} identity
 * Exactly one of username or email must be set (enforced by route validators).
 */
export async function verifyLogin(identity, password) {
  let doc;
  if (identity.email) {
    doc = await User.findOne({ email: identity.email }).lean();
  } else {
    doc = await User.findOne({ username: identity.username }).lean();
  }
  if (!doc) {
    return { ok: false, reason: "not_found" };
  }
  const match = await bcrypt.compare(password, doc.password);
  if (!match) {
    return { ok: false, reason: "bad_password" };
  }
  return {
    ok: true,
    user: {
      id: String(doc._id),
      username: doc.username,
      email: doc.email,
    },
  };
}

export async function listUsers() {
  const rows = await User.find()
    .sort({ _id: 1 })
    .select({ username: 1, email: 1 })
    .lean();
  return rows.map((u) => ({
    id: String(u._id),
    username: u.username,
    email: u.email,
  }));
}

export default { signup, verifyLogin, listUsers };
