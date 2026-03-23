import mongoose from "mongoose";
import { env } from "../config/env.js";

export const connectMongo = async () => {
  await mongoose.connect(env.MONGODB_URI, {
    dbName: env.MONGODB_DB,
  });
};

export const disconnectMongo = async () => {
  await mongoose.disconnect();
};
