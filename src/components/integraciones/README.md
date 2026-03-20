# Modulo integraciones

Espacio para integraciones con APIs externas y procesos de sincronizacion.

## Estado actual

- No existen componentes dedicados en esta carpeta.
- En `App.tsx` hay opciones de menu de integraciones que actualmente renderizan `Placeholder`.

## Opciones de menu existentes

- api_meypar
- api_tgw
- api_matricula_error
- api_proceso_reverso

## Siguiente paso recomendado

Crear una capa de servicios por proveedor en `src/services` y luego vistas por flujo en esta carpeta.

## Nota

- La integracion n8n usada por nomina se concentra en `src/services/n8nApi.ts`.
