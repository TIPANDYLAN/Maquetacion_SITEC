import type { CuentaPyG } from '../../types';
import { List, Download } from 'lucide-react';

interface PyGReportTableProps {
    periodo: string;
    centroCosto: string;
    ingresosData: CuentaPyG[];
    gastosData: CuentaPyG[];
    onViewDetail: () => void;
    onDownloadExcel: () => void;
}

export default function PyGReportTable({
    periodo,
    centroCosto,
    ingresosData,
    gastosData,
    onViewDetail,
    onDownloadExcel
}: PyGReportTableProps) {
    const parseC = (val: string) => {
        if (!val || val === '-') return 0;
        return parseFloat(val.replace(/\./g, '').replace(',', '.'));
    };

    const formatC = (val: number) => {
        if (val === 0) return '-';
        return val.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const ingresosValidos = ingresosData.filter(c => c.tipo === 'cuenta' && c.descripcion.trim() !== '');
    const gastosValidos = gastosData.filter(c => c.tipo === 'grupo' && c.descripcion.trim() !== '');
    const gastosOperacion = gastosValidos.filter(g => g.codigo !== '5.13');
    const gastosAdmin = gastosValidos.find(g => g.codigo === '5.13');

    // Cálculos para dos meses (Diciembre 2025 y Enero 2026 como ejemplo)
    const totalIngEne = ingresosValidos.reduce((sum, item) => sum + parseC(item.total), 0);
    const totalIngDic = totalIngEne * 0.95;
    const totalIngAcum = totalIngEne + totalIngDic;

    const totalGastosOpEne = gastosOperacion.reduce((sum, item) => sum + parseC(item.total), 0);
    const totalGastosOpDic = totalGastosOpEne * 0.85;
    const totalGastosOpAcum = totalGastosOpEne + totalGastosOpDic;

    const adminEne = gastosAdmin ? parseC(gastosAdmin.total) : 0;
    const adminDic = adminEne * 0.85;
    const adminAcum = adminEne + adminDic;

    const totalGastosEne = totalGastosOpEne + adminEne;
    const totalGastosDic = totalGastosOpDic + adminDic;
    const totalGastosAcum = totalGastosOpAcum + adminAcum;

    const utilEne = totalIngEne - totalGastosEne;
    const utilDic = totalIngDic - totalGastosDic;
    const utilAcum = totalIngAcum - totalGastosAcum;

    const CurrencyCell = ({ value, isBold = false, bgClass = 'bg-white' }: { value: string; isBold?: boolean; bgClass?: string }) => (
        <td className={`px-3 py-1.5 border border-slate-300 ${bgClass} ${isBold ? 'font-bold' : ''} ${isBold ? 'text-slate-800' : 'text-slate-700'}`}>
            <div className="flex justify-between items-center w-full min-w-[90px] whitespace-nowrap">
                <span className="mr-4 font-normal opacity-80">$</span>
                <span>{value}</span>
            </div>
        </td>
    );

    const TableHeader = ({ title }: { title: string }) => (
        <thead className="bg-[#1c2938] text-white text-[10px] uppercase font-bold tracking-wider">
            <tr>
                <th style={{ width: '45%' }} className="px-4 py-3 border-r border-[#2d3f56]">{title}</th>
                <th style={{ width: '16%' }} className="px-4 py-3 text-center border-r border-[#2d3f56]">DICIEMBRE 2025</th>
                <th style={{ width: '16%' }} className="px-4 py-3 text-center">ENERO</th>
                <th style={{ width: '3%' }} className="bg-white border-none"></th>
                <th style={{ width: '20%' }} className="px-4 py-3 text-center bg-[#1c2938]">ACUMULADO</th>
            </tr>
        </thead>
    );

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm overflow-x-auto space-y-6">
            {/* Titulo del reporte */}
            <div className="mb-4">
                <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">Proyecto: {centroCosto}</p>
                <p className="text-xs text-slate-500">{periodo}</p>
            </div>

            {/* TABLA 1: INGRESOS */}
            <table className="w-full min-w-[900px] text-left border-collapse mb-4">
                <TableHeader title="INGRESOS" />
                <tbody>
                    {ingresosValidos.map((ingreso, idx) => {
                        const valEne = parseC(ingreso.total);
                        const valDic = valEne * 0.95;
                        return (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-2 border-b border-l border-slate-200 text-[11px] font-medium text-slate-700">{ingreso.descripcion}</td>
                                <CurrencyCell value={formatC(valDic)} />
                                <CurrencyCell value={formatC(valEne)} />
                                <td className="bg-white border-none"></td>
                                <CurrencyCell value={formatC(valEne + valDic)} bgClass="bg-slate-50" />
                            </tr>
                        );
                    })}
                    <tr>
                        <td className="px-4 py-2 bg-[#1c2938] text-white text-right font-bold text-xs uppercase border border-[#1c2938]">TOTAL INGRESOS</td>
                        <CurrencyCell value={formatC(totalIngDic)} bgClass="bg-slate-200" isBold={true} />
                        <CurrencyCell value={formatC(totalIngEne)} bgClass="bg-slate-200" isBold={true} />
                        <td className="bg-white border-none"></td>
                        <CurrencyCell value={formatC(totalIngAcum)} bgClass="bg-slate-200" isBold={true} />
                    </tr>
                </tbody>
            </table>

            {/* TABLA 2: GASTOS */}
            <table className="w-full min-w-[900px] text-left border-collapse mb-1">
                <TableHeader title="GASTOS" />
                <tbody>
                    {gastosOperacion.map((gasto, idx) => {
                        const valEne = parseC(gasto.total);
                        const valDic = valEne * 0.85;
                        return (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-2 border-b border-l border-slate-200 text-[11px] font-medium text-slate-700">{gasto.descripcion}</td>
                                <CurrencyCell value={formatC(valDic)} />
                                <CurrencyCell value={formatC(valEne)} />
                                <td className="bg-white border-none"></td>
                                <CurrencyCell value={formatC(valEne + valDic)} bgClass="bg-slate-50" />
                            </tr>
                        );
                    })}
                    <tr>
                        <td className="px-4 py-2 bg-[#1c2938] text-white text-right font-bold text-xs uppercase border border-[#1c2938]">TOTAL GASTOS DE OPERACIÓN</td>
                        <CurrencyCell value={formatC(totalGastosOpDic)} bgClass="bg-slate-200" isBold={true} />
                        <CurrencyCell value={formatC(totalGastosOpEne)} bgClass="bg-slate-200" isBold={true} />
                        <td className="bg-white border-none"></td>
                        <CurrencyCell value={formatC(totalGastosOpAcum)} bgClass="bg-slate-200" isBold={true} />
                    </tr>
                </tbody>
            </table>

            {/* TABLA 3: GASTOS ADMINISTRATIVOS */}
            <table className="w-full min-w-[900px] text-left border-collapse mb-4 mt-4">
                <tbody>
                    <tr>
                        <td style={{ width: '45%' }} className="px-4 py-2 bg-[#1c2938] text-white text-right border border-[#1c2938]">
                            <div className="font-bold uppercase text-xs">GASTOS ADMINISTRATIVOS</div>
                            <div className="text-[9px] opacity-80 font-normal leading-tight mt-0.5">(Gestion Contable, tecnica, compras, TTHH, comercial)</div>
                        </td>
                        <CurrencyCell value={formatC(adminDic)} bgClass="bg-slate-200" isBold={true} />
                        <CurrencyCell value={formatC(adminEne)} bgClass="bg-slate-200" isBold={true} />
                        <td style={{ width: '3%' }} className="bg-white border-none"></td>
                        <CurrencyCell value={formatC(adminAcum)} bgClass="bg-slate-200" isBold={true} />
                    </tr>
                </tbody>
            </table>

            {/* TABLA 4: GASTOS TOTALES */}
            <table className="w-full min-w-[900px] text-left border-collapse mb-4 mt-6">
                <tbody>
                    <tr>
                        <td style={{ width: '45%' }} className="px-4 py-3 bg-[#1c2938] text-white text-right font-bold text-xs uppercase border border-[#1c2938]">GASTOS TOTALES</td>
                        <CurrencyCell value={formatC(totalGastosDic)} bgClass="bg-slate-200" isBold={true} />
                        <CurrencyCell value={formatC(totalGastosEne)} bgClass="bg-slate-200" isBold={true} />
                        <td style={{ width: '3%' }} className="bg-white border-none"></td>
                        <CurrencyCell value={formatC(totalGastosAcum)} bgClass="bg-slate-200" isBold={true} />
                    </tr>
                </tbody>
            </table>

            {/* TABLA 5: UTILIDAD / PERDIDA */}
            <table className="w-full text-left border-collapse mt-4 mb-8">
                <tbody>
                    <tr>
                        <td style={{ width: '45%' }} className="px-4 py-3 bg-[#d46b28] text-white text-right font-bold text-xs uppercase border border-[#d46b28]">UTILIDAD / PERDIDA</td>
                        <CurrencyCell value={formatC(utilDic)} bgClass="bg-slate-200" isBold={true} />
                        <CurrencyCell value={formatC(utilEne)} bgClass="bg-slate-200" isBold={true} />
                        <td style={{ width: '3%' }} className="bg-white border-none"></td>
                        <CurrencyCell value={formatC(utilAcum)} bgClass="bg-slate-200" isBold={true} />
                    </tr>
                </tbody>
            </table>

            {/* Botones de acción */}
            <div className="flex justify-start gap-4 pt-4 border-t border-slate-200">
                <button
                    onClick={onViewDetail}
                    className="px-8 py-3 rounded-xl bg-[#001F3F] text-white font-bold hover:bg-blue-900 shadow-lg shadow-blue-900/20 active:scale-95 transition-all text-sm flex items-center gap-2"
                >
                    <List size={18} />
                    Ver Detalle
                </button>
                <button
                    onClick={onDownloadExcel}
                    className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all text-sm flex items-center gap-2"
                >
                    <Download size={18} />
                    Descargar Excel
                </button>
            </div>
        </div>
    );
}
