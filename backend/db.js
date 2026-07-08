import pg from 'pg';
import sql from 'mssql';
import * as dotenv from 'dotenv';

dotenv.config({ override: true });

const { Pool } = pg;

const rawConnectionString = process.env.SUPABASE_DB_CONNECTION_STRING || process.env.DATABASE_URL || process.env.PG_CONNECTION_STRING || 'postgres://postgres.xaglgjnqbwyissbbukff:Krapabru87227275@aws-1-us-east-2.pooler.supabase.com:5432/postgres';
const poolerHost = process.env.SUPABASE_POOLER_HOST || 'aws-1-us-east-2.pooler.supabase.com';

function normalizeConnectionString(connectionString) {
  if (!connectionString) {
    return null;
  }

  try {
    const parsed = new URL(connectionString);
    const isSupabasePooler = parsed.hostname.includes('.pooler.supabase.com') || parsed.hostname === poolerHost;

    if (poolerHost) {
      parsed.hostname = poolerHost;
    }

    if (!parsed.searchParams.has('sslmode')) {
      parsed.searchParams.set('sslmode', isSupabasePooler ? 'disable' : 'require');
    } else if (isSupabasePooler) {
      parsed.searchParams.set('sslmode', 'disable');
    }

    return parsed.toString();
  } catch {
    return connectionString;
  }
}

const connectionString = normalizeConnectionString(rawConnectionString);
const useSupabaseSsl = Boolean(connectionString) && (
  String(process.env.SUPABASE_SSL || '').toLowerCase() === 'true' ||
  String(process.env.PGSSLMODE || '').toLowerCase() === 'require' ||
  connectionString.includes('sslmode=require')
) && !connectionString.includes('.pooler.supabase.com');

export const pool = new Pool(
  connectionString
    ? {
        connectionString,
        ssl: useSupabaseSsl ? { rejectUnauthorized: false } : undefined,
      }
    : {
        host: process.env.PGHOST || 'localhost',
        port: Number(process.env.PGPORT || 5432),
        database: process.env.PGDATABASE || 'postgres',
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
      }
);

export const getDatabaseConnectionInfo = () => {
  try {
    const url = new URL(connectionString || '');
    return {
      connectionString: connectionString || null,
      host: url.hostname,
      usingPooler: url.hostname.includes('.pooler.supabase.com'),
    };
  } catch {
    return {
      connectionString: connectionString || null,
      host: process.env.PGHOST || 'localhost',
      usingPooler: false,
    };
  }
};

const SQLSERVER_ENABLED = String(process.env.SQLSERVER_ENABLED || 'false').toLowerCase() === 'true';

const SQLSERVER_CONFIG = {
  server: process.env.SQLSERVER_HOST || 'localhost',
  port: Number(process.env.SQLSERVER_PORT || 1433),
  database: process.env.SQLSERVER_DATABASE || 'master',
  user: process.env.SQLSERVER_USER || 'sa',
  password: process.env.SQLSERVER_PASSWORD || '',
  options: {
    encrypt: String(process.env.SQLSERVER_ENCRYPT || 'false').toLowerCase() === 'true',
    trustServerCertificate: String(process.env.SQLSERVER_TRUST_CERT || 'true').toLowerCase() === 'true',
  },
  pool: {
    max: Number(process.env.SQLSERVER_POOL_MAX || 10),
    min: Number(process.env.SQLSERVER_POOL_MIN || 0),
    idleTimeoutMillis: Number(process.env.SQLSERVER_POOL_IDLE_MS || 30000),
  },
};

let sqlServerPoolPromise = null;

export const isSqlServerEnabled = () => SQLSERVER_ENABLED;

export const getSqlServerPool = async () => {
  if (!SQLSERVER_ENABLED) {
    throw new Error('SQL Server no esta habilitado. Configure SQLSERVER_ENABLED=true para activarlo.');
  }

  if (!sqlServerPoolPromise) {
    sqlServerPoolPromise = sql.connect(SQLSERVER_CONFIG);
  }

  return sqlServerPoolPromise;
};

export const checkPostgresConnection = async () => {
  await pool.query('SELECT 1');
  return { ok: true };
};

export const checkSqlServerConnection = async () => {
  if (!SQLSERVER_ENABLED) {
    return { ok: true, enabled: false, message: 'SQL Server deshabilitado por configuracion' };
  }

  const sqlPool = await getSqlServerPool();
  await sqlPool.request().query('SELECT 1 AS ok');
  return { ok: true, enabled: true };
};

