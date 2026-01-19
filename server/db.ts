import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

let _db: NodePgDatabase<typeof schema> | null = null;
let _pool: pg.Pool | null = null;

function createPool(): pg.Pool {
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
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 60000,
    max: 10,
    min: 2,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    ssl: { rejectUnauthorized: false },
  });

  pool.on('error', (err) => {
    console.error('Database pool error:', err.message);
  });

  pool.on('connect', () => {
    console.log('New database connection established');
  });

  return pool;
}

export function getDb(): NodePgDatabase<typeof schema> {
  if (!_db) {
    _pool = createPool();
    _db = drizzle(_pool, { schema });
  }
  return _db;
}

export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, prop) {
    return getDb()[prop as keyof NodePgDatabase<typeof schema>];
  },
});
