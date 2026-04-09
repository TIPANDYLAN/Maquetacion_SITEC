import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, Building, Calendar, ChevronDown, Download, Edit, Filter, List, Pencil, Plus, Save, Settings2, Trash2, X } from 'lucide-react';
import type { CuentaPyG, FiltrosPyG } from '../../types';
import { dbApi } from '../../services/dbApi';
import { getNominaCostCenters, type NominaCostCenter } from '../../services/n8nApi';

interface PyGReportTableProps {
    periodo: string;
    centroCosto: string;
    ingresosData: CuentaPyG[];
    gastosData: CuentaPyG[];
    onViewDetail: () => void;
    onDownloadExcel: () => void;
}

interface PyGDetalleViewProps {
    periodo: string;
    centroCosto: string;
    ingresosData: CuentaPyG[];
    gastosData: CuentaPyG[];
    onBack?: () => void;
    onConfiguracionSaved?: () => void;
}

interface PyGCuentasViewProps {
    periodo: string;
    tipo?: 'ingresos' | 'gastos';
    ingresosData: CuentaPyG[];
    setIngresosData: (data: CuentaPyG[]) => void;
    gastosData: CuentaPyG[];
    setGastosData: (data: CuentaPyG[]) => void;
}

interface RubroPeriodoOption {
    codigoCuenta: string;
    nombreCuenta: string;
    valor: number;
}

interface CuentaConfiguracionOption {
    codigoAgrupacion: string;
    nombreAgrupacion: string;
    codigoGrupoCuenta: string;
    nombreGrupoCuenta: string;
    codigoCuenta: string;
    nombreCuenta: string;
}

interface ConfiguracionCentroCostoOption {
    codigo: string;
    nombre: string;
    grupoCuenta: string;
    nombreGrupoCuenta: string;
    tipoCalculo: 'V' | 'P';
    valor: number;
}

export default function PyGView() {
    const [filtros, setFiltros] = useState<FiltrosPyG>({
        periodo: '2026-03',
        tipoReporte: 'por_proyecto',
        centroCosto: ''
    });

    const [ingresosData, setIngresosData] = useState<CuentaPyG[]>([]);
    const [gastosData, setGastosData] = useState<CuentaPyG[]>([]);
    const [showDetailView, setShowDetailView] = useState(false);
    const [centrosCosto, setCentrosCosto] = useState<NominaCostCenter[]>([]);
    const [loadingCentros, setLoadingCentros] = useState(false);
    const [configRefreshKey, setConfigRefreshKey] = useState(0);

    useEffect(() => {
        setLoadingCentros(true);
        getNominaCostCenters()
            .then((data) => {
                console.log('[PyG] Centros de costo cargados desde n8n:', data.length);
                setCentrosCosto(data);
            })
            .catch((error) => {
                console.error('[PyG] Error al cargar centros de costo desde n8n:', error instanceof Error ? error.message : error);
            })
            .finally(() => setLoadingCentros(false));
    }, []);

    const isGeneralReport = filtros.tipoReporte === 'general';
    const canShowProjectReport = Boolean(filtros.periodo && filtros.tipoReporte === 'por_proyecto' && filtros.centroCosto);

    const formatMonto = (val: number) => {
        if (!Number.isFinite(val)) return '-';
        if (val === 0) return '-';
        return val.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const mapRubrosToCuentas = (rubros: RubroPeriodoOption[], tipo: 'ingresos' | 'gastos'): CuentaPyG[] => {
        const rowTipo: CuentaPyG['tipo'] = tipo === 'ingresos' ? 'cuenta' : 'grupo';

        const mapped: CuentaPyG[] = rubros
            .map((item) => ({
                codigo: String(item.codigoCuenta || '').trim(),
                descripcion: String(item.nombreCuenta || '').trim(),
                tipo: rowTipo,
                total: formatMonto(Number(item.valor || 0)),
            }))
            .filter((item) => item.codigo);

        mapped.sort((a, b) => a.codigo.localeCompare(b.codigo, 'es', { numeric: true, sensitivity: 'base' }));
        return mapped;
    };

    const mergeRubrosWithConfiguracion = (
        baseRows: CuentaPyG[],
        configuraciones: ConfiguracionCentroCostoOption[],
        tipo: 'ingresos' | 'gastos',
    ): CuentaPyG[] => {
        const rowTipo: CuentaPyG['tipo'] = tipo === 'ingresos' ? 'cuenta' : 'grupo';
        const mergedByCodigo = new Map<string, CuentaPyG>();

        baseRows.forEach((row) => {
            const codigo = String(row.codigo || '').trim();
            if (!codigo) return;
            mergedByCodigo.set(codigo, row);
        });

        configuraciones.forEach((item) => {
            const codigo = String(item.grupoCuenta || '').trim();
            if (!codigo) return;

            const baseRow = mergedByCodigo.get(codigo);
            mergedByCodigo.set(codigo, {
                codigo,
                descripcion: String(item.nombre || '').trim() || baseRow?.descripcion || '',
                tipo: baseRow?.tipo || rowTipo,
                total: formatMonto(Number(item.valor || 0)),
            });
        });

        return Array.from(mergedByCodigo.values()).sort((a, b) =>
            a.codigo.localeCompare(b.codigo, 'es', { numeric: true, sensitivity: 'base' })
        );
    };

    useEffect(() => {
        if (!canShowProjectReport) {
            setIngresosData([]);
            setGastosData([]);
            return;
        }

        let isCancelled = false;

        void Promise.all([
            dbApi.contabilidad.pyg.getRubrosPeriodo<{
                ok?: boolean;
                rubros?: RubroPeriodoOption[];
            }>({
                centroCosto: filtros.centroCosto,
                periodo: filtros.periodo,
                tipo: 'ingresos',
            }),
            dbApi.contabilidad.pyg.getRubrosPeriodo<{
                ok?: boolean;
                rubros?: RubroPeriodoOption[];
            }>({
                centroCosto: filtros.centroCosto,
                periodo: filtros.periodo,
                tipo: 'gastos',
            }),
            dbApi.contabilidad.pyg.getConfiguracionCentroCosto<{
                ok?: boolean;
                configuraciones?: ConfiguracionCentroCostoOption[];
            }>({
                centroCosto: filtros.centroCosto,
                periodo: filtros.periodo,
                tipo: 'ingresos',
            }),
            dbApi.contabilidad.pyg.getConfiguracionCentroCosto<{
                ok?: boolean;
                configuraciones?: ConfiguracionCentroCostoOption[];
            }>({
                centroCosto: filtros.centroCosto,
                periodo: filtros.periodo,
                tipo: 'gastos',
            }),
        ])
            .then(([ingresosRubrosResponse, gastosRubrosResponse, ingresosConfigResponse, gastosConfigResponse]) => {
                if (isCancelled) return;

                const ingresosRubros = Array.isArray(ingresosRubrosResponse?.rubros)
                    ? ingresosRubrosResponse.rubros
                    : [];
                const gastosRubros = Array.isArray(gastosRubrosResponse?.rubros)
                    ? gastosRubrosResponse.rubros
                    : [];
                const ingresosConfiguraciones = Array.isArray(ingresosConfigResponse?.configuraciones)
                    ? ingresosConfigResponse.configuraciones
                    : [];
                const gastosConfiguraciones = Array.isArray(gastosConfigResponse?.configuraciones)
                    ? gastosConfigResponse.configuraciones
                    : [];

                setIngresosData(
                    mergeRubrosWithConfiguracion(
                        mapRubrosToCuentas(ingresosRubros, 'ingresos'),
                        ingresosConfiguraciones,
                        'ingresos',
                    ),
                );
                setGastosData(
                    mergeRubrosWithConfiguracion(
                        mapRubrosToCuentas(gastosRubros, 'gastos'),
                        gastosConfiguraciones,
                        'gastos',
                    ),
                );
            })
            .catch((error) => {
                if (isCancelled) return;

                setIngresosData([]);
                setGastosData([]);
                console.error('[PyG] Error al cargar rubros/configuraciones de PyG desde BD:', error instanceof Error ? error.message : error);
            });

        return () => {
            isCancelled = true;
        };
    }, [canShowProjectReport, filtros.centroCosto, filtros.periodo, configRefreshKey]);

    useEffect(() => {
        if (filtros.tipoReporte !== 'por_proyecto') return;
        if (!filtros.periodo || !filtros.centroCosto) return;

        const [yearRaw, monthRaw] = filtros.periodo.split('-');
        const year = Number(yearRaw || 0);
        const month = Number(monthRaw || 0);

        if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
            console.warn('[PyG] Periodo invalido para ejecutar SP:', filtros.periodo);
            return;
        }

        const firstDay = new Date(year, month - 1, 1);
        const firstDayNextMonth = new Date(year, month, 1);
        const toIsoLocal = (date: Date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };

        const fechaIni = toIsoLocal(firstDay);
        const fechaFin = toIsoLocal(firstDayNextMonth);
        const anio = String(year);
        const centroCosto = String(filtros.centroCosto || '').trim();

        console.log('[PyG] Ejecutando SP sp_reporte_pyg_filtrado con filtros', {
            centroCosto,
            fechaIni,
            fechaFin,
            anio,
        });

        void dbApi.contabilidad.pyg.ejecutarSpFiltrado({
            centroCosto,
            fechaIni,
            fechaFin,
            anio,
        })
            .then((response) => {
                const estado = String((response as { message?: string; mode?: string })?.message || (response as { message?: string; mode?: string })?.mode || '').trim().toLowerCase();
                if (estado === 'ya registrado') {
                    console.log('[PyG] ya registrado');
                    return;
                }

                if (estado === 'sp utilizado' || estado === 'sp_utilizado') {
                    console.log('[PyG] sp utilizado');
                    return;
                }

                console.log('[PyG] Estado de ejecucion:', response);
            })
            .catch((error) => {
                console.error('[PyG] Error al ejecutar SP de PyG', error instanceof Error ? error.message : error);
            });
    }, [filtros.periodo, filtros.tipoReporte, filtros.centroCosto]);

    const handleDownloadExcel = () => {
        alert(`Descargando Excel para ${filtros.centroCosto || 'Reporte General'} - ${filtros.periodo}`);
    };

    const handleViewDetail = () => {
        setShowDetailView(true);
    };

    // Si está en vista de detalle, mostrar ese componente
    if (showDetailView) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <PyGDetalleView
                    periodo={filtros.periodo}
                    centroCosto={filtros.centroCosto}
                    ingresosData={ingresosData}
                    gastosData={gastosData}
                    onBack={() => setShowDetailView(false)}
                    onConfiguracionSaved={() => setConfigRefreshKey((prev) => prev + 1)}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <BarChart3 size={24} />
                </div>
                <h2 className="text-2xl font-black text-slate-800">Pérdidas y Ganancias (PyG)</h2>
            </div>

            {/* Filtros Principales */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mb-8">
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Período */}
                    <div className="w-full md:w-1/4">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                            Periodo
                        </label>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="month"
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-700 cursor-pointer font-medium focus:border-[#001F3F] transition-all"
                                value={filtros.periodo}
                                onChange={(e) => setFiltros({ ...filtros, periodo: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Tipo de Reporte */}
                    <div className="w-full md:w-1/4">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                            Tipo de Reporte
                        </label>
                        <div className="relative">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <select
                                className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-700 cursor-pointer font-medium focus:border-[#001F3F] transition-all"
                                value={filtros.tipoReporte}
                                onChange={(e) => setFiltros({ ...filtros, tipoReporte: e.target.value as any, centroCosto: '' })}
                            >
                                <option value="por_proyecto">Por Proyecto</option>
                                <option value="general">Consolidado General</option>
                            </select>
                            <BarChart3 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>
                    </div>

                    {/* Selector de Proyecto/Parqueadero - Condicional */}
                    {filtros.tipoReporte === 'por_proyecto' && (
                        <div className="w-full md:w-2/4 animate-in fade-in duration-300">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                                Proyectos/Parqueaderos
                            </label>
                            <div className="relative">
                                <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <select
                                    className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-700 cursor-pointer font-medium focus:border-[#001F3F] transition-all disabled:opacity-50"
                                    value={filtros.centroCosto}
                                    onChange={(e) => setFiltros({ ...filtros, centroCosto: e.target.value })}
                                    disabled={loadingCentros}
                                >
                                    <option value="">
                                        {loadingCentros ? 'Cargando...' : 'Seleccione proyecto...'}
                                    </option>
                                    {centrosCosto.map((cc) => (
                                        <option key={cc.IDCENTROCOSTO} value={cc.IDCENTROCOSTO}>
                                            {cc.CENTROCOSTO}
                                        </option>
                                    ))}
                                </select>
                                <Building className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Mostrar tabla solo para reporte por proyecto */}
            {canShowProjectReport ? (
                <PyGReportTable
                    periodo={filtros.periodo}
                    centroCosto={centrosCosto.find(cc => cc.IDCENTROCOSTO === filtros.centroCosto)?.CENTROCOSTO || filtros.centroCosto || 'Consolidado General'}
                    ingresosData={ingresosData}
                    gastosData={gastosData}
                    onViewDetail={handleViewDetail}
                    onDownloadExcel={handleDownloadExcel}
                />
            ) : !isGeneralReport ? (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 text-center animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex flex-col items-center gap-4">
                        <div className="p-3 bg-blue-50 rounded-full">
                            <Filter size={40} className="text-blue-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700">Selecciona los filtros</h3>
                        <p className="text-slate-500">
                            {filtros.tipoReporte === 'por_proyecto'
                                ? 'Selecciona un período y un proyecto/parqueadero para ver el reporte'
                                : 'Selecciona un período para ver el reporte consolidado'}
                        </p>
                    </div>
                </div>
            ) : null}

            {/* Tab de administración de cuentas (opcional, si lo necesitas) */}
            {/* <PyGCuentasView ... /> */}
        </div>
    );
}

function PyGReportTable({
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

    const ingresosValidos = ingresosData.filter(c => c.tipo === 'cuenta');
    const gastosValidos = gastosData.filter(c => c.tipo === 'grupo');
    const gastosOperacion = gastosValidos.filter(g => g.codigo !== '5.13');
    const gastosAdmin = gastosValidos.find(g => g.codigo === '5.13');

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
            <div className="mb-4">
                <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">Proyecto: {centroCosto}</p>
                <p className="text-xs text-slate-500">{periodo}</p>
            </div>

            <table className="w-full min-w-[900px] text-left border-collapse mb-4">
                <TableHeader title="INGRESOS" />
                <tbody>
                    {ingresosValidos.map((ingreso, idx) => {
                        const valEne = parseC(ingreso.total);
                        const valDic = valEne * 0.95;
                        return (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-2 border-b border-l border-slate-200 text-[11px] font-medium text-slate-700">{ingreso.descripcion || 'Sin nombre asignado'}</td>
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

            <table className="w-full min-w-[900px] text-left border-collapse mb-1">
                <TableHeader title="GASTOS" />
                <tbody>
                    {gastosOperacion.map((gasto, idx) => {
                        const valEne = parseC(gasto.total);
                        const valDic = valEne * 0.85;
                        return (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-2 border-b border-l border-slate-200 text-[11px] font-medium text-slate-700">{gasto.descripcion || 'Sin nombre asignado'}</td>
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

function PyGDetalleView({
    periodo,
    centroCosto,
    ingresosData,
    gastosData,
    onBack,
    onConfiguracionSaved
}: PyGDetalleViewProps) {
    const [cuentasTipo, setCuentasTipo] = useState<'ingresos' | 'gastos' | null>(null);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [editingCuentaValue, setEditingCuentaValue] = useState<CuentaPyG | null>(null);
    const [isQuantityEditable, setIsQuantityEditable] = useState(false);
    const [porcentajeAplicado, setPorcentajeAplicado] = useState('');
    const [originalTotalVal, setOriginalTotalVal] = useState(0);
    const [configAgrupaciones, setConfigAgrupaciones] = useState<Record<string, string>>({});
    const [configGrupos, setConfigGrupos] = useState<Record<string, string>>({});
    const [configCuentas, setConfigCuentas] = useState<Record<string, string>>({});
    const [tipoCalculoByRubro, setTipoCalculoByRubro] = useState<Record<string, 'V' | 'P'>>({});
    const [cuentasModalData, setCuentasModalData] = useState<CuentaPyG[]>([]);
    const [configuracionByCodigoCuenta, setConfiguracionByCodigoCuenta] = useState<Record<string, CuentaConfiguracionOption>>({});
    const [loadingConfiguracionByCodigoCuenta, setLoadingConfiguracionByCodigoCuenta] = useState<Record<string, boolean>>({});
    const [rubrosPeriodo, setRubrosPeriodo] = useState<RubroPeriodoOption[]>([]);
    const [loadingRubrosPeriodo, setLoadingRubrosPeriodo] = useState(false);
    const [configuracionCentroCostoIngresos, setConfiguracionCentroCostoIngresos] = useState<ConfiguracionCentroCostoOption[]>([]);
    const [configuracionCentroCostoGastos, setConfiguracionCentroCostoGastos] = useState<ConfiguracionCentroCostoOption[]>([]);

    const getFormattedPeriod = (p: string) => {
        if (!p) return 'Enero-2026';
        const [year, month] = p.split('-');
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return `${months[parseInt(month, 10) - 1]}-${year}`;
    };

    const periodText = getFormattedPeriod(periodo);

    const parseC = (val: string) => {
        if (!val || val === '-') return 0;
        return parseFloat(val.toString().replace(/\./g, '').replace(',', '.'));
    };

    const formatC = (val: number) => {
        return val.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const applyConfiguracionDb = (baseData: CuentaPyG[], configuraciones: ConfiguracionCentroCostoOption[]) => {
        const byGrupoCuenta = new Map<string, ConfiguracionCentroCostoOption>();
        configuraciones.forEach((cfg) => {
            const key = String(cfg.grupoCuenta || '').trim();
            if (key) byGrupoCuenta.set(key, cfg);
        });

        return baseData.map((row) => {
            if (row.tipo === 'titulo') return row;

            const cfg = byGrupoCuenta.get(String(row.codigo || '').trim());

            if (!cfg) {
                return row;
            }

            const hasValor = cfg.valor !== null && cfg.valor !== undefined;
            return {
                ...row,
                descripcion: String(cfg.nombre || '').trim() || row.descripcion,
                total: hasValor ? formatC(Number(cfg.valor)) : row.total,
            };
        });
    };

    const detalleIngresosData = useMemo(
        () => applyConfiguracionDb(ingresosData, configuracionCentroCostoIngresos),
        [ingresosData, configuracionCentroCostoIngresos],
    );

    const detalleGastosData = useMemo(
        () => applyConfiguracionDb(gastosData, configuracionCentroCostoGastos),
        [gastosData, configuracionCentroCostoGastos],
    );

    const ingresosValidos = detalleIngresosData.filter(c => c.tipo === 'cuenta');
    const gastosValidos = detalleGastosData.filter(c => c.tipo === 'grupo');
    const cuentasData = cuentasTipo === 'ingresos' ? detalleIngresosData : detalleGastosData;

    const configuracionActiva = cuentasTipo === 'ingresos'
        ? configuracionCentroCostoIngresos
        : configuracionCentroCostoGastos;

    useEffect(() => {
        if (!cuentasTipo) return;
        setCuentasModalData([...(cuentasTipo === 'ingresos' ? detalleIngresosData : detalleGastosData)]);
    }, [cuentasTipo, detalleIngresosData, detalleGastosData]);

    useEffect(() => {
        if (!periodo || !centroCosto) {
            setConfiguracionCentroCostoIngresos([]);
            setConfiguracionCentroCostoGastos([]);
            return;
        }

        let isCancelled = false;

        void Promise.all([
            dbApi.contabilidad.pyg.getConfiguracionCentroCosto<{
                ok?: boolean;
                configuraciones?: ConfiguracionCentroCostoOption[];
            }>({
                centroCosto,
                periodo,
                tipo: 'ingresos',
            }),
            dbApi.contabilidad.pyg.getConfiguracionCentroCosto<{
                ok?: boolean;
                configuraciones?: ConfiguracionCentroCostoOption[];
            }>({
                centroCosto,
                periodo,
                tipo: 'gastos',
            }),
        ])
            .then(([responseIngresos, responseGastos]) => {
                if (isCancelled) return;

                const ingresosRows = Array.isArray(responseIngresos?.configuraciones)
                    ? responseIngresos.configuraciones
                    : [];
                const gastosRows = Array.isArray(responseGastos?.configuraciones)
                    ? responseGastos.configuraciones
                    : [];

                setConfiguracionCentroCostoIngresos(ingresosRows);
                setConfiguracionCentroCostoGastos(gastosRows);
            })
            .catch((error) => {
                if (isCancelled) return;

                setConfiguracionCentroCostoIngresos([]);
                setConfiguracionCentroCostoGastos([]);
                console.error('[PyG] Error al precargar configuracion persistida por centro de costo:', error instanceof Error ? error.message : error);
            });

        return () => {
            isCancelled = true;
        };
    }, [periodo, centroCosto]);

    useEffect(() => {
        if (!cuentasTipo) return;

        const nextConfigCuentas: Record<string, string> = {};
        const nextTipoCalculo: Record<string, 'V' | 'P'> = {};

        configuracionActiva.forEach((cfg) => {
            const rubro = String(cfg.grupoCuenta || '').trim();
            if (!rubro) return;
            nextConfigCuentas[rubro] = String(cfg.codigo || '').trim();
            nextTipoCalculo[rubro] = cfg.tipoCalculo === 'P' ? 'P' : 'V';
        });

        setConfigCuentas(nextConfigCuentas);
        setTipoCalculoByRubro(nextTipoCalculo);
    }, [cuentasTipo, configuracionActiva]);

    useEffect(() => {
        if (!cuentasTipo) return;
        if (!periodo || !centroCosto) {
            setRubrosPeriodo([]);
            return;
        }

        setLoadingRubrosPeriodo(true);
        void dbApi.contabilidad.pyg.getRubrosPeriodo<{
            ok?: boolean;
            rubros?: RubroPeriodoOption[];
        }>({
            centroCosto,
            periodo,
            tipo: cuentasTipo,
        })
            .then((response) => {
                const items = Array.isArray(response?.rubros) ? response.rubros : [];
                setRubrosPeriodo(items);
                console.log('[PyG] Rubros por periodo cargados', {
                    tipo: cuentasTipo,
                    periodo,
                    centroCosto,
                    total: items.length,
                });
            })
            .catch((error) => {
                setRubrosPeriodo([]);
                console.error('[PyG] Error al cargar rubros por periodo:', error instanceof Error ? error.message : error);
            })
            .finally(() => setLoadingRubrosPeriodo(false));
    }, [cuentasTipo, periodo, centroCosto]);

    const loadConfiguracionCuenta = (codigoCuenta: string, rubroCodigo: string) => {
        const codigo = String(codigoCuenta || '').trim();
        if (!codigo) return;

        const cached = configuracionByCodigoCuenta[codigo];
        if (cached) {
            setConfigAgrupaciones(prev => ({ ...prev, [rubroCodigo]: cached.codigoAgrupacion }));
            setConfigGrupos(prev => ({ ...prev, [rubroCodigo]: cached.codigoGrupoCuenta }));
            return;
        }

        setLoadingConfiguracionByCodigoCuenta(prev => ({ ...prev, [codigo]: true }));
        void dbApi.contabilidad.pyg.getConfiguracionCuenta<{
            ok?: boolean;
            codigoCuenta?: string;
            configuracion?: CuentaConfiguracionOption | null;
        }>(codigo)
            .then((response) => {
                const config = response?.configuracion;
                if (!config) {
                    setConfigAgrupaciones(prev => ({ ...prev, [rubroCodigo]: '' }));
                    setConfigGrupos(prev => ({ ...prev, [rubroCodigo]: '' }));
                    return;
                }

                setConfiguracionByCodigoCuenta(prev => ({ ...prev, [codigo]: config }));
                setConfigAgrupaciones(prev => ({ ...prev, [rubroCodigo]: config.codigoAgrupacion }));
                setConfigGrupos(prev => ({ ...prev, [rubroCodigo]: config.codigoGrupoCuenta }));
            })
            .catch((error) => {
                setConfigAgrupaciones(prev => ({ ...prev, [rubroCodigo]: '' }));
                setConfigGrupos(prev => ({ ...prev, [rubroCodigo]: '' }));
                console.error('[PyG] Error al cargar configuracion de cuenta:', error instanceof Error ? error.message : error);
            })
            .finally(() => {
                setLoadingConfiguracionByCodigoCuenta(prev => ({ ...prev, [codigo]: false }));
            });
    };

    const handleAddRubro = () => {
        if (!cuentasTipo) return;

        if (cuentasTipo === 'ingresos') {
            const cuentas = cuentasModalData.filter(c => c.tipo === 'cuenta');
            const lastCode = cuentas.length > 0 ? cuentas[cuentas.length - 1].codigo : '4.0';
            const nextNum = parseInt(lastCode.split('.')[1], 10) + 1;
            const nextCode = `4.${nextNum}`;
            setCuentasModalData([...cuentasModalData, { codigo: nextCode, descripcion: '', tipo: 'cuenta', total: '-' }]);
            return;
        }

        const grupos = cuentasModalData.filter(c => c.tipo === 'grupo' && c.codigo.split('.').length === 2);
        const lastCode = grupos.length > 0 ? grupos[grupos.length - 1].codigo : '5.0';
        const nextNum = parseInt(lastCode.split('.')[1], 10) + 1;
        const nextCode = `5.${nextNum}`;
        setCuentasModalData([...cuentasModalData, { codigo: nextCode, descripcion: '', tipo: 'grupo', total: '-' }]);
    };

    const handleDeleteRubro = (codigo: string) => {
        setCuentasModalData(prev => prev.filter(c => c.codigo !== codigo));
    };

    const handleSaveConfiguracion = async () => {
        if (!cuentasTipo || !centroCosto || !periodo) {
            console.error('[PyG] No se puede guardar configuracion: centroCosto o periodo vacio');
            return;
        }

        const configuraciones = cuentasModalData
            .filter((item) => item.tipo !== 'titulo')
            .map((item) => {
                const codigoCuenta = String(configCuentas[item.codigo] || '').trim();
                const codigoRubro = String(item.codigo || '').trim();
                const codigoPersistencia = codigoCuenta || codigoRubro;
                const configuracionCuenta = codigoCuenta ? configuracionByCodigoCuenta[codigoCuenta] : undefined;
                return {
                    codigo: codigoPersistencia,
                    // El nombre debe salir del rubro editable en la fila.
                    nombre: String(item.descripcion || '').trim(),
                    // GRUPO_CUENTA debe representar la asignacion del rubro (4.1, 4.2, 4.3, etc.).
                    grupoCuenta: codigoRubro,
                    nombreGrupoCuenta: configuracionCuenta?.nombreGrupoCuenta || '',
                    tipoCalculo: tipoCalculoByRubro[item.codigo] || 'V',
                    valor: parseC(String(item.total || '0')),
                };
            })
            .filter((item) => item.codigo);

        if (configuraciones.length === 0) {
            console.warn('[PyG] No hay configuraciones validas para guardar');
            return;
        }

        try {
            console.log('[PyG] Guardando configuracion Cfg_PyG_CentroCosto', {
                centroCosto,
                periodo,
                total: configuraciones.length,
            });

            const response = await dbApi.contabilidad.pyg.saveConfiguracionCentroCosto({
                centroCosto,
                periodo,
                configuraciones,
            });

            console.log('[PyG] Configuracion guardada correctamente', response);
            const refresh = await dbApi.contabilidad.pyg.getConfiguracionCentroCosto<{
                ok?: boolean;
                configuraciones?: ConfiguracionCentroCostoOption[];
            }>({
                centroCosto,
                periodo,
                tipo: cuentasTipo,
            });

            const rows = Array.isArray(refresh?.configuraciones) ? refresh.configuraciones : [];
            if (cuentasTipo === 'ingresos') {
                setConfiguracionCentroCostoIngresos(rows);
            } else {
                setConfiguracionCentroCostoGastos(rows);
            }
            setShowConfigModal(false);
            onConfiguracionSaved?.();
        } catch (error) {
            console.error('[PyG] Error al guardar configuracion de PyG', error instanceof Error ? error.message : error);
        }
    };

    const GastoCard = ({ title, amount }: { title: string; amount: string }) => (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 leading-tight">{title}</p>
            <p className="text-xl font-black text-slate-800">$ {amount}</p>
        </div>
    );

    if (cuentasTipo) {
        return (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
                {editingCuentaValue && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setEditingCuentaValue(null)} />
                        <div className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-[#001F3F] text-white">
                                <h3 className="font-black text-lg">Editar Cantidad</h3>
                                <button onClick={() => setEditingCuentaValue(null)} className="text-slate-300 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-6 space-y-5">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Cuenta Contable</label>
                                    <div className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none">
                                        {editingCuentaValue.descripcion || 'Sin nombre asignado'}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                    <input
                                        type="checkbox"
                                        id="enableEdit"
                                        checked={isQuantityEditable}
                                        onChange={(e) => setIsQuantityEditable(e.target.checked)}
                                        className="w-4 h-4 rounded border-slate-300 text-[#001F3F] focus:ring-[#001F3F] cursor-pointer"
                                    />
                                    <label htmlFor="enableEdit" className="text-sm font-bold text-slate-700 cursor-pointer select-none">
                                        Habilitar edición manual y porcentaje
                                    </label>
                                </div>

                                <div className="flex gap-4 items-start">
                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Cantidad ($)</label>
                                        <input
                                            type="text"
                                            disabled={!isQuantityEditable}
                                            value={editingCuentaValue.total}
                                            onChange={(e) => setEditingCuentaValue({ ...editingCuentaValue, total: e.target.value })}
                                            className={`w-full p-4 border-2 rounded-xl text-xl font-black outline-none transition-all shadow-sm ${isQuantityEditable ? 'bg-white border-blue-500 text-[#001F3F]' : 'bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed'}`}
                                            placeholder="0,00"
                                        />
                                    </div>
                                    {isQuantityEditable && (
                                        <div className="w-32 animate-in fade-in zoom-in duration-200">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">% a aplicar</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="100"
                                                    value={porcentajeAplicado}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setPorcentajeAplicado(val);
                                                        if (val && !Number.isNaN(Number(val))) {
                                                            const calc = (originalTotalVal * parseFloat(val)) / 100;
                                                            setEditingCuentaValue({ ...editingCuentaValue, total: formatC(calc) });
                                                        } else {
                                                            setEditingCuentaValue({ ...editingCuentaValue, total: formatC(originalTotalVal) });
                                                        }
                                                    }}
                                                    className="w-full p-4 pr-8 bg-white border-2 border-slate-200 focus:border-blue-500 rounded-xl text-xl font-black text-[#001F3F] outline-none transition-all shadow-sm"
                                                    placeholder="100"
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                                <button onClick={() => setEditingCuentaValue(null)} className="px-6 py-2.5 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors text-sm">Cancelar</button>
                                <button
                                    onClick={() => {
                                        setCuentasModalData(prev => prev.map(c => c.codigo === editingCuentaValue.codigo ? { ...c, total: editingCuentaValue.total } : c));
                                        const tipoCalculo = porcentajeAplicado && Number(porcentajeAplicado) > 0 ? 'P' : 'V';
                                        setTipoCalculoByRubro(prev => ({ ...prev, [editingCuentaValue.codigo]: tipoCalculo }));
                                        setEditingCuentaValue(null);
                                    }}
                                    className="px-8 py-2.5 rounded-xl bg-[#001F3F] text-white font-bold hover:bg-blue-900 transition-all text-sm shadow-md active:scale-95 flex items-center gap-2"
                                >
                                    <Save size={16} /> Guardar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showConfigModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-[#001F3F]/60 backdrop-blur-sm transition-opacity" onClick={() => setShowConfigModal(false)} />
                        <div className="relative bg-white rounded-3xl w-full max-w-6xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                            <div className="bg-[#001F3F] px-8 py-6 flex justify-between items-center text-white shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/10 rounded-lg"><Settings2 size={20} /></div>
                                    <div>
                                        <h3 className="font-bold text-lg leading-tight">Configuración de Cuentas - {cuentasTipo === 'ingresos' ? 'Ingresos' : 'Gastos'}</h3>
                                        <p className="text-xs text-blue-200">Asignación de agrupaciones, grupos y cuentas contables</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowConfigModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"><X size={20} /></button>
                            </div>

                            <div className="p-6 overflow-y-auto custom-scrollbar bg-slate-50">
                                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase w-[22%]">Rubro (PyG)</th>
                                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase w-[25%]">Agrupación General</th>
                                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase w-[25%]">Grupo de Cuentas</th>
                                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase w-[25%]">Cuenta Contable</th>
                                                <th className="px-2 py-3 text-xs font-bold text-slate-500 uppercase w-[6%] text-center"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {cuentasModalData.filter(c => c.tipo !== 'titulo').map((cuenta, idx) => {
                                                const currentAgrup = configAgrupaciones[cuenta.codigo] !== undefined
                                                    ? configAgrupaciones[cuenta.codigo]
                                                    : '';

                                                const currentGrupo = configGrupos[cuenta.codigo] !== undefined
                                                    ? configGrupos[cuenta.codigo]
                                                    : '';

                                                const currentCuenta = configCuentas[cuenta.codigo] !== undefined
                                                    ? configCuentas[cuenta.codigo]
                                                    : '';

                                                const configuracionCuenta = currentCuenta ? configuracionByCodigoCuenta[currentCuenta] : undefined;
                                                const loadingConfiguracion = Boolean(currentCuenta && loadingConfiguracionByCodigoCuenta[currentCuenta]);

                                                return (
                                                    <tr key={`${cuenta.codigo}-${idx}`} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-4 py-3 text-sm border-r border-slate-100">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-slate-500 w-8 shrink-0">{cuenta.codigo}</span>
                                                                <input
                                                                    type="text"
                                                                    value={cuenta.descripcion}
                                                                    onChange={(e) => setCuentasModalData(prev => prev.map(row => row.codigo === cuenta.codigo ? { ...row, descripcion: e.target.value } : row))}
                                                                    placeholder="Ej. PUBLICIDAD"
                                                                    className="w-full bg-white border border-slate-200 rounded p-1.5 text-[11px] font-medium text-slate-700 outline-none focus:border-[#001F3F]"
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2 border-r border-slate-100">
                                                            <div className="relative">
                                                                <select
                                                                    value={currentAgrup}
                                                                    className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg outline-none text-slate-700 text-[11px] font-medium appearance-none focus:border-[#001F3F] cursor-pointer disabled:opacity-50"
                                                                    disabled={!currentCuenta || loadingConfiguracion}
                                                                >
                                                                    <option value="">
                                                                        {!currentCuenta ? 'Seleccione cuenta primero...' : loadingConfiguracion ? 'Cargando...' : 'Sin agrupación configurada'}
                                                                    </option>
                                                                    {configuracionCuenta && (
                                                                        <option value={configuracionCuenta.codigoAgrupacion}>
                                                                            {`${configuracionCuenta.codigoAgrupacion} - ${configuracionCuenta.nombreAgrupacion}`}
                                                                        </option>
                                                                    )}
                                                                </select>
                                                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2 border-r border-slate-100">
                                                            <div className="relative">
                                                                <select
                                                                    value={currentGrupo}
                                                                    className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg outline-none text-slate-700 text-[11px] font-medium appearance-none focus:border-[#001F3F] cursor-pointer disabled:opacity-50"
                                                                    disabled={!currentCuenta || loadingConfiguracion}
                                                                >
                                                                    <option value="">
                                                                        {!currentCuenta ? 'Seleccione cuenta primero...' : loadingConfiguracion ? 'Cargando...' : 'Sin grupo configurado'}
                                                                    </option>
                                                                    {configuracionCuenta && (
                                                                        <option value={configuracionCuenta.codigoGrupoCuenta}>
                                                                            {`${configuracionCuenta.codigoGrupoCuenta} - ${configuracionCuenta.nombreGrupoCuenta}`}
                                                                        </option>
                                                                    )}
                                                                </select>
                                                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <div className="relative">
                                                                <select
                                                                    value={currentCuenta}
                                                                    onChange={(e) => {
                                                                        const selectedCodigoCuenta = e.target.value;
                                                                        setConfigCuentas(prev => ({ ...prev, [cuenta.codigo]: selectedCodigoCuenta }));
                                                                        setConfigAgrupaciones(prev => ({ ...prev, [cuenta.codigo]: '' }));
                                                                        setConfigGrupos(prev => ({ ...prev, [cuenta.codigo]: '' }));

                                                                        const selectedRubro = rubrosPeriodo.find((item) => item.codigoCuenta === selectedCodigoCuenta);
                                                                        if (selectedRubro) {
                                                                            setCuentasModalData(prev => prev.map((row) => (
                                                                                row.codigo === cuenta.codigo
                                                                                    ? { ...row, total: formatC(Number(selectedRubro.valor || 0)) }
                                                                                    : row
                                                                            )));
                                                                        }

                                                                        if (selectedCodigoCuenta) {
                                                                            loadConfiguracionCuenta(selectedCodigoCuenta, cuenta.codigo);
                                                                        }
                                                                    }}
                                                                    className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg outline-none text-slate-700 text-[11px] font-medium appearance-none focus:border-[#001F3F] cursor-pointer disabled:opacity-50"
                                                                    disabled={loadingRubrosPeriodo}
                                                                >
                                                                    <option value="">
                                                                        {loadingRubrosPeriodo ? 'Cargando...' : 'Seleccione cuenta...'}
                                                                    </option>
                                                                    {rubrosPeriodo.map((rubro) => (
                                                                        <option key={rubro.codigoCuenta} value={rubro.codigoCuenta}>
                                                                            {`${rubro.codigoCuenta} - ${rubro.nombreCuenta}`}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                                                            </div>
                                                        </td>
                                                        <td className="px-2 py-2 text-center border-l border-slate-100">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingCuentaValue(cuenta);
                                                                        setIsQuantityEditable(false);
                                                                        setPorcentajeAplicado('');
                                                                        setOriginalTotalVal(parseC(cuenta.total));
                                                                    }}
                                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                    title="Editar Cantidad"
                                                                >
                                                                    <Pencil size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteRubro(cuenta.codigo)}
                                                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                                    title="Eliminar rubro"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="p-3 mt-4 bg-slate-50 border border-slate-200 border-dashed rounded-xl flex justify-center">
                                    <button onClick={handleAddRubro} className="px-4 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors flex items-center gap-2">
                                        + Añadir Nuevo Rubro
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
                                <button onClick={() => setShowConfigModal(false)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors text-sm">Cancelar</button>
                                <button onClick={() => void handleSaveConfiguracion()} className="px-8 py-3 rounded-xl bg-[#001F3F] text-white font-bold hover:bg-blue-900 shadow-lg shadow-blue-900/20 active:scale-95 transition-all flex items-center gap-2 text-sm"><Save size={18} />Guardar Configuración</button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-slate-100 pb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setCuentasTipo(null)}
                            className="p-2 bg-slate-50 hover:bg-slate-200 rounded-xl transition-colors text-slate-600"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800">
                                Detalle de Cuentas Contables - {cuentasTipo === 'ingresos' ? 'Ingresos' : 'Gastos'}
                            </h2>
                            <p className="text-sm text-slate-500 font-medium">Plantilla de grupos y cuentas</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowConfigModal(true)}
                        className="px-6 py-3 bg-white border border-slate-200 text-[#001F3F] rounded-xl text-sm font-bold hover:bg-slate-50 hover:border-slate-300 transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
                    >
                        <Settings2 size={18} /> Configurar Cuentas
                    </button>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase w-32">Código</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Cuenta Contable</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase w-48">Nivel / Grupo</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase w-32 text-right">Total</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase w-40 text-center">Periodo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {cuentasData.map((cuenta) => (
                                <tr
                                    key={`${cuentasTipo}-${cuenta.codigo}`}
                                    className={
                                        cuenta.tipo === 'titulo'
                                            ? 'bg-[#1c2938] text-white'
                                            : cuenta.tipo === 'grupo'
                                              ? 'bg-slate-100 font-bold text-slate-800'
                                              : 'bg-white text-slate-600 hover:bg-slate-50 transition-colors'
                                    }
                                >
                                    <td className="px-6 py-3 font-mono text-sm">{cuenta.codigo}</td>
                                    <td
                                        className={`px-6 py-3 text-sm ${
                                            cuenta.tipo === 'cuenta' ? 'pl-8 font-medium' : ''
                                        } ${cuenta.tipo === 'titulo' ? 'font-bold uppercase tracking-wider' : ''}`}
                                    >
                                        {cuenta.descripcion || <span className="text-slate-400 italic">Sin nombre asignado</span>}
                                    </td>
                                    <td className="px-6 py-3 text-[10px] font-bold tracking-wider opacity-70">{cuenta.tipo.toUpperCase()}</td>
                                    <td className="px-6 py-3 text-right font-medium">{cuenta.total !== '-' ? `$ ${cuenta.total}` : '-'}</td>
                                    <td className="px-6 py-3 text-center text-[10px] text-slate-400 uppercase tracking-wider">{periodText}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-6">
                <button
                    onClick={onBack}
                    className="p-2 bg-slate-50 hover:bg-slate-200 rounded-xl transition-colors text-slate-600"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h2 className="text-2xl font-black text-slate-800">Detalle de Balances de PyG</h2>
                    <p className="text-sm text-slate-500 font-medium">
                        Desglose de valores correspondientes a <span className="font-bold text-[#001F3F]">{periodText}</span>
                    </p>
                </div>
            </div>

            <div className="space-y-10">
                <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-black text-[#1c2938] flex items-center gap-2 uppercase tracking-wide">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                            Ingresos
                        </h3>
                        <button
                            onClick={() => setCuentasTipo('ingresos')}
                            className="px-4 py-2 bg-white border border-slate-200 text-[#001F3F] rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <List size={14} /> Cuentas Contables
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {ingresosValidos.length > 0 ? (
                            ingresosValidos.map((ingreso) => (
                                <div key={ingreso.codigo} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{ingreso.descripcion || 'Sin nombre asignado'}</p>
                                    <p className="text-2xl font-black text-slate-800">$ {ingreso.total !== '-' ? ingreso.total : '-'}</p>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-3 text-center py-4 text-slate-400 text-sm font-medium">No hay ingresos configurados.</div>
                        )}
                    </div>
                </div>

                <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-black text-[#1c2938] flex items-center gap-2 uppercase tracking-wide">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                            Gastos
                        </h3>
                        <button
                            onClick={() => setCuentasTipo('gastos')}
                            className="px-4 py-2 bg-white border border-slate-200 text-[#001F3F] rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <List size={14} /> Cuentas Contables
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {gastosValidos.length > 0 ? (
                            gastosValidos.map((gasto) => (
                                <GastoCard
                                    key={gasto.codigo}
                                    title={gasto.descripcion || 'Sin nombre asignado'}
                                    amount={gasto.total !== '-' ? gasto.total : '-'}
                                />
                            ))
                        ) : (
                            <div className="col-span-3 text-center py-4 text-slate-400 text-sm font-medium">No hay gastos configurados.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function PyGCuentasView({
    periodo,
    ingresosData,
    setIngresosData,
    gastosData,
    setGastosData
}: PyGCuentasViewProps) {
    const [currentTab, setCurrentTab] = useState<'ingresos' | 'gastos'>('ingresos');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValues, setEditValues] = useState({ descripcion: '', total: '' });

    const getFormattedPeriod = (p: string) => {
        if (!p) return 'Enero-2026';
        const [year, month] = p.split('-');
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return `${months[parseInt(month, 10) - 1]}-${year}`;
    };

    const parseC = (val: string) => {
        if (!val || val === '-') return 0;
        return parseFloat(val.replace(/\./g, '').replace(',', '.'));
    };

    const formatC = (val: number) => {
        if (val === 0) return '0,00';
        return val.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const cuentasData = currentTab === 'ingresos' ? ingresosData : gastosData;
    const setCuentasData = currentTab === 'ingresos' ? setIngresosData : setGastosData;

    const validCuentas = cuentasData.filter(c =>
        (currentTab === 'ingresos' ? c.tipo === 'cuenta' : c.tipo === 'grupo') &&
        c.descripcion.trim() !== ''
    );

    const handleAddCuenta = () => {
        if (currentTab === 'ingresos') {
            const lastCode = ingresosData.filter(c => c.tipo === 'cuenta').slice(-1)[0]?.codigo || '4.0';
            const nextNum = parseInt(lastCode.split('.')[1], 10) + 1;
            const newCode = `4.${nextNum}`;
            setIngresosData([...ingresosData, { codigo: newCode, descripcion: '', tipo: 'cuenta', total: '-' }]);
        } else {
            const lastCode = gastosData.filter(c => c.tipo === 'grupo').slice(-1)[0]?.codigo || '5.0';
            const nextNum = parseInt(lastCode.split('.')[1], 10) + 1;
            const newCode = `5.${nextNum}`;
            setGastosData([...gastosData, { codigo: newCode, descripcion: '', tipo: 'grupo', total: '-' }]);
        }
    };

    const handleEditStart = (codigo: string, cuenta: CuentaPyG) => {
        setEditingId(codigo);
        setEditValues({ descripcion: cuenta.descripcion, total: cuenta.total });
    };

    const handleEditSave = (codigo: string) => {
        setCuentasData(
            cuentasData.map(c =>
                c.codigo === codigo
                    ? { ...c, descripcion: editValues.descripcion, total: editValues.total }
                    : c
            )
        );
        setEditingId(null);
    };

    const handleDeleteCuenta = (codigo: string) => {
        setCuentasData(cuentasData.filter(c => c.codigo !== codigo));
    };

    const periodText = getFormattedPeriod(periodo);
    const totalCuentas = validCuentas.reduce((sum, item) => sum + parseC(item.total), 0);

    return (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-slate-100 pb-6">
                <h3 className="text-2xl font-bold text-slate-800">Administrar Cuentas - {periodText}</h3>
                <button
                    onClick={handleAddCuenta}
                    className="flex items-center gap-2 px-4 py-2 bg-[#001F3F] text-white rounded-xl font-semibold hover:bg-[#001a2e] transition-all"
                >
                    <Plus size={18} />
                    Agregar Cuenta
                </button>
            </div>

            <div className="flex gap-4 mb-6 border-b border-slate-200 pb-2">
                <button
                    onClick={() => setCurrentTab('ingresos')}
                    className={`px-4 py-2 font-semibold transition-all ${
                        currentTab === 'ingresos'
                            ? 'text-[#001F3F] border-b-3 border-[#001F3F]'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    💰 Ingresos
                </button>
                <button
                    onClick={() => setCurrentTab('gastos')}
                    className={`px-4 py-2 font-semibold transition-all ${
                        currentTab === 'gastos'
                            ? 'text-[#001F3F] border-b-3 border-[#001F3F]'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    💸 Gastos
                </button>
            </div>

            <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm">
                    <thead className="bg-[#1c2938] text-white">
                        <tr>
                            <th className="px-4 py-3 text-left font-bold text-[10px] uppercase">Código</th>
                            <th className="px-4 py-3 text-left font-bold text-[10px] uppercase">Descripción</th>
                            <th className="px-4 py-3 text-right font-bold text-[10px] uppercase">Total</th>
                            <th className="px-4 py-3 text-center font-bold text-[10px] uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {validCuentas.map((cuenta, idx) => (
                            <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                                <td className="px-4 py-3 font-bold text-slate-800">{cuenta.codigo}</td>
                                <td className="px-4 py-3">
                                    {editingId === cuenta.codigo ? (
                                        <input
                                            type="text"
                                            value={editValues.descripcion}
                                            onChange={(e) => setEditValues({ ...editValues, descripcion: e.target.value })}
                                            className="w-full px-2 py-1 border border-slate-300 rounded text-slate-700"
                                        />
                                    ) : (
                                        <span className="text-slate-700">{cuenta.descripcion}</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    {editingId === cuenta.codigo ? (
                                        <input
                                            type="text"
                                            value={editValues.total}
                                            onChange={(e) => setEditValues({ ...editValues, total: e.target.value })}
                                            className="w-24 px-2 py-1 border border-slate-300 rounded text-right text-slate-700"
                                        />
                                    ) : (
                                        <span className="font-semibold text-slate-800">$ {formatC(parseC(cuenta.total))}</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        {editingId === cuenta.codigo ? (
                                            <>
                                                <button
                                                    onClick={() => handleEditSave(cuenta.codigo)}
                                                    className="p-1 text-green-600 hover:bg-green-100 rounded transition-all"
                                                    title="Guardar"
                                                >
                                                    <Save size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setEditingId(null)}
                                                    className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-all"
                                                    title="Cancelar"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => handleEditStart(cuenta.codigo, cuenta)}
                                                    className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-all"
                                                    title="Editar"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCuenta(cuenta.codigo)}
                                                    className="p-1 text-red-600 hover:bg-red-100 rounded transition-all"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-1">
                            Total {currentTab === 'ingresos' ? 'Ingresos' : 'Gastos'}
                        </p>
                        <p className={`text-3xl font-black ${currentTab === 'ingresos' ? 'text-green-600' : 'text-red-600'}`}>
                            $ {formatC(totalCuentas)}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-1">Cantidad de Cuentas</p>
                        <p className="text-3xl font-black text-slate-800">{validCuentas.length}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

void PyGCuentasView;