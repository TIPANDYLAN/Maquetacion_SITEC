import { useEffect, useMemo, useState } from 'react';
import { Eye } from 'lucide-react';
import { getNominaCostCenters, getNominaEmployeesActive } from '../../services/n8nApi';
import { dbApi } from '../../services/dbApi';
import type {
  EmpleadoNominaApiItem,
  NominaApiRecordAndListResponse,
  NominaApiResponseBase,
  NominaCentroCosto,
} from '../../types/nomina';

type SeccionValets = 'horario_fijo' | 'gestionar_valet';
type DiaLaboralKey = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';

interface EmpleadoOption {
  cedula: string;
  nombre: string;
}

interface HorarioFijoGuardado {
  id: string;
  empleadoCedula: string;
  empleadoNombre: string;
  centroCostoId: string;
  centroCostoNombre: string;
  valorFijo: number;
  anio: number;
  mes: number;
  semana: number;
  dia: DiaLaboralKey;
  horaEntrada: string;
  horaSalida: string;
}

interface EventoCalendario {
  empleadoNombre: string;
  dia: DiaLaboralKey;
  horaEntrada: string;
  horaSalida: string;
  esAdicional: boolean;
}

interface ValetAsignadoCentro {
  id: string;
  centroCostoId: string;
  centroCostoNombre: string;
  empleadoCedula: string;
  empleadoNombre: string;
  valorFijo: number;
}

interface DiaDiaAdicional {
  dia: DiaLaboralKey;
  horaEntrada: string;
  horaSalida: string;
}

interface SemanaDiaAdicionalConfig {
  semana: number;
  habilitado: boolean;
  dias: DiaDiaAdicional[];
}

interface AdicionalesEmpleadoConfig {
  habilitarDiaAdicional: boolean;
  diaAdicionalAnio: number;
  diaAdicionalMes: number;
  diaAdicionalSemanas: SemanaDiaAdicionalConfig[];
  habilitarDomingo: boolean;
  domingoAnio: number;
  domingoMes: number;
  domingoSemanas: number[];
}

interface ValetAdicionalesApiResponse extends NominaApiResponseBase {
  data?: {
    configuracion?: AdicionalesEmpleadoConfig;
  };
  registros?: Array<{
    centroCostoId: string;
    empleadoCedula: string;
    configuracion: AdicionalesEmpleadoConfig;
  }>;
}

type ValetEmpleadoApiResponse = NominaApiRecordAndListResponse<ValetAsignadoCentro>;

type ValetHorarioApiResponse = NominaApiRecordAndListResponse<HorarioFijoGuardado>;

const SEMANAS_DISPONIBLES = [1, 2, 3, 4, 5];

const crearSemanasDiaAdicional = (): SemanaDiaAdicionalConfig[] => {
  return SEMANAS_DISPONIBLES.map((semana) => ({
    semana,
    habilitado: false,
    dias: [],
  }));
};

const DIAS_LABORALES: Array<{ key: DiaLaboralKey; label: string }> = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miercoles', label: 'Miercoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
];

const DIAS_LABORALES_SIN_DOMINGO: Array<{ key: DiaLaboralKey; label: string }> = DIAS_LABORALES.filter(
  (dia) => dia.key !== 'domingo',
);
const ORDEN_DIAS_ADICIONALES = DIAS_LABORALES_SIN_DOMINGO.map((dia) => dia.key);

const MESES: Array<{ value: number; label: string }> = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
];

const HORA_INICIO = 7;
const HORA_FIN = 24;

const OPCIONES_HORA_MEDIA = Array.from({ length: HORA_FIN - HORA_INICIO + 1 }, (_, index) => {
  const horas = HORA_INICIO + index;
  const minutos = '00';
  return `${String(horas).padStart(2, '0')}:${minutos}`;
});

const etiquetaEmpleado = (empleado: EmpleadoOption): string => `${empleado.nombre} - ${empleado.cedula}`;
const etiquetaCentro = (centro: NominaCentroCosto): string => `${centro.IDCENTROCOSTO} - ${centro.CENTROCOSTO}`;

const formatearMoneda = (valor: number) => {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
};

const calcularHorasTrabajadas = (horaEntrada: string, horaSalida: string): number => {
  const [entradaHora, entradaMinuto] = horaEntrada.split(':').map(Number);
  const [salidaHora, salidaMinuto] = horaSalida.split(':').map(Number);

  if (
    Number.isNaN(entradaHora)
    || Number.isNaN(entradaMinuto)
    || Number.isNaN(salidaHora)
    || Number.isNaN(salidaMinuto)
  ) {
    return 0;
  }

  const inicioMinutos = entradaHora * 60 + entradaMinuto;
  const finMinutos = salidaHora * 60 + salidaMinuto;
  const diferencia = finMinutos - inicioMinutos;
  if (diferencia <= 0) return 0;
  return Math.round((diferencia / 60) * 100) / 100;
};

const esHoraValida = (hora: string): boolean => {
  const partes = hora.split(':');
  if (partes.length < 2) return false;
  const minutos = Number(partes[1]);
  return minutos === 0;
};

const generarHorasDelDia = (): string[] => {
  return Array.from({ length: HORA_FIN - HORA_INICIO + 1 }, (_, i) => {
    const hora = HORA_INICIO + i;
    const minutos = '00';
    return `${String(hora).padStart(2, '0')}:${minutos}`;
  });
};

const diaLaboralAIndice = (dia: DiaLaboralKey): number => {
  const indice = DIAS_LABORALES.findIndex((d) => d.key === dia);
  return indice;
};

interface BloqueCalendario {
  nombre: string;
  horaEntrada: string;
  horaSalida: string;
  esAdicional: boolean;
  top: number;
  height: number;
  lane: number;
  lanesTotal: number;
}

const obtenerBloquesCalendarioDia = (
  eventosCalendario: EventoCalendario[],
  dia: DiaLaboralKey,
  slotHeight: number,
): BloqueCalendario[] => {
  const inicioDia = HORA_INICIO * 60;
  const finDia = HORA_FIN * 60;

  const eventos = eventosCalendario
    .filter((evento) => evento.dia === dia)
    .map((evento) => {
      const [entradaH, entradaM] = evento.horaEntrada.split(':').map(Number);
      const [salidaH, salidaM] = evento.horaSalida.split(':').map(Number);
      const inicio = entradaH * 60 + entradaM;
      const fin = salidaH * 60 + salidaM;
      return {
        nombre: evento.empleadoNombre,
        horaEntrada: evento.horaEntrada,
        horaSalida: evento.horaSalida,
        esAdicional: evento.esAdicional,
        inicio,
        fin,
      };
    })
    .filter((e) => e.fin > e.inicio)
    .map((e) => ({
      ...e,
      inicio: Math.max(inicioDia, e.inicio),
      fin: Math.min(finDia, e.fin),
    }))
    .filter((e) => e.fin > e.inicio)
    .sort((a, b) => a.inicio - b.inicio || a.fin - b.fin);

  if (eventos.length === 0) return [];

  const finPorLane: number[] = [];
  const eventosConLane = eventos.map((evento) => {
    let lane = finPorLane.findIndex((finLane) => evento.inicio >= finLane);
    if (lane === -1) {
      lane = finPorLane.length;
      finPorLane.push(evento.fin);
    } else {
      finPorLane[lane] = evento.fin;
    }
    return { ...evento, lane };
  });

  const lanesTotal = Math.max(1, finPorLane.length);

  return eventosConLane.map((evento) => ({
    nombre: evento.nombre,
    horaEntrada: evento.horaEntrada,
    horaSalida: evento.horaSalida,
    esAdicional: evento.esAdicional,
    top: ((evento.inicio - inicioDia) / 60) * slotHeight,
    height: Math.max(28, ((evento.fin - evento.inicio) / 60) * slotHeight),
    lane: evento.lane,
    lanesTotal,
  }));
};

const ValetsFijosView = () => {
  const hoy = new Date();
  const [empleados, setEmpleados] = useState<EmpleadoOption[]>([]);
  const [centrosCosto, setCentrosCosto] = useState<NominaCentroCosto[]>([]);
  const [loadingEmpleados, setLoadingEmpleados] = useState(false);
  const [loadingCentros, setLoadingCentros] = useState(false);

  const [empleadoInput, setEmpleadoInput] = useState('');
  const [seccionActiva, setSeccionActiva] = useState<SeccionValets>('horario_fijo');
  const [centroHorarioInput, setCentroHorarioInput] = useState('');
  const [centroGestionInput, setCentroGestionInput] = useState('');

  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [semanaHorario, setSemanaHorario] = useState(1);
  const [diaHorario, setDiaHorario] = useState<DiaLaboralKey>('lunes');
  const [horaEntradaHorario, setHoraEntradaHorario] = useState('');
  const [horaSalidaHorario, setHoraSalidaHorario] = useState('');
  const [horariosFijosGuardados, setHorariosFijosGuardados] = useState<HorarioFijoGuardado[]>([]);
  const [asignacionesCentro, setAsignacionesCentro] = useState<ValetAsignadoCentro[]>([]);
  const [modalAgregarOpen, setModalAgregarOpen] = useState(false);
  const [modalGestionEmpleadoModo, setModalGestionEmpleadoModo] = useState<'agregar' | 'eliminar'>('agregar');
  const [modalEmpleadoInput, setModalEmpleadoInput] = useState('');
  const [modalEmpleadoEliminarCedula, setModalEmpleadoEliminarCedula] = useState('');
  const [modalValorFijo, setModalValorFijo] = useState('');
  const [modalAdicionalesOpen, setModalAdicionalesOpen] = useState(false);
  const [empleadoAdicionalSeleccionado, setEmpleadoAdicionalSeleccionado] = useState<ValetAsignadoCentro | null>(null);
  const [adicionalesPorEmpleado, setAdicionalesPorEmpleado] = useState<Record<string, AdicionalesEmpleadoConfig>>({});
  const [modalHabilitarDiaAdicional, setModalHabilitarDiaAdicional] = useState(false);
  const [modalDiaAdicionalAnio, setModalDiaAdicionalAnio] = useState(hoy.getFullYear());
  const [modalDiaAdicionalMes, setModalDiaAdicionalMes] = useState(hoy.getMonth() + 1);
  const [modalDiaAdicionalSemanas, setModalDiaAdicionalSemanas] = useState<SemanaDiaAdicionalConfig[]>(crearSemanasDiaAdicional());
  const [modalHabilitarDomingo, setModalHabilitarDomingo] = useState(false);
  const [modalDomingoAnio, setModalDomingoAnio] = useState(hoy.getFullYear());
  const [modalDomingoMes, setModalDomingoMes] = useState(hoy.getMonth() + 1);
  const [modalDomingoSemanas, setModalDomingoSemanas] = useState<number[]>([]);
  const [empleadoDetallesAbierto, setEmpleadoDetallesAbierto] = useState<ValetAsignadoCentro | null>(null);
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error' | null; text: string }>({
    type: null,
    text: '',
  });

  useEffect(() => {
    void cargarEmpleados();
    void cargarCentrosCosto();
    void cargarAsignacionesCentro();
    void cargarHorariosFijos();
    void cargarAdicionalesValets();
  }, []);

  const cargarAsignacionesCentro = async () => {
    try {
      const payload = await dbApi.valets.empleados.list<ValetEmpleadoApiResponse>();
      const registros = Array.isArray(payload?.registros) ? payload.registros : [];

      setAsignacionesCentro(registros.map((item) => ({
        id: `${item.centroCostoId}-${item.empleadoCedula}`,
        centroCostoId: String(item.centroCostoId || '').trim(),
        centroCostoNombre: String(item.centroCostoNombre || '').trim(),
        empleadoCedula: String(item.empleadoCedula || '').trim(),
        empleadoNombre: String(item.empleadoNombre || '').trim(),
        valorFijo: Number(item.valorFijo || 0),
      })));
    } catch (error) {
      console.error('Error cargando empleados de valet fijo desde backend:', error);
      setAsignacionesCentro([]);
      setMensaje({ type: 'error', text: 'No se pudo cargar empleados de valet fijo desde la base de datos.' });
    }
  };

  const cargarHorariosFijos = async () => {
    try {
      const payload = await dbApi.valets.horarios.list<ValetHorarioApiResponse>();
      const registros = Array.isArray(payload?.registros) ? payload.registros : [];

      setHorariosFijosGuardados(registros.map((item) => ({
        id: String(item.id || `${item.centroCostoId}-${item.empleadoCedula}-${item.anio}-${item.mes}-${item.semana}-${item.dia}`),
        empleadoCedula: String(item.empleadoCedula || '').trim(),
        empleadoNombre: String(item.empleadoNombre || '').trim(),
        centroCostoId: String(item.centroCostoId || '').trim(),
        centroCostoNombre: String(item.centroCostoNombre || '').trim(),
        valorFijo: Number(item.valorFijo || 0),
        anio: Number(item.anio || 0),
        mes: Number(item.mes || 0),
        semana: Number(item.semana || 0),
        dia: item.dia as DiaLaboralKey,
        horaEntrada: String(item.horaEntrada || ''),
        horaSalida: String(item.horaSalida || ''),
      })));
    } catch (error) {
      console.error('Error cargando horarios de valet fijo desde backend:', error);
      setHorariosFijosGuardados([]);
      setMensaje({ type: 'error', text: 'No se pudo cargar horarios de valet fijo desde la base de datos.' });
    }
  };

  const cargarAdicionalesValets = async () => {
    try {
      const payload = await dbApi.valets.adicionales.list<ValetAdicionalesApiResponse>();
      const registros = Array.isArray(payload?.registros) ? payload.registros : [];

      const mapa = registros.reduce<Record<string, AdicionalesEmpleadoConfig>>((acc, item) => {
        const centroCostoId = String(item?.centroCostoId || '').trim();
        const empleadoCedula = String(item?.empleadoCedula || '').trim();
        if (!centroCostoId || !empleadoCedula || !item?.configuracion) {
          return acc;
        }

        acc[`${centroCostoId}-${empleadoCedula}`] = {
          habilitarDiaAdicional: Boolean(item.configuracion.habilitarDiaAdicional),
          diaAdicionalAnio: Number(item.configuracion.diaAdicionalAnio || hoy.getFullYear()),
          diaAdicionalMes: Number(item.configuracion.diaAdicionalMes || hoy.getMonth() + 1),
          diaAdicionalSemanas: SEMANAS_DISPONIBLES.map((semana) => {
            const guardada = item.configuracion.diaAdicionalSemanas?.find((s) => s.semana === semana);
            return {
              semana,
              habilitado: Boolean(guardada?.habilitado),
              dias: (guardada?.dias ?? []).filter((d) => d.dia !== 'domingo'),
            };
          }),
          habilitarDomingo: Boolean(item.configuracion.habilitarDomingo),
          domingoAnio: Number(item.configuracion.domingoAnio || hoy.getFullYear()),
          domingoMes: Number(item.configuracion.domingoMes || hoy.getMonth() + 1),
          domingoSemanas: (item.configuracion.domingoSemanas ?? [])
            .map((semana) => Number(semana || 0))
            .filter((semana) => SEMANAS_DISPONIBLES.includes(semana))
            .sort((a, b) => a - b),
        };
        return acc;
      }, {});

      setAdicionalesPorEmpleado(mapa);
    } catch (error) {
      console.error('Error cargando adicionales de valet desde backend:', error);
      setAdicionalesPorEmpleado({});
      setMensaje({ type: 'error', text: 'No se pudo cargar adicionales de valet desde la base de datos.' });
    }
  };

  const cargarEmpleados = async () => {
    setLoadingEmpleados(true);
    try {
      const rawData = await getNominaEmployeesActive<EmpleadoNominaApiItem[]>();
      const empleadosApi = Array.isArray(rawData) ? rawData : [];

      const empleadosNormalizados = empleadosApi
        .map((item: EmpleadoNominaApiItem) => {
          const payload = (item?.json ?? item ?? {}) as Record<string, unknown>;
          const cedula = String(payload?.CEDULA || payload?.DOCI_MFEMP || '').trim();
          const nombres = String(payload?.NOMBRES || '').trim();
          const apellidos = String(payload?.APELLIDOS || '').trim();
          const nombre = `${apellidos} ${nombres}`.trim();
          return { cedula, nombre };
        })
        .filter((item: EmpleadoOption) => item.cedula && item.nombre)
        .sort((a: EmpleadoOption, b: EmpleadoOption) =>
          a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }),
        );

      setEmpleados(empleadosNormalizados);
    } catch (error) {
      console.error('Error cargando empleados para valets fijos:', error);
      setEmpleados([]);
      setMensaje({ type: 'error', text: 'No se pudo cargar la lista de empleados desde n8n.' });
    } finally {
      setLoadingEmpleados(false);
    }
  };

  const cargarCentrosCosto = async () => {
    setLoadingCentros(true);
    try {
      const data = await getNominaCostCenters();
      setCentrosCosto(data);
    } catch (error) {
      console.error('Error cargando centros de costo para valets fijos:', error);
      setCentrosCosto([]);
      setMensaje({ type: 'error', text: 'No se pudo cargar la lista de centros de costo desde n8n.' });
    } finally {
      setLoadingCentros(false);
    }
  };

  const centrosHorarioDisponibles = useMemo(() => {
    const centrosConEmpleados = new Set(
      asignacionesCentro
        .map((item) => String(item.centroCostoId || '').trim())
        .filter(Boolean),
    );

    return centrosCosto
      .filter((item) => centrosConEmpleados.has(item.IDCENTROCOSTO))
      .sort((a, b) => a.CENTROCOSTO.localeCompare(b.CENTROCOSTO, 'es', { sensitivity: 'base' }));
  }, [centrosCosto, asignacionesCentro]);

  const centroHorarioSeleccionado = useMemo(() => {
    const valor = centroHorarioInput.trim();
    if (!valor) return null;

    const porCodigo = centrosHorarioDisponibles.find((item) => item.IDCENTROCOSTO === valor);
    if (porCodigo) return porCodigo;

    return centrosHorarioDisponibles.find((item) => etiquetaCentro(item).toLowerCase() === valor.toLowerCase()) || null;
  }, [centroHorarioInput, centrosHorarioDisponibles]);

  const empleadosCentroHorario = useMemo(() => {
    if (!centroHorarioSeleccionado) return [];

    return asignacionesCentro
      .filter((item) => item.centroCostoId === centroHorarioSeleccionado.IDCENTROCOSTO)
      .reduce<EmpleadoOption[]>((acc, item) => {
        const existe = acc.some((emp) => emp.cedula === item.empleadoCedula);
        if (!existe) {
          acc.push({ cedula: item.empleadoCedula, nombre: item.empleadoNombre });
        }
        return acc;
      }, [])
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
  }, [asignacionesCentro, centroHorarioSeleccionado]);

  const empleadoSeleccionado = useMemo(() => {
    const valor = empleadoInput.trim();
    if (!valor) return null;

    const porCedula = empleadosCentroHorario.find((item) => item.cedula === valor);
    if (porCedula) return porCedula;

    return empleadosCentroHorario.find((item) => etiquetaEmpleado(item).toLowerCase() === valor.toLowerCase()) || null;
  }, [empleadoInput, empleadosCentroHorario]);

  const centroGestionSeleccionado = useMemo(() => {
    const valor = centroGestionInput.trim();
    if (!valor) return null;

    const porCodigo = centrosCosto.find((item) => item.IDCENTROCOSTO === valor);
    if (porCodigo) return porCodigo;

    return centrosCosto.find((item) => etiquetaCentro(item).toLowerCase() === valor.toLowerCase()) || null;
  }, [centroGestionInput, centrosCosto]);

  const empleadoModalSeleccionado = useMemo(() => {
    const valor = modalEmpleadoInput.trim();
    if (!valor) return null;

    const porCedula = empleados.find((item) => item.cedula === valor);
    if (porCedula) return porCedula;

    return empleados.find((item) => etiquetaEmpleado(item).toLowerCase() === valor.toLowerCase()) || null;
  }, [modalEmpleadoInput, empleados]);

  const detalleCentroSeleccionado = useMemo(() => {
    if (!centroGestionSeleccionado) return [];

    return asignacionesCentro
      .filter((item) => item.centroCostoId === centroGestionSeleccionado.IDCENTROCOSTO)
      .sort((a, b) => a.empleadoNombre.localeCompare(b.empleadoNombre, 'es', { sensitivity: 'base' }));
  }, [centroGestionSeleccionado, asignacionesCentro]);

  const empleadosCentroGestion = useMemo(() => {
    if (!centroGestionSeleccionado) return [];

    return asignacionesCentro
      .filter((item) => item.centroCostoId === centroGestionSeleccionado.IDCENTROCOSTO)
      .sort((a, b) => a.empleadoNombre.localeCompare(b.empleadoNombre, 'es', { sensitivity: 'base' }));
  }, [centroGestionSeleccionado, asignacionesCentro]);

  const diasDisponiblesIngreso = useMemo(() => {
    let dias = [...DIAS_LABORALES_SIN_DOMINGO];

    if (empleadoSeleccionado && centroHorarioSeleccionado) {
      const asignacionEmpleado = asignacionesCentro.find(
        (item) => item.centroCostoId === centroHorarioSeleccionado.IDCENTROCOSTO
          && item.empleadoCedula === empleadoSeleccionado.cedula,
      );

      if (asignacionEmpleado) {
        const configAdicionales = adicionalesPorEmpleado[asignacionEmpleado.id];
        if (
          configAdicionales?.habilitarDomingo
          && configAdicionales.domingoAnio === anio
          && configAdicionales.domingoMes === mes
          && configAdicionales.domingoSemanas.includes(semanaHorario)
        ) {
          dias = [...DIAS_LABORALES];
        }
      }
    }

    return dias;
  }, [empleadoSeleccionado, centroHorarioSeleccionado, anio, mes, semanaHorario, adicionalesPorEmpleado, asignacionesCentro]);

  useEffect(() => {
    if (diasDisponiblesIngreso.length === 0) return;

    const diaSigueDisponible = diasDisponiblesIngreso.some((dia) => dia.key === diaHorario);
    if (!diaSigueDisponible) {
      setDiaHorario(diasDisponiblesIngreso[0].key);
    }
  }, [diasDisponiblesIngreso, diaHorario]);

  const abrirModalAdicionales = async (empleado: ValetAsignadoCentro) => {
    const configGuardada = adicionalesPorEmpleado[empleado.id];
    setEmpleadoAdicionalSeleccionado(empleado);

    const aplicarConfigAModal = (config: AdicionalesEmpleadoConfig | undefined) => {
      setModalHabilitarDiaAdicional(config?.habilitarDiaAdicional ?? false);
      setModalDiaAdicionalAnio(config?.diaAdicionalAnio ?? hoy.getFullYear());
      setModalDiaAdicionalMes(config?.diaAdicionalMes ?? hoy.getMonth() + 1);
      setModalDiaAdicionalSemanas(
        SEMANAS_DISPONIBLES.map((semana) => {
          const guardada = config?.diaAdicionalSemanas?.find((item) => item.semana === semana);
          return {
            semana,
            habilitado: guardada?.habilitado ?? false,
            dias: (guardada?.dias ?? []).filter((d) => d.dia !== 'domingo'),
          };
        }),
      );
      setModalHabilitarDomingo(config?.habilitarDomingo ?? false);
      setModalDomingoAnio(config?.domingoAnio ?? hoy.getFullYear());
      setModalDomingoMes(config?.domingoMes ?? hoy.getMonth() + 1);
      setModalDomingoSemanas(
        (config?.domingoSemanas ?? [])
          .filter((semana) => SEMANAS_DISPONIBLES.includes(semana))
          .sort((a, b) => a - b),
      );
    };

    aplicarConfigAModal(configGuardada);
    setModalAdicionalesOpen(true);

    try {
      const payload = await dbApi.valets.adicionales.get<ValetAdicionalesApiResponse>(
        empleado.centroCostoId,
        empleado.empleadoCedula,
      );

      if (!payload) {
        return;
      }
      const configApi = payload?.data?.configuracion;

      if (!configApi) {
        return;
      }

      const configNormalizada: AdicionalesEmpleadoConfig = {
        habilitarDiaAdicional: Boolean(configApi.habilitarDiaAdicional),
        diaAdicionalAnio: Number(configApi.diaAdicionalAnio || hoy.getFullYear()),
        diaAdicionalMes: Number(configApi.diaAdicionalMes || hoy.getMonth() + 1),
        diaAdicionalSemanas: SEMANAS_DISPONIBLES.map((semana) => {
          const semanaApi = configApi.diaAdicionalSemanas?.find((item) => item.semana === semana);
          return {
            semana,
            habilitado: Boolean(semanaApi?.habilitado),
            dias: (semanaApi?.dias ?? []).filter((d) => d.dia !== 'domingo'),
          };
        }),
        habilitarDomingo: Boolean(configApi.habilitarDomingo),
        domingoAnio: Number(configApi.domingoAnio || hoy.getFullYear()),
        domingoMes: Number(configApi.domingoMes || hoy.getMonth() + 1),
        domingoSemanas: (configApi.domingoSemanas ?? [])
          .map((semana) => Number(semana || 0))
          .filter((semana) => SEMANAS_DISPONIBLES.includes(semana))
          .sort((a, b) => a - b),
      };

      setAdicionalesPorEmpleado((prev) => ({
        ...prev,
        [empleado.id]: configNormalizada,
      }));
      aplicarConfigAModal(configNormalizada);
    } catch (error) {
      console.error('Error cargando adicionales de valet desde backend:', error);
      setMensaje({ type: 'error', text: 'No se pudo cargar adicionales guardados desde la base de datos.' });
    }
  };

  const cerrarModalAdicionales = () => {
    setModalAdicionalesOpen(false);
    setEmpleadoAdicionalSeleccionado(null);
  };

  const obtenerIndiceDiaAdicional = (dia: DiaLaboralKey): number => ORDEN_DIAS_ADICIONALES.indexOf(dia);

  const obtenerDiasDisponiblesPorIndice = (dias: DiaDiaAdicional[], indexDia: number): DiaLaboralKey[] => {
    if (indexDia <= 0) {
      return [...ORDEN_DIAS_ADICIONALES];
    }

    const diaAnterior = dias[indexDia - 1]?.dia;
    const indiceAnterior = diaAnterior ? obtenerIndiceDiaAdicional(diaAnterior) : -1;
    if (indiceAnterior < 0) {
      return [...ORDEN_DIAS_ADICIONALES];
    }

    return ORDEN_DIAS_ADICIONALES.slice(indiceAnterior + 1);
  };

  const obtenerSiguienteDiaDisponible = (dias: DiaDiaAdicional[]): DiaLaboralKey | null => {
    if (dias.length === 0) {
      return ORDEN_DIAS_ADICIONALES[0] || null;
    }

    const ultimoDia = dias[dias.length - 1]?.dia;
    const indiceUltimo = ultimoDia ? obtenerIndiceDiaAdicional(ultimoDia) : -1;
    if (indiceUltimo < 0 || indiceUltimo + 1 >= ORDEN_DIAS_ADICIONALES.length) {
      return null;
    }

    return ORDEN_DIAS_ADICIONALES[indiceUltimo + 1] || null;
  };

  const handleToggleDiaAdicionalSemana = (semana: number, habilitado: boolean) => {
    setModalDiaAdicionalSemanas((prev) => prev.map((item) => (
      item.semana === semana ? { ...item, habilitado, dias: habilitado ? item.dias : [] } : item
    )));
  };

  const handleAgregarDiaAdicional = (semana: number) => {
    const semanaConfig = modalDiaAdicionalSemanas.find((item) => item.semana === semana);
    if (!semanaConfig) return;

    if (semanaConfig.dias.length >= 5) {
      setMensaje({ type: 'error', text: `La semana ${semana} permite maximo 5 dias adicionales.` });
      return;
    }

    const siguienteDia = obtenerSiguienteDiaDisponible(semanaConfig.dias);
    if (!siguienteDia) {
      setMensaje({ type: 'error', text: `No hay mas dias disponibles para la semana ${semana}.` });
      return;
    }

    setModalDiaAdicionalSemanas((prev) => prev.map((item) => {
      if (item.semana !== semana) return item;
      return {
        ...item,
        dias: [...item.dias, { dia: siguienteDia, horaEntrada: '', horaSalida: '' }],
      };
    }));
  };

  const handleRemoverDiaAdicional = (semana: number, indexDia: number) => {
    setModalDiaAdicionalSemanas((prev) => prev.map((item) => {
      if (item.semana !== semana) return item;
      return {
        ...item,
        dias: item.dias.filter((_, idx) => idx !== indexDia),
      };
    }));
  };

  const handleActualizarDiaAdicional = (
    semana: number,
    indexDia: number,
    campo: 'dia' | 'horaEntrada' | 'horaSalida',
    valor: string,
  ) => {
    setModalDiaAdicionalSemanas((prev) => prev.map((item) => {
      if (item.semana !== semana) return item;

      const diasActualizados = item.dias.map((d, idx) => {
        if (idx !== indexDia) return d;
        if (campo === 'dia') {
          return { ...d, dia: valor as DiaLaboralKey };
        }
        return { ...d, [campo]: valor };
      });

      if (campo === 'dia') {
        // Mantiene un orden ascendente de dias para evitar desorden entre selects.
        const diasNormalizados = [...diasActualizados];
        for (let idx = 1; idx < diasNormalizados.length; idx += 1) {
          const indiceAnterior = obtenerIndiceDiaAdicional(diasNormalizados[idx - 1].dia);
          const indiceActual = obtenerIndiceDiaAdicional(diasNormalizados[idx].dia);

          if (indiceActual > indiceAnterior) {
            continue;
          }

          const siguienteClave = ORDEN_DIAS_ADICIONALES[indiceAnterior + 1];
          if (!siguienteClave) {
            diasNormalizados.splice(idx);
            break;
          }

          diasNormalizados[idx] = {
            ...diasNormalizados[idx],
            dia: siguienteClave,
            horaEntrada: '',
            horaSalida: '',
          };
        }

        return {
          ...item,
          dias: diasNormalizados,
        };
      }

      return {
        ...item,
        dias: diasActualizados,
      };
    }));
  };

  const handleToggleDomingoSemana = (semana: number, habilitado: boolean) => {
    setModalDomingoSemanas((prev) => {
      if (habilitado) {
        return Array.from(new Set([...prev, semana])).sort((a, b) => a - b);
      }
      return prev.filter((item) => item !== semana);
    });
  };

  const handleGuardarAdicionales = async () => {
    if (!empleadoAdicionalSeleccionado) return;

    if (!modalHabilitarDiaAdicional && !modalHabilitarDomingo) {
      setMensaje({ type: 'error', text: 'Selecciona al menos una opcion de adicionales.' });
      return;
    }

    if (modalHabilitarDiaAdicional) {
      const semanasDiaAdicional = modalDiaAdicionalSemanas.filter((item) => item.habilitado);
      if (semanasDiaAdicional.length === 0) {
        setMensaje({ type: 'error', text: 'Debes habilitar al menos una semana para dia adicional.' });
        return;
      }

      for (const semanaDia of semanasDiaAdicional) {
        if (semanaDia.dias.length === 0) {
          setMensaje({ type: 'error', text: `En semana ${semanaDia.semana} debes agregar al menos un dia adicional.` });
          return;
        }

        for (const diaDia of semanaDia.dias) {
          if (!diaDia.horaEntrada || !diaDia.horaSalida) {
            setMensaje({ type: 'error', text: `En semana ${semanaDia.semana}, ${DIAS_LABORALES_SIN_DOMINGO.find((d) => d.key === diaDia.dia)?.label || diaDia.dia} necesita hora de entrada y salida.` });
            return;
          }

          if (!esHoraValida(diaDia.horaEntrada) || !esHoraValida(diaDia.horaSalida)) {
            setMensaje({ type: 'error', text: `Las horas de semana ${semanaDia.semana} deben estar en punto (:00).` });
            return;
          }

          if (calcularHorasTrabajadas(diaDia.horaEntrada, diaDia.horaSalida) <= 0) {
            setMensaje({ type: 'error', text: `En semana ${semanaDia.semana}, la salida debe ser mayor que la entrada.` });
            return;
          }
        }
      }
    }

    if (modalHabilitarDomingo && modalDomingoSemanas.length === 0) {
      setMensaje({ type: 'error', text: 'Debes habilitar al menos una semana para domingo.' });
      return;
    }

    const nuevaConfig: AdicionalesEmpleadoConfig = {
      habilitarDiaAdicional: modalHabilitarDiaAdicional,
      diaAdicionalAnio: modalDiaAdicionalAnio,
      diaAdicionalMes: modalDiaAdicionalMes,
      diaAdicionalSemanas: modalDiaAdicionalSemanas,
      habilitarDomingo: modalHabilitarDomingo,
      domingoAnio: modalDomingoAnio,
      domingoMes: modalDomingoMes,
      domingoSemanas: modalDomingoSemanas,
    };

    setAdicionalesPorEmpleado((prev) => ({
      ...prev,
      [empleadoAdicionalSeleccionado.id]: nuevaConfig,
    }));

    try {
      await dbApi.valets.adicionales.save({
        centroCostoId: empleadoAdicionalSeleccionado.centroCostoId,
        centroCostoNombre: empleadoAdicionalSeleccionado.centroCostoNombre,
        empleadoCedula: empleadoAdicionalSeleccionado.empleadoCedula,
        empleadoNombre: empleadoAdicionalSeleccionado.empleadoNombre,
        habilitarDiaAdicional: nuevaConfig.habilitarDiaAdicional,
        diaAdicionalAnio: nuevaConfig.diaAdicionalAnio,
        diaAdicionalMes: nuevaConfig.diaAdicionalMes,
        diaAdicionalSemanas: nuevaConfig.diaAdicionalSemanas,
        habilitarDomingo: nuevaConfig.habilitarDomingo,
        domingoAnio: nuevaConfig.domingoAnio,
        domingoMes: nuevaConfig.domingoMes,
        domingoSemanas: nuevaConfig.domingoSemanas,
      });
    } catch (error) {
      console.error('Error guardando adicionales de valet en backend:', error);
      setMensaje({
        type: 'error',
        text: `No se pudo guardar en base de datos: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      });
      return;
    }

    setMensaje({
      type: 'success',
      text: `Adicionales actualizados y guardados en base de datos para ${empleadoAdicionalSeleccionado.empleadoNombre}.`,
    });
    cerrarModalAdicionales();
  };

  const handleRegistrar = () => {
    if (!centroHorarioSeleccionado) {
      setMensaje({
        type: 'error',
        text: 'Selecciona un centro de costo valido.',
      });
      return;
    }

    if (empleadosCentroHorario.length === 0) {
      setMensaje({
        type: 'error',
        text: 'No existen empleados dentro de ese centro de costo.',
      });
      return;
    }

    if (!empleadoSeleccionado) {
      setMensaje({
        type: 'error',
        text: 'Selecciona un empleado valido dentro del centro de costo.',
      });
      return;
    }

    const asignacionEmpleadoCentro = asignacionesCentro.find((item) => (
      item.centroCostoId === centroHorarioSeleccionado.IDCENTROCOSTO
      && item.empleadoCedula === empleadoSeleccionado.cedula
    ));
    if (!asignacionEmpleadoCentro) {
      setMensaje({ type: 'error', text: 'El empleado no tiene valor fijo configurado en Gestionar valet.' });
      return;
    }

    if (!horaEntradaHorario || !horaSalidaHorario) {
      setMensaje({ type: 'error', text: 'Selecciona hora de entrada y salida.' });
      return;
    }

    if (!esHoraValida(horaEntradaHorario) || !esHoraValida(horaSalidaHorario)) {
      setMensaje({ type: 'error', text: 'Las horas deben estar en punto (:00).' });
      return;
    }

    if (calcularHorasTrabajadas(horaEntradaHorario, horaSalidaHorario) <= 0) {
      setMensaje({ type: 'error', text: 'La hora de salida debe ser mayor a la hora de entrada.' });
      return;
    }

    const diaSeleccionadoDisponible = diasDisponiblesIngreso.find((dia) => dia.key === diaHorario);
    if (!diaSeleccionadoDisponible) {
      setMensaje({ type: 'error', text: 'El dia seleccionado ya no esta disponible para la semana actual. Selecciona un dia valido.' });
      return;
    }

    const nuevoHorario: HorarioFijoGuardado = {
      id: `${Date.now()}-${empleadoSeleccionado.cedula}`,
      empleadoCedula: empleadoSeleccionado.cedula,
      empleadoNombre: empleadoSeleccionado.nombre,
      centroCostoId: centroHorarioSeleccionado.IDCENTROCOSTO,
      centroCostoNombre: centroHorarioSeleccionado.CENTROCOSTO,
      valorFijo: asignacionEmpleadoCentro.valorFijo,
      anio,
      mes,
      semana: semanaHorario,
      dia: diaSeleccionadoDisponible.key,
      horaEntrada: horaEntradaHorario,
      horaSalida: horaSalidaHorario,
    };

    void (async () => {
      try {
        const payload = await dbApi.valets.horarios.save<ValetHorarioApiResponse>({
          centroCostoId: nuevoHorario.centroCostoId,
          centroCostoNombre: nuevoHorario.centroCostoNombre,
          empleadoCedula: nuevoHorario.empleadoCedula,
          empleadoNombre: nuevoHorario.empleadoNombre,
          valorFijo: nuevoHorario.valorFijo,
          anio: nuevoHorario.anio,
          mes: nuevoHorario.mes,
          semana: nuevoHorario.semana,
          dia: nuevoHorario.dia,
          horaEntrada: nuevoHorario.horaEntrada,
          horaSalida: nuevoHorario.horaSalida,
        });
        const horarioGuardado = payload?.registro || nuevoHorario;

        setHorariosFijosGuardados((prev) => {
          const sinDuplicado = prev.filter((item) => !(
            item.empleadoCedula === horarioGuardado.empleadoCedula
            && item.anio === horarioGuardado.anio
            && item.mes === horarioGuardado.mes
            && item.semana === horarioGuardado.semana
            && item.dia === horarioGuardado.dia
          ));
          return [{
            id: String(horarioGuardado.id || `${horarioGuardado.centroCostoId}-${horarioGuardado.empleadoCedula}-${horarioGuardado.anio}-${horarioGuardado.mes}-${horarioGuardado.semana}-${horarioGuardado.dia}`),
            empleadoCedula: horarioGuardado.empleadoCedula,
            empleadoNombre: horarioGuardado.empleadoNombre,
            centroCostoId: horarioGuardado.centroCostoId,
            centroCostoNombre: horarioGuardado.centroCostoNombre,
            valorFijo: Number(horarioGuardado.valorFijo || 0),
            anio: Number(horarioGuardado.anio || 0),
            mes: Number(horarioGuardado.mes || 0),
            semana: Number(horarioGuardado.semana || 0),
            dia: horarioGuardado.dia as DiaLaboralKey,
            horaEntrada: horarioGuardado.horaEntrada,
            horaSalida: horarioGuardado.horaSalida,
          }, ...sinDuplicado];
        });

        setAsignacionesCentro((prev) => {
          const nuevaAsignacion: ValetAsignadoCentro = {
            id: `${nuevoHorario.centroCostoId}-${nuevoHorario.empleadoCedula}`,
            centroCostoId: nuevoHorario.centroCostoId,
            centroCostoNombre: nuevoHorario.centroCostoNombre,
            empleadoCedula: nuevoHorario.empleadoCedula,
            empleadoNombre: nuevoHorario.empleadoNombre,
            valorFijo: nuevoHorario.valorFijo,
          };

          const sinDuplicado = prev.filter((item) => !(
            item.centroCostoId === nuevaAsignacion.centroCostoId
            && item.empleadoCedula === nuevaAsignacion.empleadoCedula
          ));

          return [nuevaAsignacion, ...sinDuplicado];
        });

        setMensaje({
          type: 'success',
          text: `Horario guardado en base de datos para ${empleadoSeleccionado.nombre} en semana ${semanaHorario}, ${diaSeleccionadoDisponible.label}.`,
        });

        setHoraEntradaHorario('');
        setHoraSalidaHorario('');
      } catch (error) {
        console.error('Error guardando horario de valet fijo en backend:', error);
        setMensaje({
          type: 'error',
          text: `No se pudo guardar horario en base de datos: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        });
      }
    })();
  };

  const handleGuardarEmpleadoCentro = () => {
    if (!centroGestionSeleccionado) {
      setMensaje({ type: 'error', text: 'Selecciona un centro de costo valido.' });
      return;
    }

    if (!empleadoModalSeleccionado) {
      setMensaje({ type: 'error', text: 'Selecciona un empleado valido de la lista.' });
      return;
    }

    const valorFijoNumero = Number(modalValorFijo);
    if (!Number.isFinite(valorFijoNumero) || valorFijoNumero <= 0) {
      setMensaje({ type: 'error', text: 'Ingresa un valor fijo valido mayor a 0.' });
      return;
    }

    const nuevaAsignacion: ValetAsignadoCentro = {
      id: `${centroGestionSeleccionado.IDCENTROCOSTO}-${empleadoModalSeleccionado.cedula}`,
      centroCostoId: centroGestionSeleccionado.IDCENTROCOSTO,
      centroCostoNombre: centroGestionSeleccionado.CENTROCOSTO,
      empleadoCedula: empleadoModalSeleccionado.cedula,
      empleadoNombre: empleadoModalSeleccionado.nombre,
      valorFijo: Math.round(valorFijoNumero * 100) / 100,
    };

    void (async () => {
      try {
        await dbApi.valets.empleados.save({
          centroCostoId: nuevaAsignacion.centroCostoId,
          centroCostoNombre: nuevaAsignacion.centroCostoNombre,
          empleadoCedula: nuevaAsignacion.empleadoCedula,
          empleadoNombre: nuevaAsignacion.empleadoNombre,
          valorFijo: nuevaAsignacion.valorFijo,
        });

        setAsignacionesCentro((prev) => {
          const sinDuplicado = prev.filter((item) => !(
            item.centroCostoId === nuevaAsignacion.centroCostoId
            && item.empleadoCedula === nuevaAsignacion.empleadoCedula
          ));
          return [nuevaAsignacion, ...sinDuplicado];
        });

        setModalAgregarOpen(false);
        setModalEmpleadoInput('');
        setModalEmpleadoEliminarCedula('');
        setModalValorFijo('');
        setMensaje({ type: 'success', text: 'Empleado guardado correctamente en la base de datos.' });
      } catch (error) {
        console.error('Error guardando empleado valet fijo en backend:', error);
        setMensaje({
          type: 'error',
          text: `No se pudo guardar empleado en base de datos: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        });
      }
    })();
  };

  const handleEliminarEmpleadoCentro = () => {
    if (!centroGestionSeleccionado) {
      setMensaje({ type: 'error', text: 'Selecciona un centro de costo valido.' });
      return;
    }

    const cedula = modalEmpleadoEliminarCedula.trim();
    if (!cedula) {
      setMensaje({ type: 'error', text: 'Selecciona un empleado existente para eliminar.' });
      return;
    }

    const empleadoExistente = empleadosCentroGestion.find((item) => item.empleadoCedula === cedula);
    if (!empleadoExistente) {
      setMensaje({ type: 'error', text: 'El empleado seleccionado no pertenece a este centro de costo.' });
      return;
    }

    void (async () => {
      try {
        await dbApi.valets.empleados.delete(
          centroGestionSeleccionado.IDCENTROCOSTO,
          cedula,
        );

        setAsignacionesCentro((prev) => prev.filter((item) => !(
          item.centroCostoId === centroGestionSeleccionado.IDCENTROCOSTO
          && item.empleadoCedula === cedula
        )));

        setHorariosFijosGuardados((prev) => prev.filter((item) => !(
          item.centroCostoId === centroGestionSeleccionado.IDCENTROCOSTO
          && item.empleadoCedula === cedula
        )));

        setAdicionalesPorEmpleado((prev) => {
          const next = { ...prev };
          delete next[`${centroGestionSeleccionado.IDCENTROCOSTO}-${cedula}`];
          return next;
        });

        setModalAgregarOpen(false);
        setModalEmpleadoInput('');
        setModalEmpleadoEliminarCedula('');
        setModalValorFijo('');
        setMensaje({ type: 'success', text: 'Empleado eliminado correctamente del centro de costo.' });
      } catch (error) {
        console.error('Error eliminando empleado valet fijo en backend:', error);
        setMensaje({
          type: 'error',
          text: `No se pudo eliminar empleado en base de datos: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        });
      }
    })();
  };

  const horariosCentroPeriodo = useMemo(() => {
    if (!centroHorarioSeleccionado) return [];
    return horariosFijosGuardados
      .filter((item) => 
        item.centroCostoId === centroHorarioSeleccionado.IDCENTROCOSTO && 
        item.anio === anio && 
        item.mes === mes &&
        item.semana === semanaHorario &&
        DIAS_LABORALES.some((d) => d.key === item.dia)
      )
      .sort((a, b) => diaLaboralAIndice(a.dia) - diaLaboralAIndice(b.dia));
  }, [horariosFijosGuardados, centroHorarioSeleccionado, anio, mes, semanaHorario]);

  const eventosCalendarioPeriodo = useMemo(() => {
    const eventosBase: EventoCalendario[] = horariosCentroPeriodo.map((item) => ({
      empleadoNombre: item.empleadoNombre,
      dia: item.dia,
      horaEntrada: item.horaEntrada,
      horaSalida: item.horaSalida,
      esAdicional: false,
    }));

    if (!centroHorarioSeleccionado) return eventosBase;

    const adicionales: EventoCalendario[] = asignacionesCentro
      .filter((item) => item.centroCostoId === centroHorarioSeleccionado.IDCENTROCOSTO)
      .flatMap((asignacion) => {
        const config = adicionalesPorEmpleado[asignacion.id];
        if (!config?.habilitarDiaAdicional) return [];
        if (config.diaAdicionalAnio !== anio || config.diaAdicionalMes !== mes) return [];

        const semana = config.diaAdicionalSemanas.find((item) => item.semana === semanaHorario && item.habilitado);
        if (!semana) return [];

        return semana.dias
          .filter((diaAdicional) => diaAdicional.horaEntrada && diaAdicional.horaSalida)
          .map((diaAdicional) => ({
            empleadoNombre: asignacion.empleadoNombre,
            dia: diaAdicional.dia,
            horaEntrada: diaAdicional.horaEntrada,
            horaSalida: diaAdicional.horaSalida,
            esAdicional: true,
          }));
      });

    return [...eventosBase, ...adicionales];
  }, [horariosCentroPeriodo, centroHorarioSeleccionado, asignacionesCentro, adicionalesPorEmpleado, anio, mes, semanaHorario]);

  const diasCalendario = useMemo(() => {
    return [...DIAS_LABORALES];
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-2 inline-flex gap-2">
        <button
          type="button"
          onClick={() => setSeccionActiva('horario_fijo')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            seccionActiva === 'horario_fijo'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Ingreso Horario
        </button>
        <button
          type="button"
          onClick={() => setSeccionActiva('gestionar_valet')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            seccionActiva === 'gestionar_valet'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Gestionar valet
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">

        {mensaje.type && (
          <div
            className={`p-4 rounded-xl border text-sm font-semibold ${
              mensaje.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {mensaje.text}
          </div>
        )}

        {/* Datalists compartidos para ambas secciones */}
        <datalist id="valets-fijos-empleados">
          {empleados.map((empleado) => (
            <option key={empleado.cedula} value={etiquetaEmpleado(empleado)} />
          ))}
        </datalist>
        <datalist id="valets-fijos-centros-horario">
          {centrosHorarioDisponibles.map((centro) => (
            <option key={`horario-${centro.IDCENTROCOSTO}-${centro.CENTROCOSTO}`} value={etiquetaCentro(centro)} />
          ))}
        </datalist>
        <datalist id="valets-horario-empleados-centro">
          {empleadosCentroHorario.map((empleado) => (
            <option key={`${empleado.cedula}-horario-centro`} value={etiquetaEmpleado(empleado)} />
          ))}
        </datalist>
        <datalist id="valets-fijos-centros">
          {centrosCosto.map((centro) => (
            <option key={`${centro.IDCENTROCOSTO}-${centro.CENTROCOSTO}`} value={etiquetaCentro(centro)} />
          ))}
        </datalist>

        {seccionActiva === 'horario_fijo' && (
          <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Centro de costo</label>
          <input
            value={centroHorarioInput}
            onChange={(e) => {
              setCentroHorarioInput(e.target.value);
              setEmpleadoInput('');
            }}
            list="valets-fijos-centros-horario"
            placeholder={loadingCentros ? 'Cargando centros de costo...' : 'Escribe para buscar centro de costo'}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Empleado</label>
          <input
            value={empleadoInput}
            onChange={(e) => setEmpleadoInput(e.target.value)}
            list="valets-horario-empleados-centro"
            disabled={!centroHorarioSeleccionado || empleadosCentroHorario.length === 0}
            placeholder={!centroHorarioSeleccionado
              ? 'Selecciona primero un centro de costo'
              : empleadosCentroHorario.length === 0
                ? 'No existen empleados en este centro'
                : 'Escribe para buscar empleado del centro'}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Mes</label>
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MESES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Año</label>
          <input
            type="number"
            min={2020}
            max={2100}
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value) || hoy.getFullYear())}
            className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Semana</label>
          <select
            value={semanaHorario}
            onChange={(e) => setSemanaHorario(Number(e.target.value))}
            className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[1, 2, 3, 4, 5].map((semana) => (
              <option key={semana} value={semana}>Semana {semana}</option>
            ))}
          </select>
        </div>
      </div>

      {centroHorarioSeleccionado && empleadosCentroHorario.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-700">
          No existen empleados dentro de ese centro de costo.
        </div>
      )}

      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="min-w-full bg-white text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left text-xs font-bold text-slate-600 px-4 py-3">Dia</th>
              <th className="text-left text-xs font-bold text-slate-600 px-4 py-3">Hora de entrada</th>
              <th className="text-left text-xs font-bold text-slate-600 px-4 py-3">Hora de salida</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-slate-100">
              <td className="px-4 py-3">
                <select
                  value={diaHorario}
                  onChange={(e) => setDiaHorario(e.target.value as DiaLaboralKey)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {diasDisponiblesIngreso.map((dia) => (
                    <option key={dia.key} value={dia.key}>{dia.label}</option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3">
                <select
                  value={horaEntradaHorario}
                  onChange={(e) => setHoraEntradaHorario(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar</option>
                  {OPCIONES_HORA_MEDIA.map((hora) => (
                    <option key={`hf-entrada-${hora}`} value={hora}>{hora}</option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3">
                <select
                  value={horaSalidaHorario}
                  onChange={(e) => setHoraSalidaHorario(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar</option>
                  {OPCIONES_HORA_MEDIA.map((hora) => (
                    <option key={`hf-salida-${hora}`} value={hora}>{hora}</option>
                  ))}
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex justify-start">
        <button
          type="button"
          onClick={handleRegistrar}
          className="px-6 py-3 rounded-lg bg-[#001F3F] text-white font-semibold hover:bg-blue-900 transition-colors"
        >
          Guardar
        </button>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-xl [&::-webkit-scrollbar]:hidden" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        {!centroHorarioSeleccionado ? (
          <div className="px-4 py-6 text-center text-slate-500">
            Selecciona un centro de costo para ver el calendario de horarios.
          </div>
        ) : (
          <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            <div className="inline-block min-w-full">
              {/* Grid de calendario */}
              {(() => {
                const horasCalendario = generarHorasDelDia();
                const slotHeight = 34;
                const alturaTotal = horasCalendario.length * slotHeight;

                return (
              <div className="grid gap-0" style={{ gridTemplateColumns: `80px repeat(${diasCalendario.length}, 1fr)` }}>
                <div className="bg-slate-100 border border-slate-300 px-2 py-2 text-xs font-bold text-slate-600"></div>

                {/* Encabezados de días */}
                {diasCalendario.map((dia) => (
                  <div
                    key={dia.key}
                    className="bg-slate-100 border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 text-center"
                  >
                    {dia.label}
                  </div>
                ))}

                {/* Columna de horas */}
                <div className="border border-slate-200 bg-slate-50" style={{ height: `${alturaTotal}px` }}>
                  {horasCalendario.map((hora) => (
                    <div
                      key={`hora-${hora}`}
                      className="px-2 text-[11px] font-semibold text-slate-600 text-center flex items-center justify-center border-b border-slate-200"
                      style={{ height: `${slotHeight}px` }}
                    >
                      {hora}
                    </div>
                  ))}
                </div>

                {/* Columnas por día con bloques continuos */}
                {diasCalendario.map((dia) => {
                  const bloques = obtenerBloquesCalendarioDia(eventosCalendarioPeriodo, dia.key, slotHeight);
                  return (
                    <div
                      key={`col-${dia.key}`}
                      className="relative border border-slate-200 bg-white"
                      style={{ height: `${alturaTotal}px` }}
                    >
                      {horasCalendario.map((hora, idx) => (
                        <div
                          key={`linea-${dia.key}-${hora}`}
                          className="absolute left-0 right-0 border-b border-slate-100"
                          style={{ top: `${(idx + 1) * slotHeight}px` }}
                        />
                      ))}

                      {bloques.map((bloque, idx) => (
                        <div
                          key={`${dia.key}-${bloque.nombre}-${bloque.horaEntrada}-${bloque.horaSalida}-${idx}`}
                          className={`absolute rounded text-[10px] leading-tight px-1.5 py-0.5 overflow-hidden ${
                            bloque.esAdicional
                              ? 'border border-red-300 bg-red-100 text-red-900'
                              : 'border border-blue-300 bg-blue-100 text-blue-900'
                          }`}
                          style={{
                            top: `${bloque.top + 2}px`,
                            height: `${Math.max(18, bloque.height - 4)}px`,
                            left: `calc(${(bloque.lane * 100) / bloque.lanesTotal}% + 2px)`,
                            width: `calc(${100 / bloque.lanesTotal}% - 4px)`,
                          }}
                          title={`${bloque.nombre} (${bloque.horaEntrada}-${bloque.horaSalida})`}
                        >
                          <div className="font-semibold truncate">{bloque.nombre}</div>
                          <div className="text-[10px] opacity-80">{bloque.horaEntrada} - {bloque.horaSalida}</div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
        </>
      )}

      {seccionActiva === 'gestionar_valet' && (
        <>
          <div className="max-w-2xl">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Centro de costo</label>
            <input
              value={centroGestionInput}
              onChange={(e) => setCentroGestionInput(e.target.value)}
              list="valets-fijos-centros"
              placeholder={loadingCentros ? 'Cargando centros de costo...' : 'Escribe para buscar centro de costo'}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {!centroGestionSeleccionado && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Selecciona un centro de costo para ver los detalles de valet.
            </div>
          )}

          {centroGestionSeleccionado && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-500">Centro seleccionado</p>
                  <p className="text-sm font-bold text-slate-800">
                    {centroGestionSeleccionado.IDCENTROCOSTO} - {centroGestionSeleccionado.CENTROCOSTO}
                  </p>
                  <p className="text-sm text-slate-600">
                    Empleados pertenecientes: <span className="font-bold text-slate-800">{detalleCentroSeleccionado.length}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setModalAgregarOpen(true);
                      setModalGestionEmpleadoModo('agregar');
                      setModalEmpleadoInput('');
                      setModalEmpleadoEliminarCedula('');
                      setModalValorFijo('');
                    }}
                    className="px-4 py-2 rounded-lg bg-[#001F3F] text-white text-sm font-semibold hover:bg-blue-900 transition-colors"
                  >
                    Gestionar empleados
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-600">Empleado</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-600">Valor fijo a pagar</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-600">Gestionar adicionales</th>
                        <th className="text-center px-4 py-3 text-xs font-bold text-slate-600">Detalles</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalleCentroSeleccionado.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                            Empleados no asignados
                          </td>
                        </tr>
                      )}
                      {detalleCentroSeleccionado.map((item) => (
                        <tr key={`${item.centroCostoId}-${item.empleadoCedula}`} className="border-t border-slate-100">
                          <td className="px-4 py-3">{item.empleadoNombre}</td>
                          <td className="px-4 py-3 font-semibold text-slate-700">{formatearMoneda(item.valorFijo)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => abrirModalAdicionales(item)}
                                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100"
                              >
                                Gestionar adicionales
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => setEmpleadoDetallesAbierto(item)}
                              className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
                              title="Ver detalles"
                            >
                              <Eye size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {modalAgregarOpen && centroGestionSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-lg font-black text-slate-800">Gestionar empleados</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Centro: {centroGestionSeleccionado.IDCENTROCOSTO} - {centroGestionSeleccionado.CENTROCOSTO}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalAgregarOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-xs font-semibold hover:bg-slate-100"
              >
                Cerrar
              </button>
            </div>

            <div className="inline-flex rounded-xl border border-slate-300 p-1 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  setModalGestionEmpleadoModo('agregar');
                  setModalEmpleadoEliminarCedula('');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  modalGestionEmpleadoModo === 'agregar'
                    ? 'bg-[#001F3F] text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Agregar
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalGestionEmpleadoModo('eliminar');
                  setModalEmpleadoInput('');
                  setModalValorFijo('');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  modalGestionEmpleadoModo === 'eliminar'
                    ? 'bg-[#001F3F] text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Eliminar
              </button>
            </div>

            {modalGestionEmpleadoModo === 'agregar' ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Buscar empleado</label>
                  <input
                    value={modalEmpleadoInput}
                    onChange={(e) => setModalEmpleadoInput(e.target.value)}
                    list="valets-fijos-empleados"
                    placeholder={loadingEmpleados ? 'Cargando empleados...' : 'Escribe para buscar empleado'}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Valor fijo a pagar</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={modalValorFijo}
                    onChange={(e) => setModalValorFijo(e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Seleccionar empleado existente</label>
                <select
                  value={modalEmpleadoEliminarCedula}
                  onChange={(e) => setModalEmpleadoEliminarCedula(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar</option>
                  {empleadosCentroGestion.map((empleado) => (
                    <option key={`eliminar-${empleado.centroCostoId}-${empleado.empleadoCedula}`} value={empleado.empleadoCedula}>
                      {empleado.empleadoNombre} - {empleado.empleadoCedula}
                    </option>
                  ))}
                </select>
                {empleadosCentroGestion.length === 0 && (
                  <p className="text-xs text-slate-500 mt-2">No hay empleados en este centro para eliminar.</p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalAgregarOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm font-semibold hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={modalGestionEmpleadoModo === 'agregar' ? handleGuardarEmpleadoCentro : handleEliminarEmpleadoCentro}
                className="px-4 py-2 rounded-lg bg-[#001F3F] text-white text-sm font-semibold hover:bg-blue-900 transition-colors"
              >
                {modalGestionEmpleadoModo === 'agregar' ? 'Guardar empleado' : 'Eliminar empleado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalAdicionalesOpen && empleadoAdicionalSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-lg font-black text-slate-800">Gestionar adicionales</h4>
                <p className="text-xs text-slate-500 mt-1">Empleado: {empleadoAdicionalSeleccionado.empleadoNombre}</p>
                <p className="text-xs text-slate-500">Centro: {empleadoAdicionalSeleccionado.centroCostoId} - {empleadoAdicionalSeleccionado.centroCostoNombre}</p>
              </div>
              <button
                type="button"
                onClick={cerrarModalAdicionales}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-xs font-semibold hover:bg-slate-100"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-3 rounded-xl border border-slate-200 p-4 bg-slate-50">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={modalHabilitarDiaAdicional}
                  onChange={(e) => setModalHabilitarDiaAdicional(e.target.checked)}
                  className="h-4 w-4"
                />
                Habilitar dia adicional
              </label>

              {modalHabilitarDiaAdicional && (
                <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Año (periodo)</label>
                    <input
                      type="number"
                      min={2020}
                      max={2100}
                      value={modalDiaAdicionalAnio}
                      onChange={(e) => setModalDiaAdicionalAnio(Number(e.target.value) || hoy.getFullYear())}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Mes (periodo)</label>
                    <select
                      value={modalDiaAdicionalMes}
                      onChange={(e) => setModalDiaAdicionalMes(Number(e.target.value))}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {MESES.map((item) => (
                        <option key={`dia-adicional-mes-${item.value}`} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-600">Semanas</p>
                    {modalDiaAdicionalSemanas.map((semanaConfig) => (
                      <div key={`dia-adicional-semana-${semanaConfig.semana}`} className="rounded-lg border border-slate-200 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={semanaConfig.habilitado}
                              onChange={(e) => handleToggleDiaAdicionalSemana(semanaConfig.semana, e.target.checked)}
                              className="h-4 w-4"
                            />
                            Semana {semanaConfig.semana}
                          </label>
                          {semanaConfig.habilitado && (
                            <button
                              type="button"
                              onClick={() => handleAgregarDiaAdicional(semanaConfig.semana)}
                              disabled={semanaConfig.dias.length >= 5 || !obtenerSiguienteDiaDisponible(semanaConfig.dias)}
                              className="px-2 py-1 text-xs rounded-lg border border-blue-300 bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              + Agregar dia
                            </button>
                          )}
                        </div>

                        {semanaConfig.habilitado && (
                          <div className="space-y-2 mt-3">
                            {semanaConfig.dias.length === 0 ? (
                              <p className="text-xs text-slate-500 italic">No hay dias. Haz clic en "+ Agregar dia" para añadir.</p>
                            ) : (
                              semanaConfig.dias.map((diaDia, indexDia) => (
                                <div key={`dia-adicional-${semanaConfig.semana}-${indexDia}`} className="grid grid-cols-1 md:grid-cols-4 gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2">
                                  <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-0.5">Dia</label>
                                    <select
                                      value={diaDia.dia}
                                      onChange={(e) => handleActualizarDiaAdicional(semanaConfig.semana, indexDia, 'dia', e.target.value)}
                                      className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                      {obtenerDiasDisponiblesPorIndice(semanaConfig.dias, indexDia).map((diaKey) => {
                                        const dia = DIAS_LABORALES_SIN_DOMINGO.find((item) => item.key === diaKey);
                                        if (!dia) return null;
                                        return <option key={`dia-sel-${semanaConfig.semana}-${indexDia}-${dia.key}`} value={dia.key}>{dia.label}</option>;
                                      })}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-0.5">Entrada</label>
                                    <select
                                      value={diaDia.horaEntrada}
                                      onChange={(e) => handleActualizarDiaAdicional(semanaConfig.semana, indexDia, 'horaEntrada', e.target.value)}
                                      className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                      <option value="">Seleccionar</option>
                                      {OPCIONES_HORA_MEDIA.map((hora) => (
                                        <option key={`entrada-${semanaConfig.semana}-${indexDia}-${hora}`} value={hora}>{hora}</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-0.5">Salida</label>
                                    <select
                                      value={diaDia.horaSalida}
                                      onChange={(e) => handleActualizarDiaAdicional(semanaConfig.semana, indexDia, 'horaSalida', e.target.value)}
                                      className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                      <option value="">Seleccionar</option>
                                      {OPCIONES_HORA_MEDIA.map((hora) => (
                                        <option key={`salida-${semanaConfig.semana}-${indexDia}-${hora}`} value={hora}>{hora}</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="flex items-end">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoverDiaAdicional(semanaConfig.semana, indexDia)}
                                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-red-300 bg-red-50 text-red-700 font-semibold hover:bg-red-100 transition-colors"
                                    >
                                      Remover
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 rounded-xl border border-slate-200 p-4 bg-slate-50">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={modalHabilitarDomingo}
                  onChange={(e) => setModalHabilitarDomingo(e.target.checked)}
                  className="h-4 w-4"
                />
                Habilitar domingo
              </label>

              {modalHabilitarDomingo && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Año (periodo)</label>
                    <input
                      type="number"
                      min={2020}
                      max={2100}
                      value={modalDomingoAnio}
                      onChange={(e) => setModalDomingoAnio(Number(e.target.value) || hoy.getFullYear())}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Mes (periodo)</label>
                    <select
                      value={modalDomingoMes}
                      onChange={(e) => setModalDomingoMes(Number(e.target.value))}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {MESES.map((item) => (
                        <option key={`domingo-mes-${item.value}`} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-2">Semanas habilitadas</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                      {SEMANAS_DISPONIBLES.map((semana) => (
                        <label
                          key={`domingo-semana-${semana}`}
                          className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-2 text-sm text-slate-700 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={modalDomingoSemanas.includes(semana)}
                            onChange={(e) => handleToggleDomingoSemana(semana, e.target.checked)}
                            className="h-4 w-4"
                          />
                          Semana {semana}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={cerrarModalAdicionales}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm font-semibold hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGuardarAdicionales}
                className="px-4 py-2 rounded-lg bg-[#001F3F] text-white text-sm font-semibold hover:bg-blue-900 transition-colors"
              >
                Guardar adicionales
              </button>
            </div>
          </div>
        </div>
      )}

      {empleadoDetallesAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div
            className="absolute inset-0"
            onClick={() => setEmpleadoDetallesAbierto(null)}
          />
          <div className="relative w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-lg font-black text-slate-800">Detalles de adicionales</h4>
                <p className="text-xs text-slate-500 mt-1">Empleado: {empleadoDetallesAbierto.empleadoNombre}</p>
                <p className="text-xs text-slate-500">Centro: {empleadoDetallesAbierto.centroCostoId} - {empleadoDetallesAbierto.centroCostoNombre}</p>
              </div>
              <button
                type="button"
                onClick={() => setEmpleadoDetallesAbierto(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-xs font-semibold hover:bg-slate-100"
              >
                Cerrar
              </button>
            </div>

            {(() => {
              const config = adicionalesPorEmpleado[empleadoDetallesAbierto.id];
              const hayDias = Boolean(config?.habilitarDiaAdicional && config.diaAdicionalSemanas?.some((s) => s.habilitado));
              const hayDomingos = Boolean(config?.habilitarDomingo && config.domingoSemanas?.length);

              if (!config || (!hayDias && !hayDomingos)) {
                return (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    No hay configuración activa para este empleado.
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {hayDias && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-bold text-slate-800">Días adicionales</p>
                        <p className="text-xs text-slate-500">Periodo: {config.diaAdicionalAnio}/{String(config.diaAdicionalMes).padStart(2, '0')}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                        {config.diaAdicionalSemanas
                          .filter((semana) => semana.habilitado)
                          .map((semana) => (
                            <div key={`detalle-dia-${config.diaAdicionalAnio}-${config.diaAdicionalMes}-${semana.semana}`} className="rounded-lg border border-slate-200 bg-white p-3 h-full">
                              <p className="text-xs font-semibold text-slate-600 mb-2">Semana {semana.semana}</p>
                              <div className="space-y-1.5">
                                {semana.dias.map((dia, indexDia) => (
                                  <div
                                    key={`detalle-dia-item-${semana.semana}-${indexDia}`}
                                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                                  >
                                    <span className="font-medium text-slate-700">
                                      {DIAS_LABORALES_SIN_DOMINGO.find((d) => d.key === dia.dia)?.label || dia.dia}
                                    </span>
                                    <span className="text-slate-600">{dia.horaEntrada} - {dia.horaSalida}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {hayDomingos && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-bold text-slate-800">Domingos</p>
                        <p className="text-xs text-slate-500">Periodo: {config.domingoAnio}/{String(config.domingoMes).padStart(2, '0')}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {config.domingoSemanas.map((semana) => (
                          <span
                            key={`detalle-domingo-${config.domingoAnio}-${config.domingoMes}-${semana}`}
                            className="inline-flex items-center rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 bg-white"
                          >
                            Semana {semana}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default ValetsFijosView;
