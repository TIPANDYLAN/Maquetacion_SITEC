import { useState, useEffect } from 'react';
import { X, FileCheck, Layers, List, Save, Video, Camera } from 'lucide-react';
import { JUSTIFICATION_GROUPS, EQUIPOS_LIST, SYSTEM_ERRORS } from '../../data/mockData';
import { UploadButton } from '../commons/UploadButton';

interface JustificationModalProps {
    ticket: any;
    onClose: () => void;
    onSave: (id: string, data: any) => void;
}

const TimeEquipmentFields = ({ onChangeEquipment }: any) => (
    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
        <div>
            <label className="text-sm font-bold text-slate-700 mb-1 block">Hora Salida</label>
            <input type="time" className="w-full pl-4 pr-4 py-3 rounded-xl border-2 border-slate-200 outline-none focus:border-[#001F3F] transition-all text-slate-600 font-medium" />
        </div>
        <div>
            <label className="text-sm font-bold text-slate-700 mb-1 block">Equipo Salida</label>
            <div className="relative">
                <select
                    onChange={(e) => onChangeEquipment && onChangeEquipment(e.target.value)}
                    defaultValue=""
                    className="w-full appearance-none pl-4 pr-10 py-3 rounded-xl border-2 border-slate-200 outline-none focus:border-[#001F3F] transition-all cursor-pointer font-medium text-slate-600 text-sm">
                    <option value="" disabled>Seleccione...</option>
                    {EQUIPOS_LIST.map((eq, i) => <option key={i} value={eq}>{eq}</option>)}
                </select>
            </div>
        </div>
    </div>
);

const TimeOnlyField = () => (
    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
        <label className="text-sm font-bold text-slate-700 mb-1 block">Hora Salida</label>
        <input type="time" className="w-full pl-4 pr-4 py-3 rounded-xl border-2 border-slate-200 outline-none focus:border-[#001F3F] transition-all text-slate-600 font-medium" />
    </div>
);

export const JustificationModal = ({ ticket, onClose, onSave }: JustificationModalProps) => {
    const [selectedGroup, setSelectedGroup] = useState('');
    const [selectedReason, setSelectedReason] = useState('');
    const [exitEquipment, setExitEquipment] = useState('');
    const [additionalComments, setAdditionalComments] = useState('');
    const [incidentRaised, setIncidentRaised] = useState(false);
    const [uploads, setUploads] = useState({});

    const handleSaveJustification = () => {
        if (!selectedGroup) {
            alert("Por favor seleccione un grupo de causa.");
            return;
        }
        if (!selectedReason) {
            alert("Por favor seleccione un motivo de la lista.");
            return;
        }

        const justificationType = selectedGroup === 'No Justificado' ? 'no_justificada' : 'justificado';

        onSave(ticket.id, {
            justificationType,
            selectedGroup: selectedGroup,
            selectedReason,
            exitEquipment: exitEquipment || 'No especificado',
            additionalComments
        });
        onClose();
    };

    const handleFileUpload = (key: string) => {
        setUploads(prev => ({ ...prev, [key]: 'loading' }));
        setTimeout(() => {
            setUploads(prev => ({ ...prev, [key]: 'done' }));
        }, 2000);
    };

    const getRequirements = (reason: string) => {
        if (selectedGroup === 'No Justificado') {
            return { video: true, photoPerimSalida: true, timeEq: true };
        }

        const baseExitReqs = { video: true, photoPerimSalida: true, timeEq: true };

        switch (reason) {
            case "Placa de papel":
            case "Placa deteriorada":
            case "Placa alterada":
            case "Placa fuera de la ubicacion":
            case "Sin placa":
                return baseExitReqs;
            case "Orden manual":
                return { ...baseExitReqs };
            case "Parqueadero lleno":
                return baseExitReqs;
            case "Vehiculo de emergencias":
                return baseExitReqs;
            case "Apertura con sellos":
                return { ...baseExitReqs };
            case "Vehiculo/Moto detras de otro":
                return baseExitReqs;
            case "Salida de Invitado o Proveedor":
                return { video: true, photoIngreso: true, timeEq: true, planillado: true, photoPerimSalida: true };
            case "Otros":
                return baseExitReqs;
            case "Ticket Fraudulento":
                return { video: true, incidentCheck: true, photoPerimSalida: true };
            case "Doble emision de ticket":
                return { video: true, timeEq: true, photoPerimSalida: true };
            case "Falla de sincronizacion":
                return { systemError: true, timeOnly: true, video: true, incidentCheck: true };
            case "Valla que no baja":
                return { video: true, systemError: true, incidentCheck: true };
            default:
                return { standard: true };
        }
    };

    const reqs = getRequirements(selectedReason);

    useEffect(() => {
        setSelectedReason('');
        setUploads({});
    }, [selectedGroup]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#001F3F]/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="relative bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="bg-[#001F3F] px-8 py-6 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-lg"><FileCheck size={20} /></div>
                        <div>
                            <h3 className="font-bold text-lg leading-tight">Agregar Justificación</h3>
                            <p className="text-xs text-blue-200">Ticket abierto #{ticket.id}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"><X size={20} /></button>
                </div>

                <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                    {/* Selector de Grupo */}
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                        <label className="text-sm font-bold text-slate-700 ml-1 flex items-center gap-2"><Layers size={16} />Seleccione el Grupo</label>
                        <div className="relative group">
                            <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className="w-full appearance-none pl-4 pr-10 py-3 rounded-xl border-2 outline-none transition-all cursor-pointer font-medium text-sm border-slate-200 focus:border-[#001F3F]">
                                <option value="">Seleccione...</option>
                                {Object.keys(JUSTIFICATION_GROUPS).map((group) => (
                                    <option key={group} value={group}>{group}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Selector de Motivo */}
                    {selectedGroup && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                            <label className="text-sm font-bold text-slate-700 ml-1 flex items-center gap-2"><List size={16} />Seleccione el motivo específico</label>
                            <div className="relative group">
                                <select value={selectedReason} onChange={(e) => setSelectedReason(e.target.value)} className="w-full appearance-none pl-4 pr-10 py-3 rounded-xl border-2 outline-none transition-all cursor-pointer font-medium text-sm border-slate-200 focus:border-[#001F3F]">
                                    <option value="">Seleccione...</option>
                                    {(JUSTIFICATION_GROUPS as any)[selectedGroup]?.map((reason: string) => (
                                        <option key={reason} value={reason}>{reason}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Campo Motivo (Universal) */}
                    {selectedReason && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="text-sm font-bold text-slate-700 mb-1 block">Motivo</label>
                            <textarea
                                value={additionalComments}
                                onChange={(e) => setAdditionalComments(e.target.value)}
                                className="w-full p-3 rounded-xl border-2 border-slate-200 outline-none focus:border-[#001F3F] transition-all font-medium text-slate-600 text-sm"
                                placeholder="Describa el motivo..."
                                rows={3}
                            ></textarea>
                        </div>
                    )}

                    {reqs.systemError && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="text-sm font-bold text-slate-700 mb-1 block">Tipo Error</label>
                            <div className="relative">
                                <select className="w-full appearance-none pl-4 pr-10 py-3 rounded-xl border-2 border-slate-200 outline-none focus:border-[#001F3F] transition-all cursor-pointer font-medium text-sm">
                                    <option value="">Seleccione...</option>
                                    {SYSTEM_ERRORS.map((err) => (
                                        <option key={err} value={err}>{err}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {reqs.timeEq && <TimeEquipmentFields onChangeEquipment={setExitEquipment} />}
                    {reqs.timeOnly && <TimeOnlyField />}

                    {reqs.incidentCheck && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="flex items-center gap-3 cursor-pointer group p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
                                <input type="checkbox" checked={incidentRaised} onChange={(e) => setIncidentRaised(e.target.checked)} className="w-4 h-4 cursor-pointer" />
                                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">Generar ticket de incidencia</span>
                            </label>
                        </div>
                    )}

                    {selectedReason && (
                        <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            {reqs.video && <UploadButton label="Video" uploadKey="video" icon={<Video size={24} />} isVideo={true} uploads={uploads} onUpload={handleFileUpload} />}
                            {reqs.photoPerimSalida && <UploadButton label="Foto Perimetral Salida" uploadKey="photoPerimSalida" icon={<Camera size={24} />} uploads={uploads} onUpload={handleFileUpload} />}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors text-sm">Cancelar</button>
                    <button onClick={handleSaveJustification} className="px-8 py-3 rounded-xl bg-[#001F3F] text-white font-bold hover:bg-blue-900 shadow-lg shadow-blue-900/20 active:scale-95 transition-all flex items-center gap-2 text-sm"><Save size={18} />Guardar</button>
                </div>
            </div>
        </div>
    );
};
