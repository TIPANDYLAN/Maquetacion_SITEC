import { AlertCircle, CheckCircle } from 'lucide-react';

type ModalType = 'confirmacion' | 'exito';

interface ConfirmacionModalProps {
  tipo: ModalType;
  titulo: string;
  mensaje: string;
  onConfirm: () => void;
  onClose: () => void;
  textoBtnConfirm?: string;
}

export const ConfirmacionModal = ({
  tipo,
  titulo,
  mensaje,
  onConfirm,
  onClose,
  textoBtnConfirm = 'Confirmar',
}: ConfirmacionModalProps) => {
  const isExito = tipo === 'exito';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header con icono */}
        <div className={`px-6 py-6 flex flex-col items-center gap-3 ${isExito ? 'bg-emerald-50' : 'bg-blue-50'}`}>
          {isExito ? (
            <CheckCircle size={48} className="text-emerald-600" />
          ) : (
            <AlertCircle size={48} className="text-blue-600" />
          )}
          <h2 className={`text-lg font-bold ${isExito ? 'text-emerald-900' : 'text-blue-900'}`}>{titulo}</h2>
        </div>

        {/* Contenido */}
        <div className="px-6 py-4">
          <p className="text-slate-600 text-center text-sm leading-relaxed">{mensaje}</p>
        </div>

        {/* Botones */}
        <div className={`px-6 py-4 flex gap-3 ${isExito ? 'justify-center' : 'justify-end'}`}>
          {!isExito && (
            <button
              onClick={onClose}
              className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-semibold transition border border-slate-200"
            >
              Cancelar
            </button>
          )}
          <button
            onClick={() => {
              onConfirm();
            }}
            className={`px-5 py-2 text-white rounded-xl text-sm font-semibold transition ${
              isExito ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isExito ? 'Aceptar' : textoBtnConfirm}
          </button>
        </div>
      </div>
    </div>
  );
};
