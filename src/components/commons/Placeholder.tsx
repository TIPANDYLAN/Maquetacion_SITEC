interface PlaceholderProps {
    title: string;
    description?: string;
}

export const Placeholder = ({ title, description }: PlaceholderProps) => (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-3xl font-black text-slate-800 mb-2">{title}</h2>
        <p className="text-slate-500 text-lg">{description || 'Esta sección estará disponible próximamente'}</p>
    </div>
);
