import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export function databaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function databaseErrorMessage(error: unknown) {
  const code = typeof error === "object" && error !== null
    ? String("code" in error ? error.code : "errorCode" in error ? error.errorCode : "")
    : "";
  if (code === "P1000") return "Neon rejected the database credentials. Copy a fresh connection string into DATABASE_URL.";
  if (code === "P1001") return "The application cannot reach Neon. Check the hostname and ensure the Neon project is active.";
  if (code === "P1003") return "The database named in DATABASE_URL does not exist.";
  if (code === "P2021" || code === "P2022") return "The Neon database is connected, but its Prisma schema is missing or outdated. Redeploy the project to apply it.";
  return "The account database is unavailable. Verify the Neon connection string and redeploy the project.";
}
