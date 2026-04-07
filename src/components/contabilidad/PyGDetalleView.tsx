import { ArrowLeft, List, Settings2, X, Save, ChevronDown, Trash2, Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { CuentaPyG } from '../../types';

interface PyGDetalleViewProps {
    periodo: string;
    ingresosData: CuentaPyG[];
    gastosData: CuentaPyG[];
    onBack?: () => void;
}

export default function PyGDetalleView({ 
    periodo, 
    ingresosData, 
    gastosData,
    onBack
}: PyGDetalleViewProps) {
    const [cuentasTipo, setCuentasTipo] = useState<'ingresos' | 'gastos' | null>(null);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [editingCuentaValue, setEditingCuentaValue] = useState<CuentaPyG | null>(null);
    const [isQuantityEditable, setIsQuantityEditable] = useState(false);
    const [porcentajeAplicado, setPorcentajeAplicado] = useState('');
    const [originalTotalVal, setOriginalTotalVal] = useState(0);
    const [configAgrupaciones, setConfigAgrupaciones] = useState<Record<string, string>>({});
    const [configGrupos, setConfigGrupos] = useState<Record<string, string>>({});
    const [cuentasModalData, setCuentasModalData] = useState<CuentaPyG[]>([]);

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
        if (val === 0) return '0,00';
        return val.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const ingresosValidos = ingresosData.filter(c => c.tipo === 'cuenta' && c.descripcion.trim() !== '');
    const gastosValidos = gastosData.filter(c => c.tipo === 'grupo' && c.descripcion.trim() !== '');
    const cuentasData = cuentasTipo === 'ingresos' ? ingresosData : gastosData;

    useEffect(() => {
        if (!cuentasTipo) return;
        setCuentasModalData([...(cuentasTipo === 'ingresos' ? ingresosData : gastosData)]);
    }, [cuentasTipo, ingresosData, gastosData]);

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

    const GastoCard = ({ title, amount }: { title: string; amount: string }) => (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 leading-tight">{title}</p>
            <p className="text-xl font-black text-slate-800">$ {amount}</p>
        </div>
    );

    if (cuentasTipo) {
        return (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
                {/* NUEVO MODAL: Editar Cantidad de la Cuenta */}
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
                                                        if (val && !isNaN(Number(val))) {
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

                {/* MODAL DE CONFIGURACIÓN DE CUENTAS */}
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
                                                    : (cuenta.codigo.startsWith('4.') ? 'ingreso_operacion' : '');

                                                const currentGrupo = configGrupos[cuenta.codigo] !== undefined
                                                    ? configGrupos[cuenta.codigo]
                                                    : (cuenta.codigo.startsWith('4.') ? 'ventas_operacion' : '');

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
                                                                    onChange={(e) => setConfigAgrupaciones(prev => ({ ...prev, [cuenta.codigo]: e.target.value }))}
                                                                    className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg outline-none text-slate-700 text-[11px] font-medium appearance-none focus:border-[#001F3F] cursor-pointer"
                                                                >
                                                                    <option value="">Seleccione agrupación...</option>
                                                                    <option value="ingreso_operacion">INGRESO OPERACION</option>
                                                                    <option value="ingreso_no_operaciones">INGRESO NO OPERACIONES</option>
                                                                    <option value="costos_venta">COSTOS DE VENTA</option>
                                                                </select>
                                                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2 border-r border-slate-100">
                                                            <div className="relative">
                                                                <select
                                                                    value={currentGrupo}
                                                                    onChange={(e) => setConfigGrupos(prev => ({ ...prev, [cuenta.codigo]: e.target.value }))}
                                                                    className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg outline-none text-slate-700 text-[11px] font-medium appearance-none focus:border-[#001F3F] cursor-pointer"
                                                                >
                                                                    {currentAgrup === 'ingreso_operacion' ? (
                                                                        <>
                                                                            <option value="">Seleccione grupo...</option>
                                                                            <option value="ventas_operacion">VENTAS OPERACIÓN PARQUEADEROS</option>
                                                                            <option value="ventas_equipos">VENTAS EQUIPOS Y SUMINISTROS</option>
                                                                            <option value="venta_servicios">VENTAS DE SERVICIO</option>
                                                                        </>
                                                                    ) : currentAgrup === 'ingreso_no_operaciones' ? (
                                                                        <>
                                                                            <option value="">Seleccione grupo...</option>
                                                                            <option value="otros_ingresos_gravados">OTROS INGRESOS GRAVADOS</option>
                                                                            <option value="otros_ingresos_danos">OTROS INGRESOS DAÑOS TERCEROS</option>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <option value="">Seleccione grupo...</option>
                                                                            <option value="servicios_adicionales">SERVICIOS ADICIONALES</option>
                                                                            <option value="nomina">NÓMINA Y RRHH</option>
                                                                        </>
                                                                    )}
                                                                </select>
                                                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <div className="relative">
                                                                <select className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg outline-none text-slate-700 text-[11px] font-medium appearance-none focus:border-[#001F3F] cursor-pointer">
                                                                    <option value="">Seleccione cuenta...</option>
                                                                    <option value="cuenta_1">Cuenta 1</option>
                                                                    <option value="cuenta_2">Cuenta 2</option>
                                                                    <option value="cuenta_3">Cuenta 3</option>
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
                                <button onClick={() => setShowConfigModal(false)} className="px-8 py-3 rounded-xl bg-[#001F3F] text-white font-bold hover:bg-blue-900 shadow-lg shadow-blue-900/20 active:scale-95 transition-all flex items-center gap-2 text-sm"><Save size={18} />Guardar Configuración</button>
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
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{ingreso.descripcion}</p>
                                    <p className="text-2xl font-black text-slate-800">$ {ingreso.total !== '-' ? ingreso.total : '0,00'}</p>
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
                                    title={gasto.descripcion}
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
