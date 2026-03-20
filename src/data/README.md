# Datos y mocks

Datos de desarrollo utilizados por vistas y componentes mientras no exista integracion completa con backend.

## Archivo principal

- `mockData.ts`

## Conjuntos de datos frecuentes

- Tickets y justificaciones
- Pagos y transacciones
- Humana (empleados, planes, tarifas)
- Listas auxiliares (equipos, parqueaderos)

## Uso recomendado

- Importar solo la constante necesaria por componente.
- Mantener forma de datos compatible con los tipos de `src/types`.
- Evitar logica de negocio compleja dentro de esta carpeta.

## Siguiente etapa

Migrar progresivamente estos datos a llamadas API en `src/services`.

## Nota de estado

- Nomina y descuentos ya consumen mayormente APIs reales (`dbApi` y `n8nApi`).
- Este directorio sigue siendo util para escenarios sin backend o prototipos de nuevas vistas.
