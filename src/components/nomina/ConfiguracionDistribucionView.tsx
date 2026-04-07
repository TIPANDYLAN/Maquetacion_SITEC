import { useEffect, useMemo, useState } from 'react';
import { Building2, ChevronLeft, Plus, Save, Settings, Trash2, Users } from 'lucide-react';
import { getNominaEmployeesActive, getNominaCostCenters, type NominaCostCenter } from '../../services/n8nApi';
import type { EmpleadoNominaApiItem } from '../../types/nomina';
import { dbApi } from '../../services/dbApi';

type VistaDistribucion = 'inicio' | 'plantillas' | 'asignaciones';

interface EmpleadoDistribucion {
  idEmpleado: string;
  documento: string;
  codigoEmpleado: string;
  nombres: string;
  apellidos: string;
}

interface PlantillaCentro {
  centroCostoId: string;
  centroCostoNombre: string;
  porcentaje: number;
}

interface PlantillaDistribucion {
  id: number;
  nombre: string;
  centros: PlantillaCentro[];
  totalEmpleados: number;
}

interface EmpleadoPlantilla {
  empleadoId: string;
  empleadoDocumento: string;
  empleadoNombreCompleto: string;
}

interface PlantillaConEmpleados {
  plantillaId: number;
  plantillaNombre: string;
  empleados: EmpleadoPlantilla[];
}

interface PlantillaCentroApiItem {
  centroCostoId?: string;
  centroCostoNombre?: string;
  porcentaje?: number | string;
  centro_costo_id?: string;
  centro_costo_nombre?: string;
}

interface PlantillaApiItem {
  id?: number | string;
  nombre?: string;
  centros?: PlantillaCentroApiItem[];
  totalEmpleados?: number | string;
}

interface PlantillasResponse {
  ok?: boolean;
  plantillas?: PlantillaApiItem[];
}

interface PlantillaSaveResponse {
  ok?: boolean;
  plantilla?: PlantillaApiItem;
}

interface EmpleadoPlantillaApiItem {
  empleadoId?: string;
  empleadoDocumento?: string;
  empleadoNombreCompleto?: string;
  empleado_id?: string;
  empleado_documento?: string;
  empleado_nombre_completo?: string;
}

interface PlantillaConEmpleadosApiItem {
  plantillaId?: number | string;
  plantillaNombre?: string;
  empleados?: EmpleadoPlantillaApiItem[];
  plantilla_id?: number | string;
  plantilla_nombre?: string;
}

interface PlantillasEmpleadosResponse {
  ok?: boolean;
  plantillas?: PlantillaConEmpleadosApiItem[];
}

interface EstadoGuardado {
  tipo: 'exito' | 'error';
  mensaje: string;
}

const normalizarEmpleadoDistribucion = (item: EmpleadoNominaApiItem): EmpleadoDistribucion => {
  const payload = (item?.json ?? item ?? {}) as Record<string, unknown>;
  const cedula = String(payload?.CEDULA || payload?.DOCI_MFEMP || '').trim();
  return {
    idEmpleado: cedula,
    documento: cedula,
    codigoEmpleado: cedula,
    nombres: String(payload?.NOMBRES || '').trim(),
    apellidos: String(payload?.APELLIDOS || '').trim(),
  };
};

const normalizarPlantilla = (item: PlantillaApiItem): PlantillaDistribucion => {
  const centrosRaw = Array.isArray(item?.centros) ? item.centros : [];

  return {
    id: Number(item?.id || 0),
    nombre: String(item?.nombre || '').trim(),
    centros: centrosRaw
      .map((centro) => ({
        centroCostoId: String(centro?.centroCostoId || centro?.centro_costo_id || '').trim(),
        centroCostoNombre: String(centro?.centroCostoNombre || centro?.centro_costo_nombre || '').trim(),
        porcentaje: Number(centro?.porcentaje || 0),
      }))
      .filter((centro) => centro.centroCostoId && centro.centroCostoNombre)
      .sort((a, b) => a.centroCostoNombre.localeCompare(b.centroCostoNombre, 'es', { sensitivity: 'base' })),
    totalEmpleados: Number(item?.totalEmpleados || 0),
  };
};

const normalizarPlantillaConEmpleados = (item: PlantillaConEmpleadosApiItem): PlantillaConEmpleados => {
  const empleadosRaw = Array.isArray(item?.empleados) ? item.empleados : [];

  return {
    plantillaId: Number(item?.plantillaId || item?.plantilla_id || 0),
    plantillaNombre: String(item?.plantillaNombre || item?.plantilla_nombre || '').trim(),
    empleados: empleadosRaw
      .map((empleado) => ({
        empleadoId: String(empleado?.empleadoId || empleado?.empleado_id || '').trim(),
        empleadoDocumento: String(empleado?.empleadoDocumento || empleado?.empleado_documento || '').trim(),
        empleadoNombreCompleto: String(empleado?.empleadoNombreCompleto || empleado?.empleado_nombre_completo || '').trim(),
      }))
      .filter((empleado) => empleado.empleadoId && empleado.empleadoNombreCompleto)
      .sort((a, b) => a.empleadoNombreCompleto.localeCompare(b.empleadoNombreCompleto, 'es', { sensitivity: 'base' })),
  };
};

const ConfiguracionDistribucionView = () => {
  const [vistaActiva, setVistaActiva] = useState<VistaDistribucion>('inicio');

  const [empleados, setEmpleados] = useState<EmpleadoDistribucion[]>([]);
  const [centrosCosto, setCentrosCosto] = useState<NominaCostCenter[]>([]);
  const [plantillas, setPlantillas] = useState<PlantillaDistribucion[]>([]);
  const [plantillasConEmpleados, setPlantillasConEmpleados] = useState<PlantillaConEmpleados[]>([]);

  const [cargandoEmpleados, setCargandoEmpleados] = useState(false);
  const [cargandoCentros, setCargandoCentros] = useState(false);
  const [cargandoPlantillas, setCargandoPlantillas] = useState(false);
  const [cargandoAsignaciones, setCargandoAsignaciones] = useState(false);

  const [errorEmpleados, setErrorEmpleados] = useState<string | null>(null);
  const [errorCentros, setErrorCentros] = useState<string | null>(null);
  const [errorPlantillas, setErrorPlantillas] = useState<string | null>(null);
  const [errorAsignaciones, setErrorAsignaciones] = useState<string | null>(null);

  const [estadoPlantillas, setEstadoPlantillas] = useState<EstadoGuardado | null>(null);
  const [estadoAsignaciones, setEstadoAsignaciones] = useState<EstadoGuardado | null>(null);

  const [guardandoPlantilla, setGuardandoPlantilla] = useState(false);
  const [guardandoAsignacion, setGuardandoAsignacion] = useState(false);

  const [modalPlantillaAbierto, setModalPlantillaAbierto] = useState(false);
  const [plantillaEditandoId, setPlantillaEditandoId] = useState<number | null>(null);
  const [nombrePlantilla, setNombrePlantilla] = useState('');
  const [centrosPlantillaBorrador, setCentrosPlantillaBorrador] = useState<PlantillaCentro[]>([]);
  const [centroCostoSeleccionado, setCentroCostoSeleccionado] = useState('');
  const [porcentajeCentroSeleccionado, setPorcentajeCentroSeleccionado] = useState('');

  const [plantillaAsignacionSeleccionada, setPlantillaAsignacionSeleccionada] = useState('');
  const [empleadoAsignacionInput, setEmpleadoAsignacionInput] = useState('');

  useEffect(() => {
    void cargarEmpleados();
    void cargarCentrosCosto();
    void cargarPlantillas();
    void cargarAsignaciones();
  }, []);

  const cargarEmpleados = async () => {
    setCargandoEmpleados(true);
    setErrorEmpleados(null);

    try {
      const data = await getNominaEmployeesActive<EmpleadoNominaApiItem[]>();
      const empleadosApi = Array.isArray(data) ? data : [];

      const empleadosNormalizados = empleadosApi
        .map(normalizarEmpleadoDistribucion)
        .filter((empleado) => empleado.idEmpleado)
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
      console.error('Error cargando centros de costo para plantillas:', error);
      setCentrosCosto([]);
      setErrorCentros('No se pudo cargar la lista de centros de costo.');
    } finally {
      setCargandoCentros(false);
    }
  };

  const cargarPlantillas = async () => {
    setCargandoPlantillas(true);
    setErrorPlantillas(null);

    try {
      const data = await dbApi.distribucionPlantillas.list<PlantillasResponse>();
      const plantillasApi = Array.isArray(data?.plantillas) ? data.plantillas : [];

      setPlantillas(
        plantillasApi
          .map(normalizarPlantilla)
          .filter((plantilla) => plantilla.id > 0 && plantilla.nombre)
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })),
      );
    } catch (error) {
      console.error('Error cargando plantillas de distribucion:', error);
      setPlantillas([]);
      setErrorPlantillas('No se pudieron cargar las plantillas de distribución.');
    } finally {
      setCargandoPlantillas(false);
    }
  };

  const cargarAsignaciones = async () => {
    setCargandoAsignaciones(true);
    setErrorAsignaciones(null);

    try {
      const data = await dbApi.distribucionPlantillasEmpleados.list<PlantillasEmpleadosResponse>();
      const plantillasApi = Array.isArray(data?.plantillas) ? data.plantillas : [];

      setPlantillasConEmpleados(
        plantillasApi
          .map(normalizarPlantillaConEmpleados)
          .filter((item) => item.plantillaId > 0)
          .sort((a, b) => a.plantillaNombre.localeCompare(b.plantillaNombre, 'es', { sensitivity: 'base' })),
      );
    } catch (error) {
      console.error('Error cargando empleados por plantilla:', error);
      setPlantillasConEmpleados([]);
      setErrorAsignaciones('No se pudieron cargar las asignaciones de empleados por plantilla.');
    } finally {
      setCargandoAsignaciones(false);
    }
  };

  const totalPlantillaBorrador = useMemo(
    () => centrosPlantillaBorrador.reduce((acumulado, item) => acumulado + item.porcentaje, 0),
    [centrosPlantillaBorrador],
  );

  const plantillaValidaParaGuardar = useMemo(() => {
    return nombrePlantilla.trim().length > 0
      && centrosPlantillaBorrador.length > 0
      && Math.abs(totalPlantillaBorrador - 100) <= 0.01;
  }, [nombrePlantilla, centrosPlantillaBorrador.length, totalPlantillaBorrador]);

  const resumenAsignacionesPorPlantilla = useMemo(() => {
    const map = new Map<number, EmpleadoPlantilla[]>();

    for (const item of plantillasConEmpleados) {
      map.set(item.plantillaId, item.empleados);
    }

    return plantillas
      .map((plantilla) => ({
        ...plantilla,
        empleados: map.get(plantilla.id) || [],
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
  }, [plantillas, plantillasConEmpleados]);

  const centrosDisponiblesParaBorrador = useMemo(() => {
    const usados = new Set(centrosPlantillaBorrador.map((item) => item.centroCostoId));
    return centrosCosto.filter((centro) => !usados.has(centro.IDCENTROCOSTO));
  }, [centrosCosto, centrosPlantillaBorrador]);

  const empleadosDisponiblesParaAsignacion = useMemo(() => {
    const asignados = new Set(resumenAsignacionesPorPlantilla.flatMap((p) => p.empleados.map((emp) => emp.empleadoId)));
    return empleados.filter((emp) => !asignados.has(emp.idEmpleado));
  }, [empleados, resumenAsignacionesPorPlantilla]);

  const empleadoAsignacionResuelto = useMemo(() => {
    const valor = empleadoAsignacionInput.trim();
    if (!valor) return null;
    const porId = empleadosDisponiblesParaAsignacion.find((emp) => emp.idEmpleado === valor || emp.documento === valor);
    if (porId) return porId;
    return empleadosDisponiblesParaAsignacion.find((emp) => {
      const etiqueta = `${emp.documento || emp.codigoEmpleado} - ${emp.apellidos} ${emp.nombres}`.toLowerCase();
      return etiqueta === valor.toLowerCase();
    }) ?? null;
  }, [empleadoAsignacionInput, empleadosDisponiblesParaAsignacion]);

  const limpiarBorradorPlantilla = () => {
    setPlantillaEditandoId(null);
    setNombrePlantilla('');
    setCentrosPlantillaBorrador([]);
    setCentroCostoSeleccionado('');
    setPorcentajeCentroSeleccionado('');
  };

  const abrirModalNuevaPlantilla = () => {
    limpiarBorradorPlantilla();
    setEstadoPlantillas(null);
    setErrorPlantillas(null);
    setModalPlantillaAbierto(true);
  };

  const abrirModalEditarPlantilla = (plantilla: PlantillaDistribucion) => {
    setPlantillaEditandoId(plantilla.id);
    setNombrePlantilla(plantilla.nombre);
    setCentrosPlantillaBorrador(plantilla.centros.map((centro) => ({ ...centro })));
    setCentroCostoSeleccionado('');
    setPorcentajeCentroSeleccionado('');
    setEstadoPlantillas(null);
    setErrorPlantillas(null);
    setModalPlantillaAbierto(true);
  };

  const cerrarModalPlantilla = () => {
    limpiarBorradorPlantilla();
    setModalPlantillaAbierto(false);
  };

  const agregarCentroBorrador = () => {
    const centro = centrosCosto.find((item) => item.IDCENTROCOSTO === centroCostoSeleccionado);
    if (!centro) {
      alert('Selecciona un centro de costo.');
      return;
    }

    const porcentaje = Number(String(porcentajeCentroSeleccionado).replace(',', '.'));
    if (!Number.isFinite(porcentaje) || porcentaje <= 0 || porcentaje > 100) {
      alert('Ingresa un porcentaje válido entre 0 y 100.');
      return;
    }

    setCentrosPlantillaBorrador((prev) => [
      ...prev,
      {
        centroCostoId: centro.IDCENTROCOSTO,
        centroCostoNombre: centro.CENTROCOSTO,
        porcentaje,
      },
    ]);

    setCentroCostoSeleccionado('');
    setPorcentajeCentroSeleccionado('');
  };

  const eliminarCentroBorrador = (centroCostoId: string) => {
    setCentrosPlantillaBorrador((prev) => prev.filter((item) => item.centroCostoId !== centroCostoId));
  };

  const actualizarPorcentajeCentroBorrador = (centroCostoId: string, nuevoValor: string) => {
    const porcentaje = Number(String(nuevoValor).replace(',', '.'));

    setCentrosPlantillaBorrador((prev) => prev.map((item) => {
      if (item.centroCostoId !== centroCostoId) {
        return item;
      }

      if (!Number.isFinite(porcentaje) || porcentaje < 0 || porcentaje > 100) {
        return { ...item, porcentaje: 0 };
      }

      return { ...item, porcentaje };
    }));
  };

  const guardarPlantilla = async () => {
    if (!plantillaValidaParaGuardar) {
      alert('La plantilla debe tener nombre, al menos un centro y total de 100%.');
      return;
    }

    setGuardandoPlantilla(true);
    setEstadoPlantillas(null);
    setErrorPlantillas(null);

    try {
      const payload = {
        plantillaId: plantillaEditandoId ?? undefined,
        nombre: nombrePlantilla.trim(),
        centros: centrosPlantillaBorrador.map((item) => ({
          centroCostoId: item.centroCostoId,
          centroCostoNombre: item.centroCostoNombre,
          porcentaje: item.porcentaje,
        })),
      };

      const data = await dbApi.distribucionPlantillas.save<PlantillaSaveResponse>(payload);
      const plantillaGuardada = data?.plantilla ? normalizarPlantilla(data.plantilla) : null;

      if (!plantillaGuardada || !plantillaGuardada.id) {
        throw new Error('La API no devolvió la plantilla guardada.');
      }

      setPlantillas((prev) => {
        const sinDuplicado = prev.filter((item) => item.id !== plantillaGuardada.id);
        return [...sinDuplicado, plantillaGuardada].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
      });

      setEstadoPlantillas({
        tipo: 'exito',
        mensaje: plantillaEditandoId
          ? 'La plantilla se actualizó correctamente.'
          : 'La plantilla se creó correctamente.',
      });

      await cargarAsignaciones();
      cerrarModalPlantilla();
    } catch (error) {
      console.error('Error guardando plantilla:', error);
      setErrorPlantillas('No se pudo guardar la plantilla.');
      setEstadoPlantillas({
        tipo: 'error',
        mensaje: 'No se pudo guardar la plantilla.',
      });
    } finally {
      setGuardandoPlantilla(false);
    }
  };

  const eliminarPlantilla = async (plantillaId: number) => {
    if (!window.confirm('¿Seguro que quieres eliminar esta plantilla?')) {
      return;
    }

    setEstadoPlantillas(null);
    setErrorPlantillas(null);

    try {
      await dbApi.distribucionPlantillas.delete(plantillaId);

      setPlantillas((prev) => prev.filter((item) => item.id !== plantillaId));
      setPlantillasConEmpleados((prev) => prev.filter((item) => item.plantillaId !== plantillaId));

      setEstadoPlantillas({
        tipo: 'exito',
        mensaje: 'La plantilla se eliminó correctamente.',
      });
    } catch (error) {
      console.error('Error eliminando plantilla:', error);
      setErrorPlantillas('No se pudo eliminar la plantilla.');
      setEstadoPlantillas({
        tipo: 'error',
        mensaje: 'No se pudo eliminar la plantilla.',
      });
    }
  };

  const agregarEmpleadoAPlantilla = async () => {
    const plantillaId = Number(plantillaAsignacionSeleccionada);
    const empleado = empleadoAsignacionResuelto;

    if (!Number.isFinite(plantillaId) || plantillaId <= 0) {
      alert('Selecciona una plantilla.');
      return;
    }

    if (!empleado) {
      alert('Selecciona un empleado.');
      return;
    }

    setGuardandoAsignacion(true);
    setEstadoAsignaciones(null);
    setErrorAsignaciones(null);

    try {
      await dbApi.distribucionPlantillasEmpleados.save({
        plantillaId,
        empleadoId: empleado.idEmpleado,
        empleadoDocumento: empleado.documento || empleado.codigoEmpleado,
        empleadoNombreCompleto: `${empleado.apellidos} ${empleado.nombres}`.trim(),
      });

      await Promise.all([cargarAsignaciones(), cargarPlantillas()]);

      setEmpleadoAsignacionInput('');
      setEstadoAsignaciones({
        tipo: 'exito',
        mensaje: 'El empleado se asignó correctamente a la plantilla.',
      });
    } catch (error) {
      console.error('Error asignando empleado a plantilla:', error);
      setErrorAsignaciones('No se pudo guardar la asignación del empleado.');
      setEstadoAsignaciones({
        tipo: 'error',
        mensaje: 'No se pudo guardar la asignación del empleado.',
      });
    } finally {
      setGuardandoAsignacion(false);
    }
  };

  const quitarEmpleadoDePlantilla = async (plantillaId: number, empleadoId: string) => {
    try {
      await dbApi.distribucionPlantillasEmpleados.delete(plantillaId, empleadoId);
      await Promise.all([cargarAsignaciones(), cargarPlantillas()]);
      setEstadoAsignaciones({
        tipo: 'exito',
        mensaje: 'El empleado se eliminó de la plantilla.',
      });
    } catch (error) {
      console.error('Error eliminando empleado de plantilla:', error);
      setErrorAsignaciones('No se pudo eliminar el empleado de la plantilla.');
      setEstadoAsignaciones({
        tipo: 'error',
        mensaje: 'No se pudo eliminar el empleado de la plantilla.',
      });
    }
  };

  const renderEstado = (estado: EstadoGuardado | null) => {
    if (!estado) return null;

    return (
      <div
        className={
          estado.tipo === 'exito'
            ? 'rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 text-sm text-emerald-800'
            : 'rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-800'
        }
      >
        {estado.mensaje}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {vistaActiva === 'inicio' ? (
        <section className="grid gap-6 lg:grid-cols-2">
          <article className="flex min-h-[260px] flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <Building2 size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Generar plantillas</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Crea una o varias plantillas con nombre, centros de costo y porcentajes.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setVistaActiva('plantillas')}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900"
            >
              <Settings size={18} />
              Configurar plantillas
            </button>
          </article>

          <article className="flex min-h-[260px] flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Users size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Configurar personas por plantilla</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Selecciona la plantilla y agrega empleados para que pertenezcan a esa configuración.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setVistaActiva('asignaciones')}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <Users size={18} />
              Configurar personas
            </button>
          </article>
        </section>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setVistaActiva('inicio')}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <ChevronLeft size={16} />
                Regresar
              </button>
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {vistaActiva === 'plantillas' ? 'Plantillas de distribución' : 'Personas por plantilla'}
                </h2>
                <p className="text-xs text-slate-500">
                  {vistaActiva === 'plantillas'
                    ? 'Define centros y porcentajes por plantilla.'
                    : 'Asigna empleados a una plantilla existente.'}
                </p>
              </div>
            </div>
          </div>

          {vistaActiva === 'plantillas' ? (
            <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Plantillas</h2>
                    <p className="text-sm text-slate-500">Resumen flexible por plantilla y detalle de centros de costo.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={abrirModalNuevaPlantilla}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <Plus size={16} />
                  Crear plantilla
                </button>
              </div>

              <div className="space-y-5 px-6 py-5">
                {errorPlantillas ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800">
                    {errorPlantillas}
                  </div>
                ) : null}

                {renderEstado(estadoPlantillas)}

                {cargandoPlantillas ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-slate-500">
                    Cargando plantillas...
                  </div>
                ) : plantillas.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-slate-500">
                    No hay plantillas creadas todavía.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {plantillas.map((plantilla) => (
                      <details key={plantilla.id} className="rounded-2xl border border-slate-200 bg-white">
                        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-4">
                          <div>
                            <div className="font-semibold text-slate-800">{plantilla.nombre}</div>
                            <div className="text-xs text-slate-500">
                              {plantilla.centros.length} centros configurados
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                              Total: {plantilla.centros.reduce((sum, item) => sum + item.porcentaje, 0).toFixed(2)}%
                            </span>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.preventDefault();
                                abrirModalEditarPlantilla(plantilla);
                              }}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                            >
                              <Settings size={14} />
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.preventDefault();
                                void eliminarPlantilla(plantilla.id);
                              }}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                            >
                              <Trash2 size={14} />
                              Eliminar
                            </button>
                          </div>
                        </summary>

                        <div className="border-t border-slate-100 px-4 py-4">
                          <div className="overflow-x-auto rounded-2xl border border-slate-100">
                            <table className="min-w-full text-left text-sm">
                              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400">
                                <tr>
                                  <th className="px-4 py-3">Centro de costo</th>
                                  <th className="px-4 py-3">Porcentaje</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {plantilla.centros.map((centro) => (
                                  <tr key={`${plantilla.id}-${centro.centroCostoId}`}>
                                    <td className="px-4 py-3 text-slate-700">
                                      <div className="font-semibold">{centro.centroCostoNombre}</div>
                                      <div className="text-xs text-slate-400">{centro.centroCostoId}</div>
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-slate-700">{centro.porcentaje.toFixed(2)}%</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </details>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ) : (
            <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <Users size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Personas por plantilla</h2>
                    <p className="text-sm text-slate-500">Selecciona plantilla y empleado para registrar la pertenencia.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-5 px-6 py-5">
                {errorAsignaciones ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800">
                    {errorAsignaciones}
                  </div>
                ) : null}

                {errorEmpleados ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800">
                    {errorEmpleados}
                  </div>
                ) : null}

                {renderEstado(estadoAsignaciones)}

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="grid gap-4 md:grid-cols-[1fr_1.4fr_auto] md:items-end">
                    <label className="space-y-2 text-sm font-medium text-slate-600">
                      <span>Plantilla</span>
                      <select
                        value={plantillaAsignacionSeleccionada}
                        onChange={(event) => {
                          setPlantillaAsignacionSeleccionada(event.target.value);
                          setEmpleadoAsignacionInput('');
                        }}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400"
                      >
                        <option value="">Selecciona una plantilla</option>
                        {plantillas.map((plantilla) => (
                          <option key={plantilla.id} value={plantilla.id}>
                            {plantilla.nombre}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2 text-sm font-medium text-slate-600">
                      <span>Empleado</span>
                      <input
                        type="text"
                        list="distribucion-plantilla-empleados"
                        placeholder={cargandoEmpleados ? 'Cargando empleados...' : 'Escribe cédula o nombre'}
                        value={empleadoAsignacionInput}
                        onChange={(event) => setEmpleadoAsignacionInput(event.target.value)}
                        disabled={cargandoEmpleados}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400"
                      />
                      <datalist id="distribucion-plantilla-empleados">
                        {empleadosDisponiblesParaAsignacion.map((empleado) => {
                          const nombreCompleto = `${empleado.apellidos} ${empleado.nombres}`.trim();
                          return (
                            <option
                              key={empleado.idEmpleado}
                              value={`${empleado.documento || empleado.codigoEmpleado} - ${nombreCompleto}`}
                            />
                          );
                        })}
                      </datalist>
                    </label>

                    <button
                      type="button"
                      onClick={() => void agregarEmpleadoAPlantilla()}
                      disabled={guardandoAsignacion || cargandoEmpleados || plantillas.length === 0}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                    >
                      <Plus size={16} />
                      {guardandoAsignacion ? 'Guardando...' : 'Agregar empleado'}
                    </button>
                  </div>
                </div>

                {cargandoAsignaciones ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-slate-500">
                    Cargando asignaciones de empleados...
                  </div>
                ) : resumenAsignacionesPorPlantilla.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-slate-500">
                    No hay plantillas para mostrar asignaciones.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {resumenAsignacionesPorPlantilla.map((plantilla) => (
                      <details key={plantilla.id} className="rounded-2xl border border-slate-200 bg-white">
                        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-4">
                          <div>
                            <div className="font-semibold text-slate-800">{plantilla.nombre}</div>
                            <div className="text-xs text-slate-500">
                              {plantilla.empleados.length} empleado(s) en esta plantilla
                            </div>
                          </div>

                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            {plantilla.empleados.length} asignados
                          </span>
                        </summary>

                        <div className="border-t border-slate-100 px-4 py-4">
                          <div className="overflow-x-auto rounded-2xl border border-slate-100">
                            <table className="min-w-full text-left text-sm">
                              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400">
                                <tr>
                                  <th className="px-4 py-3">Documento</th>
                                  <th className="px-4 py-3">Empleado</th>
                                  <th className="px-4 py-3 text-right">Acciones</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {plantilla.empleados.length === 0 ? (
                                  <tr>
                                    <td className="px-4 py-6 text-center text-slate-500" colSpan={3}>
                                      Esta plantilla aún no tiene empleados asignados.
                                    </td>
                                  </tr>
                                ) : (
                                  plantilla.empleados.map((empleado) => (
                                    <tr key={`${plantilla.id}-${empleado.empleadoId}`}>
                                      <td className="px-4 py-3 font-semibold text-slate-700">
                                        {empleado.empleadoDocumento || '-'}
                                      </td>
                                      <td className="px-4 py-3 text-slate-700">{empleado.empleadoNombreCompleto}</td>
                                      <td className="px-4 py-3 text-right">
                                        <button
                                          type="button"
                                          onClick={() => void quitarEmpleadoDePlantilla(plantilla.id, empleado.empleadoId)}
                                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                                        >
                                          <Trash2 size={14} />
                                          Quitar
                                        </button>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </details>
                    ))}
                  </div>
                )}
              </div>
            </article>
          )}
        </div>
      )}

      {modalPlantillaAbierto ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  {plantillaEditandoId ? 'Editar plantilla' : 'Crear plantilla'}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Define nombre, centros y porcentajes. El total debe ser 100%.
                </p>
              </div>
              <button
                type="button"
                onClick={cerrarModalPlantilla}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                aria-label="Cerrar modal"
              >
                <ChevronLeft size={18} className="rotate-90" />
              </button>
            </div>

            <div className="flex-1 min-h-0 space-y-6 overflow-y-auto px-6 py-6">
              {errorCentros ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800">
                  {errorCentros}
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <label className="space-y-2 text-sm font-medium text-slate-600">
                  <span>Nombre de la plantilla</span>
                  <input
                    type="text"
                    value={nombrePlantilla}
                    onChange={(event) => setNombrePlantilla(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400"
                    placeholder="Ejemplo: Operaciones nocturnas"
                  />
                </label>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <div className="font-semibold text-slate-700">Total acumulado</div>
                  <div className="mt-1 text-lg font-bold text-slate-800">{totalPlantillaBorrador.toFixed(2)}%</div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr_auto] md:items-end">
                <label className="space-y-2 text-sm font-medium text-slate-600">
                  <span>Centro de costo</span>
                  <select
                    value={centroCostoSeleccionado}
                    onChange={(event) => setCentroCostoSeleccionado(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400"
                    disabled={cargandoCentros}
                  >
                    <option value="">Selecciona un centro</option>
                    {centrosDisponiblesParaBorrador.map((centro) => (
                      <option key={centro.IDCENTROCOSTO} value={centro.IDCENTROCOSTO}>
                        {centro.IDCENTROCOSTO} - {centro.CENTROCOSTO}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm font-medium text-slate-600">
                  <span>Porcentaje</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={porcentajeCentroSeleccionado}
                    onChange={(event) => setPorcentajeCentroSeleccionado(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400"
                    placeholder="0.00"
                  />
                </label>

                <button
                  type="button"
                  onClick={agregarCentroBorrador}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  <Plus size={16} />
                  Agregar centro
                </button>
              </div>

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
                    {centrosPlantillaBorrador.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-center text-slate-500" colSpan={3}>
                          Agrega al menos un centro de costo para esta plantilla.
                        </td>
                      </tr>
                    ) : (
                      centrosPlantillaBorrador.map((centro) => (
                        <tr key={centro.centroCostoId}>
                          <td className="px-4 py-3 text-slate-700">
                            <div className="font-semibold">{centro.centroCostoNombre}</div>
                            <div className="text-xs text-slate-400">{centro.centroCostoId}</div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={Number.isFinite(centro.porcentaje) ? centro.porcentaje : 0}
                              onChange={(event) => actualizarPorcentajeCentroBorrador(centro.centroCostoId, event.target.value)}
                              className="w-32 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => eliminarCentroBorrador(centro.centroCostoId)}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                            >
                              <Trash2 size={14} />
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {Math.abs(totalPlantillaBorrador - 100) > 0.01
                  ? 'La suma de porcentajes debe ser exactamente 100% para guardar la plantilla.'
                  : 'La suma está correcta. Puedes guardar la plantilla.'}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 px-6 py-5">
              <div className="text-sm text-slate-500">
                Plantilla: {centrosPlantillaBorrador.length} centro(s) configurado(s)
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={cerrarModalPlantilla}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void guardarPlantilla()}
                  disabled={!plantillaValidaParaGuardar || guardandoPlantilla}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-800 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <Save size={16} />
                  {guardandoPlantilla ? 'Guardando...' : plantillaEditandoId ? 'Actualizar plantilla' : 'Guardar plantilla'}
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
