export const PAGOS_DATA = [
    { fecha: '2024/01/25', ref: '00123', aut: '987654', lote: '001', tid: 'TID-001', monto: '$25.00', forma: 'VISA', factura: 'F-00123' },
    { fecha: '2024/01/25', ref: '00124', aut: '987655', lote: '001', tid: 'TID-002', monto: '$12.50', forma: 'MASTERCARD', factura: 'F-00124' },
    { fecha: '2024/01/24', ref: '00125', aut: '987656', lote: '002', tid: 'TID-003', monto: '$45.00', forma: 'DINERS', factura: 'F-00125' },
    { fecha: '2024/01/24', ref: '00126', aut: '987657', lote: '002', tid: 'TID-004', monto: '$8.00', forma: 'VISA', factura: 'F-00126' },
];

export const INITIAL_TICKETS_DATA = [
    { id: '576412', equipo: 'Entrada 4 - A McDonalds', fecha: '2025-02-20 08:30', matricula: 'PDP-2368', lpr: 'LPR-OK', foto_perimetral: 'placeholder', estado: 'Pagado', equipo_estado: 'Caja 1', fecha_estado: '2025-02-20 10:15' },
    { id: '449827', equipo: 'Entrada 3 - A McDonalds', fecha: '2025-02-20 09:15', matricula: 'PDS-2074', lpr: 'LPR-OK', foto_perimetral: 'placeholder', estado: 'Validado', equipo_estado: 'Caja/Supermaxi', fecha_estado: '2025-02-20 11:00' },
    { id: '449824', equipo: 'Entrada 3 - D', fecha: '2025-02-20 09:45', matricula: 'PCX-9012', lpr: 'FAIL', foto_perimetral: 'placeholder', estado: 'Entrada', equipo_estado: 'Entrada 3 - D', fecha_estado: '2025-02-20 09:45' },
    { id: '534252', equipo: 'Entrada 4-D Motos', fecha: '2025-02-20 10:00', matricula: 'MTO-087', lpr: 'LPR-OK', foto_perimetral: 'placeholder', estado: 'Entrada', equipo_estado: 'Entrada 4-D Motos', fecha_estado: '2025-02-20 10:00' },
    { id: '534222', equipo: 'Entrada 1-D Bancos', fecha: '2025-02-20 10:00', matricula: 'JPJ-081', lpr: 'LPR-OK', foto_perimetral: 'placeholder', estado: 'Entrada', equipo_estado: 'Entrada 4-D Motos', fecha_estado: '2025-02-20 10:00' },
];

export const JUSTIFICATION_GROUPS = {
    "Falla lectura placa": ["Placa de papel", "Placa deteriorada", "Placa alterada", "Placa fuera de la ubicacion", "Sin placa", "Otras"],
    "Eventos Operativos Controlados": ["Orden manual", "Parqueadero lleno", "Vehiculo de emergencias", "Apertura con sellos", "Vehiculo/Moto detras de otro", "Salida de Invitado o Proveedor", "Otros"],
    "Fallas del sistema": ["Ticket Fraudulento", "Doble emision de ticket", "Falla de sincronizacion", "Valla que no baja"],
    "No Justificado": ["Error Operativo del operador", "Incumplimiento de procedimiento", "Falta de riesgo de pago", "Motocicletas en parqueaderos donde si aplica cobro sin evidencia de pago", "Uso indebido de autorización", "Omisión de cierre de ticket", "Otros"]
};

export const EQUIPOS_LIST = ["Entrada 1 - B Etafashion", "Entrada 4 - A McDonalds", "Entrada 1 - D", "Entrada 3 - A McDonalds", "Entrada 2 - D", "TPM OFICINA", "Entrada 3 - D", "TPM", "Entrada 1 - A McDonalds", "Entrada 2 - A McDonalds", "Entrada 4-D Motos", "Salida 1 - B Etafashion", "Salida - C Kywi", "Salida 1- D", "Salida 2- D", "Salida Azul 11 - Motos", "Salida - S1 Megamaxi", "Salida 1 - S2 Megamaxi", "Salida 2 - S2 Megamaxi", "Salida 3 - S2 Megamaxi"];

export const SYSTEM_ERRORS = ["Lentitud en el sistema", "Caída del sistema", "Desgaste de sensores", "Fallas de luz", "Fallas mecánicas"];

export const PARKING_LOTS = ["Parqueadero Central", "Parqueadero Sur", "Parqueadero Norte", "Parqueadero Este"];

export const PLANES = {
    "Plan 5": { primaBase: 18.37, assist: 1 },
    "Plan 10": { primaBase: 47.23, assist: 2.5 }
};

export const TARIFAS = {
    "T": { adicionales: 0, familiares: 1 },
    "T + 1": { adicionales: 18.56, familiares: 2 },
    "T + Familia": { adicionales: 37.11, familiares: 4 }
};

export const HUMANA_MOCK_DATA = [
    {
        nombre: "MANOBANDA BARAJA MANUEL",
        centroCosto: "ADMINISTRACION",
        plan: "Plan 5",
        tarifa: "T",
        ajuste: 0,
        anio: 2025,
        mes: "Enero"
    },
    {
        nombre: "VEGA GALLO DIEGO",
        centroCosto: "OPERACIONES",
        plan: "Plan 10",
        tarifa: "T + 1",
        ajuste: 5,
        anio: 2025,
        mes: "Enero"
    },
    {
        nombre: "RODRIGUEZ NAVARRO MARGARITA",
        centroCosto: "SUPERMAXI 12 DE OCTUBRE",
        plan: "Plan 5",
        tarifa: "T + Familia",
        ajuste: 0,
        anio: 2025,
        mes: "Enero"
    },
];
