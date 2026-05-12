import mongoose from "mongoose";
import config from "../config/env.js";

export async function initDatabase() {
  if (!config.mongoUri) {
    throw new Error(
      "MONGODB_URI is required (set connection string to your MongoDB deployment)."
    );
  }
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  await mongoose.connect(config.mongoUri);
  return mongoose.connection;
}

export async function closeDatabase() {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
}

export default { initDatabase, closeDatabase };
