import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

let _db: NodePgDatabase<typeof schema> | null = null;
let _pool: pg.Pool | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;

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
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
    max: 10,
    min: 1,
    keepAlive: true,
    keepAliveInitialDelayMillis: 5000,
    ssl: { rejectUnauthorized: false },
    allowExitOnIdle: false,
  });

  pool.on('error', (err) => {
    console.error('Database pool error:', err.message);
    resetAndRecreate();
  });

  pool.on('connect', () => {
    console.log('New database connection established');
  });

  startHeartbeat(pool);

  return pool;
}

function startHeartbeat(pool: pg.Pool) {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
  
  heartbeatInterval = setInterval(async () => {
    try {
      await pool.query('SELECT 1');
    } catch (err) {
      console.error('Database heartbeat failed:', (err as Error).message);
      resetAndRecreate();
    }
  }, 15000);
}

function resetAndRecreate() {
  console.log('Resetting database connection...');
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  if (_pool) {
    _pool.end().catch(() => {});
  }
  _pool = null;
  _db = null;
  
  try {
    _pool = createPool();
    _db = drizzle(_pool, { schema });
    console.log('Database connection recreated successfully');
  } catch (err) {
    console.error('Failed to recreate database connection:', (err as Error).message);
  }
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
