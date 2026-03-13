# Backend (Express + PostgreSQL)

Servicio API para:

- Consultas y carga de periodos Humana.
- Soporte de incidencias/descuentos de nomina.

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
- `alter_medic_secure_humana_to_8_decimals.sql`

El backend tambien valida/crea estructura necesaria al iniciar para la tabla de incidencias de descuentos.

## Endpoints principales

- `GET /health`
- `GET /api/humana/periods`
- `GET /api/humana/periods/:anio/:mes`
- `GET /api/humana/employee-latest?empleado=...`
- Endpoints de descuentos de nomina (ver implementacion en `server.js`)

## Notas de integracion

- El frontend consume este backend para operaciones de Humana y gestion de descuentos.
- Si no hay backend disponible, partes del frontend operan con datos mock.
