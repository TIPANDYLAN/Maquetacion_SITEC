CREATE TABLE IF NOT EXISTS medic_secure_humana (
  id BIGSERIAL PRIMARY KEY,
  anio INTEGER NOT NULL CHECK (anio >= 2000 AND anio <= 2100),
  mes TEXT NOT NULL,

  empleado TEXT NOT NULL,
  cedula TEXT NOT NULL DEFAULT '',
  centro TEXT NOT NULL DEFAULT '',
  plan TEXT NOT NULL DEFAULT '',
  tarifa TEXT NOT NULL DEFAULT '',
  trabajador_rol NUMERIC(18,8) NOT NULL DEFAULT 0,
  urbapark NUMERIC(18,8) NOT NULL DEFAULT 0,
  prima NUMERIC(18,8) NOT NULL DEFAULT 0,
  ajuste NUMERIC(18,8) NOT NULL DEFAULT 0,
  assist NUMERIC(18,8) NOT NULL DEFAULT 0,
  seguro NUMERIC(18,8) NOT NULL DEFAULT 0,
  f_ingreso TEXT NOT NULL DEFAULT '',
  f_exclusion TEXT NOT NULL DEFAULT '',

  fecha_carga TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medic_secure_humana_periodo
  ON medic_secure_humana (anio DESC, mes DESC, fecha_carga DESC);

CREATE INDEX IF NOT EXISTS idx_medic_secure_humana_empleado
  ON medic_secure_humana (anio, mes, empleado);
