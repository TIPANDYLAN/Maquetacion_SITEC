# Layout

Esta carpeta documenta la separacion futura del layout principal.

## Estado actual

- `App.tsx` contiene la estructura completa de sidebar, header y area de contenido.
- Aun no existen componentes separados de barra lateral y encabezado en esta carpeta.

## Cambios recientes

- Se simplifico el menu de nomina removiendo la vista de prueba `HorasApiTestView`.

## Objetivo

Extraer layout para:

- reducir complejidad de `App.tsx`
- facilitar pruebas unitarias
- permitir reutilizacion de piezas de interfaz

## Propuesta de extraccion

1. Extraer barra lateral.
2. Extraer encabezado.
3. Separar area de contenido principal (opcional).
