# Config global

Constantes compartidas para evitar valores hardcodeados en componentes.

## Archivo principal

- `index.ts`

## Exportaciones habituales

- `COLORS`
- `BREAKPOINTS`
- `STATUS`
- `MENU_ITEMS`
- `COMPANY`
- `FORMATS`
- `PARKING_LOTS`

## Uso

```ts
import { COLORS, COMPANY } from '@/config';

console.log(COLORS.primary);
console.log(COMPANY.name);
```

## Reglas

- Si una constante se reutiliza en 2 o mas lugares, moverla a esta carpeta.
- Mantener nombres claros y consistentes.
- Evitar duplicar configuracion equivalente en `mockData.ts`.
