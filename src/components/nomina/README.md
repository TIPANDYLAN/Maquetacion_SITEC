# Modulo nomina

Componentes para gestion de personal, descuentos y Humana.

## Componentes en esta carpeta

- `HumanaView.tsx`
- `ProveedorHumanaView.tsx`
- `MovimientosHumanaView.tsx`
- `DescuentosView.tsx`
- `GestionDescuentosTabsView.tsx`
- `HorasApiTestView.tsx`

## Estado actual

- `HumanaView`: gestion de empleados/polizas con filtros y vistas de detalle/agregado.
- `GestionDescuentosTabsView`: flujo principal para descuentos.
- `HorasApiTestView`: pruebas de integracion para horas.
- `ProveedorHumanaView` y `MovimientosHumanaView`: soporte de carga/consulta de archivos y movimientos.

## Relacion con el backend

- Consume servicios en `src/services/humanaApi.ts`.
- Persiste informacion local en `src/services/humanaStorage.ts` cuando aplica.

## Pendiente funcional (menu)

Desde `App.tsx` existen opciones de menu que aun renderizan placeholders (movilizaciones, e-rol, bonos, prestamos, celular, alimentacion, fondos, horas).
