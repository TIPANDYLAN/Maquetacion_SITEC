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
);

CREATE INDEX IF NOT EXISTS idx_valet_fijo_empleado_centro
  ON valet_fijo_empleado (centro_costo_id);

CREATE INDEX IF NOT EXISTS idx_valet_fijo_empleado_cedula
  ON valet_fijo_empleado (empleado_cedula);
