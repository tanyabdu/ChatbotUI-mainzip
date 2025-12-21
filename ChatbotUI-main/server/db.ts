import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const host = process.env.EXTERNAL_DB_HOST;
const port = process.env.EXTERNAL_DB_PORT;
const database = process.env.EXTERNAL_DB_NAME;
const user = process.env.EXTERNAL_DB_USER;
const password = process.env.EXTERNAL_DB_PASSWORD;

if (!host || !password) {
  throw new Error("External database configuration missing. Please set EXTERNAL_DB_HOST and EXTERNAL_DB_PASSWORD");
}

const connectionString = `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`;

const pool = new pg.Pool({
  connectionString,
});

export const db = drizzle(pool, { schema });
