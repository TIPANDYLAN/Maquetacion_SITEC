CREATE TABLE IF NOT EXISTS distribucion_centro_costo (
  id BIGSERIAL PRIMARY KEY,
  centro_costo_id TEXT NOT NULL UNIQUE,
  centro_costo_nombre TEXT NOT NULL DEFAULT '',
  porcentaje NUMERIC(5,2) NOT NULL,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_distribucion_centro_costo_porcentaje_rango CHECK (porcentaje >= 0 AND porcentaje <= 100)
);

CREATE INDEX IF NOT EXISTS idx_distribucion_centro_costo_nombre
  ON distribucion_centro_costo (centro_costo_nombre);