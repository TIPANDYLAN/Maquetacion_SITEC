# Estructura del Proyecto Portal SITEC

## 📂 Organización General

```
src/
├── App.tsx                          # Componente principal (layout + routing)
├── main.tsx                         # Entrada de la aplicación
├── index.css                        # Estilos globales + tailwind
│
├── pages/                           # Páginas principales
│   ├── Tickets.tsx                 # Gestión de tickets
│   └── Pagos.tsx                   # Transacciones de pago
│
├── components/                      # Componentes reutilizables
│   ├── layout/                     # Componentes de estructura
│   │   ├── Sidebar.tsx             # [FUTURO] Barra lateral extraída
│   │   └── Header.tsx              # [FUTURO] Encabezado extraído
│   │
│   ├── commons/                    # Componentes compartidos
│   │   ├── Placeholder.tsx         # Placeholder para secciones vacías
│   │   └── UploadButton.tsx        # Botón de carga reutilizable
│   │
│   ├── modals/                     # Componentes modal
│   │   ├── JustificationModal.tsx  # Modal para justificar tickets
│   │   └── HistoryDetailModal.tsx  # Modal de historial de tickets
│   │
│   ├── operaciones/                # Módulo Operaciones
│   │   ├── Matriculas.tsx          # [FUTURO]
│   │   ├── Bicicletas.tsx          # [FUTURO]
│   │   └── Ocupacion.tsx           # [FUTURO]
│   │
│   ├── pagos/                      # Módulo Pagos y Facturación
│   │   ├── BancosView.tsx          # Conciliación de tarjetas bancarias
│   │   ├── Presupuestos.tsx        # [FUTURO]
│   │   └── CajasChicas.tsx         # [FUTURO]
│   │
│   ├── nomina/                     # Módulo Nómina
│   │   ├── HumanaView.tsx          # Gestión de seguros Humana
│   │   └── ProveedorHumanaView.tsx # Upload de facturas Humana
│   │
│   ├── contabilidad/               # Módulo Contabilidad
│   │   ├── General.tsx             # [FUTURO] Contabilidad general
│   │   └── Reportes.tsx            # [FUTURO] Reportes
│   │
│   ├── integraciones/              # Módulo Integraciones
│   │   ├── Meypar.tsx              # [FUTURO] API Meypar
│   │   └── TGW.tsx                 # [FUTURO] Gateway TGW
│   │
│   └── mantenimiento/              # Módulo Mantenimiento
│       ├── Plantilla.tsx           # [FUTURO]
│       ├── Tecnicos.tsx            # [FUTURO]
│       └── Parqueaderos.tsx        # [FUTURO]
│
├── data/                           # Datos mock y constantes
│   └── mockData.ts                # Toda la data centralizada
│
├── styles/                         # Estilos adicionales
│   └── components.css             # Clases tailwind personalizadas
│
└── assets/                         # Recursos estáticos
    ├── icons/                      # [FUTURO] Iconos custom
    └── images/                     # [FUTURO] Imágenes
```

## 📋 Guía de Componentes Implementados

### ✅ Completados

| Componente | Ubicación | Estado | Descripción |
|-----------|-----------|--------|-----------|
| TicketsView | pages/ | Completo | Sistema de justificación de tickets con modals |
| PagosView | pages/ | Completo | Tabla de transacciones de pago |
| HumanaView | components/nomina | Completo | Gestión de empleados con cálculos de seguros |
| ProveedorHumanaView | components/nomina | Completo | Upload de facturas de Humana |
| BancosView | components/pagos | Completo | Reconciliación de tarjetas bancarias |
| Placeholder | components/commons | Completo | Placeholder reutilizable |
| JustificationModal | components/modals | Completo | Modal para justificar tickets |
| HistoryDetailModal | components/modals | Completo | Modal de historial |
| UploadButton | components/commons | Completo | Botón upload reutilizable |

### ⏳ Pendientes

- [ ] layout/Sidebar.tsx - Extraer lógica de sidebar de App.tsx
- [ ] layout/Header.tsx - Extraer lógica de header de App.tsx
- [ ] operaciones/* - Crear placeholders o componentes reales
- [ ] contabilidad/* - Crear placeholders o componentes reales
- [ ] integraciones/* - Crear placeholders o componentes reales
- [ ] mantenimiento/* - Crear placeholders o componentes reales

## 🎯 Convenciones

### Nomenclatura
- **Carpetas**: `minúscula` (ej: operaciones, pagos, nomina)
- **Componentes**: `PascalCase` (ej: TicketsView, HumanaView)
- **Props Interfaces**: `{ComponentName}Props` (ej: BancosViewProps)

### Estructura de Componentes
```tsx
import { useState, useEffect, useMemo } from 'react';
import { IconName } from 'lucide-react';
import { DATA } from '../../data/mockData';

interface ComponentNameProps {
    prop1?: string;
}

const ComponentName = ({ prop1 }: ComponentNameProps) => {
    // Estado
    const [state, setState] = useState('');
    
    // Efectos
    useEffect(() => {}, []);
    
    // Renderizado
    return <div>...</div>;
};

export default ComponentName;
```

### Estilos
- Usar Tailwind CSS primariamente
- Clases custom en `src/styles/components.css` para patrones reutilizables
- Colores corporativos:
  - Primary: `#001F3F` (azul marino)
  - Secondary: `#FFCC00` (amarillo)

## 🔄 Data Flow

Toda la data centralizada en `src/data/mockData.ts`:

```typescript
export const PAGOS_DATA = [];
export const INITIAL_TICKETS_DATA = [];
export const HUMANA_MOCK_DATA = [];
export const PLANES = [];
export const TARIFAS = [];
export const JUSTIFICATION_GROUPS = {};
```

## 🚀 Próximos Pasos

1. **Refactor**: Extraer Sidebar y Header de App.tsx a componentes separados
2. **Implementar**: Componentes restantes de operaciones/contabilidad/etc
3. **Testing**: Agregar tests unitarios
4. **Routing**: Considerar agregar react-router-dom si se necesita
5. **State Management**: Evaluar necesidad de Context API o Redux

