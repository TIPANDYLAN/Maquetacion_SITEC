import { useState } from 'react';
import { Play } from 'lucide-react';

interface BancosViewProps {
    empresa?: string;
}

const BancosView = ({ empresa = "Urbapark" }: BancosViewProps) => {
    const [selectedCard, setSelectedCard] = useState('VISA');
    const [dragActive, setDragActive] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    const cards = ['VISA', 'MASTERCARD', 'DINERS', 'AMEX', 'DISCOVER'];

    const historialData = [
        { archivo: `${selectedCard}_20240125.csv`, fecha: '25/01/2024 14:30', total: 150, duplicados: 0, cargados: 150, estado: 'Exitoso' },
        { archivo: `${selectedCard}_20240124.csv`, fecha: '24/01/2024 09:15', total: 85, duplicados: 2, cargados: 83, estado: 'Advertencia' },
        { archivo: `${selectedCard}_20240123.csv`, fecha: '23/01/2024 18:00', total: 200, duplicados: 0, cargados: 200, estado: 'Exitoso' },
        { archivo: `${selectedCard}_20240122.csv`, fecha: '22/01/2024 10:00', total: 120, duplicados: 0, cargados: 120, estado: 'Exitoso' },
    ];

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        else if (e.type === "dragleave") setDragActive(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
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
                    <h2 className="text-2xl font-black text-slate-800">Conciliación de Tarjetas - {empresa}</h2>
                    <p className="text-slate-500 mt-1">Seleccione la franquicia para gestionar la carga de datos.</p>
                </div>
            </div>

            {/* SELECTOR DE TARJETA */}
            <div className="flex border-b border-slate-200 gap-8">
                {cards.map((card) => (
                    <button
                        key={card}
                        onClick={() => { setSelectedCard(card); setFile(null); }}
                        className={`pb-4 px-2 font-bold text-sm tracking-wide transition-all relative ${selectedCard === card ? 'text-[#001F3F]' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        {card}
                        {selectedCard === card && (
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-[#FFCC00] rounded-t-full"></div>
                        )}
                    </button>
                ))}
            </div>

            {/* AREA DE CARGA */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                    {/* DRAG AND DROP */}
                    <div className="lg:col-span-3">
                        <div
                            className={`h-40 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center p-4 transition-all cursor-pointer relative overflow-hidden group ${dragActive ? 'border-[#001F3F] bg-blue-50' : 'border-slate-300 hover:border-[#001F3F] hover:bg-slate-50'} ${file ? 'bg-emerald-50 border-emerald-500' : ''}`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            <input
                                onChange={handleChange}
                                type="file"
                                id="input-file-upload"
                                multiple={false}
                                style={{ display: "none" }}
                            />
                            <label htmlFor="input-file-upload" className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                                <div className="flex items-center justify-center">
                                    <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="24" width="24">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="17 8 12 3 7 8"></polyline>
                                        <line x1="12" y1="3" x2="12" y2="15"></line>
                                    </svg>
                                </div>
                                {file ? (
                                    <p className="mt-2 text-sm font-bold text-emerald-600">{file.name}</p>
                                ) : (
                                    <>
                                        <p className="mt-2 text-sm font-bold">Arrastra tu archivo aquí</p>
                                        <p className="text-xs text-slate-400 mt-1">o haz clic para seleccionar</p>
                                    </>
                                )}
                            </label>
                        </div>
                    </div>

                    {/* DESCRIPCION */}
                    <div className="lg:col-span-6 px-4 text-center lg:text-left border-l-0 lg:border-l lg:border-r border-slate-100 py-2">
                        <h3 className="text-base font-bold text-slate-800 mb-2 flex items-center justify-center lg:justify-start gap-2">
                            <span className="bg-[#001F3F] w-2 h-2 rounded-full inline-block"></span>
                            Carga de datos "{selectedCard}", en la tabla DetalleTC
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed text-justify">
                            Por favor seleccione un archivo correspondiente a <strong className="text-slate-800">'{selectedCard}'</strong> para cargar la información. Recuerde que el archivo debe ser uno solo, con nombre <strong className="text-slate-800">{selectedCard}</strong> y la extensión .csv ({selectedCard}.csv), y la estructura de datos correcta definida para este módulo.
                        </p>
                    </div>

                    {/* BOTON DE INICIO */}
                    <div className="lg:col-span-3 flex justify-center lg:justify-end">
                        <button
                            className={`w-full py-3 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all transform active:scale-95 uppercase tracking-wide ${file ? 'bg-[#001F3F] text-white hover:bg-blue-900 shadow-blue-900/20' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                            disabled={!file}
                        >
                            <Play size={16} fill="currentColor" />
                            INICIAR CARGA DE DATOS
                        </button>
                    </div>
                </div>
            </div>

            {/* HISTORIAL */}
            <div className="space-y-2">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">Historial de Bancos (DetalleTC) {selectedCard}</h3>
                    <p className="text-xs text-slate-500">Este historial muestra los 20 registros más recientes de los últimos días.</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Archivo</th>
                                <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Fecha</th>
                                <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Total</th>
                                <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Duplicados</th>
                                <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Cargados</th>
                                <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {historialData.map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-3 text-sm font-medium text-slate-800">{row.archivo}</td>
                                    <td className="px-6 py-3 text-sm text-slate-600">{row.fecha}</td>
                                    <td className="px-6 py-3 text-sm text-right font-medium text-slate-700">{row.total}</td>
                                    <td className="px-6 py-3 text-sm text-right font-medium text-slate-700">{row.duplicados}</td>
                                    <td className="px-6 py-3 text-sm text-right font-medium text-slate-700">{row.cargados}</td>
                                    <td className="px-6 py-3 text-sm">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getEstadoColor(row.estado)}`}>
                                            <div className={`w-2 h-2 rounded-full ${row.estado === 'Exitoso' ? 'bg-emerald-500' : row.estado === 'Advertencia' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                                            {row.estado}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default BancosView;
