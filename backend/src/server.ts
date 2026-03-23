import { app } from "./app.js";
import { env } from "./config/env.js";
import { connectMongo, disconnectMongo } from "./db/mongo.js";

await connectMongo();

const server = app.listen(env.PORT, () => {
  console.log(`Backend running on http://localhost:${env.PORT}`);
});

const shutdown = async () => {
  server.close(async () => {
    await disconnectMongo();
    process.exit(0);
  });
};

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});
