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
);

CREATE INDEX IF NOT EXISTS idx_incidents_discount_nomina_periodo
  ON incidents_discount_nomina (periodo DESC, fecha_creacion DESC);

CREATE INDEX IF NOT EXISTS idx_incidents_discount_nomina_estado
  ON incidents_discount_nomina (estado);
