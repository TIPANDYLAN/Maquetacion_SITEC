# Modulo nomina

Componentes para gestion de personal, descuentos y Humana.

## Componentes en esta carpeta

- `HumanaView.tsx`
- `ProveedorHumanaView.tsx`
- `MovimientosHumanaView.tsx`
- `DescuentosView.tsx`
- `ExentosPagoSeguroView.tsx`
- `ValetsFijosView.tsx`
- `GestionDescuentosTabsView.tsx`

## Estado actual

- `HumanaView`: gestion de empleados/polizas con filtros y vistas de detalle/agregado.
- `GestionDescuentosTabsView`: flujo principal para descuentos.
- `ProveedorHumanaView`: carga y normalizacion de archivos de Humana.
- `MovimientosHumanaView`: gestion, validacion y exportacion de movimientos.
- `DescuentosView`: alta, consulta, aprobacion y detalle de descuentos.
- `ExentosPagoSeguroView`: administracion de exentos de seguro.
- `ValetsFijosView`: configuracion de horarios, asignaciones y adicionales de valets.

## Relacion con el backend

- Consume servicios en `src/services/dbApi.ts`.
- Consume endpoints n8n desde `src/services/n8nApi.ts` para catalogos y familiares.
- La vista de prueba `HorasApiTestView` fue retirada.

## Pendiente funcional (menu)

Desde `App.tsx` existen opciones de menu que aun renderizan placeholders (movilizaciones, e-rol, bonos, prestamos, celular, alimentacion, fondos, horas).
