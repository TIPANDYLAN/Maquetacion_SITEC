import { useEffect, useMemo, useState } from 'react';
import { Building2, ChevronLeft, Clock3, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { getNominaCostCenters, getNominaEmployeesActive, type NominaCostCenter } from '../../services/n8nApi';
import type { EmpleadoNominaApiItem } from '../../types/nomina';

const FILTRO_DSC_MFCC = 'ADMINISTRACION-SUPERVISORES';
type TabDistribucion = 'empleados' | 'centros' | 'distribucion_empleados';
type VistaDistribucion = 'inicio' | TabDistribucion;

interface EmpleadoDistribucion {
  idEmpleado: string;
  documento: string;
  codigoEmpleado: string;
  nombres: string;
  apellidos: string;
  centroCostoCodigo: string;
  centroCostoDescripcion: string;
  departamentoCodigo: string;
  departamentoDescripcion: string;
  plan: string;
  ingreso: string;
}

interface DistribucionTemporal {
  centroCostoId: string;
  centroCostoNombre: string;
  porcentaje: number;
}

interface DistribucionEmpleadoTemporal {
  empleadoId: string;
  empleadoDocumento: string;
  empleadoNombreCompleto: string;
  centros: DistribucionTemporal[];
}

const normalizarTexto = (valor: string): string => String(valor || '').trim().toUpperCase();

const normalizarEmpleado = (item: EmpleadoNominaApiItem): EmpleadoDistribucion => {
  const payload = (item?.json ?? item ?? {}) as Record<string, unknown>;
  const documento = String(payload.DOCI_MFEMP || payload.CEDULA || '').trim();
  const codigoEmpleado = String(payload.COD_MFEMP || documento || '').trim();

  return {
    idEmpleado: documento || codigoEmpleado,
    documento,
    codigoEmpleado,
    nombres: String(payload.NOMBRES || '').trim(),
    apellidos: String(payload.APELLIDOS || '').trim(),
    centroCostoCodigo: String(payload.COD_MFCC || '').trim(),
    centroCostoDescripcion: String(payload.DSC_MFCC || '').trim(),
    departamentoCodigo: String(payload.COD_MFDPT || '').trim(),
    departamentoDescripcion: String(payload.DSC_MFDPT || '').trim(),
    plan: String(payload.PLAN || payload.TIPO_PLAN || payload.PLAN_CONTRATADO || '').trim(),
    ingreso: String(payload.FECING_MFEDC || payload.INGRESO || payload.FechaIngreso || '').trim(),
  };
};

const ConfiguracionDistribucionView = () => {
  const [vistaActiva, setVistaActiva] = useState<VistaDistribucion>('inicio');
  const [empleados, setEmpleados] = useState<EmpleadoDistribucion[]>([]);
  const [centrosCosto, setCentrosCosto] = useState<NominaCostCenter[]>([]);
  const [distribucionesTemporales, setDistribucionesTemporales] = useState<DistribucionTemporal[]>([]);
  const [distribucionesEmpleadoTemporales, setDistribucionesEmpleadoTemporales] = useState<DistribucionEmpleadoTemporal[]>([]);
  const [modalCentroAbierto, setModalCentroAbierto] = useState(false);
  const [modalEmpleadoAbierto, setModalEmpleadoAbierto] = useState(false);
  const [centroCostoSeleccionado, setCentroCostoSeleccionado] = useState('');
  const [porcentajeDistribucion, setPorcentajeDistribucion] = useState('');
  const [centroCostoEditandoId, setCentroCostoEditandoId] = useState<string | null>(null);
  const [empleadoSeleccionadoId, setEmpleadoSeleccionadoId] = useState('');
  const [centroCostoEmpleadoSeleccionado, setCentroCostoEmpleadoSeleccionado] = useState('');
  const [porcentajeEmpleadoDistribucion, setPorcentajeEmpleadoDistribucion] = useState('');
  const [centrosEmpleadoBorrador, setCentrosEmpleadoBorrador] = useState<DistribucionTemporal[]>([]);
  const [centroCostoEmpleadoEditandoId, setCentroCostoEmpleadoEditandoId] = useState<string | null>(null);
  const [porcentajeCentroEmpleadoEditando, setPorcentajeCentroEmpleadoEditando] = useState('');
  const [empleadoDistribucionEditandoId, setEmpleadoDistribucionEditandoId] = useState<string | null>(null);
  const [cargandoEmpleados, setCargandoEmpleados] = useState(false);
  const [cargandoCentros, setCargandoCentros] = useState(false);
  const [errorEmpleados, setErrorEmpleados] = useState<string | null>(null);
  const [errorCentros, setErrorCentros] = useState<string | null>(null);

  useEffect(() => {
    void cargarEmpleados();
    void cargarCentrosCosto();
  }, []);

  useEffect(() => {
    if (!modalCentroAbierto && !modalEmpleadoAbierto) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (modalEmpleadoAbierto) {
          cerrarModalEmpleado();
          return;
        }

        cerrarModalCentro();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalCentroAbierto, modalEmpleadoAbierto]);

  const cargarEmpleados = async () => {
    setCargandoEmpleados(true);
    setErrorEmpleados(null);

    try {
      const data = await getNominaEmployeesActive<EmpleadoNominaApiItem[]>();
      const empleadosApi = Array.isArray(data) ? data : [];

      const empleadosNormalizados = empleadosApi
        .map(normalizarEmpleado)
        .filter((empleado) => empleado.idEmpleado)
        .filter((empleado) => normalizarTexto(empleado.centroCostoDescripcion) === FILTRO_DSC_MFCC)
        .sort((a, b) => `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`, 'es', { sensitivity: 'base' }));

      const sinDuplicados = empleadosNormalizados.filter(
        (empleado, index, lista) => lista.findIndex((item) => item.idEmpleado === empleado.idEmpleado) === index,
      );

      setEmpleados(sinDuplicados);
    } catch (error) {
      console.error('Error cargando empleados para distribucion:', error);
      setEmpleados([]);
      setErrorEmpleados('No se pudo cargar la lista de empleados para distribuir.');
    } finally {
      setCargandoEmpleados(false);
    }
  };

  const cargarCentrosCosto = async () => {
    setCargandoCentros(true);
    setErrorCentros(null);

    try {
      const data = await getNominaCostCenters();
      const centrosApi = Array.isArray(data) ? data : [];

      setCentrosCosto(
        centrosApi
          .filter((centro) => centro.IDCENTROCOSTO || centro.CENTROCOSTO)
          .sort((a, b) => a.CENTROCOSTO.localeCompare(b.CENTROCOSTO, 'es', { sensitivity: 'base' })),
      );
    } catch (error) {
      console.error('Error cargando centros de costo para configuracion de distribucion:', error);
      setCentrosCosto([]);
      setErrorCentros('No se pudo cargar la lista de centros de costo.');
    } finally {
      setCargandoCentros(false);
    }
  };

  const limpiarFormularioCentro = () => {
    setCentroCostoSeleccionado('');
    setPorcentajeDistribucion('');
    setCentroCostoEditandoId(null);
  };

  const limpiarFormularioEmpleado = () => {
    setEmpleadoSeleccionadoId('');
    setCentroCostoEmpleadoSeleccionado('');
    setPorcentajeEmpleadoDistribucion('');
    setCentrosEmpleadoBorrador([]);
    setCentroCostoEmpleadoEditandoId(null);
    setPorcentajeCentroEmpleadoEditando('');
    setEmpleadoDistribucionEditandoId(null);
  };

  const abrirModalNuevoCentro = () => {
    limpiarFormularioCentro();
    setModalCentroAbierto(true);
  };

  const abrirModalEditarCentro = (centroCostoId: string) => {
    const registro = distribucionesTemporales.find((item) => item.centroCostoId === centroCostoId);
    if (!registro) return;

    setCentroCostoEditandoId(registro.centroCostoId);
    setCentroCostoSeleccionado(registro.centroCostoId);
    setPorcentajeDistribucion(String(registro.porcentaje));
    setModalCentroAbierto(true);
    setVistaActiva('centros');
  };

  const cerrarModalCentro = () => {
    limpiarFormularioCentro();
    setModalCentroAbierto(false);
  };

  const abrirModalNuevoEmpleado = () => {
    limpiarFormularioEmpleado();
    setModalEmpleadoAbierto(true);
  };

  const abrirModalEditarEmpleado = (empleadoId: string) => {
    const registro = distribucionesEmpleadoTemporales.find((item) => item.empleadoId === empleadoId);
    if (!registro) return;

    setEmpleadoDistribucionEditandoId(registro.empleadoId);
    setEmpleadoSeleccionadoId(registro.empleadoId);
    setCentrosEmpleadoBorrador(registro.centros.map((centro) => ({ ...centro })));
    setModalEmpleadoAbierto(true);
    setVistaActiva('distribucion_empleados');
  };

  const cerrarModalEmpleado = () => {
    limpiarFormularioEmpleado();
    setModalEmpleadoAbierto(false);
  };

  const agregarCentroEmpleadoBorrador = () => {
    const centro = centrosCosto.find((item) => item.IDCENTROCOSTO === centroCostoEmpleadoSeleccionado);
    if (!centro) {
      alert('Selecciona un centro de costo para el empleado');
      return;
    }

    const porcentaje = Number(String(porcentajeEmpleadoDistribucion).replace(',', '.'));
    if (!Number.isFinite(porcentaje) || porcentaje <= 0 || porcentaje > 100) {
      alert('Ingresa un porcentaje valido entre 0 y 100');
      return;
    }

    setCentrosEmpleadoBorrador((prev) => {
      const sinDuplicado = prev.filter((item) => item.centroCostoId !== centro.IDCENTROCOSTO);
      return [
        ...sinDuplicado,
        {
          centroCostoId: centro.IDCENTROCOSTO,
          centroCostoNombre: centro.CENTROCOSTO,
          porcentaje,
        },
      ];
    });

    setCentroCostoEmpleadoSeleccionado('');
    setPorcentajeEmpleadoDistribucion('');
  };

  const editarCentroEmpleadoBorrador = (centroCostoId: string) => {
    const registro = centrosEmpleadoBorrador.find((item) => item.centroCostoId === centroCostoId);
    if (!registro) return;

    setCentroCostoEmpleadoEditandoId(registro.centroCostoId);
    setPorcentajeCentroEmpleadoEditando(String(registro.porcentaje));
  };

  const cancelarEdicionCentroEmpleado = () => {
    setCentroCostoEmpleadoEditandoId(null);
    setPorcentajeCentroEmpleadoEditando('');
  };

  const guardarCentroEmpleadoEditado = () => {
    if (!centroCostoEmpleadoEditandoId) return;

    const porcentaje = Number(String(porcentajeCentroEmpleadoEditando).replace(',', '.'));
    if (!Number.isFinite(porcentaje) || porcentaje <= 0 || porcentaje > 100) {
      alert('Ingresa un porcentaje valido entre 0 y 100');
      return;
    }

    setCentrosEmpleadoBorrador((prev) =>
      prev.map((item) =>
        item.centroCostoId === centroCostoEmpleadoEditandoId
          ? {
              ...item,
              porcentaje,
            }
          : item,
      ),
    );

    cancelarEdicionCentroEmpleado();
  };

  const eliminarCentroEmpleadoBorrador = (centroCostoId: string) => {
    setCentrosEmpleadoBorrador((prev) => prev.filter((item) => item.centroCostoId !== centroCostoId));
    if (centroCostoEmpleadoEditandoId === centroCostoId) {
      cancelarEdicionCentroEmpleado();
    }
  };

  const guardarEmpleadoTemporal = () => {
    const empleado = empleadosFiltrados.find((item) => item.idEmpleado === empleadoSeleccionadoId);
    if (!empleado) {
      alert('Selecciona un empleado a distribuir');
      return;
    }

    if (centrosEmpleadoBorrador.length === 0) {
      alert('Agrega al menos un centro de costo');
      return;
    }

    const totalEmpleado = centrosEmpleadoBorrador.reduce((acumulado, item) => acumulado + item.porcentaje, 0);
    if (Math.abs(totalEmpleado - 100) > 0.01) {
      return;
    }

    setDistribucionesEmpleadoTemporales((prev) => {
      const sinDuplicado = prev.filter(
        (item) => item.empleadoId !== empleadoSeleccionadoId && item.empleadoId !== empleadoDistribucionEditandoId,
      );

      return [
        ...sinDuplicado,
        {
          empleadoId: empleado.idEmpleado,
          empleadoDocumento: empleado.documento || empleado.codigoEmpleado,
          empleadoNombreCompleto: `${empleado.apellidos} ${empleado.nombres}`.trim(),
          centros: centrosEmpleadoBorrador.map((centro) => ({ ...centro })),
        },
      ];
    });

    cerrarModalEmpleado();
  };

  const guardarCentroTemporal = () => {
    const centro = centrosCosto.find((item) => item.IDCENTROCOSTO === centroCostoSeleccionado);
    if (!centro) {
      alert('Selecciona un centro de costo');
      return;
    }

    const porcentaje = Number(String(porcentajeDistribucion).replace(',', '.'));
    if (!Number.isFinite(porcentaje) || porcentaje <= 0 || porcentaje > 100) {
      alert('Ingresa un porcentaje valido entre 0 y 100');
      return;
    }

    setDistribucionesTemporales((prev) => {
      const sinDuplicado = prev.filter((item) => item.centroCostoId !== centro.IDCENTROCOSTO);
      return [
        ...sinDuplicado,
        {
          centroCostoId: centro.IDCENTROCOSTO,
          centroCostoNombre: centro.CENTROCOSTO,
          porcentaje,
        },
      ];
    });

    cerrarModalCentro();
  };

  const eliminarCentroTemporal = (centroCostoId: string) => {
    setDistribucionesTemporales((prev) => prev.filter((item) => item.centroCostoId !== centroCostoId));
    if (centroCostoEditandoId === centroCostoId) {
      limpiarFormularioCentro();
    }
  };

  const eliminarDistribucionEmpleado = (empleadoId: string) => {
    setDistribucionesEmpleadoTemporales((prev) => prev.filter((item) => item.empleadoId !== empleadoId));
    if (empleadoDistribucionEditandoId === empleadoId) {
      cerrarModalEmpleado();
    }
  };

  const totalDistribucion = useMemo(
    () => distribucionesTemporales.reduce((acumulado, item) => acumulado + item.porcentaje, 0),
    [distribucionesTemporales],
  );

  const totalDistribucionEmpleadoBorrador = useMemo(
    () => centrosEmpleadoBorrador.reduce((acumulado, item) => acumulado + item.porcentaje, 0),
    [centrosEmpleadoBorrador],
  );

  const empleadoDistribucionValida = useMemo(
    () => centrosEmpleadoBorrador.length > 0 && Math.abs(totalDistribucionEmpleadoBorrador - 100) <= 0.01,
    [centrosEmpleadoBorrador.length, totalDistribucionEmpleadoBorrador],
  );

  const empleadosFiltrados = useMemo(() => {
    return empleados.filter((empleado) => normalizarTexto(empleado.centroCostoDescripcion) === FILTRO_DSC_MFCC);
  }, [empleados]);

  const empleadosParaDistribuir = useMemo(() => {
    const empleadosAsignados = new Set(distribucionesEmpleadoTemporales.map((item) => item.empleadoId));

    return empleadosFiltrados.filter((empleado) => !empleadosAsignados.has(empleado.idEmpleado));
  }, [empleadosFiltrados, distribucionesEmpleadoTemporales, empleadoDistribucionEditandoId]);

  const empleadosDisponiblesParaSelectorDistribucion = useMemo(() => {
    const empleadosAsignados = new Set(distribucionesEmpleadoTemporales.map((item) => item.empleadoId));

    return empleadosFiltrados.filter(
      (empleado) => !empleadosAsignados.has(empleado.idEmpleado) || empleado.idEmpleado === empleadoDistribucionEditandoId,
    );
  }, [empleadosFiltrados, distribucionesEmpleadoTemporales, empleadoDistribucionEditandoId]);

  const centrosCostoDisponibles = useMemo(() => {
    const centrosAgregados = new Set(distribucionesTemporales.map((item) => item.centroCostoId));

    return centrosCosto.filter((centro) => {
      if (centro.IDCENTROCOSTO === centroCostoEditandoId) {
        return true;
      }

      return !centrosAgregados.has(centro.IDCENTROCOSTO);
    });
  }, [centrosCosto, centroCostoEditandoId, distribucionesTemporales]);

  const centrosCostoDisponiblesEmpleado = useMemo(() => {
    const centrosAgregados = new Set(centrosEmpleadoBorrador.map((item) => item.centroCostoId));

    return centrosCosto.filter((centro) => !centrosAgregados.has(centro.IDCENTROCOSTO));
  }, [centrosCosto, centrosEmpleadoBorrador]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {vistaActiva === 'inicio' ? (
        <section className="grid gap-6 lg:grid-cols-3">
          <article className="flex min-h-[260px] flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Users size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Empleados para distribuir</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Lista de empleados disponibles para aplicarles la distribución por porcentaje de centros de costo.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setVistaActiva('empleados')}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Search size={18} />
              Abrir detalle
            </button>
          </article>

          <article className="flex min-h-[260px] flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <Building2 size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Centros de costo</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Agrega, edita y elimina centros con porcentaje de distribución.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setVistaActiva('centros')}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900"
            >
              <Search size={18} />
              Abrir detalle
            </button>
          </article>

          <article className="flex min-h-[260px] flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Clock3 size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Distribución por empleado</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Asigna uno o varios centros de costo a cada empleado con su porcentaje.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setVistaActiva('distribucion_empleados')}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <Search size={18} />
              Abrir detalle
            </button>
          </article>
        </section>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setVistaActiva('inicio');
                  limpiarFormularioCentro();
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <ChevronLeft size={16} />
                Regresar
              </button>
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {vistaActiva === 'empleados'
                    ? 'Empleados para distribuir'
                    : vistaActiva === 'centros'
                      ? 'Centros de costo'
                      : 'Distribución por empleado'}
                </h2>
                <p className="text-xs text-slate-500">
                  {vistaActiva === 'empleados'
                    ? 'Lista de empleados disponibles para distribuir.'
                    : vistaActiva === 'centros'
                      ? 'Gestion de centros de costo y porcentajes.'
                      : 'Distribuye empleados por uno o varios centros de costo.'}
                </p>
              </div>
            </div>
          </div>

          {vistaActiva === 'empleados' && (
            <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

              <div className="px-6 py-5">
                <div className="mb-4 flex items-center gap-3 text-sm text-slate-500">
                  <Clock3 size={16} />
                  <span>{empleadosParaDistribuir.length} registros visibles</span>
                </div>

                {cargandoEmpleados ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-slate-500">
                    Cargando empleados para distribuir...
                  </div>
                ) : errorEmpleados ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800">
                    {errorEmpleados}
                  </div>
                ) : empleadosParaDistribuir.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-slate-500">
                    No se encontraron empleados para distribuir.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400">
                        <tr>
                          <th className="px-4 py-3">Documento</th>
                          <th className="px-4 py-3">Apellidos</th>
                          <th className="px-4 py-3">Nombres</th>
                          <th className="px-4 py-3">Centro costo</th>
                          <th className="px-4 py-3">Departamento</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {empleadosParaDistribuir.map((empleado) => (
                          <tr key={empleado.idEmpleado} className="align-top">
                            <td className="px-4 py-3 font-semibold text-slate-700">{empleado.documento || '-'}</td>
                            <td className="px-4 py-3 text-slate-600">{empleado.apellidos || '-'}</td>
                            <td className="px-4 py-3 text-slate-600">{empleado.nombres || '-'}</td>
                            <td className="px-4 py-3 text-slate-600">{empleado.centroCostoDescripcion || empleado.centroCostoCodigo || '-'}</td>
                            <td className="px-4 py-3 text-slate-600">{empleado.departamentoDescripcion || empleado.departamentoCodigo || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </article>
          )}

          {vistaActiva === 'centros' && (
            <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Centros de costo</h2>
                    <p className="text-sm text-slate-500">Agrega, edita y elimina centros con porcentaje de distribución temporal.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={abrirModalNuevoCentro}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <Plus size={16} />
                  Añadir centro de costo
                </button>
              </div>

              <div className="space-y-5 px-6 py-5">
                <div className="text-sm text-slate-500">Esta lista es temporal. Luego la conectamos a base de datos.</div>

                {cargandoCentros ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-slate-500">
                    Cargando centros de costo...
                  </div>
                ) : errorCentros ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800">
                    {errorCentros}
                  </div>
                ) : centrosCosto.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-slate-500">
                    No se encontraron centros de costo.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="overflow-x-auto rounded-2xl border border-slate-100">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400">
                          <tr>
                            <th className="px-4 py-3">Centro de costo</th>
                            <th className="px-4 py-3">Porcentaje</th>
                            <th className="px-4 py-3 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {distribucionesTemporales.length === 0 ? (
                            <tr>
                              <td className="px-4 py-6 text-center text-slate-500" colSpan={3}>
                                Todavía no has agregado centros de costo.
                              </td>
                            </tr>
                          ) : (
                            distribucionesTemporales.map((item) => (
                              <tr key={item.centroCostoId}>
                                <td className="px-4 py-3 text-slate-700">
                                  <div className="font-semibold">{item.centroCostoNombre}</div>
                                  <div className="text-xs text-slate-400">{item.centroCostoId}</div>
                                </td>
                                <td className="px-4 py-3 font-semibold text-slate-700">{item.porcentaje.toFixed(2)}%</td>
                                <td className="px-4 py-3 text-right">
                                  <div className="inline-flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => abrirModalEditarCentro(item.centroCostoId)}
                                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                                    >
                                      <Pencil size={14} />
                                      Editar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => eliminarCentroTemporal(item.centroCostoId)}
                                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                                    >
                                      <Trash2 size={14} />
                                      Eliminar
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                      <span className="rounded-full bg-slate-100 px-3 py-1">Centros agregados: {distribucionesTemporales.length}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1">Total: {totalDistribucion.toFixed(2)}%</span>
                    </div>
                  </div>
                )}
              </div>
            </article>
          )}

          {vistaActiva === 'distribucion_empleados' && (
            <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <Users size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Distribución por empleado</h2>
                    <p className="text-sm text-slate-500">Asigna varios centros de costo y porcentajes a cada empleado seleccionado.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={abrirModalNuevoEmpleado}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <Plus size={16} />
                  Agregar a distribución
                </button>
              </div>

              <div className="space-y-5 px-6 py-5">
                <div className="text-sm text-slate-500">
                  La suma de porcentajes por empleado debe ser 100% antes de guardar.
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Empleado</th>
                        <th className="px-4 py-3">Centros de costo</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {distribucionesEmpleadoTemporales.length === 0 ? (
                        <tr>
                          <td className="px-4 py-6 text-center text-slate-500" colSpan={3}>
                            Todavía no has agregado empleados para distribuir.
                          </td>
                        </tr>
                      ) : (
                        distribucionesEmpleadoTemporales.map((item) => (
                          <tr key={item.empleadoId} className="align-top">
                            <td className="px-4 py-3 text-slate-700">
                              <div className="font-semibold">{item.empleadoNombreCompleto}</div>
                              <div className="text-xs text-slate-400">{item.empleadoDocumento}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-2">
                                {item.centros.map((centro) => (
                                  <div key={centro.centroCostoId} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                                    <span className="font-medium text-slate-700">{centro.centroCostoNombre}</span>
                                    <span className="font-semibold text-slate-700">{centro.porcentaje.toFixed(2)}%</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="inline-flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => abrirModalEditarEmpleado(item.empleadoId)}
                                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                                >
                                  <Pencil size={14} />
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => eliminarDistribucionEmpleado(item.empleadoId)}
                                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                                >
                                  <Trash2 size={14} />
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </article>
          )}
        </div>
      )}

      {modalCentroAbierto ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  {centroCostoEditandoId ? 'Editar centro de costo' : 'Agregar centro de costo'}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Usa el mismo formulario para crear o actualizar un registro temporal.
                </p>
              </div>
              <button
                type="button"
                onClick={cerrarModalCentro}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                aria-label="Cerrar modal"
              >
                <ChevronLeft size={18} className="rotate-90" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr] md:items-end">
                <label className="space-y-2 text-sm font-medium text-slate-600">
                  <span>Centro de costo</span>
                  <select
                    value={centroCostoSeleccionado}
                    onChange={(event) => setCentroCostoSeleccionado(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400"
                  >
                    <option value="">Selecciona un centro</option>
                    {centrosCostoDisponibles.map((centro) => (
                      <option key={centro.IDCENTROCOSTO} value={centro.IDCENTROCOSTO}>
                        {centro.IDCENTROCOSTO} - {centro.CENTROCOSTO}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm font-medium text-slate-600">
                  <span>Porcentaje de distribución</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={porcentajeDistribucion}
                    onChange={(event) => setPorcentajeDistribucion(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400"
                    placeholder="0.00"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={cerrarModalCentro}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={guardarCentroTemporal}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  <Plus size={18} />
                  {centroCostoEditandoId ? 'Actualizar centro' : 'Añadir centro'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {modalEmpleadoAbierto ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  {empleadoDistribucionEditandoId ? 'Editar distribución del empleado' : 'Agregar distribución por empleado'}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Selecciona un empleado para distribuir y agrega uno o varios centros de costo con sus porcentajes.
                </p>
              </div>
              <button
                type="button"
                onClick={cerrarModalEmpleado}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                aria-label="Cerrar modal"
              >
                <ChevronLeft size={18} className="rotate-90" />
              </button>
            </div>

            <div className="flex-1 min-h-0 space-y-6 px-6 py-6">
              <div className="grid gap-4 md:grid-cols-[1.3fr_0.7fr] md:items-end">
                <label className="space-y-2 text-sm font-medium text-slate-600">
                  <span>Empleado</span>
                  <select
                    value={empleadoSeleccionadoId}
                    onChange={(event) => setEmpleadoSeleccionadoId(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400"
                  >
                    <option value="">Selecciona un empleado a distribuir</option>
                    {empleadosDisponiblesParaSelectorDistribucion.map((empleado) => (
                      <option key={empleado.idEmpleado} value={empleado.idEmpleado}>
                        {empleado.documento || empleado.codigoEmpleado} - {empleado.apellidos} {empleado.nombres}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <div className="font-semibold text-slate-700">Total acumulado</div>
                  <div className="mt-1 text-lg font-bold text-slate-800">{totalDistribucionEmpleadoBorrador.toFixed(2)}%</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {Math.abs(totalDistribucionEmpleadoBorrador - 100) > 0.01
                      ? 'Debe sumar exactamente 100% antes de guardar.'
                      : 'La distribución está lista para guardar.'}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr_auto] md:items-end">
                <label className="space-y-2 text-sm font-medium text-slate-600">
                  <span>Centro de costo</span>
                  <select
                    value={centroCostoEmpleadoSeleccionado}
                    onChange={(event) => setCentroCostoEmpleadoSeleccionado(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400"
                  >
                    <option value="">Selecciona un centro</option>
                    {centrosCostoDisponiblesEmpleado.map((centro) => (
                      <option key={centro.IDCENTROCOSTO} value={centro.IDCENTROCOSTO}>
                        {centro.IDCENTROCOSTO} - {centro.CENTROCOSTO}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm font-medium text-slate-600">
                  <span>Porcentaje de distribución</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={porcentajeEmpleadoDistribucion}
                    onChange={(event) => setPorcentajeEmpleadoDistribucion(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400"
                    placeholder="0.00"
                  />
                </label>

                <button
                  type="button"
                  onClick={agregarCentroEmpleadoBorrador}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  <Plus size={18} />
                  Agregar centro
                </button>
              </div>

              <div className="max-h-[24vh] overflow-y-auto rounded-2xl border border-slate-100">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Centro de costo</th>
                      <th className="px-4 py-3">Porcentaje</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {centrosEmpleadoBorrador.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-center text-slate-500" colSpan={3}>
                          Todavía no has agregado centros de costo para este empleado.
                        </td>
                      </tr>
                    ) : (
                      centrosEmpleadoBorrador.map((centro) => {
                        const enEdicion = centro.centroCostoId === centroCostoEmpleadoEditandoId;

                        return (
                          <tr key={centro.centroCostoId}>
                            <td className="px-4 py-3 text-slate-700">
                              <div className="font-semibold">{centro.centroCostoNombre}</div>
                              <div className="text-xs text-slate-400">{centro.centroCostoId}</div>
                            </td>
                            <td className="px-4 py-3">
                              {enEdicion ? (
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={porcentajeCentroEmpleadoEditando}
                                  onChange={(event) => setPorcentajeCentroEmpleadoEditando(event.target.value)}
                                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400"
                                  placeholder="0.00"
                                />
                              ) : (
                                <span className="font-semibold text-slate-700">{centro.porcentaje.toFixed(2)}%</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {enEdicion ? (
                                <div className="inline-flex gap-2">
                                  <button
                                    type="button"
                                    onClick={guardarCentroEmpleadoEditado}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                                  >
                                    <Plus size={14} />
                                    Guardar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelarEdicionCentroEmpleado}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                                  >
                                    <ChevronLeft size={14} />
                                    Cancelar
                                  </button>
                                </div>
                              ) : (
                                <div className="inline-flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => editarCentroEmpleadoBorrador(centro.centroCostoId)}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                                  >
                                    <Pencil size={14} />
                                    Editar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => eliminarCentroEmpleadoBorrador(centro.centroCostoId)}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                                  >
                                    <Trash2 size={14} />
                                    Eliminar
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 px-6 py-5">
              <div className="min-h-[1.25rem] text-sm font-medium text-red-700">
                {!empleadoDistribucionValida ? 'La suma de los porcentajes debe ser 100% antes de guardar.' : ''}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={cerrarModalEmpleado}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={guardarEmpleadoTemporal}
                  disabled={!empleadoDistribucionValida}
                  className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition ${
                    empleadoDistribucionValida
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'cursor-not-allowed bg-emerald-300'
                  }`}
                >
                  <Plus size={18} />
                  {empleadoDistribucionEditandoId ? 'Actualizar empleado' : 'Guardar empleado'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ConfiguracionDistribucionView;
