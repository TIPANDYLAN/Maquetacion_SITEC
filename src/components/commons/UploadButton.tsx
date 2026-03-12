import { Check, Loader2 } from 'lucide-react';

interface UploadButtonProps {
    label: string;
    icon: React.ReactNode;
    isVideo?: boolean;
    uploadKey: string;
    uploads?: Record<string, string>;
    onUpload?: (key: string) => void;
    readOnly?: boolean;
}

export const UploadButton = ({
    label,
    icon,
    isVideo = false,
    uploadKey,
    uploads = {},
    onUpload,
    readOnly = false
}: UploadButtonProps) => {
    const status = uploads[uploadKey];
    const isDone = status === 'done';

    return (
        <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 ml-1">{label}</label>
            <button
                onClick={() => !readOnly && onUpload && onUpload(uploadKey)}
                disabled={(!readOnly && isDone)}
                className={`w-full h-20 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 transition-all group
                    ${status === 'loading' ? 'border-slate-300' :
                        isDone && !readOnly ? 'border-emerald-500 bg-emerald-50 text-emerald-600' :
                            readOnly ? 'border-slate-300 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:border-slate-400' :
                                'border-slate-300 text-slate-400 hover:border-[#001F3F] hover:text-[#001F3F] hover:bg-blue-50'}
                `}
            >
                {status === 'loading' ? (
                    <Loader2 size={24} className="animate-spin text-[#001F3F]" />
                ) : isDone && !readOnly ? (
                    <div className="flex flex-col items-center animate-in zoom-in duration-300">
                        <div className="p-1 bg-emerald-100 rounded-full mb-1"><Check size={16} /></div>
                        <span className="text-[10px] font-bold">Cargado</span>
                    </div>
                ) : readOnly ? (
                    <div className="flex flex-col items-center">
                        <div className="p-1 bg-slate-200 rounded-full mb-1">{icon}</div>
                        <span className="text-[10px] font-bold">Visualizar</span>
                    </div>
                ) : (
                    <>
                        <div className="p-1.5 bg-slate-100 rounded-full group-hover:bg-white group-hover:shadow-md transition-all">
                            {icon}
                        </div>
                        <div className="text-center"><span className="font-bold text-[10px] block">{isVideo ? "Clic para cargar video" : "Clic para cargar"}</span></div>
                    </>
                )}
            </button>
        </div>
    );
};
