import "dotenv/config";

import { defineConfig } from "prisma/config";

const defaultDatabaseUrl =
  "postgresql://leads:leads_secret@localhost:5432/leads_db";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? defaultDatabaseUrl,
  },
});
