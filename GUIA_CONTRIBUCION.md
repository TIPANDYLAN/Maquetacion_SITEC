# 📖 Guía de Contribución - Portal SITEC

## ¿Cómo agregar un nuevo componente?

### 1. **Identifica el módulo correcto**

Pregúntate: ¿A dónde pertenece?

- ¿Operaciones? → `src/components/operaciones/`
- ¿Pagos? → `src/components/pagos/`
- ¿Nómina? → `src/components/nomina/`
- ¿General? → `src/components/commons/`
- ¿Modal? → `src/components/modals/`

### 2. **Crea el archivo del componente**

Estructura básica recomendada:

```tsx
// src/components/{modulo}/{NombreComponente}.tsx

import { useState, useEffect, useMemo } from 'react';
import { IconName } from 'lucide-react';
import { DATA_CONSTANT } from '@/data/mockData';
import { TipoInterface } from '@/types';
import SomeComponent from './SomeComponent';

interface NombreComponenteProps {
    titulo?: string;
    onAction?: (data: any) => void;
}

const NombreComponente = ({ titulo = 'Default', onAction }: NombreComponenteProps) => {
    // Estado
    const [state, setState] = useState('');
    
    // Efectos
    useEffect(() => {
        // Lógica de inicialización
    }, []);
    
    // Handlers
    const handleClick = () => {
        // ...
    };
    
    // Renderizado
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <IconName size={24} />
                </div>
                <h2 className="text-2xl font-black text-slate-800">{titulo}</h2>
            </div>
            
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                {/* Contenido aquí */}
            </div>
        </div>
    );
};

export default NombreComponente;
```

### 3. **Usa las constantes correctas**

```tsx
import { COLORS, PARKING_LOTS, MENU_ITEMS } from '@/config';
import { Ticket, Payment } from '@/types';

// ✅ Bien
const color = COLORS.primary;

// ❌ Evitar
const color = '#001F3F';
```

### 4. **Centraliza los tipos**

Si necesitas tipos nuevos, agrégatlos a `src/types/index.ts`:

```ts
export interface MiNuevoTipo {
    id: string;
    nombre: string;
    // ...
}
```

### 5. **Datos mock en mockData.ts**

Todos los datos van a `src/data/mockData.ts`:

```ts
export const MI_NUEVA_DATA = [
    { id: '1', nombre: 'Item 1' },
    { id: '2', nombre: 'Item 2' },
];
```

### 6. **Integra en App.tsx**

```tsx
// 1. Import
import MiComponente from './components/{modulo}/MiComponente';

// 2. Agregar a MenuState si es necesario
interface MenuState {
    mi_seccion?: boolean;
    // ...
}

// 3. Agregar tab en comparación
{activeTab === 'mi_tab' && <MiComponente />}

// 4. Agregar al nav
<button onClick={() => setActiveTab('mi_tab')}>Mi Sección</button>
```

## 📋 Checklist antes de commitear

- [ ] Componente compila sin errores
- [ ] Está tipado correctamente con TypeScript
- [ ] Usa constantes de `config/` para colores, datos, etc.
- [ ] Usa tipos de `types/`
- [ ] Exporta por default
- [ ] Tiene interfaz `{ComponentName}Props`
- [ ] Está documentado (comentarios en lógica compleja)
- [ ] Sigue convenciones de nombre
- [ ] No repite código (reutiliza commons, modals, etc.)
- [ ] Integrado en App.tsx correctamente
- [ ] Funciona visualmente con la paleta de colores

## 🎨 Estilos

### Espaciado
```tsx
// Prefer
<div className="space-y-4">   {/* Spacing entre elementos */}
<div className="p-6">         {/* Padding interno */}
<div className="mb-2">        {/* Margin bottom */}

// Valores comunes
space-y-2, space-y-4, space-y-6, space-y-8
p-2, p-4, p-6, p-8
mb-2, mb-4, mb-6, mb-8
```

### Borde y Sombra
```tsx
// Cards base
<div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">

// Inputs
<input className="px-3 py-2 border border-slate-200 rounded-lg" />

// Botones
<button className="px-4 py-2 bg-[#001F3F] text-white rounded-lg font-bold" />
```

### Animaciones
```tsx
// Entry animation para componentes principales
<div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

// Hover effects
<div className="hover:bg-slate-50 transition-colors">

// Active states
<button className="active:scale-95">
```

## 🎯 Ejemplos a seguir

### Bien organizado
- `src/components/pagos/BancosView.tsx` - Estructura clara, bien tipado
- `src/components/nomina/HumanaView.tsx` - Lógica compleja bien manejada
- `src/pages/Tickets.tsx` - Modals integradores

### Reutilizable
- `src/components/commons/Placeholder.tsx` - Simple y flexible
- `src/components/commons/UploadButton.tsx` - Props bien documentadas
- `src/components/modals/` - Modales reutilizables

## ❌ Anti-patrones

```tsx
// ❌ No hagas esto:

// Hardcodear valores
const color = '#001F3F';

// Reprogramar lógica común
const estado = estado === 'Exitoso' ? 'bg-green-50' : 'bg-red-50';
// → Usa getEstadoColor() o similar

// Tipos implícitos
const data = [...];  // ¿Qué tipo es?

// Componentes demasiado grandes
// → Divídelo en sub-componentes

// Lógica en JSX
{items.map((item) => {
    const x = calculate();
    return <div>{x}</div>;
})}
// → Usa useMemo, extraer a función
```

## ✅ Buenas prácticas

```tsx
// ✅ Sí, haz esto:

// Usar constantes
import { COLORS } from '@/config';
const color = COLORS.primary;

// Tipos explícitos
const data: Ticket[] = mockData;

// Nombres descriptivos
const isTicketEditable = status !== 'Resuelto';
const handleJustificationSubmit = () => {};

// Separar lógica en funciones
const getStatusColor = (status: string) => {
    return statusColorMap[status] || 'default';
};

// Usar hooks efectivamente
const filteredItems = useMemo(() => {
    return items.filter(item => matchesFilter(item));
}, [items, filters]);

// Props bien documentadas
interface DataTableProps {
    /** Datos a mostrar en la tabla */
    data: Item[];
    /** Callback cuando se selecciona un item */
    onSelect?: (item: Item) => void;
}
```

## 🆘 Dudas frecuentes

**P: ¿Dónde pongo los colores personalizados?**
R: `src/config/index.ts` → `COLORS` constante

**P: ¿Cómo reutilizo un modal?**
R: Ver `src/components/modals/` y importar en tu componente

**P: ¿Necesito agregar el componente a mockData.ts?**
R: Solo si genera datos. Si consumes datos existentes, no.

**P: ¿Puedo usar otra librería de UI?**
R: Usa Tailwind CSS. Para componentes especiales, coordina antes.

**P: ¿Qué pasa con react-router-dom?**
R: Estamos usando estado en App.tsx. Habrá migración eventual.

---

**Necesitas algo más?** Ve a [README_PROYECTO.md](./README_PROYECTO.md) o [PROJECT_STRUCTURE.md](./src/PROJECT_STRUCTURE.md)
