import { useState } from 'react';
import SolicitarView from './SolicitarView.tsx';
import OrdenCompraView from './OrdenCompraView';
import RevisionView from './RevisionView.tsx';

export type Tab = 'solicitar' | 'orden_compra' | 'revision';

export interface FilaEmpleado {
  id: string;
  empleadoNombre: string;
  empleadoCedula: string;
  centroCosto: string;
  accesorio: 'botas' | 'auriculares';
  talla: string;
}

export interface SolicitudGuardada {
  id: string;
  fecha: string;
  filas: FilaEmpleado[];
  estado: 'creada' | 'orden_generada' | 'pedido_realizado';
}

export interface OrdenCompraResumen {
  solicitudId: string;
  numeroOrden: string;
  totalValor: number;
  fecha: string;
  filas: FilaEmpleado[];
  archivoOrdenNombre?: string;
  archivoValidadaNombre?: string;
  numeroFactura?: string;
  cuotasPorAccesorio?: Record<string, string>;
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'solicitar', label: 'Solicitar' },
  { id: 'orden_compra', label: 'Orden de Compra' },
  { id: 'revision', label: 'Revisión' },
];

const SolicitudAccesoriosTabsView = () => {
  const [tab, setTab] = useState<Tab>('solicitar');
  const [solicitudes, setSolicitudes] = useState<SolicitudGuardada[]>([]);
  const [ordenesCompra, setOrdenesCompra] = useState<OrdenCompraResumen[]>([]);

  const handleGuardarSolicitud = (filas: FilaEmpleado[]) => {
    const nuevaSolicitud: SolicitudGuardada = {
      id: `SOL-${Date.now()}`,
      fecha: new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      filas,
      estado: 'creada',
    };
    setSolicitudes((prev) => [nuevaSolicitud, ...prev]);
    setTab('orden_compra');
  };

  const handleUpdateEstado = (solicitudId: string, estado: SolicitudGuardada['estado']) => {
    setSolicitudes((prev) => prev.map((s) => (s.id === solicitudId ? { ...s, estado } : s)));
  };

  const handleOrdenCompraSubida = (orden: OrdenCompraResumen) => {
    setOrdenesCompra((prev) => {
      const index = prev.findIndex((o) => o.solicitudId === orden.solicitudId);
      if (index === -1) {
        return [orden, ...prev];
      }
      const copia = [...prev];
      copia[index] = { ...copia[index], ...orden };
      return copia;
    });
  };

  const handleActualizarRevision = (solicitudId: string, data: { numeroFactura: string; cuotasPorAccesorio: Record<string, string> }) => {
    setOrdenesCompra((prev) =>
      prev.map((orden) =>
        orden.solicitudId === solicitudId
          ? {
              ...orden,
              numeroFactura: data.numeroFactura,
              cuotasPorAccesorio: data.cuotasPorAccesorio,
            }
          : orden
      )
    );
  };

  const handlePedidoRealizado = (solicitudId: string) => {
    handleUpdateEstado(solicitudId, 'pedido_realizado');
    setTab('revision');
  };

  const renderContenido = () => {
    switch (tab) {
      case 'solicitar':
        return <SolicitarView onGuardar={handleGuardarSolicitud} />;
      case 'orden_compra':
        return (
          <OrdenCompraView
            solicitudes={solicitudes}
            ordenesCompra={ordenesCompra}
            onUpdateEstado={handleUpdateEstado}
            onOrdenCompraSubida={handleOrdenCompraSubida}
            onPedidoRealizado={handlePedidoRealizado}
          />
        );
      case 'revision':
        return <RevisionView ordenesCompra={ordenesCompra} onGuardarRevision={handleActualizarRevision} />;
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
