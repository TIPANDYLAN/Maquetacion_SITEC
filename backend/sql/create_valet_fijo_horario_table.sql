CREATE TABLE IF NOT EXISTS valet_fijo_horario (
  id BIGSERIAL PRIMARY KEY,
  centro_costo_id TEXT NOT NULL,
  centro_costo_nombre TEXT NOT NULL DEFAULT '',
  empleado_cedula TEXT NOT NULL,
  empleado_nombre TEXT NOT NULL DEFAULT '',
  fecha_turno DATE NOT NULL,
  hora_entrada TEXT NOT NULL,
  hora_salida TEXT NOT NULL,
  es_adicional BOOLEAN NOT NULL DEFAULT FALSE,
  aprobado BOOLEAN NOT NULL DEFAULT TRUE,
  recurrencia BOOLEAN NOT NULL DEFAULT FALSE,
  observacion TEXT NOT NULL DEFAULT '',
  evidencia_blob BYTEA,
  evidencia_mime_type TEXT NOT NULL DEFAULT '',
  evidencia_nombre_archivo TEXT NOT NULL DEFAULT '',
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_valet_fijo_horario UNIQUE (centro_costo_id, empleado_cedula, fecha_turno, hora_entrada, hora_salida)
);

CREATE INDEX IF NOT EXISTS idx_valet_fijo_horario_centro
  ON valet_fijo_horario (centro_costo_id);

CREATE INDEX IF NOT EXISTS idx_valet_fijo_horario_empleado
  ON valet_fijo_horario (empleado_cedula);

CREATE INDEX IF NOT EXISTS idx_valet_fijo_horario_fecha_turno
  ON valet_fijo_horario (fecha_turno);
