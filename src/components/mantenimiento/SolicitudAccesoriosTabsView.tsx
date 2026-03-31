import { useState } from 'react';
import SolicitarView from './SolicitarView';
import OrdenCompraView from './OrdenCompraView';
import RevisionView from './RevisionView';

type Tab = 'solicitar' | 'orden_compra' | 'revision';

const TABS: { id: Tab; label: string }[] = [
  { id: 'solicitar', label: 'Solicitar' },
  { id: 'orden_compra', label: 'Orden de Compra' },
  { id: 'revision', label: 'Revisión' },
];

const SolicitudAccesoriosTabsView = () => {
  const [tab, setTab] = useState<Tab>('solicitar');

  const renderContenido = () => {
    switch (tab) {
      case 'solicitar':
        return <SolicitarView />;
      case 'orden_compra':
        return <OrdenCompraView />;
      case 'revision':
        return <RevisionView />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-2 inline-flex gap-2">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-6 py-2 rounded-xl text-sm font-semibold transition min-w-[160px] ${
              tab === id
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-600 hover:bg-slate-100 border border-transparent'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {renderContenido()}
    </div>
  );
};

export default SolicitudAccesoriosTabsView;
