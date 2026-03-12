import { useState } from 'react';
import { File, Check, Search, RotateCw } from 'lucide-react';
import { PAGOS_DATA } from "../../data/mockData";

const PagosView = () => {
  const [activeTab, setActiveTab] = useState('tarjetas');
  const [filterPendientes, setFilterPendientes] = useState(true);
  const [filterAsignadas, setFilterAsignadas] = useState(false);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
          <File size={24} />
        </div>
        <h2 className="text-2xl font-black text-slate-800">Pagos</h2>
      </div>
      <div className="flex items-center gap-8 mb-8 border-b border-slate-100 pb-2">
        <button onClick={() => setActiveTab('tarjetas')} className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'tarjetas' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-slate-400 hover:text-slate-600'}`}>Tarjetas de credito</button>
        <button onClick={() => setActiveTab('transferencias')} className={`text-sm font-medium transition-all ${activeTab === 'transferencias' ? 'text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>Transferencias</button>
        <button onClick={() => setActiveTab('cargar')} className={`text-sm font-medium transition-all ${activeTab === 'cargar' ? 'text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>Cargar Registros</button>
        <button onClick={() => setActiveTab('bot')} className={`text-sm font-medium transition-all ${activeTab === 'bot' ? 'text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>Datafast Bot</button>
      </div>
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-700 mb-4">Asignar Facturas Tarjetas de Credito</h3>
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer group" onClick={() => setFilterPendientes((prev) => !prev)}>
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${filterPendientes ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 bg-white'}`}>{filterPendientes && <Check size={14} className="text-white" strokeWidth={3} />}</div>
              <span className="text-sm font-medium text-slate-600 group-hover:text-slate-800">Pendientes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group" onClick={() => setFilterAsignadas((prev) => !prev)}>
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${filterAsignadas ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 bg-white'}`}>{filterAsignadas && <Check size={14} className="text-white" strokeWidth={3} />}</div>
              <span className="text-sm font-medium text-slate-600 group-hover:text-slate-800">Asignadas</span>
            </label>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="BUSCAR - TID" className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 font-medium" />
            </div>
            <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm"><RotateCw size={18} /></button>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b border-slate-100">
            <tr>{['FECHA TRX', 'REF', 'AUT.', 'LOTE', 'TID', 'MONTO', 'FORMA DE PAGO', 'N FACTURA'].map((header) => (<th key={header} className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{header}</th>))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {PAGOS_DATA.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                <td className="px-4 py-3 text-sm font-medium text-slate-600">{item.fecha}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{item.ref}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{item.aut}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{item.lote}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{item.tid}</td>
                <td className="px-4 py-3 text-sm font-bold text-slate-700">{item.monto}</td>
                <td className="px-4 py-3"><span className="text-xs font-bold px-2 py-1 rounded bg-slate-100 text-slate-600 border border-slate-200">{item.forma}</span></td>
                <td className="px-4 py-3 text-sm text-blue-600 font-medium hover:underline cursor-pointer">{item.factura}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-8 text-center text-slate-400 text-sm mt-4 border-t border-slate-50 border-dashed">No hay mas registros para mostrar</div>
      </div>
    </div>
  );
};

export default PagosView;