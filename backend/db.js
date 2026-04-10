import pg from 'pg';
import sql from 'mssql';
import * as dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || 'postgres',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
});

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

export const monthToNumber = (mes) => {
  const months = {
    enero: 1,
    febrero: 2,
    marzo: 3,
    abril: 4,
    mayo: 5,
    junio: 6,
    julio: 7,
    agosto: 8,
    septiembre: 9,
    octubre: 10,
    noviembre: 11,
    diciembre: 12,
  };

  const normalized = String(mes || '').trim().toLowerCase();
  return months[normalized] || 1;
};
