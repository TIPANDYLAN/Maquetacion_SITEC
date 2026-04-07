import { useState, useEffect } from 'react';
import { Play, CheckCircle2, AlertCircle, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { HumanaEmployeeData } from '../../types/humana';
import type { NominaApiListResponse } from '../../types/nomina';
import { dbApi, humanaApi } from '../../services/dbApi';
import { getNominaEmployeesActive } from '../../services/n8nApi';

interface FileUploadMetrics {
    archivo: string;
    totalTitularesExcel: number;
    subidas: number;
    noSubidas: number;
    yaExistian: number;
}

interface UploadSummary {
    factura: FileUploadMetrics;
    movimientos: FileUploadMetrics;
    totalFinalPeriodo: number;
}

interface ParseResult {
    empleados: HumanaEmployeeData[];
    formatType: 'factura' | 'distribucion' | 'movimientos';
    cedulasMovimientos: Set<string>;
    cedulasArchivo: Set<string>;
    totalTitularesExcel: number;
    personasSubidas: number;
}

interface ExentoPagoSeguroRegistro {
    cedula: string;
    porcentaje_exento: number;
}

type ListarExentosPagoSeguroResponse = NominaApiListResponse<ExentoPagoSeguroRegistro>;

const normalizarCentroCostoEmpleado = (empleado: HumanaEmployeeData) => {
    empleado.centroCosto = String(empleado.centroCosto || '').trim();
};

const ProveedorHumanaView = () => {
    const getNombreMes = (mes: number): string => {
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return meses[Math.max(0, Math.min(11, mes - 1))];
    };

    const obtenerFechaActual = () => {
        const hoy = new Date();
        return {
            anio: hoy.getFullYear(),
            mes: getNombreMes(hoy.getMonth() + 1),
        };
    };

    const { anio: anioSeleccionado, mes: mesSeleccionado } = obtenerFechaActual();

    const [facturaFile, setFacturaFile] = useState<File | null>(null);
    const [movimientosFile, setMovimientosFile] = useState<File | null>(null);
    const [processing, setProcessing] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
    const [historialData, setHistorialData] = useState<{ archivo: string; fecha: string; total: number; periodo: string; estado: string }[]>([]);
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [resultModalOpen, setResultModalOpen] = useState(false);
    const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(null);

    useEffect(() => {
        void loadHistorial();
    }, []);

    const loadHistorial = async () => {
        try {
            const periods = await humanaApi.getAvailablePeriods();
            const detallePeriodos = await Promise.all(
                periods.map(async (period) => {
                    const data = await humanaApi.getData(period.anio, period.mes);
                    const fechaCarga = new Date(period.fechaCarga);
                    return {
                        archivo: period.archivo,
                        fecha: fechaCarga.toLocaleString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                        total: data?.empleados.length || 0,
                        periodo: `${period.mes} ${period.anio}`,
                        estado: 'Exitoso',
                    };
                })
            );

            setHistorialData(detallePeriodos);
        } catch (error) {
            console.error('Error cargando historial desde BD:', error);
            setHistorialData([]);
        }
    };

    const solicitarConfirmacionCarga = () => {
        if (!facturaFile || !movimientosFile || processing) return;
        setConfirmModalOpen(true);
    };

    const confirmarInicioCarga = () => {
        setConfirmModalOpen(false);
        void processFile();
    };

    const processFile = async () => {
        if (!facturaFile || !movimientosFile) return;

        setProcessing(true);
        setUploadStatus({ type: null, message: '' });

        try {
            const nombreMesANumero = (nombreMes: string): number => {
                const meses: { [key: string]: number } = {
                    'Enero': 1, 'Febrero': 2, 'Marzo': 3, 'Abril': 4, 'Mayo': 5, 'Junio': 6,
                    'Julio': 7, 'Agosto': 8, 'Septiembre': 9, 'Octubre': 10, 'Noviembre': 11, 'Diciembre': 12,
                };
                return meses[nombreMes] || 1;
            };

            const calcularAjuste = (
                fechaInclusion: string,
                primaMensual: number,
                mesFactura: number,
                anioFactura: number
            ): number => {
                if (!fechaInclusion || primaMensual <= 0) return 0;

                const parseDate = (dateStr: string): Date | null => {
                    const match = dateStr.match(/(\d{1,2})[-\/]?(\d{1,2})[-\/]?(\d{4})/);
                    if (match) {
                        const [, d, m, y] = match;
                        return new Date(Number(y), Number(m) - 1, Number(d));
                    }
                    const date = new Date(dateStr);
                    return isNaN(date.getTime()) ? null : date;
                };

                const fechaInclusionDate = parseDate(fechaInclusion);
                if (!fechaInclusionDate) return 0;

                let mesAnterior = mesFactura - 1;
                let anioAnterior = anioFactura;
                if (mesAnterior < 1) {
                    mesAnterior = 12;
                    anioAnterior--;
                }

                const fechaInicio = new Date(anioAnterior, mesAnterior - 1, 21);
                const fechaFin = new Date(anioFactura, mesFactura - 1, 20);
                if (fechaInclusionDate < fechaInicio || fechaInclusionDate > fechaFin) {
                    return 0;
                }

                const diaInclusion = fechaInclusionDate.getDate();
                const mesInclusion = fechaInclusionDate.getMonth() + 1;
                const anioInclusion = fechaInclusionDate.getFullYear();
                const esEnMesAnterior = mesInclusion === mesAnterior && anioInclusion === anioAnterior && diaInclusion >= 21;
                const primaDiaria = primaMensual / 30;

                if (esEnMesAnterior) {
                    const diasCubiertos = 30 - diaInclusion + 1;
                    const prorrateo = primaDiaria * diasCubiertos;
                    return primaMensual + prorrateo + 2;
                }

                const diasCubiertos = 30 - diaInclusion + 1;
                return primaDiaria * diasCubiertos + 1;
            };

                        const calcularSalida = (
                                fechaExclusion: string,
                                primaMensual: number,
                                mesFactura: number,
                                anioFactura: number
                        ): number => {
                                if (!fechaExclusion || fechaExclusion === '---' || fechaExclusion === '--' || primaMensual <= 0) return 0;

                                const parseDate = (dateStr: string): Date | null => {
                                        const match = dateStr.match(/(\d{1,2})[-\/]?(\d{1,2})[-\/]?(\d{4})/);
                                        if (match) {
                                                const [, d, m, y] = match;
                                                return new Date(Number(y), Number(m) - 1, Number(d));
                                        }
                                        const date = new Date(dateStr);
                                        return isNaN(date.getTime()) ? null : date;
                                };

                const fechaExclusionDate = parseDate(fechaExclusion);
                if (!fechaExclusionDate) return 0;

                let mesAnterior = mesFactura - 1;
                let anioAnterior = anioFactura;
                if (mesAnterior < 1) {
                    mesAnterior = 12;
                    anioAnterior--;
                }

                const fechaInicio = new Date(anioAnterior, mesAnterior - 1, 21);
                const fechaFin = new Date(anioFactura, mesFactura - 1, 20);
                if (fechaExclusionDate < fechaInicio || fechaExclusionDate > fechaFin) {
                    return 0;
                }

                return -1;
            };

            const calcularTrabajadorPorTarifa = (tarifa: string): number => {
                const tarifaUpper = String(tarifa || '').toUpperCase();
                if (tarifaUpper === 'T') return 7.5;
                if (tarifaUpper === 'T+1') return 26.06;
                if (tarifaUpper.includes('FAMILIAR') || tarifaUpper.includes('FAMILIA')) return 44.61;
                return 7.5;
            };

            const obtenerPlanDesdeGrupo = (grupo: string): 'PLAN 5' | 'PLAN 10' => {
                const grupoUpper = String(grupo || '').trim().toUpperCase();
                const grupoMatch = grupoUpper.match(/GRUPO\s*([12])\b/);

                if (grupoMatch?.[1] === '2' || grupoUpper === '2') return 'PLAN 10';
                if (grupoMatch?.[1] === '1' || grupoUpper === '1') return 'PLAN 5';

                return 'PLAN 5';
            };

            const parseArchivo = async (archivo: File, expectedType: 'factura' | 'movimientos'): Promise<ParseResult> => {
                const data = await archivo.arrayBuffer();
                const workbook = XLSX.read(data, { type: 'array', raw: false });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                let jsonData = XLSX.utils.sheet_to_json<any>(firstSheet, { header: 1, defval: '' });

                // Detectar si el CSV usa ; como separador y solo tiene 1 columna
                if (jsonData.length > 0 && jsonData[0].length === 1 && typeof jsonData[0][0] === 'string' && jsonData[0][0].includes(';')) {
                    // Re-parsear el archivo como texto con ; como separador
                    const textData = await archivo.text();
                    const lines = textData.split(/\r?\n/);
                    jsonData = lines.map(line => line.split(';'));
                }

                let headerRowIndex = -1;
                let formatType: ParseResult['formatType'] | 'unknown' = 'unknown';

                const normalize = (str: string) =>
                    String(str)
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .toLowerCase()
                        .replace(/[.\s\-_]/g, '');

                // PRIORIDAD 1: Buscar formato MOVIMIENTOS primero (más específico)
                for (let i = 0; i < Math.min(jsonData.length, 120); i++) {
                    const row = jsonData[i] as any[];
                    if (!row || row.length === 0) continue;
                    const normalizedRow = row.map((cell) => normalize(String(cell))).join('|');
                    
                    // Detección de movimientos: debe tener campos únicos de movimientos
                    const hasMovimiento = normalizedRow.includes('movimiento');
                    const hasFechaIncl = normalizedRow.includes('fecincl') || normalizedRow.includes('fechaincl');
                    const hasFechaExcl = normalizedRow.includes('fecexcl') || normalizedRow.includes('fechaexcl');
                    
                    // Si tiene las 3 columnas clave de movimientos, ES movimientos
                    if (hasMovimiento && hasFechaIncl && hasFechaExcl) {
                        headerRowIndex = i;
                        formatType = 'movimientos';
                        break;
                    }
                }

                // PRIORIDAD 2: Buscar formato FACTURA
                if (formatType === 'unknown') {
                    for (let i = 0; i < Math.min(jsonData.length, 100); i++) {
                        const row = jsonData[i] as any[];
                        if (!row || row.length === 0) continue;
                        const normalizedRow = row.map((cell) => normalize(String(cell))).join('|');
                        
                        // Verificar que NO sea un archivo de movimientos
                        const hasMovimiento = normalizedRow.includes('movimiento');
                        const hasFecIncl = normalizedRow.includes('fecincl');
                        const hasFecExcl = normalizedRow.includes('fecexcl');
                        
                        // Si tiene columnas de movimientos, saltar esta fila
                        if (hasMovimiento && (hasFecIncl || hasFecExcl)) {
                            console.log(`⚠️  Fila ${i} parece ser movimientos, no factura`);
                            continue;
                        }
                        
                        const facturaKeywords = ['grupo', 'nro', 'identif', 'cliente', 'parentesco', 'tarifa', 'valor'];
                        const matchCount = facturaKeywords.filter((keyword) => normalizedRow.includes(keyword)).length;
                        if (matchCount >= 5) {
                            headerRowIndex = i;
                            formatType = 'factura';
                            console.log(`✅ FORMATO FACTURA detectado en fila ${i} (${matchCount}/7 keywords)`);
                            break;
                        }
                    }
                }

                // PRIORIDAD 3: Buscar formato DISTRIBUCIÓN
                if (formatType === 'unknown') {
                    for (let i = 0; i < Math.min(jsonData.length, 50); i++) {
                        const row = jsonData[i] as any[];
                        if (!row || row.length === 0) continue;
                        const normalizedRow = row.map((cell) => normalize(String(cell))).join('|');
                        if (normalizedRow.includes('apellidos') || (normalizedRow.includes('nombres') && normalizedRow.includes('centro') && normalizedRow.includes('costo'))) {
                            headerRowIndex = i;
                            formatType = 'distribucion';
                            console.log(`✅ FORMATO DISTRIBUCIÓN detectado en fila ${i}`);
                            break;
                        }
                    }
                }

                if (formatType === 'unknown') {
                    console.log('❌ No se detectó ningún formato válido');
                }

                if (headerRowIndex === -1 || formatType === 'unknown') {
                    console.error('❌ No se detectó formato válido. Filas analizadas:', Math.min(jsonData.length, 120));
                    throw new Error(`No se detecto un formato valido en ${archivo.name}`);
                }

                if (expectedType === 'movimientos' && formatType !== 'movimientos') {
                    console.error(`❌ Error: se esperaba MOVIMIENTOS pero se detectó ${formatType}`);
                    throw new Error(`El archivo de movimientos (${archivo.name}) no tiene formato MOVIMIENTOS HUMANA`);
                }
                if (expectedType === 'factura' && formatType === 'movimientos') {
                    console.error(`❌ Error: se esperaba FACTURA pero se detectó MOVIMIENTOS`);
                    throw new Error(`El archivo de factura (${archivo.name}) no puede ser MOVIMIENTOS HUMANA`);
                }

                const dataRows = jsonData.slice(headerRowIndex + 1);
                const empleados: HumanaEmployeeData[] = [];
                const cedulasMovimientos = new Set<string>();
                const cedulasArchivo = new Set<string>();
                let totalTitularesExcel = 0;
                let personasSubidas = 0;

                if (formatType === 'factura') {
                    const facturaRows = jsonData as any[];
                    const headerRow = facturaRows[headerRowIndex] as any[];

                    let grupoColIdx = -1;
                    let cedulaColIdx = -1;
                    let nombreColIdx = -1;
                    let parentescoColIdx = -1;
                    let generoColIdx = -1;
                    let tarifaColIdx = -1;
                    let fechaIngresoColIdx = -1;

                    for (let i = 0; i < headerRow.length; i++) {
                        const cell = normalize(String(headerRow[i] || ''));
                        if (cell.includes('grupo')) grupoColIdx = i;
                        else if (cell.includes('nroidentif') || cell.includes('identif')) cedulaColIdx = i;
                        else if (cell.includes('cliente')) nombreColIdx = i;
                        else if (cell.includes('parentesco')) parentescoColIdx = i;
                        else if (cell.includes('sexo')) generoColIdx = i;
                        else if (cell.includes('tarifa')) tarifaColIdx = i;
                        else if (cell.includes('fecing')) fechaIngresoColIdx = i;
                    }

                    const parseMoney = (val: unknown): number => {
                        if (typeof val === 'number') return val;
                        if (typeof val !== 'string') return 0;
                        const s = val.trim();
                        if (!s) return 0;
                        const normalizedVal = s.includes(',') && s.includes('.')
                            ? s.replace(/\./g, '').replace(',', '.')
                            : s.replace(',', '.');
                        const n = parseFloat(normalizedVal);
                        return Number.isFinite(n) ? n : 0;
                    };

                    const getCedula = (val: unknown): string => {
                        if (typeof val === 'number') {
                            const asInt = Math.trunc(val);
                            const s = String(asInt);
                            return /^\d{10}$/.test(s) ? s : '';
                        }
                        if (typeof val === 'string') {
                            const s = val.trim();
                            if (/^\d{10}$/.test(s)) return s;
                            const decimalCedula = s.match(/^(\d{10})\.0+$/);
                            if (decimalCedula) return decimalCedula[1];
                            return '';
                        }
                        return '';
                    };

                    const findCedulaInRow = (row: any[]): string => {
                        const fromCol = getCedula(row[cedulaColIdx]);
                        if (fromCol) return fromCol;
                        for (let i = 0; i < row.length; i++) {
                            const c = getCedula(row[i]);
                            if (c) return c;
                        }
                        return '';
                    };

                    const isValidNombre = (value: string): boolean => {
                        const s = value.trim();
                        if (!s || s.length < 6) return false;
                        if (!/[A-Za-z]/.test(s)) return false;
                        if (/^\d/.test(s)) return false;
                        if (s.includes('/')) return false;

                        const upper = s.toUpperCase();
                        if (upper.includes('GRUPO') || upper.includes('URBAPARK') || upper.includes('TOTAL')) return false;
                        if (upper.includes('TITULAR') || upper.includes('CONYUGE') || upper.includes('HIJO')) return false;
                        if (upper.includes('CLIENTE') || upper.includes('PARENTESCO') || upper.includes('TARIFA')) return false;

                        return true;
                    };

                    const findNombreInRow = (row: any[]): string => {
                        const preferredCandidates = [
                            String(row[nombreColIdx] ?? '').trim(),
                            String(row[nombreColIdx + 1] ?? '').trim(),
                            String(row[nombreColIdx - 1] ?? '').trim(),
                        ];

                        for (const candidate of preferredCandidates) {
                            if (isValidNombre(candidate)) return candidate;
                        }

                        const start = Math.max(0, cedulaColIdx + 1);
                        const end = parentescoColIdx > start ? parentescoColIdx : row.length;
                        for (let i = start; i < end; i++) {
                            const val = String(row[i] ?? '').trim();
                            if (isValidNombre(val)) return val;
                        }

                        for (let i = 0; i < row.length; i++) {
                            const val = String(row[i] ?? '').trim();
                            if (isValidNombre(val)) return val;
                        }

                        return '';
                    };

                    const normalizeTarifa = (value: string): string => {
                        const raw = value.trim().toUpperCase().replace(/\s+/g, '');
                        if (!raw) return '';
                        if (raw === 'T') return 'T';
                        if (raw === 'T1' || raw === 'T+1') return 'T+1';
                        if (raw === 'TF' || raw === 'T+F' || raw === 'T+FAMILIA' || raw === 'T+FAMILIAR') return 'T+FAMILIAR';
                        return value.trim().toUpperCase();
                    };

                    const findTarifaInRow = (row: any[]): string => {
                        const candidateIndexes = [
                            tarifaColIdx,
                            tarifaColIdx - 1,
                            tarifaColIdx + 1,
                            tarifaColIdx - 2,
                            tarifaColIdx + 2,
                        ].filter((idx) => idx >= 0 && idx < row.length);

                        for (const idx of candidateIndexes) {
                            const normalized = normalizeTarifa(String(row[idx] ?? ''));
                            if (normalized) return normalized;
                        }

                        for (let i = 0; i < row.length; i++) {
                            const cell = String(row[i] ?? '').trim().toUpperCase().replace(/\s+/g, '');
                            if (/^T(\+?1|\+?F|\+?FAMILIA|\+?FAMILIAR)?$/.test(cell)) {
                                return normalizeTarifa(cell);
                            }
                        }

                        return '';
                    };

                    const normalizeParentesco = (value: string): string => {
                        const p = value.trim().toUpperCase();
                        if (p.includes('TITULAR')) return 'TITULAR';
                        if (p.includes('CONYUGE')) return 'CONYUGE';
                        if (p.includes('HIJO')) return 'HIJO/HIJA';
                        return p;
                    };

                    const findParentescoInRow = (row: any[]): string => {
                        const candidateIndexes = [
                            parentescoColIdx,
                            parentescoColIdx - 1,
                            parentescoColIdx + 1,
                            parentescoColIdx - 2,
                            parentescoColIdx + 2,
                        ].filter((idx) => idx >= 0 && idx < row.length);

                        for (const idx of candidateIndexes) {
                            const normalized = normalizeParentesco(String(row[idx] ?? ''));
                            if (normalized === 'TITULAR' || normalized === 'CONYUGE' || normalized === 'HIJO/HIJA') {
                                return normalized;
                            }
                        }

                        for (let i = 0; i < row.length; i++) {
                            const normalized = normalizeParentesco(String(row[i] ?? ''));
                            if (normalized === 'TITULAR' || normalized === 'CONYUGE' || normalized === 'HIJO/HIJA') {
                                return normalized;
                            }
                        }

                        return '';
                    };

                    const parseDateCell = (val: unknown): string => {
                        if (val instanceof Date && !Number.isNaN(val.getTime())) {
                            const dd = String(val.getDate()).padStart(2, '0');
                            const mm = String(val.getMonth() + 1).padStart(2, '0');
                            const yyyy = String(val.getFullYear());
                            return `${dd}/${mm}/${yyyy}`;
                        }

                        if (typeof val === 'number' && Number.isFinite(val) && val > 20000 && val < 60000) {
                            const formatted = XLSX.SSF.format('dd/mm/yyyy', val);
                            const s = String(formatted).trim();
                            if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
                        }

                        if (typeof val !== 'string') return '';
                        const s = val.trim();
                        let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                        if (m) {
                            const dd = m[1].padStart(2, '0');
                            const mm = m[2].padStart(2, '0');
                            const yyyy = m[3];
                            return `${dd}/${mm}/${yyyy}`;
                        }

                        m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
                        if (m) {
                            const dd = m[1].padStart(2, '0');
                            const mm = m[2].padStart(2, '0');
                            const yyyy = m[3];
                            return `${dd}/${mm}/${yyyy}`;
                        }

                        return '';
                    };

                    const findFechaIngresoInRow = (row: any[]): string => {
                        const candidateIndexes = [
                            fechaIngresoColIdx,
                            fechaIngresoColIdx - 1,
                            fechaIngresoColIdx + 1,
                            fechaIngresoColIdx - 2,
                            fechaIngresoColIdx + 2,
                        ].filter((idx) => idx >= 0 && idx < row.length);

                        for (const idx of candidateIndexes) {
                            const parsed = parseDateCell(row[idx]);
                            if (parsed) return parsed;
                        }

                        const dates: string[] = [];
                        for (let i = 0; i < row.length; i++) {
                            const parsed = parseDateCell(row[i]);
                            if (parsed) dates.push(parsed);
                        }

                        if (dates.length >= 2) return dates[1];
                        if (dates.length === 1) return dates[0];
                        return '';
                    };

                    for (let idx = headerRowIndex + 1; idx < facturaRows.length; idx++) {
                        const row = (facturaRows[idx] || []) as any[];
                        const cedulaRaw = findCedulaInRow(row);
                        if (!cedulaRaw) continue;

                        const parentesco = findParentescoInRow(row);
                        if (parentesco !== 'TITULAR') continue;
                        totalTitularesExcel++;

                        const nombre = findNombreInRow(row);
                        if (!nombre) continue;

                        const grupo = String(row[grupoColIdx] ?? '').trim();
                        const genero = String(row[generoColIdx] ?? '').trim();
                        const tarifa = findTarifaInRow(row);
                        const fechaIngreso = findFechaIngresoInRow(row);

                        let valor = 0;
                        for (let lookAhead = 1; lookAhead <= 8; lookAhead++) {
                            const nextRow = (facturaRows[idx + lookAhead] || []) as any[];
                            if (!nextRow.length) continue;

                            const nextCedula = findCedulaInRow(nextRow);
                            if (nextCedula) {
                                const nextParentesco = normalizeParentesco(String(nextRow[parentescoColIdx] ?? ''));
                                if (nextParentesco === 'TITULAR') break;
                                continue;
                            }

                            for (let j = nextRow.length - 1; j >= 0; j--) {
                                const n = parseMoney(nextRow[j]);
                                if (n > 0 && n < 10000) {
                                    valor = n;
                                    break;
                                }
                            }
                            if (valor > 0) break;
                        }

                        const centroCosto = grupo || 'N/A';

                        const plan = obtenerPlanDesdeGrupo(grupo);

                        const trabajadorValue = calcularTrabajadorPorTarifa(tarifa);

                        const parts = nombre.split(/\s+/).filter((p: string) => p.length > 0);
                        let apellidos: string;
                        let nombres: string;
                        
                        if (parts.length === 4) {
                            apellidos = `${parts[2]} ${parts[3]}`;
                            nombres = `${parts[0]} ${parts[1]}`;
                        } else {
                            apellidos = parts.slice(0, 2).join(' ') || parts[0] || '';
                            nombres = parts.slice(2).join(' ');
                        }
                        const assistValue = plan === 'PLAN 10' ? 2.5 : 1;
                        const primaNeta = Math.max(0, valor - assistValue);

                        empleados.push({
                            apellidos,
                            nombres,
                            cedula: cedulaRaw,
                            centroCosto,
                            fechaNacimiento: '',
                            estadoCivil: '',
                            tarifa,
                            parentesco,
                            genero,
                            fechaSolicitud: '',
                            fechaInclusion: fechaIngreso,
                            fechaExclusion: '',
                            plan,
                            cobertura: 0,
                            prima: primaNeta,
                            ajuste: calcularAjuste(fechaIngreso, primaNeta, nombreMesANumero(mesSeleccionado), anioSeleccionado),
                            humanaAssist: assistValue,
                            seguroCampesino: 0,
                            urbapark: primaNeta,
                            sssCampesino: 0,
                            totalUrbapark: 0,
                            trabajador: trabajadorValue,
                            total: primaNeta,
                            diferencia: 0,
                        });

                        personasSubidas++;
                        cedulasArchivo.add(cedulaRaw);
                    }

                    if (empleados.length > 0) {
                        const totalFactura = empleados.reduce((sum, emp) => sum + (emp.prima + emp.humanaAssist), 0);
                        const seguroCampesinoPerEmpleado = totalFactura * 0.005 / empleados.length;
                        empleados.forEach((emp) => {
                            if (emp.ajuste < 0) {
                                emp.trabajador = 0;
                                emp.prima = 0;
                                emp.humanaAssist = 0;
                                emp.seguroCampesino = 0;
                                emp.totalUrbapark = emp.ajuste;
                                return;
                            }
                            emp.seguroCampesino = seguroCampesinoPerEmpleado;
                            emp.totalUrbapark = emp.ajuste < 0
                                ? emp.ajuste
                                : emp.prima + emp.seguroCampesino + emp.ajuste + emp.humanaAssist - emp.trabajador;
                        });
                    }
                } else if (formatType === 'movimientos') {
                    const movimientosRows = jsonData as any[];
                    const headerRow = movimientosRows[headerRowIndex] as any[];

                    let movimientoColIdx = -1;
                    let nombreColIdx = -1;
                    let cedulaColIdx = -1;
                    let grupoColIdx = -1;
                    let tarifaColIdx = -1;
                    let parentescoColIdx = -1;
                    let sexoColIdx = -1;
                    let fechaInclColIdx = -1;
                    let fechaExclColIdx = -1;
                    let valorColIdx = -1;

                    for (let i = 0; i < headerRow.length; i++) {
                        const cell = normalize(String(headerRow[i] || ''));
                        if (cell.includes('movimiento')) movimientoColIdx = i;
                        else if (cell.includes('asegurado') || cell.includes('cliente')) nombreColIdx = i;
                        else if (cell.includes('nroidentif') || cell.includes('identif')) cedulaColIdx = i;
                        else if (cell.includes('nomgrupo') || cell.includes('grupo')) grupoColIdx = i;
                        else if (cell.includes('modalidad') || cell.includes('tarifa')) tarifaColIdx = i;
                        else if (cell.includes('parentesco')) parentescoColIdx = i;
                        else if (cell.includes('sexo')) sexoColIdx = i;
                        else if (cell.includes('fecincl')) fechaInclColIdx = i;
                        else if (cell.includes('fecexcl')) fechaExclColIdx = i;
                        else if (cell.includes('valor')) valorColIdx = i;
                    }

                    const parseMoney = (val: unknown): number => {
                        if (typeof val === 'number') return val;
                        if (typeof val !== 'string') return 0;
                        const s = val.trim();
                        if (!s) return 0;
                        const normalizedVal = s.includes(',') && s.includes('.')
                            ? s.replace(/\./g, '').replace(',', '.')
                            : s.replace(',', '.');
                        const n = parseFloat(normalizedVal);
                        return Number.isFinite(n) ? n : 0;
                    };

                    const getCedula = (val: unknown): string => {
                        if (typeof val === 'number') {
                            const asInt = Math.trunc(val);
                            const s = String(asInt);
                            return /^\d{10}$/.test(s) ? s : '';
                        }
                        if (typeof val === 'string') {
                            const s = val.trim();
                            if (/^\d{10}$/.test(s)) return s;
                            const decimalCedula = s.match(/^(\d{10})\.0+$/);
                            if (decimalCedula) return decimalCedula[1];
                        }
                        return '';
                    };

                    // Función para obtener cédula con validación detallada
                    const getCedulaConValidacion = (val: unknown): { cedula: string; razonRechazo?: string } => {
                        const cedula = getCedula(val);
                        if (cedula) {
                            return { cedula };
                        }

                        // Si no es válida, determinar por qué
                        if (typeof val === 'number') {
                            const s = String(Math.trunc(val));
                            if (s.length < 10) {
                                return { cedula: '', razonRechazo: `Cédula incompleta (${s.length} dígitos): ${s}` };
                            }
                        }
                        if (typeof val === 'string') {
                            const s = val.trim();
                            if (/^\d+$/.test(s) && s.length < 10) {
                                return { cedula: '', razonRechazo: `Cédula incompleta (${s.length} dígitos): ${s}` };
                            }
                            if (/^\d+$/.test(s)) {
                                return { cedula: '', razonRechazo: `Cédula inválida: ${s}` };
                            }
                        }

                        return { cedula: '', razonRechazo: `Cédula vacía o inválida` };
                    };

                    const getCedulaRaw = (val: unknown): string => {
                        if (typeof val === 'number') return String(Math.trunc(val)).trim();
                        if (typeof val === 'string') {
                            const s = val.trim();
                            const decimalCedula = s.match(/^(\d+)\.0+$/);
                            if (decimalCedula) return decimalCedula[1];
                            return s;
                        }
                        return '';
                    };

                    const parseDateCell = (val: unknown): string => {
                        if (val instanceof Date && !Number.isNaN(val.getTime())) {
                            const dd = String(val.getDate()).padStart(2, '0');
                            const mm = String(val.getMonth() + 1).padStart(2, '0');
                            const yyyy = String(val.getFullYear());
                            return `${dd}/${mm}/${yyyy}`;
                        }
                        if (typeof val === 'number' && Number.isFinite(val) && val > 20000 && val < 60000) {
                            const formatted = XLSX.SSF.format('dd/mm/yyyy', val);
                            const s = String(formatted).trim();
                            if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
                        }
                        if (typeof val !== 'string') return '';
                        const s = val.trim();
                        if (!s) return '';
                        let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                        if (m) {
                            return `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}/${m[3]}`;
                        }
                        m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
                        if (m) {
                            return `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}/${m[3]}`;
                        }
                        return '';
                    };

                    const parseDateFromParts = (d: unknown, m: unknown, y: unknown): string => {
                        const dd = String(d ?? '').trim();
                        const mm = String(m ?? '').trim();
                        const yy = String(y ?? '').trim();
                        if (!/^\d{1,2}$/.test(dd) || !/^\d{1,2}$/.test(mm) || !/^\d{4}$/.test(yy)) return '';
                        return `${dd.padStart(2, '0')}/${mm.padStart(2, '0')}/${yy}`;
                    };

                    const extractFechaInclusion = (row: any[]): string => {
                        if (fechaInclColIdx < 0) return '';

                        // Caso normal: fecha completa en una sola celda
                        const direct = parseDateCell(row[fechaInclColIdx]);
                        if (direct) return direct;

                        // Caso columnas separadas (AB, AC, AD)
                        const fromSplit = parseDateFromParts(
                            row[fechaInclColIdx],
                            row[fechaInclColIdx + 1],
                            row[fechaInclColIdx + 2]
                        );
                        if (fromSplit) return fromSplit;

                        // Fallback cercano por desplazamiento
                        for (let offset = -2; offset <= 3; offset++) {
                            const idx = fechaInclColIdx + offset;
                            if (idx < 0 || idx >= row.length) continue;
                            const parsed = parseDateCell(row[idx]);
                            if (parsed) return parsed;
                        }

                        return '';
                    };

                    const extractFechaExclusion = (row: any[]): string => {
                        if (fechaExclColIdx < 0) return '';

                        // Caso normal: fecha completa en una sola celda (AF)
                        const direct = parseDateCell(row[fechaExclColIdx]);
                        if (direct) return direct;

                        // En algunos archivos puede venir desplazada 1-2 columnas
                        for (let offset = -2; offset <= 2; offset++) {
                            const idx = fechaExclColIdx + offset;
                            if (idx < 0 || idx >= row.length) continue;
                            const parsed = parseDateCell(row[idx]);
                            if (parsed) return parsed;
                        }

                        return '';
                    };

                    const normalizeTarifa = (value: string): string => {
                        const raw = value.trim().toUpperCase().replace(/\s+/g, '');
                        if (!raw) return 'T';
                        if (raw === 'T') return 'T';
                        if (raw === 'T1' || raw === 'T+1') return 'T+1';
                        if (raw === 'TF' || raw === 'T+F' || raw === 'T+FAMILIA' || raw === 'T+FAMILIAR') return 'T+FAMILIAR';
                        return value.trim().toUpperCase();
                    };

                    const isNombreCandidato = (val: string): boolean => {
                        const cleaned = val.trim();
                        if (!cleaned || cleaned.length < 4) return false;
                        if (/^\d+$/.test(cleaned)) return false;
                        if (/^[^\p{L}]*$/u.test(cleaned)) return false;

                        const norm = normalize(cleaned);
                        if (norm.includes('exclusion') || norm.includes('inclusion')) return false;
                        if (norm.includes('movimiento')) return false;
                        if (norm.includes('nucleo')) return false;
                        if (norm === 'titular') return false;

                        return true;
                    };

                    // Función para extraer nombre correctamente del CSV separado por ;
                    const extractNombreDesdeRow = (row: any[]): string => {
                        // Primero intentar en columnas cercanas a Asegurado (en estos archivos suele correrse +1)
                        const nombreCandidateOffsets = [0, 1, 2, -1, -2];
                        for (const offset of nombreCandidateOffsets) {
                            const idx = nombreColIdx + offset;
                            if (idx >= 0 && idx < row.length) {
                                const nombre = String(row[idx] || '').trim();
                                if (isNombreCandidato(nombre)) return nombre;
                            }
                        }

                        // Buscar en posiciones cercanas al índice de cédula
                        if (cedulaColIdx >= 0) {
                            for (let offset of [-2, -1, 1, 2, -3, 3]) {
                                const idx = cedulaColIdx + offset;
                                if (idx >= 0 && idx < row.length) {
                                    const val = String(row[idx] || '').trim();
                                    if (isNombreCandidato(val)) {
                                        return val;
                                    }
                                }
                            }
                        }

                        // Búsqueda general: encuentra el primer valor que parece un nombre
                        for (let i = 0; i < Math.min(row.length, 15); i++) {
                            const val = String(row[i] || '').trim();
                            if (isNombreCandidato(val)) {
                                return val;
                            }
                        }

                        return '';
                    };

                    for (let idx = headerRowIndex + 1; idx < movimientosRows.length; idx++) {
                        const row = (movimientosRows[idx] || []) as any[];
                        if (!row.length) continue;

                        const movRaw = String(row[movimientoColIdx] ?? '').trim();
                        const movNorm = normalize(movRaw);
                        
                        if (!movNorm.includes('inclusion') && !movNorm.includes('exclusion')) {
                            continue;
                        }

                        const parentescoRaw = normalize(String(row[parentescoColIdx] ?? ''));
                        if (parentescoRaw && !parentescoRaw.includes('titular')) {
                            continue;
                        }

                        const { cedula, razonRechazo } = getCedulaConValidacion(row[cedulaColIdx]);
                        const cedulaRaw = getCedulaRaw(row[cedulaColIdx]);
                        totalTitularesExcel++;

                        const nombreDirecto = nombreColIdx >= 0 && nombreColIdx < row.length
                            ? String(row[nombreColIdx] || '').trim()
                            : '';
                        const nombre = extractNombreDesdeRow(row);

                        console.log(
                            `👤 Fila ${idx} | mov="${movRaw}" | cedulaRaw="${cedulaRaw}" | nombreCol="${nombreDirecto}" | nombreExtraido="${nombre || '(vacío)'}"`
                        );

                        if (!nombre) {
                            console.log(`❌ ${cedula || cedulaRaw || '(sin cédula)'}: No se pudo extraer nombre`);
                            continue;
                        }

                        const parts = nombre.split(/\s+/).filter((p: string) => p.length > 0);
                        let apellidos: string;
                        let nombres: string;
                        
                        if (parts.length === 4) {
                            apellidos = `${parts[2]} ${parts[3]}`;
                            nombres = `${parts[0]} ${parts[1]}`;
                        } else {
                            apellidos = parts.slice(0, 2).join(' ') || parts[0] || '';
                            nombres = parts.slice(2).join(' ');
                        }
                        const grupo = String(row[grupoColIdx] ?? '').trim();
                        const tarifa = normalizeTarifa(String(row[tarifaColIdx] ?? ''));
                        const fechaInclusion = extractFechaInclusion(row);
                        const fechaExclusion = extractFechaExclusion(row);
                        const ajusteArchivo = parseMoney(row[valorColIdx]);
                        const plan = obtenerPlanDesdeGrupo(grupo);

                        const assistValue = plan === 'PLAN 10' ? 2.5 : 1;

                        if (!cedula) {
                            // Se conserva el registro de EXCLUSION aunque la cédula sea inválida para no perder el nombre/datos.
                            // No suma como "subida" y se refleja en "no subidas".
                            const cedulaFallback = cedulaRaw || `INVALID-${idx}`;
                            console.log(`⚠️ ${razonRechazo} | ${cedulaFallback} | ${apellidos} ${nombres}`);

                            empleados.push({
                                apellidos,
                                nombres,
                                cedula: cedulaFallback,
                                centroCosto: grupo || 'N/A',
                                fechaNacimiento: '',
                                estadoCivil: '',
                                tarifa,
                                parentesco: 'TITULAR',
                                genero: String(row[sexoColIdx] || ''),
                                fechaSolicitud: '',
                                fechaInclusion: fechaInclusion || '',
                                fechaExclusion: fechaExclusion || '',
                                plan,
                                cobertura: 0,
                                prima: 0,
                                ajuste: ajusteArchivo,
                                humanaAssist: assistValue,
                                seguroCampesino: 0,
                                urbapark: 0,
                                sssCampesino: 0,
                                totalUrbapark: ajusteArchivo,
                                trabajador: calcularTrabajadorPorTarifa(tarifa),
                                total: 0,
                                diferencia: 0,
                            });

                            cedulasArchivo.add(cedulaFallback);
                            continue;
                        }

                        console.log(`✅ ${cedula} | ${apellidos} ${nombres} | Movimiento: ${movRaw} | FecIncl: ${fechaInclusion} | FecExcl: ${fechaExclusion} | Valor: ${ajusteArchivo}`);

                        empleados.push({
                            apellidos,
                            nombres,
                            cedula,
                            centroCosto: grupo || 'N/A',
                            fechaNacimiento: '',
                            estadoCivil: '',
                            tarifa,
                            parentesco: 'TITULAR',
                            genero: String(row[sexoColIdx] || ''),
                            fechaSolicitud: '',
                            fechaInclusion: fechaInclusion || '',
                            fechaExclusion: fechaExclusion || '',
                            plan,
                            cobertura: 0,
                            prima: 0,
                            ajuste: ajusteArchivo,
                            humanaAssist: assistValue,
                            seguroCampesino: 0,
                            urbapark: 0,
                            sssCampesino: 0,
                                totalUrbapark: ajusteArchivo,
                                trabajador: calcularTrabajadorPorTarifa(tarifa),
                            total: 0,
                            diferencia: 0,
                        });

                        personasSubidas++;
                        cedulasMovimientos.add(cedula);
                        cedulasArchivo.add(cedula);
                    }
                } else {
                    for (const row of dataRows) {
                        const rowData = row as any[];
                        if (!rowData[0] || rowData[0] === '') continue;

                        const cedula = String(rowData[2] || '').trim();
                        if (!cedula) continue;

                        const parentesco = String(rowData[7] || '').trim().toUpperCase();
                        if (parentesco && !parentesco.includes('TITULAR')) continue;
                        totalTitularesExcel++;

                        const apellidos = String(rowData[0] || '').trim();
                        const nombres = String(rowData[1] || '').trim();
                        if (!apellidos && !nombres) continue;

                        const prima = parseFloat(String(rowData[14] || '0').replace(/,/g, '')) || 0;
                        const humanaAssist = parseFloat(String(rowData[16] || '0').replace(/,/g, '')) || 0;
                        const primaNeta = Math.max(0, prima - humanaAssist);
                        const seguroCampesino = parseFloat(String(rowData[17] || '0').replace(/,/g, '')) || 0;
                        const ajuste = calcularAjuste(String(rowData[10] || ''), primaNeta, nombreMesANumero(mesSeleccionado), anioSeleccionado);

                        empleados.push({
                            apellidos: String(rowData[0] || ''),
                            nombres: String(rowData[1] || ''),
                            cedula,
                            centroCosto: String(rowData[3] || ''),
                            fechaNacimiento: String(rowData[4] || ''),
                            estadoCivil: String(rowData[5] || ''),
                            tarifa: String(rowData[6] || ''),
                            parentesco: String(rowData[7] || ''),
                            genero: String(rowData[8] || ''),
                            fechaSolicitud: String(rowData[9] || ''),
                            fechaInclusion: String(rowData[10] || ''),
                            fechaExclusion: String(rowData[11] || ''),
                            plan: String(rowData[12] || ''),
                            cobertura: parseFloat(String(rowData[13] || '0').replace(/,/g, '')) || 0,
                            prima: primaNeta,
                            ajuste,
                            humanaAssist,
                            seguroCampesino,
                            urbapark: primaNeta,
                            sssCampesino: parseFloat(String(rowData[20] || '0').replace(/,/g, '')) || 0,
                            totalUrbapark: ajuste < 0 ? ajuste : (primaNeta + seguroCampesino + ajuste + humanaAssist - 7.5),
                            trabajador: parseFloat(String(rowData[22] || '0').replace(/,/g, '')) || 0,
                            total: parseFloat(String(rowData[23] || '0').replace(/,/g, '')) || 0,
                            diferencia: parseFloat(String(rowData[24] || '0').replace(/,/g, '')) || 0,
                        });

                        personasSubidas++;
                        cedulasArchivo.add(cedula);
                    }
                }

                console.log(`\n✅ PARSE COMPLETO (${formatType}): ${empleados.length} personas procesadas`);

                return {
                    empleados,
                    formatType,
                    cedulasMovimientos,
                    cedulasArchivo,
                    totalTitularesExcel,
                    personasSubidas,
                };
            };

            const cargarExentosPagoSeguro = async (): Promise<Map<string, number>> => {
                try {
                    const data = await dbApi.exentosPagoSeguro.list<ListarExentosPagoSeguroResponse>();
                    if (!data.ok) {
                        console.warn('No se pudieron cargar exentos de pago seguro:', data.error || 'Error desconocido');
                        return new Map();
                    }

                    return new Map(
                        (Array.isArray(data.registros) ? data.registros : [])
                            .map((registro): [string, number] => [
                                String(registro.cedula || '').trim(),
                                Number(registro.porcentaje_exento || 0),
                            ])
                            .filter(([cedula, porcentaje]) => Boolean(cedula) && Number.isFinite(porcentaje) && porcentaje > 0)
                    );
                } catch (error) {
                    console.warn('Error consultando exentos de pago seguro:', error);
                    return new Map();
                }
            };

            const facturaResult = await parseArchivo(facturaFile, 'factura');
            const movimientosResult = await parseArchivo(movimientosFile, 'movimientos');

            if (facturaResult.empleados.length === 0) {
                throw new Error('No se encontraron titulares procesables en el archivo de factura/distribucion');
            }

            const dataActualPeriodo = await humanaApi.getData(anioSeleccionado, mesSeleccionado);
            const cedulasPrevias = new Set(
                (dataActualPeriodo?.empleados || [])
                    .map((emp: HumanaEmployeeData) => emp.cedula)
                    .filter(Boolean)
            );

            for (const empleado of facturaResult.empleados) {
                normalizarCentroCostoEmpleado(empleado);
            }

            for (const empleado of facturaResult.empleados) {
                const salidaAjuste = calcularSalida(empleado.fechaExclusion, empleado.prima, nombreMesANumero(mesSeleccionado), anioSeleccionado);
                if (salidaAjuste < 0) {
                    empleado.ajuste = -1;
                    empleado.trabajador = 0;
                }
                empleado.totalUrbapark = empleado.ajuste < 0
                    ? empleado.ajuste
                    : empleado.prima + empleado.seguroCampesino + empleado.ajuste + empleado.humanaAssist - 7.5;
            }

            const mapa = new Map<string, HumanaEmployeeData>(
                facturaResult.empleados
                    .filter((emp: HumanaEmployeeData) => !!emp.cedula)
                    .map((emp: HumanaEmployeeData) => [emp.cedula, { ...emp }])
            );

            for (const mov of movimientosResult.empleados) {
                const previo = mapa.get(mov.cedula);
                if (!previo) {
                    mapa.set(mov.cedula, { ...mov });
                    continue;
                }

                mapa.set(mov.cedula, {
                    ...previo,
                    apellidos: mov.apellidos || previo.apellidos,
                    nombres: mov.nombres || previo.nombres,
                    genero: mov.genero || previo.genero,
                    tarifa: mov.tarifa || previo.tarifa,
                    plan: mov.plan || previo.plan,
                    fechaInclusion: mov.fechaInclusion || previo.fechaInclusion,
                    fechaExclusion: mov.fechaExclusion || previo.fechaExclusion,
                    ajuste: mov.ajuste,
                });
            }

            const empleadosFinal = Array.from(mapa.values());

            // Corregir nombres/apellidos usando la API (cubre nombres con más de 4 palabras)
            try {
                const empleadosApi = await getNominaEmployeesActive<unknown[]>();
                const nombresMap = new Map<string, { apellidos: string; nombres: string }>();
                for (const item of (Array.isArray(empleadosApi) ? empleadosApi : [])) {
                    const payload = (item as Record<string, unknown>)?.json ?? item as Record<string, unknown>;
                    const p = payload as Record<string, unknown>;
                    const cedula = String(p.CEDULA || p.DOCI_MFEMP || '').trim();
                    const apellidos = String(p.APELLIDOS || '').trim();
                    const nombres = String(p.NOMBRES || '').trim();
                    if (cedula && (apellidos || nombres)) {
                        nombresMap.set(cedula, { apellidos, nombres });
                    }
                }
                for (const emp of empleadosFinal) {
                    const encontrado = nombresMap.get(emp.cedula);
                    if (encontrado) {
                        emp.apellidos = encontrado.apellidos;
                        emp.nombres = encontrado.nombres;
                    } else {
                        // Fallback: el nombre del archivo viene en formato NOMBRES APELLIDOS
                        // Reordenar: últimas 2 palabras → apellidos, primeras 2 → nombres
                        const partes = `${emp.apellidos} ${emp.nombres}`.trim().split(/\s+/).filter(Boolean);
                        if (partes.length >= 4) {
                            emp.apellidos = partes.slice(-2).join(' ');
                            emp.nombres = partes.slice(0, -2).join(' ');
                        } else if (partes.length === 3) {
                            emp.apellidos = partes.slice(-2).join(' ');
                            emp.nombres = partes[0];
                        }
                        // 1-2 palabras: se deja como está
                    }
                }
            } catch (e) {
                console.warn('No se pudo obtener nombres desde API, se usarán los del archivo:', e);
            }

            console.log(`\n📊 RESUMEN FINAL ANTES DE GUARDAR:`);
            console.log(`   facturaResult.totalTitularesExcel: ${facturaResult.totalTitularesExcel}`);
            console.log(`   facturaResult.personasSubidas: ${facturaResult.personasSubidas}`);
            console.log(`   movimientosResult.totalTitularesExcel: ${movimientosResult.totalTitularesExcel}`);
            console.log(`   movimientosResult.personasSubidas: ${movimientosResult.personasSubidas}`);
            console.log(`   mapa.size (empleados finales): ${empleadosFinal.length}`);

            for (const empleado of empleadosFinal) {
                normalizarCentroCostoEmpleado(empleado);
            }

            const exentosPagoSeguro = await cargarExentosPagoSeguro();

            if (empleadosFinal.length > 0) {
                const totalFacturaFinal = empleadosFinal.reduce((sum, emp) => sum + ((emp.prima || 0) + (emp.humanaAssist || 0)), 0);
                const seguroCampesinoPerEmpleadoFinal = totalFacturaFinal * 0.005 / empleadosFinal.length;
                let totalUrbaparkBasePlan5TarifaT: number | null = null;

                empleadosFinal.forEach((emp) => {
                    const ajuste = emp.ajuste || 0;
                    if (ajuste < 0) {
                        emp.trabajador = 0;
                        emp.prima = 0;
                        emp.humanaAssist = 0;
                        emp.seguroCampesino = 0;
                        emp.totalUrbapark = ajuste;
                    } else {
                        const trabajadorBase = calcularTrabajadorPorTarifa(emp.tarifa || '');
                        const porcentajeExento = Math.max(0, Math.min(100, exentosPagoSeguro.get(emp.cedula) || 0));
                        const valorExento = trabajadorBase * (porcentajeExento / 100);
                        emp.trabajador = trabajadorBase - valorExento;
                        emp.seguroCampesino = seguroCampesinoPerEmpleadoFinal;
                        emp.totalUrbapark = (emp.prima || 0) + emp.seguroCampesino + ajuste + (emp.humanaAssist || 0) - emp.trabajador;

                        const planNormalizado = String(emp.plan || '').trim().toUpperCase().replace(/\s+/g, ' ');
                        const tarifaNormalizada = String(emp.tarifa || '').trim().toUpperCase();
                        const sinAjuste = Number(ajuste) === 0;
                        const sinExento = porcentajeExento === 0;

                        if (totalUrbaparkBasePlan5TarifaT === null && sinAjuste && sinExento && planNormalizado === 'PLAN 5' && tarifaNormalizada === 'T') {
                            totalUrbaparkBasePlan5TarifaT = emp.totalUrbapark;
                        }
                    }
                });

                if (totalUrbaparkBasePlan5TarifaT !== null) {
                    empleadosFinal.forEach((emp) => {
                        const ajuste = Number(emp.ajuste || 0);
                        const porcentajeExento = Math.max(0, Math.min(100, exentosPagoSeguro.get(emp.cedula) || 0));
                        const sinAjuste = ajuste === 0;
                        const sinExento = porcentajeExento === 0;

                        if (sinAjuste && sinExento) {
                            emp.totalUrbapark = totalUrbaparkBasePlan5TarifaT as number;
                            emp.trabajador = (emp.prima || 0) + emp.seguroCampesino + ajuste + (emp.humanaAssist || 0) - emp.totalUrbapark;
                        }
                    });
                }
            }

            // Reemplazar urbapark con totalUrbapark antes de guardar en BD
            empleadosFinal.forEach((emp) => {
                emp.urbapark = emp.totalUrbapark;
            });

            await humanaApi.saveData(
                anioSeleccionado,
                mesSeleccionado,
                empleadosFinal,
                `${facturaFile.name} + ${movimientosFile.name}`
            );

            const facturaNoSubidas = Math.max(0, facturaResult.totalTitularesExcel - facturaResult.personasSubidas);
            const movimientosNoSubidas = Math.max(0, movimientosResult.totalTitularesExcel - movimientosResult.personasSubidas);

            console.log(`\n📋 CÁLCULO DE NO SUBIDAS:`);
            console.log(`   Factura: ${facturaResult.totalTitularesExcel} - ${facturaResult.personasSubidas} = ${facturaNoSubidas}`);
            console.log(`   Movimientos: ${movimientosResult.totalTitularesExcel} - ${movimientosResult.personasSubidas} = ${movimientosNoSubidas}`);

            const yaExistian_factura = Array.from(facturaResult.cedulasArchivo).filter((cedula) => cedulasPrevias.has(cedula)).length;
            const yaExistian_movimientos = Array.from(movimientosResult.cedulasArchivo).filter((cedula) => cedulasPrevias.has(cedula)).length;

            console.log(`   Ya existían - Factura: ${yaExistian_factura}, Movimientos: ${yaExistian_movimientos}\n`);

            setUploadSummary({
                factura: {
                    archivo: facturaFile.name,
                    totalTitularesExcel: facturaResult.totalTitularesExcel,
                    subidas: facturaResult.personasSubidas,
                    noSubidas: facturaNoSubidas,
                    yaExistian: Array.from(facturaResult.cedulasArchivo).filter((cedula) => cedulasPrevias.has(cedula)).length,
                },
                movimientos: {
                    archivo: movimientosFile.name,
                    totalTitularesExcel: movimientosResult.totalTitularesExcel,
                    subidas: movimientosResult.personasSubidas,
                    noSubidas: movimientosNoSubidas,
                    yaExistian: Array.from(movimientosResult.cedulasArchivo).filter((cedula) => cedulasPrevias.has(cedula)).length,
                },
                totalFinalPeriodo: empleadosFinal.length,
            });
            setResultModalOpen(true);

            setUploadStatus({
                type: 'success',
                message: `✓ Factura y movimientos cargados exitosamente. ${empleadosFinal.length} empleados en ${mesSeleccionado} ${anioSeleccionado}`,
            });

            setFacturaFile(null);
            setMovimientosFile(null);
            await loadHistorial();
        } catch (error) {
            console.error('Error procesando archivo:', error);
            setUploadStatus({
                type: 'error',
                message: error instanceof Error ? `✗ Error: ${error.message}` : '✗ Error desconocido al procesar el archivo',
            });
        } finally {
            setProcessing(false);
        }
    };

    const handleFacturaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) setFacturaFile(e.target.files[0]);
    };

    const handleMovimientosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) setMovimientosFile(e.target.files[0]);
    };

    const getEstadoColor = (estado: string) => {
        if (estado === 'Exitoso') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (estado === 'Advertencia') return 'bg-yellow-50 text-yellow-700 border-yellow-200';
        return 'bg-red-50 text-red-700 border-red-200';
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end mb-2">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">Ingreso Factura de Humana</h2>
                    <p className="text-slate-500 mt-1">Cargue los archivos de facturas de Humana para procesamiento.</p>
                </div>
            </div>

            {/* MENSAJE DE ESTADO */}
            {uploadStatus.type && (
                <div className={`p-4 rounded-xl border ${uploadStatus.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    <div className="flex items-center gap-2">
                        {uploadStatus.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                        <span className="font-semibold text-sm">{uploadStatus.message}</span>
                    </div>
                </div>
            )}

            {/* AREA DE CARGA */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* ZONA FACTURA */}
                    <div className="relative">
                        <label className="block text-xs font-bold text-slate-600 mb-3 uppercase tracking-wide">
                            Archivo Factura / Distribución
                        </label>
                        <div
                            onClick={() => document.getElementById('input-file-factura-humana')?.click()}
                            className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
                                facturaFile
                                    ? 'border-emerald-400 bg-emerald-50/50'
                                    : 'border-slate-300 bg-slate-50 hover:border-[#001F3F] hover:bg-blue-50/30'
                            }`}
                        >
                            <input
                                id="input-file-factura-humana"
                                type="file"
                                accept=".xls,.xlsx,.csv"
                                onChange={handleFacturaChange}
                                className="hidden"
                            />
                            <div className="flex flex-col items-center gap-3">
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                                    facturaFile ? 'bg-emerald-100' : 'bg-slate-200'
                                }`}>
                                    {facturaFile ? (
                                        <CheckCircle2 className="text-emerald-600" size={28} />
                                    ) : (
                                        <Upload className="text-slate-500" size={28} />
                                    )}
                                </div>
                                {facturaFile ? (
                                    <>
                                        <div className="text-sm font-bold text-emerald-700">{facturaFile.name}</div>
                                        <div className="text-xs text-emerald-600">Archivo cargado correctamente</div>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-sm font-bold text-slate-700">Haz clic para seleccionar</div>
                                        <div className="text-xs text-slate-500">Archivo Excel (.xls, .xlsx, .csv)</div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ZONA MOVIMIENTOS */}
                    <div className="relative">
                        <label className="block text-xs font-bold text-slate-600 mb-3 uppercase tracking-wide">
                            Archivo Movimientos
                        </label>
                        <div
                            onClick={() => document.getElementById('input-file-movimientos-humana')?.click()}
                            className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
                                movimientosFile
                                    ? 'border-emerald-400 bg-emerald-50/50'
                                    : 'border-slate-300 bg-slate-50 hover:border-[#001F3F] hover:bg-blue-50/30'
                            }`}
                        >
                            <input
                                id="input-file-movimientos-humana"
                                type="file"
                                accept=".xls,.xlsx,.csv"
                                onChange={handleMovimientosChange}
                                className="hidden"
                            />
                            <div className="flex flex-col items-center gap-3">
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                                    movimientosFile ? 'bg-emerald-100' : 'bg-slate-200'
                                }`}>
                                    {movimientosFile ? (
                                        <CheckCircle2 className="text-emerald-600" size={28} />
                                    ) : (
                                        <Upload className="text-slate-500" size={28} />
                                    )}
                                </div>
                                {movimientosFile ? (
                                    <>
                                        <div className="text-sm font-bold text-emerald-700">{movimientosFile.name}</div>
                                        <div className="text-xs text-emerald-600">Archivo cargado correctamente</div>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-sm font-bold text-slate-700">Haz clic para seleccionar</div>
                                        <div className="text-xs text-slate-500">Archivo Excel (.xls, .xlsx, .csv)</div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* BOTON DE CARGA */}
                <div className="flex justify-center">
                    <button
                        onClick={solicitarConfirmacionCarga}
                        disabled={!facturaFile || !movimientosFile || processing}
                        className={`py-3 px-8 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all transform active:scale-95 uppercase tracking-wide ${
                            facturaFile && movimientosFile && !processing
                                ? 'bg-[#001F3F] text-white hover:bg-blue-900 shadow-blue-900/20'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                    >
                        <Play size={18} fill="currentColor" />
                        {processing ? 'PROCESANDO...' : 'PROCESAR ARCHIVOS'}
                    </button>
                </div>
            </div>

            {/* HISTORIAL */}
            <div className="space-y-2">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">Historial de Facturas HUMANA</h3>
                    <p className="text-xs text-slate-500">Registros cargados en el sistema ordenados por período.</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Archivo</th>
                                <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Período</th>
                                <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Fecha Carga</th>
                                <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Empleados</th>
                                <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {historialData.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                                        No hay registros disponibles. Cargue un archivo para comenzar.
                                    </td>
                                </tr>
                            ) : (
                                historialData.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-3 text-sm font-medium text-slate-800">{row.archivo}</td>
                                        <td className="px-6 py-3 text-sm text-slate-600 font-semibold">{row.periodo}</td>
                                        <td className="px-6 py-3 text-sm text-slate-600">{row.fecha}</td>
                                        <td className="px-6 py-3 text-sm text-right font-medium text-slate-700">{row.total}</td>
                                        <td className="px-6 py-3 text-sm">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getEstadoColor(row.estado)}`}>
                                                <div className={`w-2 h-2 rounded-full ${row.estado === 'Exitoso' ? 'bg-emerald-500' : row.estado === 'Advertencia' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                                                {row.estado}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {confirmModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-6">
                        <h4 className="text-lg font-black text-slate-800 mb-2">Confirmar carga de archivo</h4>
                        <p className="text-sm text-slate-600 mb-5">
                            Se procesara primero la factura y luego movimientos. Esta accion requiere ambos archivos.
                        </p>
                        <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3 mb-2">
                            <span className="font-semibold text-slate-700">Factura:</span> {facturaFile?.name || 'Sin archivo'}
                        </div>
                        <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3 mb-5">
                            <span className="font-semibold text-slate-700">Movimientos:</span> {movimientosFile?.name || 'Sin archivo'}
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setConfirmModalOpen(false)}
                                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmarInicioCarga}
                                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#001F3F] hover:bg-blue-900"
                            >
                                Iniciar carga de datos
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {processing && (
                <div className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-6 text-center">
                        <div className="w-10 h-10 mx-auto mb-3 border-4 border-slate-200 border-t-[#001F3F] rounded-full animate-spin"></div>
                        <h4 className="text-lg font-black text-slate-800 mb-1">Procesando información</h4>
                        <p className="text-sm text-slate-600">Estamos analizando y cargando los datos del archivo.</p>
                    </div>
                </div>
            )}

            {resultModalOpen && uploadSummary && (
                <div className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl p-6">
                        <h4 className="text-lg font-black text-slate-800 mb-2">Carga de datos finalizada</h4>
                        <p className="text-sm text-slate-600 mb-4">Resumen consolidado de factura y movimientos.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-xs font-bold text-slate-700 mb-2 uppercase">Factura</p>
                                <p className="text-xs text-slate-500 mb-2 break-all">{uploadSummary.factura.archivo}</p>
                                <p className="text-xs text-slate-500">Titulares en Excel</p>
                                <p className="text-lg font-black text-slate-800 mb-1">{uploadSummary.factura.totalTitularesExcel}</p>
                                <p className="text-xs text-slate-500">Error Subidas</p>
                                <p className="text-base font-black text-red-600 mb-1">{uploadSummary.factura.noSubidas}</p>
                                <p className="text-xs text-slate-500">Ya estaban guardadas</p>
                                <p className="text-base font-black text-blue-700 mb-1">{uploadSummary.factura.yaExistian}</p>
                                <p className="text-xs text-slate-500">Nuevos Subidos</p>
                                <p className="text-base font-black text-emerald-600">{uploadSummary.factura.totalTitularesExcel - uploadSummary.factura.noSubidas - uploadSummary.factura.yaExistian}</p>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-xs font-bold text-slate-700 mb-2 uppercase">Movimientos</p>
                                <p className="text-xs text-slate-500 mb-2 break-all">{uploadSummary.movimientos.archivo}</p>
                                <p className="text-xs text-slate-500">Titulares en Excel</p>
                                <p className="text-lg font-black text-slate-800 mb-1">{uploadSummary.movimientos.totalTitularesExcel}</p>
                                <p className="text-xs text-slate-500">Error Subidas</p>
                                <p className="text-base font-black text-red-600 mb-1">{uploadSummary.movimientos.noSubidas}</p>
                                <p className="text-xs text-slate-500">Ya estaban guardadas</p>
                                <p className="text-base font-black text-blue-700 mb-1">{uploadSummary.movimientos.yaExistian}</p>
                                <p className="text-xs text-slate-500">Nuevos Subidos</p>
                                <p className="text-base font-black text-emerald-600">{uploadSummary.movimientos.totalTitularesExcel - uploadSummary.movimientos.noSubidas - uploadSummary.movimientos.yaExistian}</p>
                            </div>
                        </div>

                        <div className="rounded-lg border border-slate-200 bg-white p-3 mb-5">
                            <p className="text-xs text-slate-500">Total de personas en el período después de cargar</p>
                            <p className="text-lg font-black text-slate-800">{uploadSummary.totalFinalPeriodo}</p>
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={() => {
                                    setResultModalOpen(false);
                                    setUploadSummary(null);
                                }}
                                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#001F3F] hover:bg-blue-900"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProveedorHumanaView;
