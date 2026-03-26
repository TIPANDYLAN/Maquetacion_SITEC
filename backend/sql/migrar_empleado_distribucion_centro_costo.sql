-- WARNING: Esto eliminará todos los datos previos de la tabla empleado_distribucion_centro_costo
DROP TABLE IF EXISTS empleado_distribucion_centro_costo;

-- Nueva estructura (una fila por centro de costo por empleado)
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
);

CREATE INDEX IF NOT EXISTS idx_empleado_distribucion_centro_costo_empleado_id
  ON empleado_distribucion_centro_costo (empleado_id);

CREATE INDEX IF NOT EXISTS idx_empleado_distribucion_centro_costo_documento
  ON empleado_distribucion_centro_costo (empleado_documento);

CREATE INDEX IF NOT EXISTS idx_empleado_distribucion_centro_costo_centro
  ON empleado_distribucion_centro_costo (centro_costo_id);
