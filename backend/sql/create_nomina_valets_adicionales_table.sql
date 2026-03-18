CREATE TABLE IF NOT EXISTS valet_fijo_adicionales (
  id BIGSERIAL PRIMARY KEY,
  centro_costo_id TEXT NOT NULL,
  centro_costo_nombre TEXT NOT NULL DEFAULT '',
  empleado_cedula TEXT NOT NULL,
  empleado_nombre TEXT NOT NULL DEFAULT '',
  periodo_mes_dia_adicional TEXT NOT NULL DEFAULT '',
  periodo_mes_domingo TEXT NOT NULL DEFAULT '',
  habilitar_dia_adicional BOOLEAN NOT NULL DEFAULT FALSE,
  habilitar_domingo BOOLEAN NOT NULL DEFAULT FALSE,
  dia_adicional_semanas JSONB NOT NULL DEFAULT '[]'::jsonb,
  domingo_semanas INTEGER[] NOT NULL DEFAULT '{}',
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_valet_fijo_adicionales UNIQUE (centro_costo_id, empleado_cedula),
  CONSTRAINT chk_nomina_valets_periodo_mes_dia_adicional_format
    CHECK (periodo_mes_dia_adicional = '' OR periodo_mes_dia_adicional ~ '^[0-9]{4}-[0-9]{2}$'),
  CONSTRAINT chk_nomina_valets_periodo_mes_domingo_format
    CHECK (periodo_mes_domingo = '' OR periodo_mes_domingo ~ '^[0-9]{4}-[0-9]{2}$')
);

CREATE INDEX IF NOT EXISTS idx_valet_fijo_adicionales_centro
  ON valet_fijo_adicionales (centro_costo_id);

CREATE INDEX IF NOT EXISTS idx_valet_fijo_adicionales_empleado
  ON valet_fijo_adicionales (empleado_cedula);
