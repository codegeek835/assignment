import mongoose from "mongoose";
import config from "../config/env.js";

function duplicateKeyMessage(err) {
  const field = err.keyPattern ? Object.keys(err.keyPattern)[0] : null;
  const messages = {
    username: "Username already exists",
    email: "Email already registered",
  };
  return messages[field] || "Duplicate key violation";
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.entries(err.errors).map(([path, e]) => ({
      path,
      msg: e.message,
    }));
    return res.status(400).json({
      msg: "Validation failed",
      errors,
    });
  }

  if (err.code === 11000 || err.code === "11000") {
    return res.status(409).json({
      msg: duplicateKeyMessage(err),
    });
  }

  const status = err.statusCode || 500;
  const payload = {
    msg: err.publicMessage || "Internal server error",
  };
  if (config.nodeEnv !== "production" && err.message) {
    payload.detail = err.message;
  }
  res.status(status).json(payload);
}
