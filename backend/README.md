# Backend Humana (PostgreSQL)

Servicio Express para guardar y consultar data de Humana por periodo (`anio` + `mes`) usando la tabla `medic_secure_humana`.

## Variables de entorno

- `BACKEND_PORT` (opcional, default `4000`)
- `PGHOST` (default `localhost`)
- `PGPORT` (default `5432`)
- `PGDATABASE` (default `postgres`)
- `PGUSER` (default `postgres`)
- `PGPASSWORD` (default `postgres`)

## Crear tabla

Ejecuta el SQL en `backend/sql/create_humana_period_data.sql`.

## Levantar backend

```bash
npm run dev:backend
```

## Campos principales solicitados en DB

- `mes`
- `anio`
- `empleado`
- `centro`
- `plan`
- `tarifa`
- `trabajador_rol`
- `urbapark`
- `prima`
- `ajuste`
- `assist`
- `seguro`
- `f_ingreso`
- `f_exclusion`

## Endpoints

- `GET /health`
- `GET /api/humana/periods`
- `GET /api/humana/periods/:anio/:mes`
- `PUT /api/humana/periods/:anio/:mes`
  - Body JSON:
  ```json
  {
    "archivo": "FACTURA.csv + MOVIMIENTOS.csv",
    "empleados": []
  }
  ```
