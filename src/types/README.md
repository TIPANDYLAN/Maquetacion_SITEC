# Tipos compartidos

Definiciones TypeScript comunes para mantener consistencia entre componentes, servicios y mocks.

## Archivo principal

- `index.ts`

## Recomendaciones

- Definir aqui interfaces reutilizables por mas de un modulo.
- Preferir tipos explicitos antes que `any`.
- Cuando cambie la estructura de un endpoint, ajustar tipo y consumo en el mismo cambio.

## Uso

```ts
import type { Ticket, Payment } from '@/types';
```
