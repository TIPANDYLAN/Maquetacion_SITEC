# Configuración Global

Constantes y configuración centralizada de la aplicación.

## Archivos

- **index.ts** - Colores, breakpoints, menú, formatos, etc.

## Exports

- **COLORS** - Paleta de colores corporativa (primary, secondary, success, etc.)
- **BREAKPOINTS** - Breakpoints de responsive design
- **STATUS** - Estados predefinidos (Exitoso, Advertencia, Error, Pendiente)
- **MENU_ITEMS** - Estructura del menú principal
- **COMPANY** - Información de la empresa
- **FORMATS** - Formatos de fecha y moneda
- **PARKING_LOTS** - Lista de parqueaderos

## Cómo usar

```tsx
import { COLORS, MENU_ITEMS, COMPANY } from '@/config';

console.log(COLORS.primary); // '#001F3F'
console.log(COMPANY.name); // 'Urbapark'
```

## Mejores prácticas

- Usar estas constantes en lugar de hardcodear valores
- Mantener sincronizados con estilos Tailwind
- Agregar nuevas constantes aquí cuando se necesite reutilizar valores
