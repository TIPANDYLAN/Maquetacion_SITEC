CREATE TABLE IF NOT EXISTS valet_fijo_horario (
  id BIGSERIAL PRIMARY KEY,
  centro_costo_id TEXT NOT NULL,
  centro_costo_nombre TEXT NOT NULL DEFAULT '',
  empleado_cedula TEXT NOT NULL,
  empleado_nombre TEXT NOT NULL DEFAULT '',
  valor_fijo NUMERIC(18,2) NOT NULL DEFAULT 0,
  anio INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  semana INTEGER NOT NULL,
  dia TEXT NOT NULL,
  hora_entrada TEXT NOT NULL,
  hora_salida TEXT NOT NULL,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_valet_fijo_horario UNIQUE (centro_costo_id, empleado_cedula, anio, mes, semana, dia),
  CONSTRAINT chk_valet_fijo_horario_mes_rango CHECK (mes >= 1 AND mes <= 12),
  CONSTRAINT chk_valet_fijo_horario_semana_rango CHECK (semana >= 1 AND semana <= 5),
  CONSTRAINT chk_valet_fijo_horario_dia_valido CHECK (dia IN ('lunes','martes','miercoles','jueves','viernes','sabado','domingo'))
);

CREATE INDEX IF NOT EXISTS idx_valet_fijo_horario_periodo
  ON valet_fijo_horario (anio DESC, mes DESC, semana ASC);

CREATE INDEX IF NOT EXISTS idx_valet_fijo_horario_centro
  ON valet_fijo_horario (centro_costo_id);

CREATE INDEX IF NOT EXISTS idx_valet_fijo_horario_empleado
  ON valet_fijo_horario (empleado_cedula);
