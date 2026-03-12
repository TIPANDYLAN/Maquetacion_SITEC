# Tipos e Interfaces

Definiciones centralizadas de tipos TypeScript para toda la aplicación.

## Archivos

- **index.ts** - Tipos para Tickets, Payments, Empleados, Usuarios, etc.

## Interfaces principales

1. **Ticket** - Sistema de tickets con justificación
2. **JustificationData** - Datos de justificación de tickets
3. **Payment** - Transacciones de pago
4. **EmpleadoHumana** - Empleado con póliza
5. **CentroCosto** - Centro de costo agregado
6. **UploadData** - Información de uploads
7. **User** - Usuario del sistema
8. **Statistics** - Estadísticas generales

## Cómo usar

```tsx
import { Ticket, Payment } from '@/types';

const handleTicket = (ticket: Ticket) => {
  // ...
};
```
