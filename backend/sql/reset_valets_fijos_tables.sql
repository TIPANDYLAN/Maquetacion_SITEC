BEGIN;

DROP TABLE IF EXISTS valet_fijo_adicionales;
DROP TABLE IF EXISTS valet_fijo_horario;
DROP TABLE IF EXISTS valet_fijo_empleado;

CREATE TABLE valet_fijo_empleado (
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

CREATE INDEX idx_valet_fijo_empleado_centro ON valet_fijo_empleado (centro_costo_id);
CREATE INDEX idx_valet_fijo_empleado_cedula ON valet_fijo_empleado (empleado_cedula);

CREATE TABLE valet_fijo_horario (
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
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_valet_fijo_horario UNIQUE (centro_costo_id, empleado_cedula, fecha_turno, hora_entrada, hora_salida)
);

CREATE INDEX idx_valet_fijo_horario_centro ON valet_fijo_horario (centro_costo_id);
CREATE INDEX idx_valet_fijo_horario_empleado ON valet_fijo_horario (empleado_cedula);
CREATE INDEX idx_valet_fijo_horario_fecha_turno ON valet_fijo_horario (fecha_turno);

COMMIT;
