import { useState } from 'react';
import { FileText, Upload, CheckCircle, Eye, X, ChevronDown, ChevronRight, Download } from 'lucide-react';
import type { SolicitudGuardada, FilaEmpleado, OrdenCompraResumen } from './SolicitudAccesoriosTabsView';

interface OrdenCompraViewProps {
  solicitudes: SolicitudGuardada[];
  ordenesCompra: OrdenCompraResumen[];
  onUpdateEstado: (solicitudId: string, estado: SolicitudGuardada['estado']) => void;
  onOrdenCompraSubida: (orden: OrdenCompraResumen) => void;
  onPedidoRealizado: (solicitudId: string) => void;
}

interface ArchivoSubido {
  solicitudId: string;
  tipo: 'orden' | 'acta' | 'orden_validada';
  nombre: string;
  fecha: string;
  empleadoCedula?: string;
  file?: File;
}

interface FilaSeleccionadaContext {
  solicitudId: string;
  fila: FilaEmpleado;
}

const OrdenCompraView = ({ solicitudes, ordenesCompra, onUpdateEstado, onOrdenCompraSubida, onPedidoRealizado }: OrdenCompraViewProps) => {
  const [archivos, setArchivos] = useState<ArchivoSubido[]>([]);
  const [filaSeleccionada, setFilaSeleccionada] = useState<FilaSeleccionadaContext | null>(null);
  const [generandoActaPersonal, setGenerandoActaPersonal] = useState(false);
  const [expandedSolicitud, setExpandedSolicitud] = useState<string | null>(null);

  if (solicitudes.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 flex flex-col items-center justify-center gap-4 min-h-[340px] text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center">
            <FileText size={28} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700">Sin solicitudes</h3>
          <p className="text-sm text-slate-400 max-w-sm">
            Crea una solicitud en la pestaña "Solicitar" para ver el resumen aquí.
          </p>
        </div>
      </div>
    );
  }

  const getOrden = (solicitudId: string) => ordenesCompra.find((o) => o.solicitudId === solicitudId);

  const getActasCompletas = (solicitudId: string) =>
    new Set(
      archivos
        .filter((a) => a.tipo === 'acta' && a.solicitudId === solicitudId && a.empleadoCedula)
        .map((a) => a.empleadoCedula)
    ).size;

  const getTotalPersonasSolicitud = (solicitud: SolicitudGuardada) =>
    new Set(
      solicitud.filas
        .map((fila) => fila.empleadoCedula)
        .filter((cedula) => Boolean(cedula && cedula.trim()))
    ).size;

  const descargarArchivo = (solicitudId: string, tipo: 'orden' | 'orden_validada') => {
    const archivo = [...archivos]
      .reverse()
      .find((a) => a.solicitudId === solicitudId && a.tipo === tipo);

    if (!archivo?.file) {
      window.alert('No hay archivo disponible para descargar en esta sesion.');
      return;
    }

    const url = URL.createObjectURL(archivo.file);
    const link = document.createElement('a');
    link.href = url;
    link.download = archivo.nombre;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getActaArchivo = (solicitudId: string, empleadoCedula: string) =>
    [...archivos]
      .reverse()
      .find(
        (a) =>
          a.tipo === 'acta' &&
          a.solicitudId === solicitudId &&
          a.empleadoCedula === empleadoCedula
      );

  const descargarActaFirmada = (solicitudId: string, empleadoCedula: string) => {
    const archivo = getActaArchivo(solicitudId, empleadoCedula);

    if (!archivo?.file) {
      window.alert('No hay acta firmada disponible para descargar en esta sesion.');
      return;
    }

    const url = URL.createObjectURL(archivo.file);
    const link = document.createElement('a');
    link.href = url;
    link.download = archivo.nombre;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleUploadArchivo = (tipo: 'orden' | 'acta' | 'orden_validada', solicitud: SolicitudGuardada) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx';

    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || !files[0]) return;

      const file = files[0];
      const solicitudId = solicitud.id;
      const ordenActual = getOrden(solicitudId);

      if (tipo === 'orden' && ordenActual?.archivoOrdenNombre) {
        return;
      }

      if (tipo === 'orden_validada' && ordenActual?.archivoValidadaNombre) {
        return;
      }

      let numeroOrden = ordenActual?.numeroOrden || '';
      let totalValor = ordenActual?.totalValor || 0;

      if (tipo === 'orden') {
        const numeroIngresado = window.prompt('Ingrese el numero de orden de compra');
        if (!numeroIngresado || !numeroIngresado.trim()) return;
        numeroOrden = numeroIngresado.trim();

        const totalIngresado = window.prompt('Ingrese el total de la orden (valor)');
        if (!totalIngresado || !totalIngresado.trim()) return;

        totalValor = Number(totalIngresado.replace(',', '.'));
        if (Number.isNaN(totalValor) || totalValor <= 0) {
          window.alert('El total debe ser un numero mayor a 0.');
          return;
        }
      }

      setArchivos((prev) => [
        ...prev,
        {
          solicitudId,
          tipo,
          nombre: file.name,
          fecha: new Date().toLocaleDateString('es-ES'),
          empleadoCedula: filaSeleccionada?.fila.empleadoCedula,
          file,
        },
      ]);

      if (tipo === 'orden') {
        onUpdateEstado(solicitudId, 'orden_generada');
        onOrdenCompraSubida({
          solicitudId,
          numeroOrden,
          totalValor,
          fecha: new Date().toLocaleDateString('es-ES'),
          filas: solicitud.filas,
          archivoOrdenNombre: file.name,
          archivoValidadaNombre: ordenActual?.archivoValidadaNombre,
          numeroFactura: ordenActual?.numeroFactura,
          cuotasPorAccesorio: ordenActual?.cuotasPorAccesorio,
        });
      }

      if (tipo === 'orden_validada') {
        if (!ordenActual) {
          window.alert('Primero debe subir la orden de compra.');
          return;
        }

        onOrdenCompraSubida({
          ...ordenActual,
          archivoValidadaNombre: file.name,
        });
        onPedidoRealizado(solicitudId);
      }
    };

    input.click();
  };

  const handleGenerarActaPersonal = () => {
    if (!filaSeleccionada) return;
    setGenerandoActaPersonal(true);

    setTimeout(() => {
      setArchivos((prev) => [
        ...prev,
        {
          solicitudId: filaSeleccionada.solicitudId,
          tipo: 'acta',
          nombre: `Acta_${filaSeleccionada.fila.empleadoCedula}_${filaSeleccionada.solicitudId}.pdf`,
          fecha: new Date().toLocaleDateString('es-ES'),
          empleadoCedula: filaSeleccionada.fila.empleadoCedula,
        },
      ]);
      setGenerandoActaPersonal(false);
    }, 1500);
  };

  return (
    <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
        <p className="mt-1 text-sm text-slate-600">Gestiona las solicitudes de accesorios y carga sus documentos de orden y validacion.</p>
      </div>

      <div className="bg-white divide-y divide-slate-200">
      {solicitudes.map((solicitud) => {
        const orden = getOrden(solicitud.id);
        const ordenSubida = Boolean(orden?.archivoOrdenNombre);
        const ordenValidada = Boolean(orden?.archivoValidadaNombre);
        const actasCompletas = getActasCompletas(solicitud.id);
        const totalPersonas = getTotalPersonasSolicitud(solicitud);
        const todasActasCompletas = actasCompletas === totalPersonas && totalPersonas > 0;
        const panelAbierto = expandedSolicitud === solicitud.id;

        return (
          <div key={solicitud.id} className="bg-white overflow-hidden">
            <button
              onClick={() => setExpandedSolicitud((prev) => (prev === solicitud.id ? null : solicitud.id))}
              className={`w-full px-6 py-4 border-b border-slate-200 flex items-center justify-between transition ${
                panelAbierto ? 'bg-slate-100' : 'bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${panelAbierto ? 'bg-blue-100' : 'bg-blue-50'}`}>
                  <FileText size={18} className="text-blue-500" />
                </div>
                <div className="text-left">
                  <h3 className="text-base font-bold text-slate-700">{solicitud.id}</h3>
                  <p className="text-xs text-slate-400">Solicitud de accesorios</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    solicitud.estado === 'pedido_realizado'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : solicitud.estado === 'orden_generada'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {solicitud.estado === 'pedido_realizado'
                    ? 'Pedido realizado'
                    : solicitud.estado === 'orden_generada'
                    ? 'Orden generada'
                    : 'Solicitud creada'}
                </span>
                {panelAbierto ? <ChevronDown size={18} className="text-slate-500" /> : <ChevronRight size={18} className="text-slate-500" />}
              </div>
            </button>

            {panelAbierto && (
              <div className="p-6 space-y-6">
                <div className="text-sm text-slate-500">
                  <p>
                    Fecha: <span className="font-medium text-slate-700">{solicitud.fecha}</span>
                  </p>
                </div>
                <div className="border-t border-slate-200 pt-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <h4 className="text-base font-bold text-slate-700">Orden de Compra</h4>
                      {ordenSubida && (
                        <button
                          onClick={() => descargarArchivo(solicitud.id, ordenValidada ? 'orden_validada' : 'orden')}
                          className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-white rounded-xl text-sm font-semibold transition ${
                            ordenValidada ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                        >
                          <Download size={16} />
                          {ordenValidada ? 'Descargar Orden Validada' : 'Descargar Orden de Compra'}
                        </button>
                      )}
                    </div>

                    {!ordenSubida && (
                      <div className="border border-slate-200 bg-white overflow-hidden w-full lg:max-w-xl">
                        <div className="p-4 bg-white">
                          <h5 className="font-bold text-slate-700 text-sm">Orden de Compra</h5>
                          <p className="text-xs text-slate-500 mt-1">Subir orden principal de compra para habilitar el detalle individual.</p>
                        </div>

                        <div className="border-t border-slate-200 p-4">
                          <button
                            onClick={() => handleUploadArchivo('orden', solicitud)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition"
                          >
                            <Upload size={16} />
                            Subir Orden de Compra
                          </button>
                        </div>
                      </div>
                    )}

                    {ordenSubida && (
                      <>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-slate-50 text-slate-500 uppercase tracking-wide">
                                <th className="px-3 py-2 text-left font-semibold">Empleado</th>
                                <th className="px-3 py-2 text-left font-semibold">Cédula</th>
                                <th className="px-3 py-2 text-left font-semibold">Centro</th>
                                <th className="px-3 py-2 text-left font-semibold">Accesorio</th>
                                <th className="px-3 py-2 text-center font-semibold">Talla</th>
                                <th className="px-3 py-2 text-center font-semibold">Acta</th>
                              </tr>
                            </thead>
                            <tbody>
                              {solicitud.filas.map((fila, idx) => (
                                <tr key={fila.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                  <td className="px-3 py-2 font-medium text-slate-700">{fila.empleadoNombre}</td>
                                  <td className="px-3 py-2 text-slate-500">{fila.empleadoCedula}</td>
                                  <td className="px-3 py-2 text-slate-600 max-w-[150px] truncate">{fila.centroCosto}</td>
                                  <td className="px-3 py-2">
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                        fila.accesorio === 'botas' ? 'bg-amber-50 text-amber-700' : 'bg-violet-50 text-violet-700'
                                      }`}
                                    >
                                      {fila.accesorio === 'botas' ? 'Botas' : 'Auriculares'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-center text-slate-600">{fila.accesorio === 'botas' ? fila.talla : '—'}</td>
                                  <td className="px-3 py-2 text-center">
                                    <button
                                      onClick={() => setFilaSeleccionada({ solicitudId: solicitud.id, fila })}
                                      className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                      title="Ver/generar acta"
                                    >
                                      <Eye size={16} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="text-right text-xs text-slate-400">
                          Total de artículos: <span className="font-bold text-slate-700">{solicitud.filas.length}</span>
                        </div>

                        {!ordenValidada && (
                          <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between">
                            <h4 className="text-base font-bold text-slate-700">Validar</h4>
                            {!ordenValidada && !todasActasCompletas && (
                              <p className="text-sm text-amber-700 lg:text-right">
                                <span className="font-bold">Progreso de actas:</span> {actasCompletas} de {totalPersonas} subidas. Suba todas las actas antes de proceder la validación.
                              </p>
                            )}
                          </div>

                          <div className="border border-slate-200 bg-white overflow-hidden w-full lg:max-w-xl">
                            <div className="p-4 bg-white">
                              <h5 className="font-bold text-emerald-800 text-sm">Orden Validada</h5>
                              <p className="text-xs text-emerald-700 mt-1">Subir orden validada para cerrar el pedido y enviarlo a revisión.</p>
                            </div>

                            <div className="border-t border-slate-200 p-4">
                              {ordenValidada ? (
                                <button
                                  onClick={() => descargarArchivo(solicitud.id, 'orden_validada')}
                                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition"
                                >
                                  <Download size={16} />
                                  Descargar Orden Validada
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUploadArchivo('orden_validada', solicitud)}
                                  disabled={!todasActasCompletas}
                                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-sm font-semibold transition"
                                >
                                  <Upload size={16} />
                                  Subir Orden de Compra Validada
                                </button>
                              )}
                            </div>
                          </div>
                          </div>
                        )}
                      </>
                    )}
                </div>
              </div>
            </div>
            )}
          </div>
        );
      })}
      </div>

      {filaSeleccionada && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="px-6 py-6 flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-50 to-blue-100">
              <div className="flex-1">
                <h2 className="text-lg font-bold text-slate-900">Acta - {filaSeleccionada.fila.empleadoNombre}</h2>
                <p className="text-xs text-slate-500 mt-1">Cédula: {filaSeleccionada.fila.empleadoCedula}</p>
              </div>
              <button
                onClick={() => setFilaSeleccionada(null)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Accesorio solicitado</p>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      filaSeleccionada.fila.accesorio === 'botas' ? 'bg-amber-50 text-amber-700' : 'bg-violet-50 text-violet-700'
                    }`}
                  >
                    {filaSeleccionada.fila.accesorio === 'botas' ? 'Botas' : 'Auriculares'}
                  </span>
                  {filaSeleccionada.fila.accesorio === 'botas' && (
                    <span className="text-xs text-slate-600 ml-2">
                      Talla: <span className="font-bold">{filaSeleccionada.fila.talla}</span>
                    </span>
                  )}
                </div>
              </div>

              {(() => {
                const actaArchivo = getActaArchivo(filaSeleccionada.solicitudId, filaSeleccionada.fila.empleadoCedula);
                const actaFirmada = Boolean(actaArchivo?.file);

                if (!actaArchivo) return null;

                return (
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 flex items-start gap-2">
                  <CheckCircle size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-700">
                    <p className="font-semibold">{actaFirmada ? 'Acta firmada cargada' : 'Acta generada'}</p>
                    <p className="text-emerald-600">{actaFirmada ? 'Lista para descargar' : 'Pendiente de firma y carga'}</p>
                  </div>
                </div>
                );
              })()}
            </div>

            <div className="px-6 py-5 bg-slate-50 border-t border-slate-200 flex flex-col gap-3">
              {(() => {
                const actaArchivo = getActaArchivo(filaSeleccionada.solicitudId, filaSeleccionada.fila.empleadoCedula);
                const actaFirmada = Boolean(actaArchivo?.file);

                if (actaFirmada) {
                  return (
                    <button
                      onClick={() => descargarActaFirmada(filaSeleccionada.solicitudId, filaSeleccionada.fila.empleadoCedula)}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition"
                    >
                      <Download size={16} />
                      Descargar Acta Firmada
                    </button>
                  );
                }

                return (
                  <>
                    <button
                      onClick={handleGenerarActaPersonal}
                      disabled={generandoActaPersonal || Boolean(actaArchivo)}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-sm font-semibold transition"
                    >
                      <Download size={16} />
                      {generandoActaPersonal ? 'Generando…' : 'Generar Acta'}
                    </button>

                    <button
                      onClick={() => handleUploadArchivo('acta', solicitudes.find((s) => s.id === filaSeleccionada.solicitudId) ?? solicitudes[0])}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition"
                    >
                      <Upload size={16} />
                      Subir Acta
                    </button>
                  </>
                );
              })()}

              <button
                onClick={() => setFilaSeleccionada(null)}
                className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-semibold transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdenCompraView;
