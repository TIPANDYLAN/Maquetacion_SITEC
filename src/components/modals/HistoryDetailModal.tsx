import { X, Eye } from 'lucide-react';

interface TicketJustificationData {
    justificationType?: string;
    selectedGroup?: string;
    selectedReason?: string;
    exitEquipment?: string;
    additionalComments?: string;
}

interface HistoryTicket {
    id: string;
    matricula?: string;
    justificationData?: TicketJustificationData;
}

interface HistoryDetailModalProps {
    ticket: HistoryTicket;
    onClose: () => void;
}

export const HistoryDetailModal = ({ ticket, onClose }: HistoryDetailModalProps) => {
    const data = ticket.justificationData || {};
    const group = data.selectedGroup || (data.justificationType === 'no_justificada' ? 'N/A' : 'Sin Grupo');
    const reason = data.selectedReason || 'Sin Motivo';
    const equipment = data.exitEquipment || 'No registrado';
    const comments = data.additionalComments || 'Sin comentarios adicionales';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#001F3F]/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="relative bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="bg-[#001F3F] px-8 py-6 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-lg"><Eye size={20} /></div>
                        <div>
                            <h3 className="font-bold text-lg leading-tight">Detalle de Justificación</h3>
                            <p className="text-xs text-blue-200">Ticket #{ticket.id} - {ticket.matricula}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"><X size={20} /></button>
                </div>

                <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Grupo</label>
                                <p className="font-bold text-[#001F3F] text-base">{group}</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Équipo Salida</label>
                                <p className="font-bold text-[#001F3F] text-base">{equipment}</p>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Motivo Específico</label>
                            <p className="font-bold text-[#001F3F] text-base">{reason}</p>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Motivo (Descripción)</label>
                            <p className="font-medium text-slate-700 text-sm bg-white p-2 rounded border border-slate-200">{comments}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 ml-1">Video Evidencia</label>
                            <div className="h-32 bg-slate-100 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                                <p className="text-xs">No disponible</p>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 ml-1">Foto Perimetral Salida</label>
                            <div className="h-32 bg-slate-100 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                                <p className="text-xs">No disponible</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
                    <button onClick={onClose} className="px-8 py-3 rounded-xl bg-[#001F3F] text-white font-bold hover:bg-blue-900 shadow-lg shadow-blue-900/20 active:scale-95 transition-all text-sm">Cerrar</button>
                </div>
            </div>
        </div>
    );
};
