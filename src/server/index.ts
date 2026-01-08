import express, { Request, Response, Application } from "express";
import prisma from "../shared/lib/prisma";

function getApp(): Application {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const mod = require("./app");
    return mod.default || mod;
  } catch (err) {
    const fallback = express();
    fallback.use(express.json());

    fallback.get("/api/health", (_req: Request, res: Response) => {
      res.json({
        status: "DEGRADED",
        message: "Fallback app in use - main app failed to load",
      });
    });

    fallback.use("/api", (_req: Request, res: Response) => {
      res.status(503).json({
        status: "INIT",
        error: "App module failed to load; running fallback server",
      });
    });

    console.error(
      "Failed to load ./app module, starting fallback server:",
      err
    );
    return fallback;
  }
}

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  require("dotenv").config();
} catch {
  // optional: dotenv not installed or no .env file
}

const PORT =
  Number(process.env.PORT) ||
  (process.env.NODE_ENV === "development" ? 3002 : 3002);

function startServer() {
  const appInstance = getApp();
  const server = (appInstance as any).listen(PORT, "127.0.0.1", () => {
    console.log(`🚀 Server is running on http://127.0.0.1:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log("🔗 Database: MySQL via Prisma ORM");

    if (process.env.NODE_ENV === "development") {
      console.log(`🌐 Server: http://127.0.0.1:${PORT}`);
      console.log(`🔍 Health: http://127.0.0.1:${PORT}/api/health`);
    }
  });

  server.on("error", (err: Error) => {
    console.error("HTTP server error:", err);
  });

  void connectWithRetry();
}

async function connectWithRetry(attempt = 1): Promise<void> {
  try {
    await prisma.$connect();
    console.log("✅ Connected to MySQL database via Prisma");
  } catch (error) {
    const delay = Math.min(30000, 1000 * Math.pow(2, attempt - 1));
    const msg = error instanceof Error ? error.message : String(error);
    console.error(
      `⚠️ Prisma connect failed (attempt ${attempt}). Retrying in ${Math.round(
        delay / 1000
      )}s...`,
      msg
    );
    globalThis.setTimeout(() => {
      void connectWithRetry(attempt + 1);
    }, delay);
  }
}

process.on("uncaughtException", async (error) => {
  console.error("Uncaught Exception:", error);
  try {
    await prisma.$disconnect();
  } catch (disconnectError) {
    console.error("Failed to disconnect Prisma:", disconnectError);
  }
});

process.on("unhandledRejection", async (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  try {
    await prisma.$disconnect();
  } catch (disconnectError) {
    console.error("Failed to disconnect Prisma:", disconnectError);
  }
});

startServer();
