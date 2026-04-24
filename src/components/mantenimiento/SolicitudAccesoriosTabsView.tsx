import { useState, useEffect } from 'react';
import SolicitarView from './SolicitarView.tsx';
import OrdenCompraView from './OrdenCompraView';
import RevisionView from './RevisionView.tsx';
import { dbApiFetch, DB_API_CATALOG } from '../../services/dbApi';

export type Tab = 'solicitar' | 'orden_compra' | 'revision';
export type AccesorioTipo = 'botas' | 'auriculares';

export interface FilaEmpleado {
  id: string;
  empleadoNombre: string;
  empleadoCedula: string;
  centroCosto: string;
  accesorio: AccesorioTipo;
  talla: string;
  acta?: boolean;
  valor?: number;
  cuotas?: string;
}

export interface SolicitudGuardada {
  id: string;
  fecha: string;
  filas: FilaEmpleado[];
  estado: 'creada' | 'orden_generada' | 'pedido_realizado';
}

export interface OrdenAccesorioResumen {
  numeroOrden: string;
  totalValor: number;
  fecha: string;
  archivoOrdenNombre?: string;
  archivoValidadaNombre?: string;
}

export interface OrdenCompraResumen {
  solicitudId: string;
  numeroOrden: string;
  totalValor: number;
  fecha: string;
  filas: FilaEmpleado[];
  archivoOrdenNombre?: string;
  archivoValidadaNombre?: string;
  ordenesPorAccesorio?: Partial<Record<AccesorioTipo, OrdenAccesorioResumen>>;
  facturasPorAccesorio?: Partial<Record<AccesorioTipo, string>>;
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

  const construirOrdenesDesdeArchivos = async (solicitudesBase: SolicitudGuardada[]): Promise<OrdenCompraResumen[]> => {
    const resultados = await Promise.all(
      solicitudesBase.map(async (solicitud) => {
        const archivosResponse = await dbApiFetch<{
          ok: boolean;
          archivos?: Array<Record<string, unknown>>;
        }>({
          endpoint: `${DB_API_CATALOG.accesoriasArchivos}/${solicitud.id}`,
          method: 'GET',
          allow404: true,
        });

        const archivos = Array.isArray(archivosResponse?.archivos) ? archivosResponse.archivos : [];
        const archivosOrden = archivos.filter((item) => {
          const tipo = String(item.tipo || '').trim().toLowerCase();
          const accesorio = String(item.accesorio || '').trim();
          return (tipo === 'orden' || tipo === 'orden_validada') && Boolean(accesorio);
        });

        if (archivosOrden.length === 0) {
          return null;
        }

        const ordenesPorAccesorio: Partial<Record<AccesorioTipo, OrdenAccesorioResumen>> = {};

        for (const archivo of archivosOrden) {
          const accesorio = String(archivo.accesorio || '').trim() as AccesorioTipo;
          const tipo = String(archivo.tipo || '').trim().toLowerCase();

          if (accesorio !== 'botas' && accesorio !== 'auriculares') {
            continue;
          }

          const actual = ordenesPorAccesorio[accesorio] ?? {
            numeroOrden: '',
            totalValor: 0,
            fecha: solicitud.fecha,
          };

          if (tipo === 'orden') {
            if (!actual.numeroOrden) {
              actual.numeroOrden = String(archivo.numero_orden || '').trim();
            }
            if ((!actual.totalValor || Number(actual.totalValor) <= 0) && Number(archivo.total_valor || 0) > 0) {
              actual.totalValor = Number(archivo.total_valor || 0);
            }
            if (!actual.archivoOrdenNombre) {
              actual.archivoOrdenNombre = String(archivo.nombre_archivo || '').trim() || undefined;
            }
          }

          if (tipo === 'orden_validada' && !actual.archivoValidadaNombre) {
            actual.archivoValidadaNombre = String(archivo.nombre_archivo || '').trim() || undefined;
          }

          ordenesPorAccesorio[accesorio] = actual;
        }

        const detalles = Object.values(ordenesPorAccesorio);
        const numeroOrden = detalles.map((d) => String(d?.numeroOrden || '').trim()).filter(Boolean).join(' / ');
        const totalValor = detalles.reduce((acc, d) => acc + Number(d?.totalValor || 0), 0);
        const totalOrdenesConArchivo = detalles.filter((d) => Boolean(d?.archivoOrdenNombre)).length;
        const totalValidadasConArchivo = detalles.filter((d) => Boolean(d?.archivoValidadaNombre)).length;

        return {
          solicitudId: solicitud.id,
          numeroOrden,
          totalValor,
          fecha: solicitud.fecha,
          filas: solicitud.filas,
          archivoOrdenNombre:
            totalOrdenesConArchivo > 0
              ? totalOrdenesConArchivo === 1
                ? detalles.find((d) => d?.archivoOrdenNombre)?.archivoOrdenNombre
                : `${totalOrdenesConArchivo} ordenes cargadas`
              : undefined,
          archivoValidadaNombre:
            totalValidadasConArchivo > 0
              ? totalValidadasConArchivo === 1
                ? detalles.find((d) => d?.archivoValidadaNombre)?.archivoValidadaNombre
                : `${totalValidadasConArchivo} ordenes validadas`
              : undefined,
          ordenesPorAccesorio,
          facturasPorAccesorio: {},
          cuotasPorAccesorio: {},
        } as OrdenCompraResumen;
      })
    );

    return resultados.filter((item): item is OrdenCompraResumen => Boolean(item));
  };

  // Cargar solicitudes y órdenes al montar el componente
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const solicitudesResponse = await dbApiFetch<{
          ok: boolean;
          solicitudes: SolicitudGuardada[];
        }>({
          endpoint: DB_API_CATALOG.accesoriosSolicitudes,
          method: 'GET',
        });

        if (solicitudesResponse?.ok && solicitudesResponse.solicitudes) {
          setSolicitudes(solicitudesResponse.solicitudes);
        }

        const ordenesResponse = await dbApiFetch<{
          ok: boolean;
          ordenes: OrdenCompraResumen[];
        }>({
          endpoint: DB_API_CATALOG.accesoriasOrdenes,
          method: 'GET',
        });

        if (ordenesResponse?.ok && ordenesResponse.ordenes) {
          if (ordenesResponse.ordenes.length > 0) {
            setOrdenesCompra(ordenesResponse.ordenes as OrdenCompraResumen[]);
          } else {
            const fallback = await construirOrdenesDesdeArchivos(solicitudesResponse?.solicitudes ?? []);
            setOrdenesCompra(fallback);
          }
        }
      } catch (error) {
        console.error('Error cargando datos:', error);
      }
    };

    void cargarDatos();
  }, []);

  const handleGuardarSolicitud = async (filas: FilaEmpleado[]) => {
    try {
      const solicitudId = `SOL-${Date.now()}`;
      const nuevaSolicitud: SolicitudGuardada = {
        id: solicitudId,
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

      // Guardar en BD
      await dbApiFetch({
        endpoint: DB_API_CATALOG.accesoriosSolicitudes,
        method: 'POST',
        body: nuevaSolicitud,
      });

      setSolicitudes((prev) => [nuevaSolicitud, ...prev]);
      setTab('orden_compra');
    } catch (error) {
      console.error('Error guardando solicitud:', error);
      window.alert('Error al guardar la solicitud');
    }
  };

  const handleUpdateEstado = async (solicitudId: string, estado: SolicitudGuardada['estado']) => {
    try {
      // Actualizar en BD
      await dbApiFetch({
        endpoint: `${DB_API_CATALOG.accesoriosSolicitudes}/${solicitudId}`,
        method: 'PUT',
        body: { estado },
      });

      setSolicitudes((prev) => prev.map((s) => (s.id === solicitudId ? { ...s, estado } : s)));
    } catch (error) {
      console.error('Error actualizando estado:', error);
      window.alert('Error al actualizar el estado');
    }
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

  const handleActualizarRevision = async (
    solicitudId: string,
    data: { facturasPorAccesorio: Partial<Record<AccesorioTipo, string>>; cuotasPorAccesorio: Record<string, string> },
  ): Promise<boolean> => {
    try {
      await dbApiFetch({
        endpoint: DB_API_CATALOG.accesoriasOrdenes,
        method: 'POST',
        body: {
          solicitudId,
          facturasPorAccesorio: data.facturasPorAccesorio,
          cuotasPorAccesorio: data.cuotasPorAccesorio,
        },
      });

      setOrdenesCompra((prev) =>
        prev.map((orden) =>
          orden.solicitudId === solicitudId
            ? {
                ...orden,
                facturasPorAccesorio: data.facturasPorAccesorio,
                cuotasPorAccesorio: data.cuotasPorAccesorio,
                filas: orden.filas.map((fila) => ({
                  ...fila,
                  cuotas: data.cuotasPorAccesorio[fila.id] ?? fila.cuotas,
                })),
              }
            : orden
        )
      );

      return true;
    } catch (error) {
      console.error('Error guardando revision:', error);
      window.alert('No se pudo guardar la revision.');
      return false;
    }
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
