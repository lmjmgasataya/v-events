import { config } from "dotenv";
import type { Config } from "drizzle-kit";

config({ path: ".env.local" });

export default {
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // This app shares its database with v-1. Scope drizzle-kit to our own `er_*`
  // tables so push/generate never tries to drop or alter v-1's tables, and keep
  // our migration history in a separate table from v-1's `__drizzle_migrations`.
  tablesFilter: ["er_*"],
  migrations: {
    table: "__er_drizzle_migrations",
  },
  dbCredentials: {
    // Use direct (unpooled) connection for migrations — pooler doesn't support DDL
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!,
    ssl: process.env.NODE_ENV === "production" || !!process.env.DATABASE_URL_UNPOOLED,
  },
} satisfies Config;
