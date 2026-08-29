import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load environment variables from .env file.
dotenv.config();

const sqlHost = process.env.SQL_HOST || process.env.PGHOST || "127.0.0.1";
const sqlDbName = process.env.SQL_DB_NAME || process.env.PGDATABASE || "study_nest";
const user = process.env.SQL_ADMIN_USER || process.env.SQL_USER || process.env.PGUSER || "postgres";
const password = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD || process.env.PGPASSWORD || "";
const port = process.env.SQL_PORT
  ? parseInt(process.env.SQL_PORT, 10)
  : process.env.PGPORT
  ? parseInt(process.env.PGPORT, 10)
  : 5432;

console.log(`Connecting to database ${sqlDbName} on ${sqlHost}:${port} as ${user}`);

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle", // Output directory for migrations.
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: {
    host: sqlHost,
    port: port,
    user: user,
    password: password,
    database: sqlDbName,
    ssl: false,
  },
  verbose: true,
});

