# Backend (Express + PostgreSQL)

Servicio API para:

- Consultas y carga de periodos Humana.
- Gestion de descuentos de nomina.
- Gestion de exentos de pago de seguro.
- Gestion de distribucion por plantillas.
- Gestion de valets (empleados, horarios y adicionales).

## Requisitos

- Node.js 18+
- PostgreSQL accesible desde la maquina local

## Variables de entorno

- `BACKEND_PORT` (opcional, default: `4000`)
- `PGHOST` (default: `localhost`)
- `PGPORT` (default: `5432`)
- `PGDATABASE` (default: `postgres`)
- `PGUSER` (default: `postgres`)
- `PGPASSWORD` (default: `postgres`)

## Levantar backend

Desde la raiz del proyecto:

```bash
npm run dev:backend
```

Salud del servicio:

```txt
GET http://localhost:4000/health
```

## SQL y tablas

Scripts utiles en `backend/sql/`:

- `create_humana_period_data.sql`
- `create_descuentos_nomina_table.sql`
- `create_humana_exentos_pago_seguro_table.sql`
- `create_nomina_valets_adicionales_table.sql`
- `create_valet_fijo_empleado_table.sql`
- `create_valet_fijo_horario_table.sql`

El backend valida/crea estructura necesaria al iniciar para tablas de descuentos, exentos y valets.

## Endpoints principales

- `GET /health`
- `GET /api/humana/periods`
- `GET /api/humana/periods/:anio/:mes`
- `GET /api/humana/employee-latest?empleado=...`
- `GET /api/descuentos/incidentes-caja-chica`
- `POST /api/descuentos/incidentes-caja-chica`
- `PATCH /api/descuentos/incidentes-caja-chica/:id/estado`
- `GET /api/descuentos/exentos-pago-seguro`
- `POST /api/descuentos/exentos-pago-seguro`
- `GET /api/nomina/distribucion-plantillas`
- `POST /api/nomina/distribucion-plantillas`
- `DELETE /api/nomina/distribucion-plantillas/:plantillaId`
- `GET /api/nomina/distribucion-plantillas-empleados`
- `POST /api/nomina/distribucion-plantillas-empleados`
- `DELETE /api/nomina/distribucion-plantillas-empleados/:plantillaId/:empleadoId`
- `GET /api/valets/empleados`
- `POST /api/valets/empleados`
- `DELETE /api/valets/empleados`
- `GET /api/valets/horarios`
- `POST /api/valets/horarios`
- `GET /api/valets/adicionales`
- `GET /api/valets/adicionales/lista`
- `POST /api/valets/adicionales`

## Notas de integracion

- El frontend consume este backend mediante `src/services/dbApi.ts`.
- En desarrollo se recomienda usar el proxy de Vite para rutas `/api/humana`, `/api/descuentos`, `/api/nomina` y `/api/valets`.
