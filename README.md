# Portal SITEC

Sistema interno para gestion de operaciones de parqueaderos, pagos, nomina, mantenimiento e integraciones.

## Objetivo

Centralizar en una sola interfaz web los procesos operativos y administrativos de Urbapark, con modulos en distintos niveles de madurez (implementado, parcial o placeholder).

## Stack

- Frontend: React 19 + TypeScript + Vite
- Estilos: Tailwind CSS
- Backend: Node.js + Express
- Base de datos: PostgreSQL

## Inicio rapido

```bash
npm install
npm run dev
```

Frontend local:

```txt
http://localhost:5173
```

Backend local (opcional, para endpoints de Humana y descuentos):

```bash
npm run dev:backend
```

Backend local:

```txt
http://localhost:4000
```

## Scripts disponibles

- `npm run dev`: levanta frontend en modo desarrollo
- `npm run build`: compila TypeScript y genera build de Vite
- `npm run preview`: previsualiza build local
- `npm run lint`: ejecuta ESLint
- `npm run dev:backend`: levanta backend Express
- `npm run start:backend`: levanta backend Express

## Estado funcional por modulo

- Operaciones:
  - Implementado: `TicketsView`
  - Placeholder: matriculas, bicicletas, ocupacion
- Pagos y facturacion:
  - Implementado: `PagosView`, `BancosView`
  - Placeholder: boletas, facturas, niubiz, agora, izipay, presupuestos, cajas chicas
- Nomina / gestion de personal:
  - Implementado: `HumanaView`, `GestionDescuentosTabsView`, `HorasApiTestView`
  - Soporte adicional: `ProveedorHumanaView`, `MovimientosHumanaView`, `DescuentosView`
  - Placeholder: movilizaciones, e-rol, bonos, prestamos, celular, alimentacion, fondos, horas
- Contabilidad e integraciones:
  - Vista disponible: `BancosView` dentro del menu contable
  - Placeholder: resto de opciones
- Mantenimiento:
  - Placeholder en todas sus opciones actuales

## Estructura del proyecto

```txt
backend/                 API Express + SQL de soporte
public/                  activos estaticos
src/
  components/            modulos y componentes UI
  config/                constantes globales
  data/                  mock data
  services/              llamadas API y storage local
  styles/                estilos compartidos
  types/                 tipos TypeScript
```

Referencia extendida de estructura:

- `src/PROJECT_STRUCTURE.md`

## Documentacion por carpeta

- `backend/README.md`
- `src/components/operaciones/README.md`
- `src/components/pagos/README.md`
- `src/components/nomina/README.md`
- `src/components/contabilidad/README.md`
- `src/components/integraciones/README.md`
- `src/components/mantenimiento/README.md`
- `src/components/layout/README.md`
- `src/config/README.md`
- `src/data/README.md`
- `src/types/README.md`

## Convenciones

- Componentes: PascalCase
- Funciones y variables: camelCase
- Carpetas de modulos: minusculas
- Tipos compartidos: centralizados en `src/types/index.ts`
- Constantes compartidas: centralizadas en `src/config/index.ts`

## Notas

- Este README reemplaza al README base de Vite y pasa a ser la documentacion general del proyecto.
- `README_PROYECTO.md` se mantiene sincronizado como copia de referencia.
