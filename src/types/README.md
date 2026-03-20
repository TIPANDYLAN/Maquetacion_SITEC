# Tipos compartidos

Definiciones TypeScript comunes para mantener consistencia entre componentes, servicios y mocks.

## Archivos principales

- `index.ts`
- `humana.ts`
- `nomina.ts`

## Tipos destacados recientes

- Humana:
	- `HumanaEmployeeData`
	- `HumanaDataByPeriod`
- Nomina:
	- `EmpleadoNominaApiItem`
	- `EmpleadoNominaApiPayload`
	- `NominaCentroCosto`
	- `NominaApiResponseBase`
	- `NominaApiRecordResponse`
	- `NominaApiListResponse`
	- `NominaApiRecordAndListResponse`

## Recomendaciones

- Definir aqui interfaces reutilizables por mas de un modulo.
- Preferir tipos explicitos antes que `any`.
- Cuando cambie la estructura de un endpoint, ajustar tipo y consumo en el mismo cambio.
