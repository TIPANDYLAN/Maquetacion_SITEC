import { useState } from 'react';
import { Plus, Trash2, Edit, Save, X } from 'lucide-react';
import type { CuentaPyG } from '../../types';

interface PyGCuentasViewProps {
    periodo: string;
    tipo?: 'ingresos' | 'gastos';
    ingresosData: CuentaPyG[];
    setIngresosData: (data: CuentaPyG[]) => void;
    gastosData: CuentaPyG[];
    setGastosData: (data: CuentaPyG[]) => void;
}

export default function PyGCuentasView({
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
            const nextNum = parseInt(lastCode.split('.')[1]) + 1;
            const newCode = `4.${nextNum}`;
            setIngresosData([...ingresosData, { codigo: newCode, descripcion: '', tipo: 'cuenta', total: '-' }]);
        } else {
            const lastCode = gastosData.filter(c => c.tipo === 'grupo').slice(-1)[0]?.codigo || '5.0';
            const nextNum = parseInt(lastCode.split('.')[1]) + 1;
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

            {/* Tabs */}
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

            {/* Tabla de cuentas */}
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

            {/* Resumen */}
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
