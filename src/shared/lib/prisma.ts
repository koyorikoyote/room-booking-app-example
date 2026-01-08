import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

const prisma =
  globalThis.__prisma ||
  new PrismaClient({
    log: ["error", "warn"],
  });

// eslint-disable-next-line no-undef
if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
  globalThis.__prisma = prisma;
}

export default prisma;
