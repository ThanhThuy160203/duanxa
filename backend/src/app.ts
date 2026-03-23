import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFound.js";
import { departmentsRouter } from "./modules/departments/index.js";
import { tasksRouter } from "./modules/tasks/index.js";
import { usersRouter } from "./modules/users/index.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "duanxa-backend" });
});

app.use("/api/departments", departmentsRouter);
app.use("/api/users", usersRouter);
app.use("/api/tasks", tasksRouter);

app.use(notFoundHandler);
app.use(errorHandler);
