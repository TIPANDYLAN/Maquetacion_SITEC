# 🏢 Portal SITEC - Sistema Integral de Tickets y Estacionamiento

> Sistema de gestión completo para parqueaderos Urbapark con módulos de operaciones, finanzas, nómina y más.

## 🚀 Quick Start

```bash
# Instalar dependencias
npm install

# Iniciar desarrollo
npm run dev

# Acceso
# http://localhost:5173
```

## ✨ Características Principales

### 📱 Módulos Implementados

| Módulo | Componentes | Estado |
|--------|-----------|--------|
| **Operaciones** | Tickets (Gestión + Justificación) | ✅ |
| **Pagos** | Transacciones, Bancos | ✅ |
| **Nómina** | Humana (Empleados), Proveedor | ✅ |
| **Contabilidad** | General, Reportes | ⏳ |
| **Integraciones** | APIs externas | ⏳ |
| **Mantenimiento** | Personal técnico, Recursos | ⏳ |

### 🎨 Diseño

- **Framework**: React 19 + TypeScript
- **Styling**: Tailwind CSS 3.4
- **Iconos**: Lucide React
- **Build**: Vite 7.3

## 📂 Estructura del Proyecto

```
src/
├── App.tsx                 # Aplicación principal
├── components/             # Componentes React
│   ├── commons/           # Compartidos (Placeholder, UploadButton)
│   ├── modals/            # Modales (Justification, History)
│   ├── pagos/             # Pagos y bancos
│   ├── nomina/            # Nómina y empleados
│   ├── operaciones/       # Operaciones (futuro)
│   ├── contabilidad/      # Contabilidad (futuro)
│   ├── integraciones/     # APIs (futuro)
│   ├── mantenimiento/     # Mantenimiento (futuro)
│   └── layout/            # Layout (futuro)
├── pages/                 # Páginas principales
├── data/                  # Mock data centralizada
├── config/                # Configuración global
├── types/                 # TypeScript interfaces
└── styles/                # CSS adicional
```

**Ver:** [PROJECT_STRUCTURE.md](./src/PROJECT_STRUCTURE.md) - Documentación completa

## 🎯 Componentes Principales

### ✅ Tickets (pages/Tickets.tsx)
- Tabla de tickets sin justificar
- Sistema de filtrado (parqueadero, fechas)
- Modal de justificación con campos dinámicos
- Historial de justificaciones
- 2 vistas: Gestión e Historial

### ✅ Pagos (pages/Pagos.tsx)
- Tabla de transacciones
- Filtros: pendientes/asignadas
- Búsqueda por TID
- Estados visuales

### ✅ Bancos (components/pagos/BancosView.tsx)
- Selector de franco icia (VISA, MASTERCARD, DINERS, AMEX, DISCOVER)
- Drag & drop file upload
- Historial con estados (Exitoso/Advertencia/Error)
- Carga con validación

### ✅ Humana (components/nomina/HumanaView.tsx)
- Tabla de empleados con cálculos automáticos
- Subtabs: Detalle (empleados) / Centros (agregado)
- Filtros por centro, plan, tarifa
- Cálculos: prima, asistencia, trabajador, total

### ✅ Proveedor Humana (components/nomina/ProveedorHumanaView.tsx)
- Upload de facturas Humana
- Historial con validaciones
- Interfaz idéntica a Bancos

## 🔧 Configuración

### Colores Corporativos
```ts
import { COLORS } from '@/config';

COLORS.primary     // #001F3F (Azul marino)
COLORS.secondary   // #FFCC00 (Amarillo)
```

### Constantes Globales
```ts
import { MENU_ITEMS, COMPANY, PARKING_LOTS } from '@/config';
```

### Tipos Centralizados
```ts
import { Ticket, Payment, EmpleadoHumana } from '@/types';
```

## 📊 Data

Toda la data mock está centralizadas en `src/data/mockData.ts`:

```ts
export const INITIAL_TICKETS_DATA = [...]
export const PAGOS_DATA = [...]
export const HUMANA_MOCK_DATA = [...]
export const PLANES = [...]
export const TARIFAS = [...]
export const JUSTIFICATION_GROUPS = {...}
```

## 🎨 Temas y Estilos

### Clases Tailwind Personalizadas

Ver `src/styles/components.css`:
- `.card-container` - Contenedor card base
- `.card-header` - Encabezado de card
- `.table-header` - Encabezado de tabla
- `.status-badge` - Badge de estado

## 📚 Documentación

- [PROJECT_STRUCTURE.md](./src/PROJECT_STRUCTURE.md) - Guía de carpetas
- [CAMBIOS.md](./CAMBIOS.md) - Resumen de cambios realizados
- [src/config/README.md](./src/config/README.md) - Configuración global
- [src/types/README.md](./src/types/README.md) - Tipos e interfaces
- [src/data/README.md](./src/data/README.md) - Mock data

## 🚀 Próximos Desarrollos

1. **Interfaz**: Extraer Sidebar y Header a componentes
2. **Componentes**: Implementar placeholders pendientes  
3. **API**: Conectar a backend real
4. **Tests**: Agregar test unitarios
5. **State**: Implementar Context/Zustand para estado global
6. **Performance**: Optimizar re-renders con memo/useMemo

## 🤝 Convenciones

### Código
- **Componentes**: `PascalCase` (ej: `HumanaView`)
- **Archivos**: Mismo nombre del componente
- **Props**: `{ComponentName}Props` interface
- **Funciones**: `camelCase` (ej: `handleTicketUpdate`)

### Carpetas
- **Minúsculas**: `components/pagos`, `components/nomina`
- **Plural** cuando contiene varios: `components` (✓), `component` (✗)

### Estilos
- Tailwind CSS primariamente
- Custom clases en `styles/components.css`
- Colores desde `config/index.ts`

## 📞 Soporte

Para preguntas sobre la estructura o componentes:
1. Ver [PROJECT_STRUCTURE.md](./src/PROJECT_STRUCTURE.md)
2. Revisar README en la carpeta del componente
3. Consultar archivos de componente similar

---

**Última actualización**: Marzo 5, 2026  
**Versión**: 1.0  
**Autor**: Portal SITEC Team
