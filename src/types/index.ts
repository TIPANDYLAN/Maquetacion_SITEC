/**
 * Tipos e interfaces compartidas a través de la aplicación
 */

// 🎫 Ticket
export interface Ticket {
    id: string;
    numero: string;
    equipoEntrada: string;
    fecha: string;
    matricula: string;
    lpr: string;
    fotoPerimetral?: string;
    estado: 'Pendiente' | 'Justificado' | 'Resuelto';
    equipoEstado: string;
    fechaEstado: string;
    justificationData?: JustificationData;
}

// 📋 Justificación de ticket
export interface JustificationData {
    group: string;
    reason: string;
    description?: string;
    equipment?: string;
    systemError?: string;
    incidentCheck?: boolean;
    uploads?: Record<string, { fileName: string; status: 'pending' | 'done' }>;
}

// 💳 Pago
export interface Payment {
    id: string;
    fechaTrx: string;
    ref: string;
    aut: string;
    lote: string;
    tid: string;
    monto: number;
    formaDePago: string;
    numFactura: string;
}

// 👤 Empleado Humana
export interface EmpleadoHumana {
    id: string;
    nombre: string;
    cedula: string;
    centro: string;
    plan: string;
    tarifa: string;
    prima: number;
    asistir: number;
    trabajador: number;
    seguroCampesino: number;
    totalFactura: number;
    urbapark: number;
}

// 🏢 Centro de costo
export interface CentroCosto {
    id: string;
    nombre: string;
    empleados: EmpleadoHumana[];
    totalPrima: number;
    totalTrabajador: number;
    totalUrbapark: number;
    totalFactura: number;
}

// 📁 Upload
export interface UploadData {
    archivo: string;
    fecha: string;
    total: number;
    duplicados: number;
    cargados: number;
    estado: 'Exitoso' | 'Advertencia' | 'Error';
}

// 🔐 Usuario
export interface User {
    id: string;
    nombre: string;
    email: string;
    rol: 'admin' | 'operador' | 'supervisor';
    empresa: string;
    activo: boolean;
}

// 📊 Estadísticas
export interface Statistics {
    ticketsTotal: number;
    ticketsPendientes: number;
    ticketsResueltos: number;
    pagosTotal: number;
    saldoPendiente: number;
}
