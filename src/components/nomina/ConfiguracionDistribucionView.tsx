import { useEffect, useMemo, useState } from 'react';
import { Building2, ChevronLeft, Clock3, Pencil, Plus, Save, Search, Trash2, Users, Settings } from 'lucide-react';
import { getNominaCostCenters, getEmpleadosDistribucion, type NominaCostCenter, type EmpleadoDistribucionApiItem } from '../../services/n8nApi';
import { dbApi } from '../../services/dbApi';
import type { EmpleadoNominaApiItem } from '../../types/nomina';


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

interface DistribucionCentroCostoApiItem {
  id?: number;
  centroCostoId?: string;
  centroCostoNombre?: string;
  porcentaje?: number | string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
  centro_costo_id?: string;
  centro_costo_nombre?: string;
}

interface DistribucionCentroCostoResponse {
  ok?: boolean;
  centros?: DistribucionCentroCostoApiItem[];
}

interface DistribucionEmpleadoCentroCostoApiCentroItem {
  centroCostoId?: string;
  centroCostoNombre?: string;
  porcentaje?: number | string;
  centro_costo_id?: string;
  centro_costo_nombre?: string;
}

interface DistribucionEmpleadoCentroCostoApiItem {
  id?: number;
  empleadoId?: string;
  empleadoDocumento?: string;
  empleadoNombreCompleto?: string;
  centros?: DistribucionEmpleadoCentroCostoApiCentroItem[];
  porcentajeTotal?: number | string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
  empleado_id?: string;
  empleado_documento?: string;
  empleado_nombre_completo?: string;
  porcentaje_total?: number | string;
}

interface DistribucionEmpleadoCentroCostoResponse {
  ok?: boolean;
  empleado?: DistribucionEmpleadoCentroCostoApiItem;
  empleados?: DistribucionEmpleadoCentroCostoApiItem[];
}

interface EstadoGuardadoDistribucionCentros {
  tipo: 'exito' | 'error';
  mensaje: string;
}

interface EstadoGuardadoDistribucionEmpleados {
  tipo: 'exito' | 'error';
  mensaje: string;
}

const normalizarTexto = (valor: string): string => String(valor || '').trim().toUpperCase();

const normalizarDistribucionCentroCosto = (item: DistribucionCentroCostoApiItem): DistribucionTemporal => ({
  centroCostoId: String(item?.centroCostoId || item?.centro_costo_id || '').trim(),
  centroCostoNombre: String(item?.centroCostoNombre || item?.centro_costo_nombre || '').trim(),
  porcentaje: Number(item?.porcentaje || 0),
});

const normalizarDistribucionEmpleadoCentroCosto = (item: DistribucionEmpleadoCentroCostoApiItem): DistribucionEmpleadoTemporal => {
  const centrosFuente = Array.isArray(item?.centros) ? item.centros : [];

  return {
    empleadoId: String(item?.empleadoId || item?.empleado_id || '').trim(),
    empleadoDocumento: String(item?.empleadoDocumento || item?.empleado_documento || '').trim(),
    empleadoNombreCompleto: String(item?.empleadoNombreCompleto || item?.empleado_nombre_completo || '').trim(),
    centros: centrosFuente
      .map((centro) => ({
        centroCostoId: String(centro?.centroCostoId || centro?.centro_costo_id || '').trim(),
        centroCostoNombre: String(centro?.centroCostoNombre || centro?.centro_costo_nombre || '').trim(),
        porcentaje: Number(centro?.porcentaje || 0),
      }))
      .filter((centro) => centro.centroCostoId && centro.centroCostoNombre),
  };
};

const normalizarEmpleadoDistribucion = (item: EmpleadoDistribucionApiItem): EmpleadoDistribucion & { codigoDistribucion: string } => {
  return {
    idEmpleado: String(item.DOCI_MFEMP || item.COD_MFEMP || '').trim(),
    documento: String(item.DOCI_MFEMP || '').trim(),
    codigoEmpleado: String(item.COD_MFEMP || '').trim(),
    nombres: String(item.NOMBRES || '').trim(),
    apellidos: String(item.APELLIDOS || '').trim(),
    centroCostoCodigo: String(item.COD_MFCC || '').trim(),
    centroCostoDescripcion: String(item.DSC_MFCC || '').trim(),
    departamentoCodigo: '',
    departamentoDescripcion: String(item.DSC_MFDPT || '').trim(),
    plan: '',
    ingreso: '',
    codigoDistribucion: String(item.COD_DISTRIBUCION || '').trim(),
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
  const [cargandoDistribucionCentros, setCargandoDistribucionCentros] = useState(false);
  const [cargandoDistribucionEmpleados, setCargandoDistribucionEmpleados] = useState(false);
  const [guardandoDistribucionCentros, setGuardandoDistribucionCentros] = useState(false);
  const [guardandoDistribucionEmpleados, setGuardandoDistribucionEmpleados] = useState(false);
  const [errorEmpleados, setErrorEmpleados] = useState<string | null>(null);
  const [errorCentros, setErrorCentros] = useState<string | null>(null);
  const [errorDistribucionCentros, setErrorDistribucionCentros] = useState<string | null>(null);
  const [errorDistribucionEmpleados, setErrorDistribucionEmpleados] = useState<string | null>(null);
  const [estadoGuardadoDistribucionCentros, setEstadoGuardadoDistribucionCentros] = useState<EstadoGuardadoDistribucionCentros | null>(null);
  const [estadoGuardadoDistribucionEmpleados, setEstadoGuardadoDistribucionEmpleados] = useState<EstadoGuardadoDistribucionEmpleados | null>(null);

  useEffect(() => {
    void cargarEmpleados();
    void cargarCentrosCosto();
    void cargarDistribucionCentroCosto();
    void cargarDistribucionEmpleadoCentroCosto();
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
      const data = await getEmpleadosDistribucion<EmpleadoDistribucionApiItem[]>();
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
      console.error('Error cargando centros de costo para configuracion de distribucion:', error);
      setCentrosCosto([]);
      setErrorCentros('No se pudo cargar la lista de centros de costo.');
    } finally {
      setCargandoCentros(false);
    }
  };

  const cargarDistribucionCentroCosto = async () => {
    setCargandoDistribucionCentros(true);
    setErrorDistribucionCentros(null);
    setEstadoGuardadoDistribucionCentros(null);

    try {
      const data = await dbApi.distribucionCentroCosto.list<DistribucionCentroCostoResponse>();
      const centros = Array.isArray(data?.centros) ? data.centros : [];

      setDistribucionesTemporales(
        centros
          .map(normalizarDistribucionCentroCosto)
          .filter((item) => item.centroCostoId && item.centroCostoNombre)
          .sort((a, b) => a.centroCostoNombre.localeCompare(b.centroCostoNombre, 'es', { sensitivity: 'base' })),
      );
    } catch (error) {
      console.error('Error cargando distribucion de centros de costo:', error);
      setDistribucionesTemporales([]);
      setErrorDistribucionCentros('No se pudo cargar la configuracion de centros de costo.');
    } finally {
      setCargandoDistribucionCentros(false);
    }
  };

  const cargarDistribucionEmpleadoCentroCosto = async () => {
    setCargandoDistribucionEmpleados(true);
    setErrorDistribucionEmpleados(null);
    setEstadoGuardadoDistribucionEmpleados(null);

    try {
      const data = await dbApi.distribucionEmpleadoCentroCosto.list<DistribucionEmpleadoCentroCostoResponse>();
      const empleadosGuardados = Array.isArray(data?.empleados) ? data.empleados : [];

      setDistribucionesEmpleadoTemporales(
        empleadosGuardados
          .map(normalizarDistribucionEmpleadoCentroCosto)
          .filter((item) => item.empleadoId && item.empleadoNombreCompleto)
          .sort((a, b) => a.empleadoNombreCompleto.localeCompare(b.empleadoNombreCompleto, 'es', { sensitivity: 'base' })),
      );
    } catch (error) {
      console.error('Error cargando distribucion por empleado:', error);
      setDistribucionesEmpleadoTemporales([]);
      setErrorDistribucionEmpleados('No se pudo cargar la distribucion por empleado.');
    } finally {
      setCargandoDistribucionEmpleados(false);
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
    setErrorDistribucionEmpleados(null);
    setEstadoGuardadoDistribucionEmpleados(null);
    setModalEmpleadoAbierto(true);
  };

  const abrirModalEditarEmpleado = (empleadoId: string) => {
    const registro = distribucionesEmpleadoTemporales.find((item) => item.empleadoId === empleadoId);
    if (!registro) return;

    setEmpleadoDistribucionEditandoId(registro.empleadoId);
    setEmpleadoSeleccionadoId(registro.empleadoId);
    setCentrosEmpleadoBorrador(registro.centros.map((centro) => ({ ...centro })));
    setErrorDistribucionEmpleados(null);
    setEstadoGuardadoDistribucionEmpleados(null);
    setModalEmpleadoAbierto(true);
    setVistaActiva('distribucion_empleados');
  };

  const cerrarModalEmpleado = () => {
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

  const guardarEmpleadoTemporal = async () => {
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

    setGuardandoDistribucionEmpleados(true);
    setErrorDistribucionEmpleados(null);
    setEstadoGuardadoDistribucionEmpleados(null);

    try {
      const data = await dbApi.distribucionEmpleadoCentroCosto.save<DistribucionEmpleadoCentroCostoResponse>({
        empleadoId: empleado.idEmpleado,
        empleadoDocumento: empleado.documento || empleado.codigoEmpleado,
        empleadoNombreCompleto: `${empleado.apellidos} ${empleado.nombres}`.trim(),
        centros: centrosEmpleadoBorrador.map((centro) => ({ ...centro })),
      });

      const empleadoGuardado = normalizarDistribucionEmpleadoCentroCosto(
        data?.empleado || {
          empleadoId: empleado.idEmpleado,
          empleadoDocumento: empleado.documento || empleado.codigoEmpleado,
          empleadoNombreCompleto: `${empleado.apellidos} ${empleado.nombres}`.trim(),
          centros: centrosEmpleadoBorrador.map((centro) => ({ ...centro })),
        },
      );

      setDistribucionesEmpleadoTemporales((prev) => {
        const sinDuplicado = prev.filter((item) => item.empleadoId !== empleadoGuardado.empleadoId);

        return [
          ...sinDuplicado,
          empleadoGuardado,
        ].sort((a, b) => a.empleadoNombreCompleto.localeCompare(b.empleadoNombreCompleto, 'es', { sensitivity: 'base' }));
      });

      setEstadoGuardadoDistribucionEmpleados({
        tipo: 'exito',
        mensaje: 'La distribución por empleado se guardó correctamente.',
      });
      cerrarModalEmpleado();
    } catch (error) {
      console.error('Error guardando distribucion por empleado:', error);
      setErrorDistribucionEmpleados('No se pudo guardar la distribucion por empleado.');
      setEstadoGuardadoDistribucionEmpleados({
        tipo: 'error',
        mensaje: 'No se pudo guardar la distribución por empleado.',
      });
    } finally {
      setGuardandoDistribucionEmpleados(false);
    }
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

  const guardarDistribucionCentroCosto = async () => {
    if (distribucionesTemporales.length === 0) {
      alert('Agrega al menos un centro de costo');
      return;
    }

    if (Math.abs(totalDistribucion - 100) > 0.01) {
      alert('La suma de los porcentajes de los centros de costo debe ser 100%');
      return;
    }

    setGuardandoDistribucionCentros(true);
    setErrorDistribucionCentros(null);
    setEstadoGuardadoDistribucionCentros(null);

    try {
      const data = await dbApi.distribucionCentroCosto.save<DistribucionCentroCostoResponse>({
        centros: distribucionesTemporales.map((item) => ({
          centroCostoId: item.centroCostoId,
          centroCostoNombre: item.centroCostoNombre,
          porcentaje: item.porcentaje,
        })),
      });

      const centrosGuardados = Array.isArray(data?.centros)
        ? data.centros.map(normalizarDistribucionCentroCosto)
        : distribucionesTemporales;
      setDistribucionesTemporales(
        centrosGuardados
          .filter((item) => item.centroCostoId && item.centroCostoNombre)
          .sort((a, b) => a.centroCostoNombre.localeCompare(b.centroCostoNombre, 'es', { sensitivity: 'base' })),
      );
      setEstadoGuardadoDistribucionCentros({
        tipo: 'exito',
        mensaje: 'La configuración de centros de costo se guardó correctamente.',
      });
    } catch (error) {
      console.error('Error guardando distribucion de centros de costo:', error);
      setErrorDistribucionCentros('No se pudo guardar la configuracion de centros de costo.');
      setEstadoGuardadoDistribucionCentros({
        tipo: 'error',
        mensaje: 'No se pudo guardar la configuración de centros de costo.',
      });
    } finally {
      setGuardandoDistribucionCentros(false);
    }
  };

  const eliminarCentroTemporal = (centroCostoId: string) => {
    setDistribucionesTemporales((prev) => prev.filter((item) => item.centroCostoId !== centroCostoId));
    if (centroCostoEditandoId === centroCostoId) {
      limpiarFormularioCentro();
    }
  };

  const eliminarDistribucionEmpleado = async (empleadoId: string) => {
    try {
      await dbApi.distribucionEmpleadoCentroCosto.delete(empleadoId);
      setDistribucionesEmpleadoTemporales((prev) => prev.filter((item) => item.empleadoId !== empleadoId));
      setEstadoGuardadoDistribucionEmpleados({
        tipo: 'exito',
        mensaje: 'La distribución por empleado se eliminó correctamente.',
      });

      if (empleadoDistribucionEditandoId === empleadoId) {
        cerrarModalEmpleado();
      }
    } catch (error) {
      console.error('Error eliminando distribucion por empleado:', error);
      setErrorDistribucionEmpleados('No se pudo eliminar la distribucion por empleado.');
      setEstadoGuardadoDistribucionEmpleados({
        tipo: 'error',
        mensaje: 'No se pudo eliminar la distribución por empleado.',
      });
    }
  };

  const totalDistribucion = useMemo(
    () => distribucionesTemporales.reduce((acumulado, item) => acumulado + item.porcentaje, 0),
    [distribucionesTemporales],
  );

  const distribucionCentroCostoValida = useMemo(
    () => distribucionesTemporales.length > 0 && Math.abs(totalDistribucion - 100) <= 0.01,
    [distribucionesTemporales.length, totalDistribucion],
  );

  const totalDistribucionEmpleadoBorrador = useMemo(
    () => centrosEmpleadoBorrador.reduce((acumulado, item) => acumulado + item.porcentaje, 0),
    [centrosEmpleadoBorrador],
  );

  const empleadoDistribucionValida = useMemo(
    () => centrosEmpleadoBorrador.length > 0 && Math.abs(totalDistribucionEmpleadoBorrador - 100) <= 0.01,
    [centrosEmpleadoBorrador.length, totalDistribucionEmpleadoBorrador],
  );

  const empleadosFiltrados = useMemo(() => empleados, [empleados]);

  const empleadosParaDistribuir = useMemo(() => {
    const empleadosAsignados = new Set(distribucionesEmpleadoTemporales.map((item) => item.empleadoId));
    return empleadosFiltrados
      .filter((empleado) => !empleadosAsignados.has(empleado.idEmpleado))
      .map((empleado) => ({
        ...empleado,
        codigoDistribucion: (empleado as any).codigoDistribucion ?? '',
      }));
  }, [empleadosFiltrados, distribucionesEmpleadoTemporales]);

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
              Detalle
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
              <Settings size={18} />
              Configurar
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
              <Settings size={18} />
              Configurar
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
                          <th className="px-4 py-3">Cod. Distribución</th>
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
                            <td className="px-4 py-3 text-slate-600">{empleado.codigoDistribucion || '-'}</td>
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
                    <p className="text-sm text-slate-500">Agrega, edita y elimina centros con porcentaje de distribución.</p>
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

                {errorDistribucionCentros ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800">
                    {errorDistribucionCentros}
                  </div>
                ) : null}

                {estadoGuardadoDistribucionCentros ? (
                  <div
                    className={
                      estadoGuardadoDistribucionCentros.tipo === 'exito'
                        ? 'rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 text-sm text-emerald-800'
                        : 'rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-800'
                    }
                  >
                    {estadoGuardadoDistribucionCentros.mensaje}
                  </div>
                ) : null}

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

                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                      <div className="text-sm text-slate-600">
                        {distribucionCentroCostoValida
                          ? 'La configuracion esta lista para guardarse en la base de datos.'
                          : 'La suma debe quedar exactamente en 100% para poder guardar.'}
                      </div>

                      <button
                        type="button"
                        onClick={guardarDistribucionCentroCosto}
                        disabled={!distribucionCentroCostoValida || guardandoDistribucionCentros}
                        className="inline-flex items-center gap-2 rounded-2xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        <Save size={16} />
                        {guardandoDistribucionCentros ? 'Guardando...' : 'Guardar configuración'}
                      </button>
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

                {errorDistribucionEmpleados ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800">
                    {errorDistribucionEmpleados}
                  </div>
                ) : null}

                {estadoGuardadoDistribucionEmpleados ? (
                  <div
                    className={
                      estadoGuardadoDistribucionEmpleados.tipo === 'exito'
                        ? 'rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 text-sm text-emerald-800'
                        : 'rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-800'
                    }
                  >
                    {estadoGuardadoDistribucionEmpleados.mensaje}
                  </div>
                ) : null}

                {cargandoDistribucionEmpleados ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-slate-500">
                    Cargando distribuciones por empleado...
                  </div>
                ) : null}

                {!cargandoDistribucionEmpleados ? (
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
                ) : null}
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
                {errorDistribucionEmpleados || (!empleadoDistribucionValida ? 'La suma de los porcentajes debe ser 100% antes de guardar.' : '')}
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
                  disabled={!empleadoDistribucionValida || guardandoDistribucionEmpleados}
                  className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition ${
                    empleadoDistribucionValida && !guardandoDistribucionEmpleados
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'cursor-not-allowed bg-emerald-300'
                  }`}
                >
                  <Plus size={18} />
                  {guardandoDistribucionEmpleados
                    ? 'Guardando...'
                    : empleadoDistribucionEditandoId
                      ? 'Actualizar distribución'
                      : 'Guardar distribución'}
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
