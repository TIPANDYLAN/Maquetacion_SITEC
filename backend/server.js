import express from 'express';
import { pool } from './db.js';

const app = express();
const PORT = Number(process.env.BACKEND_PORT || 4000);

app.use(express.json({ limit: '20mb' }));

const ensureDescuentosTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS incidents_discount_nomina (
      id BIGSERIAL PRIMARY KEY,
      periodo TEXT NOT NULL,
      nombre TEXT NOT NULL,
      valor NUMERIC(18,4) NOT NULL,
      codigo_centro_costo TEXT NOT NULL DEFAULT '',
      centro_costo TEXT NOT NULL,
      observacion TEXT NOT NULL DEFAULT '',
      estado TEXT NOT NULL DEFAULT 'pendiente revision',
      fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT chk_incidents_discount_nomina_periodo_format
        CHECK (periodo ~ '^[0-9]{4}-[0-9]{2}$')
    )
  `);

  await pool.query(`
    ALTER TABLE incidents_discount_nomina
    ADD COLUMN IF NOT EXISTS estado TEXT
  `);

  await pool.query(`
    ALTER TABLE incidents_discount_nomina
    ADD COLUMN IF NOT EXISTS codigo_centro_costo TEXT
  `);

  await pool.query(`
    ALTER TABLE incidents_discount_nomina
    ADD COLUMN IF NOT EXISTS observacion TEXT
  `);

  await pool.query(`
    UPDATE incidents_discount_nomina
    SET codigo_centro_costo = ''
    WHERE codigo_centro_costo IS NULL
  `);

  await pool.query(`
    UPDATE incidents_discount_nomina
    SET observacion = ''
    WHERE observacion IS NULL
  `);

  await pool.query(`
    UPDATE incidents_discount_nomina
    SET estado = 'pendiente revision'
    WHERE estado IS NULL
      OR TRIM(estado) = ''
      OR LOWER(TRIM(estado)) IN ('pendiente', 'pendiente revision')
  `);

  await pool.query(`
    ALTER TABLE incidents_discount_nomina
    ALTER COLUMN estado SET DEFAULT 'pendiente revision'
  `);

  await pool.query(`
    ALTER TABLE incidents_discount_nomina
    ALTER COLUMN estado SET NOT NULL
  `);

  await pool.query(`
    ALTER TABLE incidents_discount_nomina
    ALTER COLUMN codigo_centro_costo SET DEFAULT ''
  `);

  await pool.query(`
    ALTER TABLE incidents_discount_nomina
    ALTER COLUMN codigo_centro_costo SET NOT NULL
  `);

  await pool.query(`
    ALTER TABLE incidents_discount_nomina
    ALTER COLUMN observacion SET DEFAULT ''
  `);

  await pool.query(`
    ALTER TABLE incidents_discount_nomina
    ALTER COLUMN observacion SET NOT NULL
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_incidents_discount_nomina_periodo
      ON incidents_discount_nomina (periodo DESC, fecha_creacion DESC)
  `);
};

const ensureExentosPagoSeguroTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS humana_exentos_pago_seguro (
      id BIGSERIAL PRIMARY KEY,
      cedula TEXT NOT NULL UNIQUE,
      nombre TEXT NOT NULL,
      porcentaje_exento NUMERIC(5,2) NOT NULL,
      fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT chk_humana_exentos_porcentaje_rango
        CHECK (porcentaje_exento >= 0 AND porcentaje_exento <= 100)
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_humana_exentos_pago_seguro_nombre
      ON humana_exentos_pago_seguro (nombre)
  `);
};

const ensureValetsAdicionalesTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS valet_fijo_adicionales (
      id BIGSERIAL PRIMARY KEY,
      centro_costo_id TEXT NOT NULL,
      centro_costo_nombre TEXT NOT NULL DEFAULT '',
      empleado_cedula TEXT NOT NULL,
      empleado_nombre TEXT NOT NULL DEFAULT '',
      periodo_mes_dia_adicional TEXT NOT NULL DEFAULT '',
      periodo_mes_domingo TEXT NOT NULL DEFAULT '',
      habilitar_dia_adicional BOOLEAN NOT NULL DEFAULT FALSE,
      habilitar_domingo BOOLEAN NOT NULL DEFAULT FALSE,
      dia_adicional_semanas JSONB NOT NULL DEFAULT '[]'::jsonb,
      domingo_semanas INTEGER[] NOT NULL DEFAULT '{}',
      fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_valet_fijo_adicionales UNIQUE (centro_costo_id, empleado_cedula),
      CONSTRAINT chk_nomina_valets_periodo_mes_dia_adicional_format
        CHECK (periodo_mes_dia_adicional = '' OR periodo_mes_dia_adicional ~ '^[0-9]{4}-[0-9]{2}$'),
      CONSTRAINT chk_nomina_valets_periodo_mes_domingo_format
        CHECK (periodo_mes_domingo = '' OR periodo_mes_domingo ~ '^[0-9]{4}-[0-9]{2}$')
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_valet_fijo_adicionales_centro
      ON valet_fijo_adicionales (centro_costo_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_valet_fijo_adicionales_empleado
      ON valet_fijo_adicionales (empleado_cedula)
  `);
};

const ensureValetFijoEmpleadoTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS valet_fijo_empleado (
      id BIGSERIAL PRIMARY KEY,
      centro_costo_id TEXT NOT NULL,
      centro_costo_nombre TEXT NOT NULL DEFAULT '',
      empleado_cedula TEXT NOT NULL,
      empleado_nombre TEXT NOT NULL DEFAULT '',
      valor_fijo NUMERIC(18,2) NOT NULL,
      fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_valet_fijo_empleado UNIQUE (centro_costo_id, empleado_cedula),
      CONSTRAINT chk_valet_fijo_empleado_valor_fijo_positivo CHECK (valor_fijo > 0)
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_valet_fijo_empleado_centro
      ON valet_fijo_empleado (centro_costo_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_valet_fijo_empleado_cedula
      ON valet_fijo_empleado (empleado_cedula)
  `);
};

const ensureValetFijoHorarioTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS valet_fijo_horario (
      id BIGSERIAL PRIMARY KEY,
      centro_costo_id TEXT NOT NULL,
      centro_costo_nombre TEXT NOT NULL DEFAULT '',
      empleado_cedula TEXT NOT NULL,
      empleado_nombre TEXT NOT NULL DEFAULT '',
      valor_fijo NUMERIC(18,2) NOT NULL DEFAULT 0,
      anio INTEGER NOT NULL,
      mes INTEGER NOT NULL,
      semana INTEGER NOT NULL,
      dia TEXT NOT NULL,
      hora_entrada TEXT NOT NULL,
      hora_salida TEXT NOT NULL,
      fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_valet_fijo_horario UNIQUE (centro_costo_id, empleado_cedula, anio, mes, semana, dia),
      CONSTRAINT chk_valet_fijo_horario_mes_rango CHECK (mes >= 1 AND mes <= 12),
      CONSTRAINT chk_valet_fijo_horario_semana_rango CHECK (semana >= 1 AND semana <= 5),
      CONSTRAINT chk_valet_fijo_horario_dia_valido CHECK (dia IN ('lunes','martes','miercoles','jueves','viernes','sabado','domingo'))
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_valet_fijo_horario_periodo
      ON valet_fijo_horario (anio DESC, mes DESC, semana ASC)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_valet_fijo_horario_centro
      ON valet_fijo_horario (centro_costo_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_valet_fijo_horario_empleado
      ON valet_fijo_horario (empleado_cedula)
  `);
};

const ensureDistribucionCentroCostoTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS distribucion_centro_costo (
      id BIGSERIAL PRIMARY KEY,
      centro_costo_id TEXT NOT NULL UNIQUE,
      centro_costo_nombre TEXT NOT NULL DEFAULT '',
      porcentaje NUMERIC(5,2) NOT NULL,
      fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT chk_distribucion_centro_costo_porcentaje_rango CHECK (porcentaje >= 0 AND porcentaje <= 100)
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_distribucion_centro_costo_nombre
      ON distribucion_centro_costo (centro_costo_nombre)
  `);
};

const ensureEmpleadoDistribucionCentroCostoTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS empleado_distribucion_centro_costo (
      id BIGSERIAL PRIMARY KEY,
      empleado_id TEXT NOT NULL,
      empleado_documento TEXT NOT NULL DEFAULT '',
      empleado_nombre_completo TEXT NOT NULL DEFAULT '',
      centro_costo_id TEXT NOT NULL,
      centro_costo_nombre TEXT NOT NULL DEFAULT '',
      porcentaje NUMERIC(5,2) NOT NULL,
      fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_empleado_distribucion_centro_costo_empleado_id
      ON empleado_distribucion_centro_costo (empleado_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_empleado_distribucion_centro_costo_documento
      ON empleado_distribucion_centro_costo (empleado_documento)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_empleado_distribucion_centro_costo_centro
      ON empleado_distribucion_centro_costo (centro_costo_id)
  `);
};

const getPeriodoActual = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const parseValor = (valor) => {
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : NaN;
  }

  if (typeof valor === 'string') {
    const normalized = valor.replace(',', '.').trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  return NaN;
};

const parseCentroCostoCompuesto = (valor) => {
  const raw = String(valor || '').trim();
  if (!raw) {
    return { codigoCentroCosto: '', centroCosto: '' };
  }

  const match = raw.match(/^([^\-]+?)\s*-\s*(.+)$/);
  if (!match) {
    return { codigoCentroCosto: '', centroCosto: raw };
  }

  return {
    codigoCentroCosto: String(match[1] || '').trim(),
    centroCosto: String(match[2] || '').trim(),
  };
};

const mapDbRowToDescuento = (row) => ({
  id: Number(row.id),
  periodo: String(row.periodo || ''),
  nombre: String(row.nombre || ''),
  valor: Number(row.valor || 0),
  codigo_centro_costo: String(row.codigo_centro_costo || ''),
  centro_costo: String(row.centro_costo || ''),
  observacion: String(row.observacion || ''),
  estado: String(row.estado || 'pendiente revision'),
  recurrencia: Number(row.recurrencia || 1),
  fecha_creacion: row.fecha_creacion,
});

const mapDbRowToExentoPagoSeguro = (row) => ({
  id: Number(row.id),
  cedula: String(row.cedula || ''),
  nombre: String(row.nombre || ''),
  porcentaje_exento: Number(row.porcentaje_exento || 0),
  fecha_creacion: row.fecha_creacion,
  fecha_actualizacion: row.fecha_actualizacion,
});

const toPeriodoMes = (anio, mes) => {
  if (!Number.isInteger(anio) || !Number.isInteger(mes) || mes < 1 || mes > 12) {
    return '';
  }

  return `${anio}-${String(mes).padStart(2, '0')}`;
};

const mapDbRowToValetAdicionales = (row) => {
  const diaPeriodo = String(row.periodo_mes_dia_adicional || '');
  const domingoPeriodo = String(row.periodo_mes_domingo || '');

  const [diaAnioRaw, diaMesRaw] = diaPeriodo ? diaPeriodo.split('-') : ['', ''];
  const [domingoAnioRaw, domingoMesRaw] = domingoPeriodo ? domingoPeriodo.split('-') : ['', ''];

  return {
    centroCostoId: String(row.centro_costo_id || ''),
    centroCostoNombre: String(row.centro_costo_nombre || ''),
    empleadoCedula: String(row.empleado_cedula || ''),
    empleadoNombre: String(row.empleado_nombre || ''),
    configuracion: {
      habilitarDiaAdicional: Boolean(row.habilitar_dia_adicional),
      diaAdicionalAnio: Number(diaAnioRaw || 0),
      diaAdicionalMes: Number(diaMesRaw || 0),
      diaAdicionalSemanas: Array.isArray(row.dia_adicional_semanas) ? row.dia_adicional_semanas : [],
      habilitarDomingo: Boolean(row.habilitar_domingo),
      domingoAnio: Number(domingoAnioRaw || 0),
      domingoMes: Number(domingoMesRaw || 0),
      domingoSemanas: Array.isArray(row.domingo_semanas) ? row.domingo_semanas.map((item) => Number(item || 0)) : [],
    },
    fechaCreacion: row.fecha_creacion,
    fechaActualizacion: row.fecha_actualizacion,
  };
};

const mapDbRowToValetFijoEmpleado = (row) => ({
  id: `${String(row.centro_costo_id || '')}-${String(row.empleado_cedula || '')}`,
  centroCostoId: String(row.centro_costo_id || ''),
  centroCostoNombre: String(row.centro_costo_nombre || ''),
  empleadoCedula: String(row.empleado_cedula || ''),
  empleadoNombre: String(row.empleado_nombre || ''),
  valorFijo: Number(row.valor_fijo || 0),
  fechaCreacion: row.fecha_creacion,
  fechaActualizacion: row.fecha_actualizacion,
});

const mapDbRowToValetFijoHorario = (row) => ({
  id: `${String(row.centro_costo_id || '')}-${String(row.empleado_cedula || '')}-${Number(row.anio || 0)}-${Number(row.mes || 0)}-${Number(row.semana || 0)}-${String(row.dia || '')}`,
  centroCostoId: String(row.centro_costo_id || ''),
  centroCostoNombre: String(row.centro_costo_nombre || ''),
  empleadoCedula: String(row.empleado_cedula || ''),
  empleadoNombre: String(row.empleado_nombre || ''),
  valorFijo: Number(row.valor_fijo || 0),
  anio: Number(row.anio || 0),
  mes: Number(row.mes || 0),
  semana: Number(row.semana || 0),
  dia: String(row.dia || ''),
  horaEntrada: String(row.hora_entrada || ''),
  horaSalida: String(row.hora_salida || ''),
  fechaCreacion: row.fecha_creacion,
  fechaActualizacion: row.fecha_actualizacion,
});

const mapDbRowToDistribucionCentroCosto = (row) => ({
  id: Number(row.id),
  centroCostoId: String(row.centro_costo_id || ''),
  centroCostoNombre: String(row.centro_costo_nombre || ''),
  porcentaje: Number(row.porcentaje || 0),
  fechaCreacion: row.fecha_creacion,
  fechaActualizacion: row.fecha_actualizacion,
});

const mapDbRowToDistribucionEmpleadoCentroCosto = (row) => ({
  id: Number(row.id),
  empleadoId: String(row.empleado_id || ''),
  empleadoDocumento: String(row.empleado_documento || ''),
  empleadoNombreCompleto: String(row.empleado_nombre_completo || ''),
  centros: Array.isArray(row.centros)
    ? row.centros.map((centro) => ({
        centroCostoId: String(centro?.centroCostoId || centro?.centro_costo_id || '').trim(),
        centroCostoNombre: String(centro?.centroCostoNombre || centro?.centro_costo_nombre || '').trim(),
        porcentaje: Number(centro?.porcentaje || 0),
      }))
    : [],
  porcentajeTotal: Number(row.porcentaje_total || 0),
  fechaCreacion: row.fecha_creacion,
  fechaActualizacion: row.fecha_actualizacion,
});

const separarApellidosYNombres = (nombreCompleto) => {
  const partes = String(nombreCompleto || '').trim().split(/\s+/).filter(Boolean);

  if (partes.length === 0) {
    return { apellidos: '', nombres: '' };
  }

  if (partes.length === 1) {
    return { apellidos: partes[0], nombres: '' };
  }

  if (partes.length === 2) {
    return { apellidos: partes[0], nombres: partes[1] };
  }

  return {
    apellidos: partes.slice(0, 2).join(' '),
    nombres: partes.slice(2).join(' '),
  };
};

const mapDbRowToEmpleado = (row) => ({
  ...separarApellidosYNombres(row.empleado),
  cedula: '',
  centroCosto: String(row.centro || ''),
  fechaNacimiento: '',
  estadoCivil: '',
  tarifa: String(row.tarifa || ''),
  parentesco: '',
  genero: '',
  fechaSolicitud: '',
  fechaInclusion: String(row.f_ingreso || ''),
  fechaExclusion: String(row.f_exclusion || ''),
  plan: String(row.plan || ''),
  cobertura: 0,
  prima: Number(row.prima || 0),
  ajuste: Number(row.ajuste || 0),
  humanaAssist: Number(row.assist || 0),
  seguroCampesino: Number(row.seguro || 0),
  urbapark: Number(row.urbapark || 0),
  sssCampesino: 0,
  totalUrbapark: 0,
  trabajador: Number(row.trabajador_rol || 0),
  total: 0,
  diferencia: 0,
});

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ ok: true, service: 'humana-backend' });
  } catch (error) {
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.get('/api/humana/periods', async (_req, res) => {
  try {
    console.log('[GET /api/humana/periods] Obteniendo periodos disponibles');
    const result = await pool.query(
      `SELECT anio, mes, MAX(fecha_carga) AS fecha_carga
       FROM medic_secure_humana
       GROUP BY anio, mes
       ORDER BY anio DESC, mes DESC, MAX(fecha_carga) DESC`
    );

    console.log(`[GET /api/humana/periods] Encontrados ${result.rowCount} periodos`);
    res.status(200).json(result.rows.map((row) => ({
      anio: row.anio,
      mes: row.mes,
      archivo: '',
      fechaCarga: new Date(row.fecha_carga).getTime(),
    })));
  } catch (error) {
    console.error('[GET /api/humana/periods] Error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ 
      error: 'No se pudo cargar periodos', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

app.get('/api/humana/periods/:anio/:mes', async (req, res) => {
  const anio = Number(req.params.anio);
  const mes = String(req.params.mes || '');

  if (!Number.isInteger(anio) || !mes) {
    res.status(400).json({ error: 'Parametros invalidos' });
    return;
  }

  try {
    console.log(`[GET /api/humana/periods] Consultando anio=${anio}, mes=${mes}`);
    const result = await pool.query(
      `SELECT *
       FROM medic_secure_humana
       WHERE anio = $1 AND mes = $2
       ORDER BY empleado ASC`,
      [anio, mes]
    );

    console.log(`[GET /api/humana/periods] Encontrados ${result.rowCount} registros`);

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Periodo no encontrado' });
      return;
    }

    const first = result.rows[0];
    const empleados = result.rows.map(mapDbRowToEmpleado);
    res.status(200).json({
      anio,
      mes,
      archivo: '',
      fechaCarga: new Date(first.fecha_carga).getTime(),
      empleados,
    });
  } catch (error) {
    console.error('[GET /api/humana/periods] Error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ 
      error: 'No se pudo cargar el periodo', 
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

app.get('/api/humana/employee-latest', async (req, res) => {
  const empleado = String(req.query.empleado || '').trim();

  if (!empleado) {
    res.status(400).json({ error: 'Parametro empleado es requerido' });
    return;
  }

  try {
    const hoy = new Date();
    const inicioRango = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 20);
    const finRango = new Date(hoy.getFullYear(), hoy.getMonth(), 20);
    const toIsoDate = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };
    const inicioRangoIso = toIsoDate(inicioRango);
    const finRangoIso = toIsoDate(finRango);

    const nombreNormalizado = empleado.replace(/\s+/g, ' ').trim().toLowerCase();

    let result = await pool.query(
      `WITH candidatos AS (
         SELECT
           empleado, plan, tarifa, fecha_carga, anio, mes, f_ingreso, f_exclusion,
           CASE
             WHEN (
               CASE
                 WHEN COALESCE(f_ingreso, '') ~ '^\\d{2}-\\d{2}-\\d{4}$' THEN to_date(f_ingreso, 'DD-MM-YYYY')
                 WHEN COALESCE(f_ingreso, '') ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN to_date(f_ingreso, 'YYYY-MM-DD')
                 ELSE NULL
               END
             ) BETWEEN $2::date AND $3::date THEN 1
             WHEN (
               CASE
                 WHEN COALESCE(f_exclusion, '') ~ '^\\d{2}-\\d{2}-\\d{4}$' THEN to_date(f_exclusion, 'DD-MM-YYYY')
                 WHEN COALESCE(f_exclusion, '') ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN to_date(f_exclusion, 'YYYY-MM-DD')
                 ELSE NULL
               END
             ) BETWEEN $2::date AND $3::date THEN 1
             ELSE 0
           END AS prioridad_movimiento
         FROM medic_secure_humana
         WHERE LOWER(REGEXP_REPLACE(TRIM(empleado), '\\s+', ' ', 'g')) = $1
       )
       SELECT empleado, plan, tarifa, fecha_carga, anio, mes, prioridad_movimiento
       FROM candidatos
       ORDER BY prioridad_movimiento DESC, fecha_carga DESC, anio DESC, mes DESC
       LIMIT 1`,
      [nombreNormalizado, inicioRangoIso, finRangoIso]
    );

    // Fallback: coincidencia flexible por todas las palabras del nombre
    if (result.rowCount === 0) {
      const tokens = nombreNormalizado.split(' ').filter(Boolean);
      if (tokens.length > 0) {
        const whereTokens = tokens.map((_, idx) => `LOWER(empleado) LIKE $${idx + 1}`).join(' AND ');
        const params = tokens.map((t) => `%${t}%`);
        result = await pool.query(
          `WITH candidatos AS (
             SELECT
               empleado, plan, tarifa, fecha_carga, anio, mes, f_ingreso, f_exclusion,
               CASE
                 WHEN (
                   CASE
                     WHEN COALESCE(f_ingreso, '') ~ '^\\d{2}-\\d{2}-\\d{4}$' THEN to_date(f_ingreso, 'DD-MM-YYYY')
                     WHEN COALESCE(f_ingreso, '') ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN to_date(f_ingreso, 'YYYY-MM-DD')
                     ELSE NULL
                   END
                 ) BETWEEN $${tokens.length + 1}::date AND $${tokens.length + 2}::date THEN 1
                 WHEN (
                   CASE
                     WHEN COALESCE(f_exclusion, '') ~ '^\\d{2}-\\d{2}-\\d{4}$' THEN to_date(f_exclusion, 'DD-MM-YYYY')
                     WHEN COALESCE(f_exclusion, '') ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN to_date(f_exclusion, 'YYYY-MM-DD')
                     ELSE NULL
                   END
                 ) BETWEEN $${tokens.length + 1}::date AND $${tokens.length + 2}::date THEN 1
                 ELSE 0
               END AS prioridad_movimiento
             FROM medic_secure_humana
             WHERE ${whereTokens}
           )
           SELECT empleado, plan, tarifa, fecha_carga, anio, mes, prioridad_movimiento
           FROM candidatos
           ORDER BY prioridad_movimiento DESC, fecha_carga DESC, anio DESC, mes DESC
           LIMIT 1`,
          [...params, inicioRangoIso, finRangoIso]
        );
      }
    }

    if (result.rowCount === 0) {
      res.status(200).json({
        found: false,
        empleado,
        plan: '',
        tarifa: '',
        fechaCarga: null,
        anio: null,
        mes: null,
      });
      return;
    }

    const row = result.rows[0];
    res.status(200).json({
      found: true,
      empleado: String(row.empleado || ''),
      plan: String(row.plan || ''),
      tarifa: String(row.tarifa || ''),
      prioridadMovimiento: Number(row.prioridad_movimiento || 0),
      rangoMovimientos: { inicio: inicioRangoIso, fin: finRangoIso },
      fechaCarga: row.fecha_carga ? new Date(row.fecha_carga).getTime() : null,
      anio: Number(row.anio || 0),
      mes: String(row.mes || ''),
    });
  } catch (error) {
    console.error('[GET /api/humana/employee-latest] Error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({
      error: 'No se pudo consultar el empleado en medic_secure_humana',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.put('/api/humana/periods/:anio/:mes', async (req, res) => {
  const anio = Number(req.params.anio);
  const mes = String(req.params.mes || '');
  const archivo = String(req.body?.archivo || '');
  const empleados = Array.isArray(req.body?.empleados) ? req.body.empleados : [];

  if (!Number.isInteger(anio) || !mes) {
    res.status(400).json({ error: 'Parametros invalidos' });
    return;
  }

  try {
    console.log(`[PUT /api/humana/periods] Guardando anio=${anio}, mes=${mes}, empleados=${empleados.length}`);

    await pool.query('BEGIN');
    await pool.query('DELETE FROM medic_secure_humana WHERE anio = $1 AND mes = $2', [anio, mes]);

    for (const emp of empleados) {
      const apellidos = String(emp?.apellidos || '').trim();
      const nombres = String(emp?.nombres || '').trim();
      const empleado = `${apellidos} ${nombres}`.trim();

      await pool.query(
        `INSERT INTO medic_secure_humana (
          anio, mes,
          empleado, centro, plan, tarifa,
          trabajador_rol, urbapark, prima, ajuste, assist, seguro,
          f_ingreso, f_exclusion
        ) VALUES (
          $1, $2,
          $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12,
          $13, $14
        )`,
        [
          anio, mes,
          empleado, String(emp?.centroCosto || ''), String(emp?.plan || ''), String(emp?.tarifa || ''),
          Number(emp?.trabajador || 0), Number(emp?.urbapark || 0), Number(emp?.prima || 0), Number(emp?.ajuste || 0), Number(emp?.humanaAssist || 0), Number(emp?.seguroCampesino || 0),
          String(emp?.fechaInclusion || ''), String(emp?.fechaExclusion || ''),
        ]
      );
    }

    await pool.query('COMMIT');

    console.log(`[PUT /api/humana/periods] Guardado exitoso: ${empleados.length} empleados`);
    res.status(200).json({
      ok: true,
      anio,
      mes,
      archivo,
      fechaCarga: Date.now(),
      totalEmpleados: empleados.length,
    });
  } catch (error) {
    await pool.query('ROLLBACK').catch(() => {});
    console.error('[PUT /api/humana/periods] Error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ 
      error: 'No se pudo guardar el periodo', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

app.get('/api/descuentos/incidentes-caja-chica', async (_req, res) => {
  try {
    await ensureDescuentosTable();
    const result = await pool.query(
      `SELECT id, periodo, nombre, valor, codigo_centro_costo, centro_costo, observacion, estado,
              COUNT(*) OVER (PARTITION BY nombre) AS recurrencia,
              fecha_creacion
       FROM incidents_discount_nomina
       ORDER BY fecha_creacion DESC, id DESC`
    );

    res.status(200).json({
      ok: true,
      descuentos: result.rows.map(mapDbRowToDescuento),
    });
  } catch (error) {
    console.error('[GET /api/descuentos/incidentes-caja-chica] Error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({
      error: 'No se pudo cargar descuentos',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.post('/api/descuentos/incidentes-caja-chica', async (req, res) => {
  const nombre = String(req.body?.nombre || '').trim();
  const centroCostoInput = String(req.body?.centroCosto || '').trim();
  const observacion = String(req.body?.observacion || '').trim();
  const valor = parseValor(req.body?.valor);
  const periodo = getPeriodoActual();
  const { codigoCentroCosto, centroCosto } = parseCentroCostoCompuesto(centroCostoInput);

  if (!nombre) {
    res.status(400).json({ error: 'El campo nombre es requerido' });
    return;
  }

  if (!centroCostoInput) {
    res.status(400).json({ error: 'El campo centroCosto es requerido' });
    return;
  }

  if (!Number.isFinite(valor) || valor <= 0) {
    res.status(400).json({ error: 'El campo valor debe ser numerico y mayor a 0' });
    return;
  }

  try {
    await ensureDescuentosTable();

    const result = await pool.query(
      `INSERT INTO incidents_discount_nomina (periodo, nombre, valor, codigo_centro_costo, centro_costo, observacion, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, periodo, nombre, valor, codigo_centro_costo, centro_costo, observacion, estado, fecha_creacion`,
      [periodo, nombre, valor, codigoCentroCosto, centroCosto, observacion, 'pendiente revision']
    );

    const recurrenciaResult = await pool.query(
      `SELECT COUNT(*)::int AS recurrencia
       FROM incidents_discount_nomina
       WHERE nombre = $1`,
      [nombre]
    );

    const descuentoConRecurrencia = {
      ...result.rows[0],
      recurrencia: Number(recurrenciaResult.rows[0]?.recurrencia || 1),
    };

    res.status(201).json({
      ok: true,
      descuento: mapDbRowToDescuento(descuentoConRecurrencia),
    });
  } catch (error) {
    console.error('[POST /api/descuentos/incidentes-caja-chica] Error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({
      error: 'No se pudo guardar el descuento',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.patch('/api/descuentos/incidentes-caja-chica/:id/estado', async (req, res) => {
  const id = Number(req.params.id);
  const estado = String(req.body?.estado || '').trim().toLowerCase();

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'El parametro id es invalido' });
    return;
  }

  if (!estado) {
    res.status(400).json({ error: 'El campo estado es requerido' });
    return;
  }

  try {
    await ensureDescuentosTable();

    const result = await pool.query(
      `UPDATE incidents_discount_nomina
       SET estado = $2
       WHERE id = $1
       RETURNING id, periodo, nombre, valor, codigo_centro_costo, centro_costo, observacion, estado, fecha_creacion`,
      [id, estado]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Descuento no encontrado' });
      return;
    }

    const recurrenciaResult = await pool.query(
      `SELECT COUNT(*)::int AS recurrencia
       FROM incidents_discount_nomina
       WHERE nombre = $1`,
      [String(result.rows[0]?.nombre || '')]
    );

    res.status(200).json({
      ok: true,
      descuento: mapDbRowToDescuento({
        ...result.rows[0],
        recurrencia: Number(recurrenciaResult.rows[0]?.recurrencia || 1),
      }),
    });
  } catch (error) {
    console.error('[PATCH /api/descuentos/incidentes-caja-chica/:id/estado] Error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({
      error: 'No se pudo actualizar el estado del descuento',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.get('/api/descuentos/exentos-pago-seguro', async (_req, res) => {
  try {
    await ensureExentosPagoSeguroTable();

    const result = await pool.query(
      `SELECT id, cedula, nombre, porcentaje_exento, fecha_creacion, fecha_actualizacion
       FROM humana_exentos_pago_seguro
       ORDER BY fecha_actualizacion DESC, id DESC`
    );

    res.status(200).json({
      ok: true,
      registros: result.rows.map(mapDbRowToExentoPagoSeguro),
    });
  } catch (error) {
    console.error('[GET /api/descuentos/exentos-pago-seguro] Error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({
      error: 'No se pudo cargar exentos de pago seguro',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.post('/api/descuentos/exentos-pago-seguro', async (req, res) => {
  const cedula = String(req.body?.cedula || '').trim();
  const nombre = String(req.body?.nombre || '').trim();
  const porcentajeExento = parseValor(req.body?.porcentajeExento);

  if (!cedula) {
    res.status(400).json({ error: 'El campo cedula es requerido' });
    return;
  }

  if (!nombre) {
    res.status(400).json({ error: 'El campo nombre es requerido' });
    return;
  }

  if (!Number.isFinite(porcentajeExento) || porcentajeExento < 0 || porcentajeExento > 100) {
    res.status(400).json({ error: 'El campo porcentajeExento debe estar entre 0 y 100' });
    return;
  }

  try {
    await ensureExentosPagoSeguroTable();

    const result = await pool.query(
      `INSERT INTO humana_exentos_pago_seguro (cedula, nombre, porcentaje_exento)
       VALUES ($1, $2, $3)
       ON CONFLICT (cedula)
       DO UPDATE SET
         nombre = EXCLUDED.nombre,
         porcentaje_exento = EXCLUDED.porcentaje_exento,
         fecha_actualizacion = NOW()
       RETURNING id, cedula, nombre, porcentaje_exento, fecha_creacion, fecha_actualizacion`,
      [cedula, nombre, porcentajeExento]
    );

    res.status(201).json({
      ok: true,
      registro: mapDbRowToExentoPagoSeguro(result.rows[0]),
    });
  } catch (error) {
    console.error('[POST /api/descuentos/exentos-pago-seguro] Error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({
      error: 'No se pudo guardar exento de pago seguro',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.get('/api/valets/adicionales', async (req, res) => {
  const centroCostoId = String(req.query.centroCostoId || '').trim();
  const empleadoCedula = String(req.query.empleadoCedula || '').trim();

  if (!centroCostoId || !empleadoCedula) {
    res.status(400).json({ error: 'Los parametros centroCostoId y empleadoCedula son requeridos' });
    return;
  }

  try {
    await ensureValetsAdicionalesTable();

    const result = await pool.query(
      `SELECT id, centro_costo_id, centro_costo_nombre, empleado_cedula, empleado_nombre,
              periodo_mes_dia_adicional, periodo_mes_domingo,
              habilitar_dia_adicional, habilitar_domingo,
              dia_adicional_semanas, domingo_semanas,
              fecha_creacion, fecha_actualizacion
      FROM valet_fijo_adicionales
       WHERE centro_costo_id = $1 AND empleado_cedula = $2
       LIMIT 1`,
      [centroCostoId, empleadoCedula]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'No existe configuracion para el empleado en ese centro de costo' });
      return;
    }

    res.status(200).json({
      ok: true,
      data: mapDbRowToValetAdicionales(result.rows[0]),
    });
  } catch (error) {
    console.error('[GET /api/valets/adicionales] Error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({
      error: 'No se pudo cargar configuracion de adicionales',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.get('/api/valets/adicionales/lista', async (req, res) => {
  const centroCostoId = String(req.query.centroCostoId || '').trim();

  try {
    await ensureValetsAdicionalesTable();

    const filtros = [];
    const params = [];

    if (centroCostoId) {
      params.push(centroCostoId);
      filtros.push(`centro_costo_id = $${params.length}`);
    }

    const whereSql = filtros.length > 0 ? `WHERE ${filtros.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT id, centro_costo_id, centro_costo_nombre, empleado_cedula, empleado_nombre,
              periodo_mes_dia_adicional, periodo_mes_domingo,
              habilitar_dia_adicional, habilitar_domingo,
              dia_adicional_semanas, domingo_semanas,
              fecha_creacion, fecha_actualizacion
       FROM valet_fijo_adicionales
       ${whereSql}
       ORDER BY centro_costo_id ASC, empleado_nombre ASC`,
      params
    );

    res.status(200).json({
      ok: true,
      registros: result.rows.map(mapDbRowToValetAdicionales),
    });
  } catch (error) {
    console.error('[GET /api/valets/adicionales/lista] Error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({
      error: 'No se pudo cargar lista de adicionales',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.post('/api/valets/adicionales', async (req, res) => {
  const centroCostoId = String(req.body?.centroCostoId || '').trim();
  const centroCostoNombre = String(req.body?.centroCostoNombre || '').trim();
  const empleadoCedula = String(req.body?.empleadoCedula || '').trim();
  const empleadoNombre = String(req.body?.empleadoNombre || '').trim();

  const habilitarDiaAdicional = Boolean(req.body?.habilitarDiaAdicional);
  const diaAdicionalAnio = Number(req.body?.diaAdicionalAnio || 0);
  const diaAdicionalMes = Number(req.body?.diaAdicionalMes || 0);
  const diaAdicionalSemanas = Array.isArray(req.body?.diaAdicionalSemanas) ? req.body.diaAdicionalSemanas : [];

  const habilitarDomingo = Boolean(req.body?.habilitarDomingo);
  const domingoAnio = Number(req.body?.domingoAnio || 0);
  const domingoMes = Number(req.body?.domingoMes || 0);
  const domingoSemanasRaw = Array.isArray(req.body?.domingoSemanas) ? req.body.domingoSemanas : [];
  const domingoSemanas = domingoSemanasRaw
    .map((item) => Number(item || 0))
    .filter((item) => Number.isInteger(item) && item >= 1 && item <= 5)
    .sort((a, b) => a - b);

  if (!centroCostoId || !empleadoCedula) {
    res.status(400).json({ error: 'Los campos centroCostoId y empleadoCedula son requeridos' });
    return;
  }

  if (!habilitarDiaAdicional && !habilitarDomingo) {
    res.status(400).json({ error: 'Debe habilitar al menos un tipo de adicional (dia adicional o domingo)' });
    return;
  }

  if (habilitarDiaAdicional && !toPeriodoMes(diaAdicionalAnio, diaAdicionalMes)) {
    res.status(400).json({ error: 'Periodo de dia adicional invalido' });
    return;
  }

  if (habilitarDomingo && !toPeriodoMes(domingoAnio, domingoMes)) {
    res.status(400).json({ error: 'Periodo de domingo invalido' });
    return;
  }

  if (habilitarDomingo && domingoSemanas.length === 0) {
    res.status(400).json({ error: 'Debe enviar al menos una semana para domingos' });
    return;
  }

  try {
    await ensureValetsAdicionalesTable();

    const periodoMesDiaAdicional = habilitarDiaAdicional ? toPeriodoMes(diaAdicionalAnio, diaAdicionalMes) : '';
    const periodoMesDomingo = habilitarDomingo ? toPeriodoMes(domingoAnio, domingoMes) : '';

    const result = await pool.query(
      `INSERT INTO valet_fijo_adicionales (
         centro_costo_id,
         centro_costo_nombre,
         empleado_cedula,
         empleado_nombre,
         periodo_mes_dia_adicional,
         periodo_mes_domingo,
         habilitar_dia_adicional,
         habilitar_domingo,
         dia_adicional_semanas,
         domingo_semanas,
         fecha_actualizacion
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::int[], NOW())
       ON CONFLICT (centro_costo_id, empleado_cedula)
       DO UPDATE SET
         centro_costo_nombre = EXCLUDED.centro_costo_nombre,
         empleado_nombre = EXCLUDED.empleado_nombre,
         periodo_mes_dia_adicional = EXCLUDED.periodo_mes_dia_adicional,
         periodo_mes_domingo = EXCLUDED.periodo_mes_domingo,
         habilitar_dia_adicional = EXCLUDED.habilitar_dia_adicional,
         habilitar_domingo = EXCLUDED.habilitar_domingo,
         dia_adicional_semanas = EXCLUDED.dia_adicional_semanas,
         domingo_semanas = EXCLUDED.domingo_semanas,
         fecha_actualizacion = NOW()
       RETURNING id, centro_costo_id, centro_costo_nombre, empleado_cedula, empleado_nombre,
                 periodo_mes_dia_adicional, periodo_mes_domingo,
                 habilitar_dia_adicional, habilitar_domingo,
                 dia_adicional_semanas, domingo_semanas,
                 fecha_creacion, fecha_actualizacion`,
      [
        centroCostoId,
        centroCostoNombre,
        empleadoCedula,
        empleadoNombre,
        periodoMesDiaAdicional,
        periodoMesDomingo,
        habilitarDiaAdicional,
        habilitarDomingo,
        JSON.stringify(diaAdicionalSemanas),
        domingoSemanas,
      ]
    );

    res.status(201).json({
      ok: true,
      data: mapDbRowToValetAdicionales(result.rows[0]),
    });
  } catch (error) {
    console.error('[POST /api/valets/adicionales] Error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({
      error: 'No se pudo guardar configuracion de adicionales',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.get('/api/valets/empleados', async (_req, res) => {
  try {
    await ensureValetFijoEmpleadoTable();

    const result = await pool.query(
      `SELECT id, centro_costo_id, centro_costo_nombre, empleado_cedula, empleado_nombre, valor_fijo,
              fecha_creacion, fecha_actualizacion
       FROM valet_fijo_empleado
       ORDER BY centro_costo_id ASC, empleado_nombre ASC`
    );

    res.status(200).json({
      ok: true,
      registros: result.rows.map(mapDbRowToValetFijoEmpleado),
    });
  } catch (error) {
    console.error('[GET /api/valets/empleados] Error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({
      error: 'No se pudo cargar empleados valet fijo',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.post('/api/valets/empleados', async (req, res) => {
  const centroCostoId = String(req.body?.centroCostoId || '').trim();
  const centroCostoNombre = String(req.body?.centroCostoNombre || '').trim();
  const empleadoCedula = String(req.body?.empleadoCedula || '').trim();
  const empleadoNombre = String(req.body?.empleadoNombre || '').trim();
  const valorFijo = parseValor(req.body?.valorFijo);

  if (!centroCostoId || !empleadoCedula) {
    res.status(400).json({ error: 'Los campos centroCostoId y empleadoCedula son requeridos' });
    return;
  }

  if (!Number.isFinite(valorFijo) || valorFijo <= 0) {
    res.status(400).json({ error: 'El campo valorFijo debe ser numerico y mayor a 0' });
    return;
  }

  try {
    await ensureValetFijoEmpleadoTable();

    const result = await pool.query(
      `INSERT INTO valet_fijo_empleado (
         centro_costo_id,
         centro_costo_nombre,
         empleado_cedula,
         empleado_nombre,
         valor_fijo,
         fecha_actualizacion
       )
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (centro_costo_id, empleado_cedula)
       DO UPDATE SET
         centro_costo_nombre = EXCLUDED.centro_costo_nombre,
         empleado_nombre = EXCLUDED.empleado_nombre,
         valor_fijo = EXCLUDED.valor_fijo,
         fecha_actualizacion = NOW()
       RETURNING id, centro_costo_id, centro_costo_nombre, empleado_cedula, empleado_nombre, valor_fijo,
                 fecha_creacion, fecha_actualizacion`,
      [centroCostoId, centroCostoNombre, empleadoCedula, empleadoNombre, valorFijo]
    );

    res.status(201).json({
      ok: true,
      registro: mapDbRowToValetFijoEmpleado(result.rows[0]),
    });
  } catch (error) {
    console.error('[POST /api/valets/empleados] Error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({
      error: 'No se pudo guardar empleado valet fijo',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.delete('/api/valets/empleados', async (req, res) => {
  const centroCostoId = String(req.query.centroCostoId || '').trim();
  const empleadoCedula = String(req.query.empleadoCedula || '').trim();

  if (!centroCostoId || !empleadoCedula) {
    res.status(400).json({ error: 'Los parametros centroCostoId y empleadoCedula son requeridos' });
    return;
  }

  try {
    await ensureValetFijoEmpleadoTable();

    const result = await pool.query(
      `DELETE FROM valet_fijo_empleado
       WHERE centro_costo_id = $1 AND empleado_cedula = $2
       RETURNING id, centro_costo_id, centro_costo_nombre, empleado_cedula, empleado_nombre, valor_fijo,
                 fecha_creacion, fecha_actualizacion`,
      [centroCostoId, empleadoCedula]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'No se encontro el empleado en ese centro de costo' });
      return;
    }

    res.status(200).json({
      ok: true,
      registro: mapDbRowToValetFijoEmpleado(result.rows[0]),
    });
  } catch (error) {
    console.error('[DELETE /api/valets/empleados] Error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({
      error: 'No se pudo eliminar empleado valet fijo',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.get('/api/valets/horarios', async (req, res) => {
  const anio = Number(req.query.anio || 0);
  const mes = Number(req.query.mes || 0);
  const centroCostoId = String(req.query.centroCostoId || '').trim();
  const empleadoCedula = String(req.query.empleadoCedula || '').trim();

  try {
    await ensureValetFijoHorarioTable();

    const filtros = [];
    const params = [];

    if (Number.isInteger(anio) && anio > 0) {
      params.push(anio);
      filtros.push(`anio = $${params.length}`);
    }

    if (Number.isInteger(mes) && mes >= 1 && mes <= 12) {
      params.push(mes);
      filtros.push(`mes = $${params.length}`);
    }

    if (centroCostoId) {
      params.push(centroCostoId);
      filtros.push(`centro_costo_id = $${params.length}`);
    }

    if (empleadoCedula) {
      params.push(empleadoCedula);
      filtros.push(`empleado_cedula = $${params.length}`);
    }

    const whereSql = filtros.length > 0 ? `WHERE ${filtros.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT id, centro_costo_id, centro_costo_nombre, empleado_cedula, empleado_nombre,
              valor_fijo, anio, mes, semana, dia, hora_entrada, hora_salida,
              fecha_creacion, fecha_actualizacion
       FROM valet_fijo_horario
       ${whereSql}
       ORDER BY anio DESC, mes DESC, semana ASC, empleado_nombre ASC`,
      params
    );

    res.status(200).json({
      ok: true,
      registros: result.rows.map(mapDbRowToValetFijoHorario),
    });
  } catch (error) {
    console.error('[GET /api/valets/horarios] Error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({
      error: 'No se pudo cargar horarios valet fijo',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.post('/api/valets/horarios', async (req, res) => {
  const centroCostoId = String(req.body?.centroCostoId || '').trim();
  const centroCostoNombre = String(req.body?.centroCostoNombre || '').trim();
  const empleadoCedula = String(req.body?.empleadoCedula || '').trim();
  const empleadoNombre = String(req.body?.empleadoNombre || '').trim();
  const valorFijo = parseValor(req.body?.valorFijo);
  const anio = Number(req.body?.anio || 0);
  const mes = Number(req.body?.mes || 0);
  const semana = Number(req.body?.semana || 0);
  const dia = String(req.body?.dia || '').trim().toLowerCase();
  const horaEntrada = String(req.body?.horaEntrada || '').trim();
  const horaSalida = String(req.body?.horaSalida || '').trim();

  const diasValidos = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

  if (!centroCostoId || !empleadoCedula) {
    res.status(400).json({ error: 'Los campos centroCostoId y empleadoCedula son requeridos' });
    return;
  }

  if (!Number.isInteger(anio) || anio < 2000) {
    res.status(400).json({ error: 'El campo anio es invalido' });
    return;
  }

  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    res.status(400).json({ error: 'El campo mes es invalido' });
    return;
  }

  if (!Number.isInteger(semana) || semana < 1 || semana > 5) {
    res.status(400).json({ error: 'El campo semana es invalido' });
    return;
  }

  if (!diasValidos.includes(dia)) {
    res.status(400).json({ error: 'El campo dia es invalido' });
    return;
  }

  if (!horaEntrada || !horaSalida) {
    res.status(400).json({ error: 'Los campos horaEntrada y horaSalida son requeridos' });
    return;
  }

  if (!Number.isFinite(valorFijo) || valorFijo <= 0) {
    res.status(400).json({ error: 'El campo valorFijo debe ser numerico y mayor a 0' });
    return;
  }

  try {
    await ensureValetFijoHorarioTable();

    const result = await pool.query(
      `INSERT INTO valet_fijo_horario (
         centro_costo_id,
         centro_costo_nombre,
         empleado_cedula,
         empleado_nombre,
         valor_fijo,
         anio,
         mes,
         semana,
         dia,
         hora_entrada,
         hora_salida,
         fecha_actualizacion
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
       ON CONFLICT (centro_costo_id, empleado_cedula, anio, mes, semana, dia)
       DO UPDATE SET
         centro_costo_nombre = EXCLUDED.centro_costo_nombre,
         empleado_nombre = EXCLUDED.empleado_nombre,
         valor_fijo = EXCLUDED.valor_fijo,
         hora_entrada = EXCLUDED.hora_entrada,
         hora_salida = EXCLUDED.hora_salida,
         fecha_actualizacion = NOW()
       RETURNING id, centro_costo_id, centro_costo_nombre, empleado_cedula, empleado_nombre,
                 valor_fijo, anio, mes, semana, dia, hora_entrada, hora_salida,
                 fecha_creacion, fecha_actualizacion`,
      [
        centroCostoId,
        centroCostoNombre,
        empleadoCedula,
        empleadoNombre,
        valorFijo,
        anio,
        mes,
        semana,
        dia,
        horaEntrada,
        horaSalida,
      ]
    );

    res.status(201).json({
      ok: true,
      registro: mapDbRowToValetFijoHorario(result.rows[0]),
    });
  } catch (error) {
    console.error('[POST /api/valets/horarios] Error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({
      error: 'No se pudo guardar horario valet fijo',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.get('/api/nomina/distribucion-centro-costo', async (_req, res) => {
  try {
    await ensureDistribucionCentroCostoTable();
    const result = await pool.query(
      `SELECT id, centro_costo_id, centro_costo_nombre, porcentaje, fecha_creacion, fecha_actualizacion
       FROM distribucion_centro_costo
       ORDER BY centro_costo_nombre ASC, id ASC`
    );

    res.status(200).json({
      ok: true,
      centros: result.rows.map(mapDbRowToDistribucionCentroCosto),
    });
  } catch (error) {
    console.error('[GET /api/nomina/distribucion-centro-costo] Error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({
      error: 'No se pudo cargar la distribucion de centros de costo',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.post('/api/nomina/distribucion-centro-costo', async (req, res) => {
  const centros = Array.isArray(req.body?.centros) ? req.body.centros : [];

  if (centros.length === 0) {
    res.status(400).json({ error: 'Debe enviar al menos un centro de costo' });
    return;
  }

  const normalizados = [];
  const idsVistos = new Set();

  for (const item of centros) {
    const centroCostoId = String(item?.centroCostoId || item?.centro_costo_id || '').trim();
    const centroCostoNombre = String(item?.centroCostoNombre || item?.centro_costo_nombre || '').trim();
    const porcentaje = parseValor(item?.porcentaje);

    if (!centroCostoId) {
      res.status(400).json({ error: 'Cada centro debe incluir centroCostoId' });
      return;
    }

    if (!centroCostoNombre) {
      res.status(400).json({ error: 'Cada centro debe incluir centroCostoNombre' });
      return;
    }

    if (!Number.isFinite(porcentaje) || porcentaje < 0 || porcentaje > 100) {
      res.status(400).json({ error: 'Cada porcentaje debe ser numerico entre 0 y 100' });
      return;
    }

    if (idsVistos.has(centroCostoId)) {
      res.status(400).json({ error: 'No se permiten centros duplicados en la misma configuracion' });
      return;
    }

    idsVistos.add(centroCostoId);
    normalizados.push({ centroCostoId, centroCostoNombre, porcentaje });
  }

  const total = normalizados.reduce((acumulado, item) => acumulado + item.porcentaje, 0);
  if (Math.abs(total - 100) > 0.01) {
    res.status(400).json({ error: 'La suma de porcentajes de los centros de costo debe ser 100%' });
    return;
  }

  try {
    await ensureDistribucionCentroCostoTable();

    await pool.query('BEGIN');
    await pool.query('DELETE FROM distribucion_centro_costo');

    for (const item of normalizados) {
      await pool.query(
        `INSERT INTO distribucion_centro_costo (
          centro_costo_id,
          centro_costo_nombre,
          porcentaje,
          fecha_actualizacion
        ) VALUES ($1, $2, $3, NOW())`,
        [item.centroCostoId, item.centroCostoNombre, item.porcentaje]
      );
    }

    await pool.query('COMMIT');

    const result = await pool.query(
      `SELECT id, centro_costo_id, centro_costo_nombre, porcentaje, fecha_creacion, fecha_actualizacion
       FROM distribucion_centro_costo
       ORDER BY centro_costo_nombre ASC, id ASC`
    );

    res.status(200).json({
      ok: true,
      total,
      centros: result.rows.map(mapDbRowToDistribucionCentroCosto),
    });
  } catch (error) {
    await pool.query('ROLLBACK').catch(() => {});
    console.error('[POST /api/nomina/distribucion-centro-costo] Error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({
      error: 'No se pudo guardar la distribucion de centros de costo',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});


// GET: devuelve [{ empleado_id, empleado_documento, empleado_nombre_completo, centros: [{centro_costo_id, centro_costo_nombre, porcentaje}] }]
app.get('/api/nomina/empleado-distribucion-centro-costo', async (_req, res) => {
  try {
    await ensureEmpleadoDistribucionCentroCostoTable();
    const result = await pool.query(
      `SELECT empleado_id, empleado_documento, empleado_nombre_completo, centro_costo_id, centro_costo_nombre, porcentaje
       FROM empleado_distribucion_centro_costo
       ORDER BY empleado_nombre_completo ASC, empleado_id ASC, id ASC`
    );
    // Agrupar por empleado
    const empleadosMap = new Map();
    for (const row of result.rows) {
      if (!empleadosMap.has(row.empleado_id)) {
        empleadosMap.set(row.empleado_id, {
          empleadoId: row.empleado_id,
          empleadoDocumento: row.empleado_documento,
          empleadoNombreCompleto: row.empleado_nombre_completo,
          centros: [],
        });
      }
      empleadosMap.get(row.empleado_id).centros.push({
        centroCostoId: row.centro_costo_id,
        centroCostoNombre: row.centro_costo_nombre,
        porcentaje: Number(row.porcentaje),
      });
    }
    res.status(200).json({
      ok: true,
      empleados: Array.from(empleadosMap.values()),
    });
  } catch (error) {
    console.error('[GET /api/nomina/empleado-distribucion-centro-costo] Error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({
      error: 'No se pudo cargar la distribucion por empleado',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});


// POST: recibe { empleadoId, empleadoDocumento, empleadoNombreCompleto, centros: [{centroCostoId, centroCostoNombre, porcentaje}] }
app.post('/api/nomina/empleado-distribucion-centro-costo', async (req, res) => {
  const empleadoId = String(req.body?.empleadoId || '').trim();
  const empleadoDocumento = String(req.body?.empleadoDocumento || '').trim();
  const empleadoNombreCompleto = String(req.body?.empleadoNombreCompleto || '').trim();
  const centros = Array.isArray(req.body?.centros) ? req.body.centros : [];

  if (!empleadoId) {
    res.status(400).json({ error: 'El campo empleadoId es requerido' });
    return;
  }
  if (!empleadoNombreCompleto) {
    res.status(400).json({ error: 'El campo empleadoNombreCompleto es requerido' });
    return;
  }
  if (centros.length === 0) {
    res.status(400).json({ error: 'Debe enviar al menos un centro de costo' });
    return;
  }
  const normalizados = [];
  const idsVistos = new Set();
  for (const item of centros) {
    const centroCostoId = String(item?.centroCostoId || item?.centro_costo_id || '').trim();
    const centroCostoNombre = String(item?.centroCostoNombre || item?.centro_costo_nombre || '').trim();
    const porcentaje = parseValor(item?.porcentaje);
    if (!centroCostoId) {
      res.status(400).json({ error: 'Cada centro debe incluir centroCostoId' });
      return;
    }
    if (!centroCostoNombre) {
      res.status(400).json({ error: 'Cada centro debe incluir centroCostoNombre' });
      return;
    }
    if (!Number.isFinite(porcentaje) || porcentaje < 0 || porcentaje > 100) {
      res.status(400).json({ error: 'Cada porcentaje debe ser numerico entre 0 y 100' });
      return;
    }
    if (idsVistos.has(centroCostoId)) {
      res.status(400).json({ error: 'No se permiten centros duplicados en la misma distribucion del empleado' });
      return;
    }
    idsVistos.add(centroCostoId);
    normalizados.push({ centroCostoId, centroCostoNombre, porcentaje });
  }
  const total = normalizados.reduce((acumulado, item) => acumulado + item.porcentaje, 0);
  if (Math.abs(total - 100) > 0.01) {
    res.status(400).json({ error: 'La suma de porcentajes del empleado debe ser 100%' });
    return;
  }
  try {
    await ensureEmpleadoDistribucionCentroCostoTable();
    // Eliminar filas previas del empleado
    await pool.query('DELETE FROM empleado_distribucion_centro_costo WHERE empleado_id = $1', [empleadoId]);
    // Insertar cada centro como fila
    const values = [];
    const placeholders = [];
    normalizados.forEach((item, idx) => {
      values.push(
        empleadoId,
        empleadoDocumento,
        empleadoNombreCompleto,
        item.centroCostoId,
        item.centroCostoNombre,
        item.porcentaje
      );
      const base = idx * 6;
      placeholders.push(`($${base+1}, $${base+2}, $${base+3}, $${base+4}, $${base+5}, $${base+6})`);
    });
    if (values.length > 0) {
      await pool.query(
        `INSERT INTO empleado_distribucion_centro_costo (
          empleado_id, empleado_documento, empleado_nombre_completo, centro_costo_id, centro_costo_nombre, porcentaje
        ) VALUES ${placeholders.join(',')}`,
        values
      );
    }
    res.status(200).json({
      ok: true,
      empleado: {
        empleadoId,
        empleadoDocumento,
        empleadoNombreCompleto,
        centros: normalizados,
      },
    });
  } catch (error) {
    console.error('[POST /api/nomina/empleado-distribucion-centro-costo] Error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({
      error: 'No se pudo guardar la distribucion por empleado',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});


// DELETE: elimina todas las filas de un empleado
app.delete('/api/nomina/empleado-distribucion-centro-costo/:empleadoId', async (req, res) => {
  const empleadoId = String(req.params.empleadoId || '').trim();
  if (!empleadoId) {
    res.status(400).json({ error: 'El parametro empleadoId es requerido' });
    return;
  }
  try {
    await ensureEmpleadoDistribucionCentroCostoTable();
    const result = await pool.query(
      `DELETE FROM empleado_distribucion_centro_costo
       WHERE empleado_id = $1`,
      [empleadoId]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Distribucion del empleado no encontrada' });
      return;
    }
    res.status(200).json({
      ok: true,
      empleadoId,
    });
  } catch (error) {
    console.error('[DELETE /api/nomina/empleado-distribucion-centro-costo/:empleadoId] Error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({
      error: 'No se pudo eliminar la distribucion por empleado',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

const startServer = async () => {
  try {
    await ensureDescuentosTable();
    await ensureExentosPagoSeguroTable();
    await ensureValetsAdicionalesTable();
    await ensureValetFijoEmpleadoTable();
    await ensureValetFijoHorarioTable();
    await ensureDistribucionCentroCostoTable();
    await ensureEmpleadoDistribucionCentroCostoTable();
    app.listen(PORT, () => {
      console.log(`humana-backend escuchando en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('No se pudo inicializar backend:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
};

void startServer();
