/**
 * Configuración global de la aplicación
 */

// 🎨 Colores corporativos
export const COLORS = {
    primary: '#001F3F',    // Azul marino
    secondary: '#FFCC00',  // Amarillo
    success: '#10B981',    // Verde
    warning: '#F59E0B',    // Naranja
    error: '#EF4444',      // Rojo
    slate: {
        50: '#F8FAFC',
        100: '#F1F5F9',
        200: '#E2E8F0',
        300: '#CBD5E1',
        400: '#94A3B8',
        500: '#64748B',
        600: '#475569',
        700: '#334155',
        800: '#1E293B',
        900: '#0F172A',
    }
} as const;

// 📱 Breakpoints
export const BREAKPOINTS = {
    xs: '0px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
} as const;

// 🔷 Tipos de estado
export const STATUS = {
    EXITOSO: 'Exitoso',
    ADVERTENCIA: 'Advertencia',
    ERROR: 'Error',
    PENDIENTE: 'Pendiente',
} as const;

// 📊 Menú principal
export const MENU_ITEMS = [
    {
        id: 'operaciones',
        label: 'Operaciones',
        items: ['tickets', 'matriculas', 'bicicletas', 'ocupacion']
    },
    {
        id: 'pagos_facturacion',
        label: 'Pagos y Facturación',
        items: ['pagos', 'boletas', 'facturas', 'bancos', 'presupuestos', 'cajas_chicas']
    },
    {
        id: 'nomina',
        label: 'Nómina',
        items: ['movilizaciones', 'erol', 'bonos', 'prestamos', 'celular', 'alimentacion', 'fondos', 'descuentos', 'horas', 'proveedor_humana', 'humana']
    },
    {
        id: 'contabilidad',
        label: 'Contabilidad',
        items: ['contab_general', 'contab_reportes']
    },
    {
        id: 'integraciones',
        label: 'Integraciones y APIs',
        items: ['api_meypar', 'api_tgw']
    },
    {
        id: 'mantenimiento',
        label: 'Mantenimiento',
        items: ['mant_plantilla', 'mant_tecnicos', 'mant_parqueaderos']
    }
] as const;

// 🏢 Información de empresa
export const COMPANY = {
    name: 'Urbapark',
    email: 'admin@urbapark.com',
    logo: 'SITEC',
} as const;

// 🕐 Formatos
export const FORMATS = {
    dateTime: 'dd/MM/yyyy HH:mm',
    date: 'dd/MM/yyyy',
    currency: 'COP',
} as const;

// 📍 Parqueaderos
export const PARKING_LOTS = [
    'Parqueadero Central',
    'Parqueadero Sur',
    'Parqueadero Norte',
    'Parqueadero Este',
    'Parqueadero Oeste',
] as const;
