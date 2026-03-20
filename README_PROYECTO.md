# Portal SITEC

Sistema interno de Urbapark para operaciones, pagos, nomina y procesos administrativos.

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

Frontend: http://localhost:5173

Backend (para Humana, descuentos, valets y exentos):

```bash
npm run dev:backend
```

Backend: http://localhost:4000

## Scripts

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`
- `npm run dev:backend`
- `npm run start:backend`

## Estado funcional actual

- Operaciones:
	- Implementado: `TicketsView`
	- Placeholder: matriculas, bicicletas, ocupacion
- Pagos y facturacion:
	- Implementado: `PagosView`, `BancosView`
	- Placeholder: boletas, facturas, niubiz, agora, izipay, presupuestos, cajas chicas
- Nomina:
	- Implementado: `HumanaView`, `GestionDescuentosTabsView`
	- Subvistas activas: `ProveedorHumanaView`, `MovimientosHumanaView`, `DescuentosView`, `ExentosPagoSeguroView`, `ValetsFijosView`
	- Eliminado: `HorasApiTestView` (vista de prueba retirada)
	- Placeholder: movilizaciones, e-rol, bonos, prestamos, celular, alimentacion, fondos, horas
- Contabilidad:
	- Vista disponible en menu: `BancosView`
	- Resto en placeholder
- Integraciones y mantenimiento:
	- Opciones de menu en placeholder

## Cambios estructurales recientes

- APIs separadas por dominio:
	- `src/services/n8nApi.ts` para n8n
	- `src/services/dbApi.ts` para backend propio
- Limpieza de servicios obsoletos:
	- eliminado `src/services/humanaApi.ts`
	- eliminado `src/services/humanaStorage.ts`
- Tipos compartidos movidos a:
	- `src/types/humana.ts`
	- `src/types/nomina.ts`
- Rutas backend estandarizadas:
	- valets en `/api/valets/*`
	- exentos en `/api/descuentos/exentos-pago-seguro`
- Retiro del proxy `get-with-body` y su middleware en Vite

## Estructura

```txt
backend/                 API Express + SQL
public/                  activos estaticos
src/
	components/            vistas y componentes UI
	config/                constantes globales
	data/                  datos de soporte y mocks
	services/              integraciones API
	styles/                estilos compartidos
	types/                 tipos TypeScript compartidos
```

Detalle: `src/PROJECT_STRUCTURE.md`

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

## Nota

Este archivo se mantiene sincronizado con `README.md`.
