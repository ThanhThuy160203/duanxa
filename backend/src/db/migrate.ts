import { DepartmentModel } from "../models/Department.js";
import { TaskModel } from "../models/Task.js";
import { UserModel } from "../models/User.js";
import { connectMongo, disconnectMongo } from "./mongo.js";

const run = async () => {
  await connectMongo();

  try {
    await Promise.all([DepartmentModel.init(), UserModel.init(), TaskModel.init()]);
    console.log("MongoDB indexes initialized");
  } finally {
    await disconnectMongo();
  }
};

void run();
