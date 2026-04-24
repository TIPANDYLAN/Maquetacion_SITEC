-- ===================================================================
-- Limpieza de tablas no usadas del flujo de accesorios (maqueta)
-- Mantiene: solicitudes_accesorios, lineas_solicitud, archivos_accesorios
-- ===================================================================

BEGIN;

-- Si quedaron de versiones anteriores, eliminamos triggers explícitos
DROP TRIGGER IF EXISTS update_ordenes_compra_updated_at ON ordenes_compra;
DROP TRIGGER IF EXISTS update_ordenes_accesorio_updated_at ON ordenes_accesorio;

-- Tablas antiguas del diseño previo (no usadas en la maqueta actual)
DROP TABLE IF EXISTS cuotas_accesorios CASCADE;
DROP TABLE IF EXISTS ordenes_accesorio CASCADE;
DROP TABLE IF EXISTS ordenes_compra CASCADE;
DROP TABLE IF EXISTS ordenes_accesorios CASCADE;

COMMIT;
