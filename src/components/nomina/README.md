# Módulo Nómina

Componentes relacionados a gestión de empleados, nómina y seguros.

## Implementados

- **HumanaView.tsx** - Gestión de pólizas de seguros Humana
  - Sistema de empleados con cálculo automático de primas
  - Filtros por Centro de Costo, Plan y Tarifa
  - Vista de Detalle (empleados) y Centros (agregado)
  
- **ProveedorHumanaView.tsx** - Upload de facturas de Humana
  - Drag & drop file upload
  - Historial de cargas

## Pendientes

- **Movilizaciones.tsx** - Asignación de subsidio de movilización
- **Erol.tsx** - Gestión de riesgos laborales
- **Bonos.tsx** - Asignación de bonos y gratificaciones
- **Prestamos.tsx** - Gestión de préstamos a empleados
- **Celular.tsx** - Control de líneas telefónicas
- **Alimentacion.tsx** - Subsidio de alimentación
- **Fondos.tsx** - Gestión de fondos de solidaridad
- **Descuentos.tsx** - Control de descuentos salariales
- **Horas.tsx** - Gestión de horas extraordinarias

## Estructura HumanaView

- **Detalle Tab**: Tabla de empleados individuales
- **Centros Tab**: Agregación por centro de costo con cálculos totales
- Columnas: Prima, Asistencia, Trabajador, Seguro Campesino, Total Factura, Urbapark
