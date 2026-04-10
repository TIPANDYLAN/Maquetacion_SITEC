import pg from 'pg';
import sql from 'mssql';
import * as dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Carga .env por ruta absoluta para evitar problemas cuando el backend se ejecuta desde otra carpeta.
dotenv.config({ path: path.join(projectRoot, '.env') });
dotenv.config({ path: path.join(projectRoot, '.env.local'), override: true });

const envValue = (name, fallback = '') => {
  const value = process.env[name];
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed === '' ? fallback : trimmed;
};

const { Pool } = pg;

export const pool = new Pool({
  host: envValue('PGHOST', 'localhost'),
  port: Number(envValue('PGPORT', '5432')),
  database: envValue('PGDATABASE', 'postgres'),
  user: envValue('PGUSER', 'postgres'),
  password: envValue('PGPASSWORD', 'postgres'),
});

const SQLSERVER_ENABLED = envValue('SQLSERVER_ENABLED', 'false').toLowerCase() === 'true';

const SQLSERVER_CONFIG = {
  server: envValue('SQLSERVER_HOST', 'localhost'),
  port: Number(envValue('SQLSERVER_PORT', '1433')),
  database: envValue('SQLSERVER_DATABASE', 'master'),
  user: envValue('SQLSERVER_USER', 'sa'),
  password: envValue('SQLSERVER_PASSWORD', ''),
  options: {
    encrypt: envValue('SQLSERVER_ENCRYPT', 'false').toLowerCase() === 'true',
    trustServerCertificate: envValue('SQLSERVER_TRUST_CERT', 'true').toLowerCase() === 'true',
  },
  pool: {
    max: Number(envValue('SQLSERVER_POOL_MAX', '10')),
    min: Number(envValue('SQLSERVER_POOL_MIN', '0')),
    idleTimeoutMillis: Number(envValue('SQLSERVER_POOL_IDLE_MS', '30000')),
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
