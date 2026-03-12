import { Fragment, useMemo, useState, useEffect } from 'react';
import { type HumanaEmployeeData } from '../../services/humanaStorage';
import { humanaApi } from '../../services/humanaApi';
import { Download } from 'lucide-react';
import ExcelJS from 'exceljs';

interface HumanaEmployee {
    cedula?: string;
    nombre: string;
    centroCosto: string;
    plan: string;
    tarifa: string;
    prima: number;
    ajuste: number;
    humanaAssist: number;
    seguroCampesino: number;
    trabajador: number;
    urbapark: number;
    totalUrbapark: number;
    total: number;
    fechaInclusion: string;
    fechaExclusion: string;
}

const HumanaView = () => {
    const [activeSubTab, setActiveSubTab] = useState<'detalle' | 'centros'>('detalle');
    const [expandedCentro, setExpandedCentro] = useState<string | null>(null);
    const [anioSeleccionado, setAnioSeleccionado] = useState(2026);
    const [mesSeleccionado, setMesSeleccionado] = useState('Febrero');
    const [empleadosData, setEmpleadosData] = useState<HumanaEmployee[]>([]);

    useEffect(() => {
        void loadData();
    }, [anioSeleccionado, mesSeleccionado]);

    const loadData = async () => {
        try {
            const data = await humanaApi.getData(anioSeleccionado, mesSeleccionado);
            const empleadosBd: HumanaEmployee[] = (data?.empleados || [])
                .map((emp: HumanaEmployeeData) => ({
                    cedula: emp.cedula || '',
                    nombre: `${emp.apellidos} ${emp.nombres}`.trim(),
                    centroCosto: emp.centroCosto,
                    plan: emp.plan,
                    tarifa: emp.tarifa,
                    prima: emp.prima,
                    ajuste: emp.ajuste,
                    humanaAssist: emp.humanaAssist || 0,
                    seguroCampesino: emp.seguroCampesino,
                    trabajador: emp.trabajador,
                    urbapark: emp.urbapark,
                    totalUrbapark: emp.totalUrbapark,
                    total: emp.prima,
                    fechaInclusion: emp.fechaInclusion,
                    fechaExclusion: !emp.fechaExclusion || emp.fechaExclusion === '---' ? '—' : emp.fechaExclusion,
                }));

            setEmpleadosData(empleadosBd);
        } catch (error) {
            console.error('Error cargando datos de Humana desde BD:', error);
            setEmpleadosData([]);
        }
    };

    const trunc2 = (value: number) => Math.round(value * 100) / 100;

    const estadoMovimiento = (ajuste: number) => {
        if (ajuste > 0) return 'nuevo';
        if (ajuste < 0) return 'salida';
        return 'normal';
    };

    const exportarAExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Factura');

        const headers = ['Empleado', 'Centro', 'Plan', 'Tarifa', 'Trabajador Rol', 'Urbapark', 'Prima', 'Ajuste', 'Assist', 'Seguro', 'F. Ingreso', 'F. Exclusión'];
        const headerRow = worksheet.addRow(headers);

        headerRow.font = { bold: true, size: 11 };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

        headers.forEach((_, idx) => {
            headerRow.getCell(idx + 1).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        });

        empleadosOrdenados.forEach((emp) => {
            const esExcluido = emp.ajuste < 0;
            const trabajadorExcel = esExcluido ? 0 : (emp.trabajador || 0);
            const primaExcel = esExcluido ? 0 : (emp.prima || 0);
            const seguroExcel = esExcluido ? 0 : (emp.seguroCampesino || 0);
            const assistExcel = esExcluido ? 0 : (emp.humanaAssist || 0);

            const row = worksheet.addRow([
                emp.nombre,
                emp.centroCosto,
                emp.plan,
                emp.tarifa,
                trabajadorExcel,
                emp.urbapark || 0,
                primaExcel,
                emp.ajuste || 0,
                assistExcel,
                seguroExcel,
                emp.fechaInclusion || '—',
                emp.fechaExclusion,
            ]);

            // Mantener formato general para visualizar y usar el valor exacto almacenado.
            row.getCell(5).numFmt = 'General';
            row.getCell(6).numFmt = 'General';
            row.getCell(7).numFmt = 'General';
            row.getCell(8).numFmt = 'General';
            row.getCell(9).numFmt = 'General';
            row.getCell(10).numFmt = 'General';

            // Colorear solo las celdas de la tabla (sin extender a columnas vacias).
            const fillColor = emp.ajuste > 0 ? 'FFC6EFCE' : emp.ajuste < 0 ? 'FFFFC7CE' : null;

            // Aplicar bordes, alineacion y color por celda.
            row.alignment = { horizontal: 'left', vertical: 'middle' };
            row.eachCell((cell, colNumber) => {
                if (fillColor) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
                }
                cell.font = { color: { argb: 'FF000000' } };
                cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
                if (colNumber > 4) {
                    cell.alignment = { horizontal: 'right' };
                }
            });
        });

        // Ajustar ancho de columnas
        worksheet.columns = [
            { width: 25 },
            { width: 15 },
            { width: 15 },
            { width: 12 },
            { width: 14 },
            { width: 12 },
            { width: 12 },
            { width: 12 },
            { width: 10 },
            { width: 12 },
            { width: 14 },
            { width: 14 },
        ];

        const fileName = `Factura_Humana_${mesSeleccionado}_${anioSeleccionado}.xlsx`;
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const empleadosFiltrados = useMemo(() => empleadosData, [empleadosData]);

    const empleadosOrdenados = useMemo(() => {
        const nuevos = empleadosFiltrados.filter(e => e.ajuste > 0).sort((a, b) => a.nombre.localeCompare(b.nombre));
        const excluidos = empleadosFiltrados.filter(e => e.ajuste < 0).sort((a, b) => a.nombre.localeCompare(b.nombre));
        const otros = empleadosFiltrados.filter(e => e.ajuste === 0 || e.ajuste === null).sort((a, b) => a.nombre.localeCompare(b.nombre));
        return [...nuevos, ...excluidos, ...otros];
    }, [empleadosFiltrados]);

    const agrupadoPorCentro = useMemo(() => {
        return empleadosFiltrados.reduce<Record<string, { totalTrabajador: number; totalUrbapark: number; totalFactura: number; empleados: HumanaEmployee[] }>>((acc, emp) => {
            const centro = emp.centroCosto;

            if (!acc[centro]) {
                acc[centro] = {
                    totalTrabajador: 0,
                    totalUrbapark: 0,
                    totalFactura: 0,
                    empleados: [],
                };
            }

            acc[centro].totalTrabajador += emp.trabajador;
            acc[centro].totalUrbapark += emp.totalUrbapark;
            acc[centro].totalFactura += emp.prima;
            acc[centro].empleados.push(emp);

            return acc;
        }, {});
    }, [empleadosFiltrados]);

    const centrosFiltrados = useMemo(() => Object.keys(agrupadoPorCentro), [agrupadoPorCentro]);

    return (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-white flex flex-wrap gap-4 items-center">
                <div>
                    <label className="block text-xs text-slate-400 mb-1">Año</label>
                    <select
                        value={anioSeleccionado}
                        onChange={(e) => setAnioSeleccionado(Number(e.target.value))}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                    >
                        <option value={2024}>2024</option>
                        <option value={2025}>2025</option>
                        <option value={2026}>2026</option>
                    </select>
                </div>

                <div>
                    <label className="block text-xs text-slate-400 mb-1">Mes</label>
                    <select
                        value={mesSeleccionado}
                        onChange={(e) => setMesSeleccionado(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                    >
                        <option>Enero</option>
                        <option>Febrero</option>
                        <option>Marzo</option>
                        <option>Abril</option>
                        <option>Mayo</option>
                        <option>Junio</option>
                        <option>Julio</option>
                        <option>Agosto</option>
                        <option>Septiembre</option>
                        <option>Octubre</option>
                        <option>Noviembre</option>
                        <option>Diciembre</option>
                    </select>
                </div>
            </div>

            <div className="flex border-b border-slate-200 bg-slate-50">
                <button
                    onClick={() => setActiveSubTab('detalle')}
                    className={`px-6 py-3 text-sm font-semibold transition ${activeSubTab === 'detalle' ? 'border-b-2 border-indigo-600 text-indigo-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Detalle
                </button>

                <button
                    onClick={() => setActiveSubTab('centros')}
                    className={`px-6 py-3 text-sm font-semibold transition ${activeSubTab === 'centros' ? 'border-b-2 border-indigo-600 text-indigo-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Centros de Costo
                </button>
            </div>

            {activeSubTab === 'detalle' && (
                <>
                    <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h2 className="text-xl font-black text-slate-800">Factura</h2>
                        <button
                            onClick={exportarAExcel}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition"
                        >
                            <Download size={16} />
                            Exportar Excel
                        </button>
                    </div>

                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-400 text-[11px] uppercase font-bold tracking-wider border-b border-slate-100 sticky top-0">
                                <tr>
                                    <th className="px-3 py-4 w-12 text-center">N</th>
                                    <th className="px-4 py-4 min-w-[150px]">Empleado</th>
                                    <th className="px-4 py-4 min-w-[140px]">Centro</th>
                                    <th className="px-4 py-4 min-w-[80px]">Plan</th>
                                    <th className="px-4 py-4 min-w-[70px]">Tarifa</th>
                                    <th className="px-4 py-4 text-right min-w-[100px]">Trabajador Rol</th>
                                    <th className="px-4 py-4 text-right min-w-[90px]">Urbapark</th>
                                    <th className="px-4 py-4 text-right min-w-[80px]">Prima</th>
                                    <th className="px-4 py-4 text-right min-w-[80px]">Ajuste</th>
                                    <th className="px-4 py-4 text-right min-w-[70px]">Assist</th>
                                    <th className="px-4 py-4 text-right min-w-[80px]">Seguro</th>
                                    <th className="px-4 py-4 min-w-[120px]">F. Ingreso</th>
                                    <th className="px-4 py-4 min-w-[120px]">F. Exclusión</th>
                                </tr>
                            </thead>

                            <tbody>
                                {empleadosOrdenados.length === 0 ? (
                                    <tr>
                                        <td colSpan={13} className="px-6 py-8 text-center text-slate-400">
                                            No hay datos disponibles para {mesSeleccionado} {anioSeleccionado}. Por favor cargue un archivo desde "Proveedor Humana".
                                        </td>
                                    </tr>
                                ) : (
                                    empleadosOrdenados.map((emp, index) => {
                                        const estado = estadoMovimiento(emp.ajuste);

                                        return (
                                            <tr key={index} className="border-b hover:bg-slate-50 text-[10px]">
                                                <td className="px-3 py-3 text-center">
                                                    {estado === 'nuevo' && (
                                                        <span className="flex justify-center items-center w-5 h-5 bg-emerald-500 rounded-full text-white text-[12px]">🡅</span>
                                                    )}
                                                    {estado === 'salida' && (
                                                        <span className="flex justify-center items-center w-5 h-5 bg-red-500 rounded-full text-white text-[12px]">🡇</span>
                                                    )}
                                                </td>

                                                <td className="px-4 py-3 font-semibold">{emp.nombre}</td>
                                                <td className="px-4 py-3">{emp.centroCosto}</td>
                                                <td className="px-4 py-3">{emp.plan}</td>
                                                <td className="px-4 py-3">{emp.tarifa}</td>
                                                <td className="px-4 py-3 text-right">${trunc2(emp.trabajador).toFixed(2)}</td>
                                                <td className="px-4 py-3 text-right">${trunc2(emp.urbapark).toFixed(2)}</td>
                                                <td className="px-4 py-3 text-right">${trunc2(emp.prima).toFixed(2)}</td>
                                                <td className="px-4 py-3 text-right">${trunc2(emp.ajuste).toFixed(2)}</td>
                                                <td className="px-4 py-3 text-right">${trunc2(emp.humanaAssist).toFixed(2)}</td>
                                                <td className="px-4 py-3 text-right">${trunc2(emp.seguroCampesino).toFixed(2)}</td>
                                                <td className="px-4 py-3 min-w-[120px]">{emp.fechaInclusion || '—'}</td>
                                                <td className="px-4 py-3 min-w-[120px]">{emp.fechaExclusion}</td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {activeSubTab === 'centros' && (
                <>
                    <div className="p-6 border-b border-slate-100 bg-slate-50">
                        <h2 className="text-xl font-black text-slate-800">Distribuido</h2>
                    </div>

                    <div className="p-6">
                        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                            <table className="w-full text-left text-[11px]">
                                <thead className="bg-slate-50 text-slate-400 uppercase font-bold tracking-wider border-b border-slate-200 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 w-8"></th>
                                        <th className="px-4 py-3 min-w-[180px]">Centro de Costo</th>
                                        <th className="px-4 py-3 text-right min-w-[110px]">Total Urbapark</th>
                                        <th className="px-4 py-3 text-right min-w-[120px]">Total Trabajador</th>
                                        <th className="px-4 py-3 text-right min-w-[100px]">Total General</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {centrosFiltrados.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                                                No hay centros de costo disponibles para este período.
                                            </td>
                                        </tr>
                                    ) : (
                                        centrosFiltrados.map((centro, index) => {
                                            const empleados = agrupadoPorCentro[centro].empleados;
                                            const data = agrupadoPorCentro[centro];
                                            const esExpandible = empleados.length > 1;
                                            const estaAbierto = expandedCentro === centro;

                                            return (
                                                <Fragment key={`${centro}-${index}`}>
                                                    <tr
                                                        className={`border-b cursor-pointer hover:bg-slate-50 ${estaAbierto ? 'bg-slate-50' : ''}`}
                                                        onClick={() => esExpandible && setExpandedCentro(estaAbierto ? null : centro)}
                                                    >
                                                        <td className="px-4 py-3 text-center">
                                                            {esExpandible && (
                                                                <span className={`inline-block transition-transform duration-200 ${estaAbierto ? 'rotate-0' : '-rotate-90'} font-bold text-slate-500`}>
                                                                    ▼
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 font-semibold text-slate-700">{centro}</td>
                                                        <td className="px-4 py-3 text-right font-semibold">${trunc2(data.totalUrbapark).toFixed(2)}</td>
                                                        <td className="px-4 py-3 text-right font-semibold">${trunc2(data.totalTrabajador).toFixed(2)}</td>
                                                        <td className="px-4 py-3 text-right font-bold text-slate-900">${trunc2(data.totalFactura).toFixed(2)}</td>
                                                    </tr>

                                                    {estaAbierto &&
                                                        empleados.map((emp, i) => {
                                                            return (
                                                                <tr key={`${centro}-${emp.nombre}-${i}`} className="bg-white border-b text-[10px]">
                                                                    <td></td>
                                                                    <td className="px-8 py-2 text-slate-600">{emp.nombre}</td>
                                                                    <td className="px-4 py-2 text-right">${trunc2(emp.totalUrbapark).toFixed(2)}</td>
                                                                    <td className="px-4 py-2 text-right">${trunc2(emp.trabajador).toFixed(2)}</td>
                                                                    <td className="px-4 py-2 text-right font-semibold">${trunc2(emp.prima).toFixed(2)}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                </Fragment>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default HumanaView;
