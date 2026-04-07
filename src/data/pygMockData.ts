import type { CuentaPyG } from '../types';

// 🏢 Lista de parqueaderos/proyectos
export const PARKING_LOTS = [
    "18 de Septiembre", "Aeropuerto", "Aguacate Rumiñahui", "Astecnia", "Avalon Plaza",
    "Centro Comercial El Bosque", "Centro Comercial El Recreo", "Centro Comercial La Y",
    "Centro Comercial Mall del Sol", "Centro Comercial Mall El Jardin",
    "Centro Comercial Naciones Unidas", "Centro Comercial Paseo San Francisco",
    "Centro Comercial Policentro", "Centro Comercial Real Plaza", "Centro Comercial Scala",
    "Ciudad Milenium", "Clinica Pasteur", "Hotel Colon", "Hotel LeParc", "Hotel Marriot",
    "Hotel Quito", "Hotel Swissotel", "Supermaxi 12 de Octubre", "Supermaxi San Gabriel",
    "Torre Milenium", "Village Plaza"
];

// 📊 Datos iniciales de Ingresos PyG
export const INITIAL_PYG_INGRESOS: CuentaPyG[] = [
    { codigo: '4', descripcion: 'INGRESOS', tipo: 'titulo', total: '7.208,27' },
    { codigo: '4.1', descripcion: 'Hora o Fraccion', tipo: 'cuenta', total: '5.991,75' },
    { codigo: '4.2', descripcion: 'Mensualidades', tipo: 'cuenta', total: '1.000,00' },
    { codigo: '4.3', descripcion: 'Igor', tipo: 'cuenta', total: '216,52' },
    { codigo: '4.4', descripcion: '', tipo: 'cuenta', total: '-' },
    { codigo: '4.5', descripcion: '', tipo: 'cuenta', total: '-' },
];

// 📊 Datos iniciales de Gastos PyG
export const INITIAL_PYG_GASTOS: CuentaPyG[] = [
    { codigo: '5', descripcion: 'GASTOS', tipo: 'titulo', total: '2.606,09' },
    { codigo: '5.1', descripcion: 'Nomina, uniformes, capacitacion y SSO', tipo: 'grupo', total: '1.604,69' },
    { codigo: '5.2', descripcion: 'Suministros de operación, seguros, aseo y limpieza', tipo: 'grupo', total: '102,11' },
    { codigo: '5.3', descripcion: 'Gasto de mantenimiento operación (scooters, mobiliario, infraestructura)', tipo: 'grupo', total: '-' },
    { codigo: '5.4', descripcion: 'Servicio de software, nube, enlaces, internet, radios y conectividad', tipo: 'grupo', total: '76,99' },
    { codigo: '5.5', descripcion: 'Servicios Básicos (energía eléctrica)', tipo: 'grupo', total: '4,00' },
    { codigo: '5.6', descripcion: 'Alquiler datafast y comisión TC x transacción', tipo: 'grupo', total: '141,15' },
    { codigo: '5.7', descripcion: 'Tickets, rollos, facturas', tipo: 'grupo', total: '68,78' },
    { codigo: '5.8', descripcion: 'Gasto de mantenimiento de Equipos de parqueo, CCTV, infraestructura redes', tipo: 'grupo', total: '7,67' },
    { codigo: '5.9', descripcion: 'Señalizacion Vertical y horizontal (mantenimiento)', tipo: 'grupo', total: '-' },
    { codigo: '5.10', descripcion: 'Gasto de cobertura de incidentes menores (reposición de espejos, vidrios, gol)', tipo: 'grupo', total: '160,00' },
    { codigo: '5.11', descripcion: 'Seguridad y Vigilancia', tipo: 'grupo', total: '-' },
    { codigo: '5.12', descripcion: 'Amortizacion Inversion Equipos Y Obras', tipo: 'grupo', total: '161,47' },
    { codigo: '5.13', descripcion: 'Gastos Administrativos (Gestion Contable, tecnica, compras, TTHH, comercial)', tipo: 'grupo', total: '279,22' }
];
