import { ClipboardCheck } from 'lucide-react';

const RevisionView = () => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-8 flex flex-col items-center justify-center gap-4 min-h-[340px] text-center">
        <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center">
          <ClipboardCheck size={28} className="text-violet-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-700">Revisión</h3>
        <p className="text-sm text-slate-400 max-w-sm">
          Panel de revisión y aprobación de solicitudes de accesorios pendientes.
        </p>
        <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-600 text-xs font-semibold">
          En construcción
        </span>
      </div>
    </div>
  );
};

export default RevisionView;
