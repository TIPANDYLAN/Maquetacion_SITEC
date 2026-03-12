# Data y Mock Data

Datos centralizados para toda la aplicación, incluyendo datos mock para desarrollo/testing.

## Archivos

- **mockData.ts** - Todos los datos mock para el desarrollo

## Constantes exportadas

- **INITIAL_PARKING_LOTS** - Lista de parqueaderos
- **INITIAL_TICKETS_DATA** - Tickets de ejemplo
- **JUSTIFICATION_GROUPS** - Grupos de justificación con estructura jerárquica
- **EQUIPOS_LIST** - Equipos de entrada/salida
- **PAGOS_DATA** - Transacciones de pago
- **HUMANA_MOCK_DATA** - Empleados con pólizas
- **PLANES** - Planes de seguro
- **TARIFAS** - Tarifas de seguros

## Estructura de datos

### Ticket
```ts
{
  id: string;
  numero: string;
  equipoEntrada: string;
  fecha: string;
  matricula: string;
  estado: string;
}
```

### Empleado Humana
```ts
{
  id: string;
  nombre: string;
  cedula: string;
  centro: string;
  plan: string;
  prima: number;
}
```

## Próximos pasos

- Reemplazar mock data con llamadas API reales
- Implementar store centralizado (Context, Zustand, Redux)
- Agregar cache de datos
