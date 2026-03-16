CREATE TABLE IF NOT EXISTS humana_exentos_pago_seguro (
  id BIGSERIAL PRIMARY KEY,
  cedula TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  porcentaje_exento NUMERIC(5,2) NOT NULL,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_humana_exentos_porcentaje_rango
    CHECK (porcentaje_exento >= 0 AND porcentaje_exento <= 100)
);

CREATE INDEX IF NOT EXISTS idx_humana_exentos_pago_seguro_nombre
  ON humana_exentos_pago_seguro (nombre);

CREATE INDEX IF NOT EXISTS idx_humana_exentos_pago_seguro_actualizacion
  ON humana_exentos_pago_seguro (fecha_actualizacion DESC);
