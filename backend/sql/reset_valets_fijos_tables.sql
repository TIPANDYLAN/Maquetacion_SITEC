BEGIN;

DROP TABLE IF EXISTS valet_fijo_adicionales;
DROP TABLE IF EXISTS valet_fijo_configuracion;
DROP TABLE IF EXISTS valet_fijo_centro;
DROP TABLE IF EXISTS valet_fijo_horario;
DROP TABLE IF EXISTS valet_fijo_empleado;

CREATE TABLE valet_fijo_empleado (
  id BIGSERIAL PRIMARY KEY,
  centro_costo_id TEXT NOT NULL,
  centro_costo_nombre TEXT NOT NULL DEFAULT '',
  empleado_cedula TEXT NOT NULL,
  empleado_nombre TEXT NOT NULL DEFAULT '',
  valor_fijo NUMERIC(18,2) NOT NULL DEFAULT 0,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_valet_fijo_empleado UNIQUE (centro_costo_id, empleado_cedula),
  CONSTRAINT chk_valet_fijo_empleado_valor_fijo_positivo CHECK (valor_fijo >= 0)
);

CREATE INDEX idx_valet_fijo_empleado_centro
  ON valet_fijo_empleado (centro_costo_id);

CREATE INDEX idx_valet_fijo_empleado_cedula
  ON valet_fijo_empleado (empleado_cedula);

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
  recurrencia BOOLEAN NOT NULL DEFAULT FALSE,
  fin_recurrencia DATE,
  observacion TEXT NOT NULL DEFAULT '',
  evidencia_blob BYTEA,
  evidencia_mime_type TEXT NOT NULL DEFAULT '',
  evidencia_nombre_archivo TEXT NOT NULL DEFAULT '',
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_valet_fijo_horario UNIQUE (centro_costo_id, empleado_cedula, fecha_turno, hora_entrada, hora_salida),
  CONSTRAINT chk_valet_fijo_horario_hora_entrada_salida CHECK (hora_entrada <> '' AND hora_salida <> ''),
  CONSTRAINT chk_valet_fijo_horario_fecha_turno_formato CHECK (fecha_turno IS NOT NULL)
);

CREATE INDEX idx_valet_fijo_horario_centro
  ON valet_fijo_horario (centro_costo_id);

CREATE INDEX idx_valet_fijo_horario_empleado
  ON valet_fijo_horario (empleado_cedula);

CREATE INDEX idx_valet_fijo_horario_fecha_turno
  ON valet_fijo_horario (fecha_turno);

-- Centros agregados en la gestion de valets (fuente para listas de parqueaderos gestionados).
CREATE TABLE valet_fijo_centro (
  id BIGSERIAL PRIMARY KEY,
  centro_costo_id TEXT NOT NULL,
  centro_costo_nombre TEXT NOT NULL DEFAULT '',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_valet_fijo_centro UNIQUE (centro_costo_id)
);

CREATE INDEX idx_valet_fijo_centro_activo
  ON valet_fijo_centro (activo);

CREATE INDEX idx_valet_fijo_centro_nombre
  ON valet_fijo_centro (centro_costo_nombre);

-- Configuracion de tarifas por centro de costo para valets fijos.
CREATE TABLE valet_fijo_configuracion (
  id BIGSERIAL PRIMARY KEY,
  centro_costo_id TEXT NOT NULL,
  horas_normal_limite NUMERIC(10,2) NOT NULL DEFAULT 40,
  valor_normal NUMERIC(18,2) NOT NULL DEFAULT 3.50,
  valor_adicional NUMERIC(18,2) NOT NULL DEFAULT 3.00,
  valor_domingo NUMERIC(18,2) NOT NULL DEFAULT 10.00,
  valor_domingo_adicional NUMERIC(18,2) NOT NULL DEFAULT 15.00,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_valet_fijo_configuracion UNIQUE (centro_costo_id),
  CONSTRAINT chk_valet_fijo_config_horas_normal CHECK (horas_normal_limite >= 0),
  CONSTRAINT chk_valet_fijo_config_valor_normal CHECK (valor_normal >= 0),
  CONSTRAINT chk_valet_fijo_config_valor_adicional CHECK (valor_adicional >= 0),
  CONSTRAINT chk_valet_fijo_config_valor_domingo CHECK (valor_domingo >= 0),
  CONSTRAINT chk_valet_fijo_config_valor_domingo_adicional CHECK (valor_domingo_adicional >= 0)
);

CREATE INDEX idx_valet_fijo_configuracion_centro
  ON valet_fijo_configuracion (centro_costo_id);

-- Trigger comun para mantener fecha_actualizacion en UPDATE.
CREATE OR REPLACE FUNCTION valet_set_fecha_actualizacion()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fecha_actualizacion = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_valet_fijo_empleado_fecha_actualizacion
BEFORE UPDATE ON valet_fijo_empleado
FOR EACH ROW
EXECUTE FUNCTION valet_set_fecha_actualizacion();

CREATE TRIGGER trg_valet_fijo_horario_fecha_actualizacion
BEFORE UPDATE ON valet_fijo_horario
FOR EACH ROW
EXECUTE FUNCTION valet_set_fecha_actualizacion();

CREATE TRIGGER trg_valet_fijo_centro_fecha_actualizacion
BEFORE UPDATE ON valet_fijo_centro
FOR EACH ROW
EXECUTE FUNCTION valet_set_fecha_actualizacion();

CREATE TRIGGER trg_valet_fijo_configuracion_fecha_actualizacion
BEFORE UPDATE ON valet_fijo_configuracion
FOR EACH ROW
EXECUTE FUNCTION valet_set_fecha_actualizacion();

COMMIT;
