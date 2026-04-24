-- ===================================================================
-- Tablas simplificadas para órdenes de accesorios (maqueta)
-- ===================================================================

-- Tabla principal de solicitudes
CREATE TABLE IF NOT EXISTS solicitudes_accesorios (
  id VARCHAR(50) PRIMARY KEY,
  fecha TIMESTAMP NOT NULL,
  estado VARCHAR(50) NOT NULL CHECK (estado IN ('creada', 'orden_generada', 'pedido_realizado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_solicitudes_accesorios_fecha 
  ON solicitudes_accesorios (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_solicitudes_accesorios_estado 
  ON solicitudes_accesorios (estado);

-- Tabla de líneas (empleados + accesorios)
CREATE TABLE IF NOT EXISTS lineas_solicitud (
  id VARCHAR(50) PRIMARY KEY,
  solicitud_id VARCHAR(50) NOT NULL REFERENCES solicitudes_accesorios(id) ON DELETE CASCADE,
  empleado_nombre VARCHAR(255) NOT NULL,
  empleado_cedula VARCHAR(20) NOT NULL,
  centro_costo VARCHAR(100) NOT NULL,
  accesorio VARCHAR(50) NOT NULL CHECK (accesorio IN ('botas', 'auriculares')),
  talla VARCHAR(20) NOT NULL,
  acta BOOLEAN NOT NULL DEFAULT FALSE,
  numero_factura VARCHAR(100),
  cuotas VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lineas_solicitud_solicitud 
  ON lineas_solicitud (solicitud_id);

DROP TABLE IF EXISTS ordenes_accesorios CASCADE;

-- Tabla de metadata de archivos subidos (sin contenido binario)
CREATE TABLE IF NOT EXISTS archivos_accesorios (
  id BIGSERIAL PRIMARY KEY,
  solicitud_id VARCHAR(50) NOT NULL REFERENCES solicitudes_accesorios(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('orden', 'acta', 'orden_validada')),
  nombre_archivo VARCHAR(255) NOT NULL,
  accesorio VARCHAR(50) CHECK (accesorio IN ('botas', 'auriculares')),
  empleado_cedula VARCHAR(20),
  numero_orden VARCHAR(100),
  total_valor NUMERIC(18, 4) NOT NULL DEFAULT 0,
  fecha_carga TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_archivos_accesorios_solicitud
  ON archivos_accesorios (solicitud_id);
CREATE INDEX IF NOT EXISTS idx_archivos_accesorios_tipo
  ON archivos_accesorios (tipo);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_solicitudes_accesorios_updated_at ON solicitudes_accesorios;
CREATE TRIGGER update_solicitudes_accesorios_updated_at
BEFORE UPDATE ON solicitudes_accesorios
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

