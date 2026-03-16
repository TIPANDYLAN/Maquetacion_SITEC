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

app.get('/api/descuentos/humana/exentos-pago-seguro', async (_req, res) => {
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
    console.error('[GET /api/descuentos/humana/exentos-pago-seguro] Error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({
      error: 'No se pudo cargar exentos de pago seguro',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.post('/api/descuentos/humana/exentos-pago-seguro', async (req, res) => {
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
    console.error('[POST /api/descuentos/humana/exentos-pago-seguro] Error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({
      error: 'No se pudo guardar exento de pago seguro',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

const startServer = async () => {
  try {
    await ensureDescuentosTable();
    await ensureExentosPagoSeguroTable();
    app.listen(PORT, () => {
      console.log(`humana-backend escuchando en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('No se pudo inicializar backend:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
};

void startServer();
