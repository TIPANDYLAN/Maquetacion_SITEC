import { useState } from 'react';
import { BarChart3, Calendar, Filter, Building } from 'lucide-react';
import type { CuentaPyG, FiltrosPyG } from '../../types';
import { INITIAL_PYG_INGRESOS, INITIAL_PYG_GASTOS, PARKING_LOTS } from '../../data/pygMockData';
import PyGReportTable from './PyGReportTable.tsx';
import PyGDetalleView from './PyGDetalleView.tsx';

export default function PyGView() {
    const [filtros, setFiltros] = useState<FiltrosPyG>({
        periodo: '2026-03',
        tipoReporte: 'por_proyecto',
        centroCosto: ''
    });

    const [ingresosData] = useState<CuentaPyG[]>(INITIAL_PYG_INGRESOS);
    const [gastosData] = useState<CuentaPyG[]>(INITIAL_PYG_GASTOS);
    const [showDetailView, setShowDetailView] = useState(false);

    const isGeneralReport = filtros.tipoReporte === 'general';
    const canShowProjectReport = Boolean(filtros.periodo && filtros.tipoReporte === 'por_proyecto' && filtros.centroCosto);

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
                    ingresosData={ingresosData}
                    gastosData={gastosData}
                    onBack={() => setShowDetailView(false)}
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
                                    className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-700 cursor-pointer font-medium focus:border-[#001F3F] transition-all"
                                    value={filtros.centroCosto}
                                    onChange={(e) => setFiltros({ ...filtros, centroCosto: e.target.value })}
                                >
                                    <option value="">Seleccione proyecto...</option>
                                    {PARKING_LOTS.map((lot, idx) => (
                                        <option key={idx} value={lot}>
                                            {lot}
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
                    centroCosto={filtros.centroCosto || 'Consolidado General'}
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
