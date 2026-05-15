import { useEffect, useState } from 'react';
import { Eye, Trash2, ChevronDown, Check, CheckCircle2 } from 'lucide-react';
import { ListarValetsFijos, getNominaCostCenters, getNominaEmployeesActive, type NominaCostCenter } from '../../services/n8nApi';
import { dbApi } from '../../services/dbApi';
import type { EmpleadoNominaApiItem } from '../../types/nomina';

type SeccionValets = 'ingreso' | 'gestionar';

interface EmpleadoValet {
  id: string;
  centro: string;
  nombre: string;
  valor: string;
  cedula?: string;
}

interface ValetEmpleadoDbRegistro {
  id: string;
  centroCostoId: string;
  centroCostoNombre: string;
  empleadoCedula: string;
  empleadoNombre: string;
  valorFijo: number;
}

interface ValetEmpleadosListResponse {
  ok?: boolean;
  registros?: ValetEmpleadoDbRegistro[];
}

interface ValetEmpleadoSaveResponse {
  ok?: boolean;
  registro?: ValetEmpleadoDbRegistro;
}

interface ValetHorarioDbRegistro {
  id: string;
  centroCostoId: string;
  centroCostoNombre: string;
  empleadoCedula: string;
  empleadoNombre: string;
  fechaTurno: string;
  horaEntrada: string;
  horaSalida: string;
  esAdicional: boolean;
  aprobado?: boolean;
  recurrencia?: boolean;
  finRecurrencia?: string;
  observacion?: string;
  evidenciaBase64?: string;
  evidenciaMimeType?: string;
  evidenciaNombreArchivo?: string;
}

interface ValetHorariosListResponse {
  ok?: boolean;
  registros?: ValetHorarioDbRegistro[];
}

interface ValetHorarioSaveResponse {
  ok?: boolean;
  registro?: ValetHorarioDbRegistro;
}

interface ValetHorarioDeleteResponse {
  ok?: boolean;
  registro?: ValetHorarioDbRegistro;
}

interface EmpleadoActivoOption {
  cedula: string;
  nombreCompleto: string;
  centroId: string;
  centroNombre: string;
}

interface HorarioRegistrado {
  id: string;
  centro: string;
  empleado: string;
  fecha: string;
  horaEntrada: string;
  horaSalida: string;
  adicional: boolean;
  aprobado?: boolean;
  recurrencia: boolean;
  finRecurrencia: string;
  observacion: string;
  evidenciaBase64: string;
  evidenciaMimeType: string;
  evidenciaNombreArchivo: string;
}

interface CalendarDay {
  d: number;
  curr: boolean;
  m: number;
  y: number;
  active?: boolean;
}

interface WeekDay {
  d: number;
  m: number;
  y: number;
  n: string;
  active: boolean;
}

const calcularValorNum = (entrada: string, salida: string): number => {
  if (!entrada || !salida) return 0;
  const [h1, m1] = entrada.split(':').map(Number);
  const [h2, m2] = salida.split(':').map(Number);
  let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (diff < 0) diff += 24 * 60;
  return (diff / 60) * 3;
};

const calcularValorStr = (entrada: string, salida: string): string => calcularValorNum(entrada, salida).toFixed(2);

const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const daysOfWeek = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const hours = Array.from({ length: 24 }, (_, i) => i);

const parseCentroCompuesto = (valor: string): { centroCostoId: string; centroCostoNombre: string } => {
  const raw = String(valor || '').trim();
  const match = raw.match(/^([^\-]+?)\s*-\s*(.+)$/);

  if (!match) {
    return { centroCostoId: '', centroCostoNombre: raw };
  }

  return {
    centroCostoId: String(match[1] || '').trim(),
    centroCostoNombre: String(match[2] || '').trim(),
  };
};

const composeCentroDisplay = (centroCostoId: string, centroCostoNombre: string): string => {
  if (centroCostoId && centroCostoNombre) {
    return `${centroCostoId} - ${centroCostoNombre}`;
  }
  return centroCostoId || centroCostoNombre;
};

const parseHora24AMinutos = (value: string): number | null => {
  const raw = String(value || '').trim();
  if (!/^\d{2}:\d{2}$/.test(raw)) return null;

  const [h, m] = raw.split(':').map(Number);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;

  return (h * 60) + m;
};

const horariosSeSolapan = (inicioA: number, finA: number, inicioB: number, finB: number): boolean => {
  return inicioA < finB && inicioB < finA;
};

const esFechaDomingo = (fechaIso: string): boolean => {
  const d = new Date(`${fechaIso}T12:00:00`);
  return !Number.isNaN(d.getTime()) && d.getDay() === 0;
};

const parseFechaLocal = (fechaIso: string): Date | null => {
  const [anio, mes, dia] = String(fechaIso || '').split('-').map(Number);
  if (!Number.isInteger(anio) || !Number.isInteger(mes) || !Number.isInteger(dia)) return null;
  return new Date(anio, mes - 1, dia);
};

const formatFechaLocal = (date: Date): string => {
  const anio = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

const fileToBase64 = async (file: File): Promise<string> => {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo de evidencia.'));
    reader.readAsDataURL(file);
  });
};

interface Bloque {
  id: string;
  evento: HorarioRegistrado;
  inicioMin: number;
  finMin: number;
  duracionMin: number;
  lane: number;
  lanesTotal: number;
}

const calcularBloquesCalendario = (eventosDelDia: HorarioRegistrado[]): Bloque[] => {
  const eventosValidos = eventosDelDia
    .map((evento) => {
      const inicioMin = parseHora24AMinutos(evento.horaEntrada);
      const finMin = parseHora24AMinutos(evento.horaSalida);
      if (inicioMin === null || finMin === null || finMin <= inicioMin) return null;

      return {
        id: evento.id,
        evento,
        inicioMin,
        finMin,
        duracionMin: finMin - inicioMin,
      };
    })
    .filter((item): item is Exclude<typeof item, null> => item !== null)
    .sort((a, b) => a.inicioMin - b.inicioMin);

  if (eventosValidos.length === 0) return [];

  const finPorLane: number[] = [];
  const bloquesConLane = eventosValidos.map((bloque) => {
    let lane = finPorLane.findIndex((fin) => bloque.inicioMin >= fin);
    if (lane === -1) {
      lane = finPorLane.length;
      finPorLane.push(bloque.finMin);
    } else {
      finPorLane[lane] = bloque.finMin;
    }
    return { ...bloque, lane };
  });

  const lanesTotal = Math.max(1, finPorLane.length);

  return bloquesConLane.map((bloque) => ({
    ...bloque,
    lanesTotal,
  }));
};

const ValetsFijosView = () => {
  const [activeSubTab, setActiveSubTab] = useState<SeccionValets>('ingreso');
  
  // Estados para GESTIONAR VALET
  const [gestionarCentro, setGestionarCentro] = useState('');
  const [showGestionarEmpleadosModal, setShowGestionarEmpleadosModal] = useState(false);
  const [empleadoBusqueda, setEmpleadoBusqueda] = useState('');
  const [valorFijo, setValorFijo] = useState('');
  const [showSuccessGuardado, setShowSuccessGuardado] = useState(false);
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);
  const [loadingEmpleadosDb, setLoadingEmpleadosDb] = useState(false);
  const [guardandoEmpleado, setGuardandoEmpleado] = useState(false);
  const [eliminandoEmpleadoId, setEliminandoEmpleadoId] = useState('');
  const [catalogosError, setCatalogosError] = useState('');
  const [centrosCostoValet, setCentrosCostoValet] = useState<NominaCostCenter[]>([]);
  const [empleadosActivos, setEmpleadosActivos] = useState<EmpleadoActivoOption[]>([]);
  const [centroAutorizadoList, setCentroAutorizadoList] = useState<Record<string, boolean>>({});
  const [showDetallesModal, setShowDetallesModal] = useState(false);
  const [detalleEmpleado, setDetalleEmpleado] = useState<EmpleadoValet | null>(null);
  const [empleadosValet, setEmpleadosValet] = useState<EmpleadoValet[]>([]);

  // Estados para INGRESO HORARIO
  const [ingresoCentro, setIngresoCentro] = useState('');
  const [ingresoEmpleado, setIngresoEmpleado] = useState('');
  const [ingresoFecha, setIngresoFecha] = useState('');
  const [ingresoHoraEntrada, setIngresoHoraEntrada] = useState('');
  const [ingresoHoraSalida, setIngresoHoraSalida] = useState('');
  const [ingresoAdicional, setIngresoAdicional] = useState(false);
  const [ingresoObservacion, setIngresoObservacion] = useState('');
  const [ingresoEvidencia, setIngresoEvidencia] = useState<File | null>(null);
  const [showSuccessHorario, setShowSuccessHorario] = useState(false);
  const [loadingHorariosDb, setLoadingHorariosDb] = useState(false);
  const [guardandoHorario, setGuardandoHorario] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroEmpleadoCalendario, setFiltroEmpleadoCalendario] = useState('');
  const [horariosRegistrados, setHorariosRegistrados] = useState<HorarioRegistrado[]>([]);
  const [calendarView, setCalendarView] = useState('mes');
  const [calendarOffset, setCalendarOffset] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const cargarCatalogos = async () => {
      setLoadingCatalogos(true);
      setCatalogosError('');

      try {
        const [centrosData, centrosValetData, empleadosData] = await Promise.all([
          getNominaCostCenters(),
          ListarValetsFijos(),
          getNominaEmployeesActive<EmpleadoNominaApiItem[]>(),
        ]);

        const centrosNormalizados = (Array.isArray(centrosData) ? centrosData : [])
          .filter((cc) => cc.IDCENTROCOSTO || cc.CENTROCOSTO)
          .sort((a, b) => `${a.IDCENTROCOSTO} ${a.CENTROCOSTO}`.localeCompare(`${b.IDCENTROCOSTO} ${b.CENTROCOSTO}`, 'es', { sensitivity: 'base' }));

        const centrosValetNormalizados = (Array.isArray(centrosValetData) ? centrosValetData : [])
          .filter((cc) => cc.IDCENTROCOSTO || cc.CENTROCOSTO)
          .sort((a, b) => `${a.IDCENTROCOSTO} ${a.CENTROCOSTO}`.localeCompare(`${b.IDCENTROCOSTO} ${b.CENTROCOSTO}`, 'es', { sensitivity: 'base' }));

        const empleadosMap = new Map<string, EmpleadoActivoOption>();
        (Array.isArray(empleadosData) ? empleadosData : []).forEach((item) => {
          const payload = item?.json ?? item;
          const cedula = String(payload?.CEDULA || payload?.DOCI_MFEMP || '').trim();
          const nombres = String(payload?.NOMBRES || '').trim();
          const apellidos = String(payload?.APELLIDOS || '').trim();
          const nombreCompleto = `${apellidos} ${nombres}`.trim();
          const centroId = String((payload as EmpleadoNominaApiItem & { COD_MFCC?: string })?.COD_MFCC || '').trim();
          const centroNombre = String((payload as EmpleadoNominaApiItem & { DSC_MFCC?: string })?.DSC_MFCC || '').trim();

          if (!cedula || !nombreCompleto) return;
          if (!empleadosMap.has(cedula)) {
            empleadosMap.set(cedula, {
              cedula,
              nombreCompleto,
              centroId,
              centroNombre,
            });
          }
        });

        const empleadosNormalizados = Array.from(empleadosMap.values())
          .sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto, 'es', { sensitivity: 'base' }));

        if (!isMounted) return;
        setCentrosCostoValet(centrosValetNormalizados.length > 0 ? centrosValetNormalizados : centrosNormalizados);
        setEmpleadosActivos(empleadosNormalizados);
      } catch (error) {
        if (!isMounted) return;
        setCatalogosError(error instanceof Error ? error.message : 'No se pudieron cargar catalogos desde n8n.');
      } finally {
        if (isMounted) {
          setLoadingCatalogos(false);
        }
      }
    };

    cargarCatalogos();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const cargarHorariosValet = async () => {
      setLoadingHorariosDb(true);
      try {
        const response = await dbApi.valets.horarios.list<ValetHorariosListResponse>();
        const registros = Array.isArray(response?.registros) ? response.registros : [];

        if (!isMounted) return;
        setHorariosRegistrados(
          registros
            .map((item) => ({
              id: String(item.id || `${item.centroCostoId}-${item.empleadoCedula}-${item.fechaTurno}`),
              centro: composeCentroDisplay(String(item.centroCostoId || ''), String(item.centroCostoNombre || '')),
              empleado: String(item.empleadoNombre || '').trim(),
              fecha: String(item.fechaTurno || '').trim(),
              horaEntrada: String(item.horaEntrada || '').trim(),
              horaSalida: String(item.horaSalida || '').trim(),
              adicional: Boolean(item.esAdicional),
                aprobado: item.aprobado === undefined ? true : Boolean(item.aprobado),
                recurrencia: Boolean(item.recurrencia),
              finRecurrencia: String(item.finRecurrencia || '').trim(),
                observacion: String(item.observacion || ''),
                evidenciaBase64: String(item.evidenciaBase64 || ''),
                evidenciaMimeType: String(item.evidenciaMimeType || ''),
                evidenciaNombreArchivo: String(item.evidenciaNombreArchivo || ''),
            }))
            .filter((item) => item.centro && item.empleado && item.fecha && item.horaEntrada && item.horaSalida)
        );
      } catch (error) {
        if (!isMounted) return;
        alert(error instanceof Error ? error.message : 'No se pudieron cargar horarios de valet fijo desde la base de datos.');
      } finally {
        if (isMounted) {
          setLoadingHorariosDb(false);
        }
      }
    };

    void cargarHorariosValet();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const cargarEmpleadosValet = async () => {
      setLoadingEmpleadosDb(true);
      try {
        const response = await dbApi.valets.empleados.list<ValetEmpleadosListResponse>();
        const registros = Array.isArray(response?.registros) ? response.registros : [];

        if (!isMounted) return;
        setEmpleadosValet(
          registros
            .map((item) => ({
              id: String(item.id || `${item.centroCostoId}-${item.empleadoCedula}`),
              centro: composeCentroDisplay(String(item.centroCostoId || ''), String(item.centroCostoNombre || '')),
              nombre: String(item.empleadoNombre || '').trim(),
              valor: Number(item.valorFijo || 0).toFixed(2),
              cedula: String(item.empleadoCedula || '').trim(),
            }))
            .filter((item) => item.centro && item.nombre && item.cedula)
        );
      } catch (error) {
        if (!isMounted) return;
        alert(error instanceof Error ? error.message : 'No se pudo cargar empleados de valet fijo desde la base de datos.');
      } finally {
        if (isMounted) {
          setLoadingEmpleadosDb(false);
        }
      }
    };

    void cargarEmpleadosValet();
    return () => {
      isMounted = false;
    };
  }, []);

  const empleadosParaIngreso = empleadosValet.filter(e => e.centro === ingresoCentro);

  const empleadosCentroGestion = empleadosValet.filter(e => e.centro === gestionarCentro);
  const empleadosActivosFiltrados = empleadosActivos
    .filter((emp) => {
      const q = empleadoBusqueda.trim().toLowerCase();
      if (!q) return true;
      return emp.nombreCompleto.toLowerCase().includes(q) || emp.cedula.toLowerCase().includes(q);
    });

  const calcularTotalCentro = (centro: string): number => {
    const empAdicCentro = horariosRegistrados.filter(h => h.centro === centro && (h.adicional || esFechaDomingo(h.fecha)));
    let total = 0;
    const emps = [...new Set(empAdicCentro.map(h => h.empleado))];
    
    emps.forEach(empName => {
      const evs = empAdicCentro.filter(h => h.empleado === empName);
      const domingosMap = new Map();
      
      evs.forEach(ev => {
        const isAprobado = ev.aprobado !== false;
        if (!isAprobado) return;

        if (esFechaDomingo(ev.fecha) && !ev.adicional) {
          domingosMap.set(ev.fecha, true);
        } else {
          total += calcularValorNum(ev.horaEntrada, ev.horaSalida);
        }
      });
      total += domingosMap.size * 10;
    });
    return total;
  };

  const getMonthGrid = (): { grid: CalendarDay[], monthName: string, year: number } => {
    const now = new Date();
    const baseDate = new Date(now.getFullYear(), now.getMonth() + calendarOffset, 1);
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    let startOffset = firstDay === 0 ? 6 : firstDay - 1;
    
    const grid: CalendarDay[] = [];
    for (let i = startOffset - 1; i >= 0; i--) {
      grid.push({ d: daysInPrevMonth - i, curr: false, m: month === 0 ? 12 : month, y: month === 0 ? year - 1 : year });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const isToday = new Date().toDateString() === new Date(year, month, i).toDateString();
      grid.push({ d: i, curr: true, m: month + 1, y: year, active: isToday });
    }
    const remaining = (Math.ceil(grid.length / 7) * 7) - grid.length;
    for (let i = 1; i <= remaining; i++) {
      grid.push({ d: i, curr: false, m: month === 11 ? 1 : month + 2, y: month === 11 ? year + 1 : year });
    }
    return { grid, monthName: monthNames[month], year };
  };

  const getWeekDays = (): WeekDay[] => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(now.getFullYear(), now.getMonth(), diffToMonday + calendarOffset * 7);
    
    const names = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const wDays: WeekDay[] = [];
    for (let i = 0; i < 7; i++) {
      const cur = new Date(monday);
      cur.setDate(monday.getDate() + i);
      const isToday = new Date().toDateString() === cur.toDateString();
      wDays.push({
        d: cur.getDate(),
        m: cur.getMonth() + 1,
        y: cur.getFullYear(),
        n: names[i],
        active: isToday
      });
    }
    return wDays;
  };

  const { grid: currentCalendarGrid, monthName: currentMonthName, year: currentYear } = getMonthGrid();
  const currentWeekDays = getWeekDays();

  const horariosCalendario: HorarioRegistrado[] = (() => {
    const days = calendarView === 'semana' ? currentWeekDays : currentCalendarGrid;
    if (days.length === 0) return horariosRegistrados;
    const first = days[0];
    const last = days[days.length - 1];
    const inicio = new Date(first.y, first.m - 1, first.d);
    const fin = new Date(last.y, last.m - 1, last.d);
    const resultado: HorarioRegistrado[] = [];
    for (const h of horariosRegistrados) {
      if (!h.recurrencia) {
        resultado.push(h);
        continue;
      }
      const fechaBase = parseFechaLocal(h.fecha);
      if (!fechaBase) {
        resultado.push(h);
        continue;
      }
      const fechaFin = h.finRecurrencia ? parseFechaLocal(h.finRecurrencia) : null;
      const diaSemana = fechaBase.getDay();
      const curr = new Date(inicio);
      const diff = (diaSemana - curr.getDay() + 7) % 7;
      curr.setDate(curr.getDate() + diff);
      while (curr <= fin) {
        if (curr >= fechaBase && (!fechaFin || curr <= fechaFin)) {
          resultado.push({ ...h, fecha: formatFechaLocal(curr) });
        }
        curr.setDate(curr.getDate() + 7);
      }
    }
    return resultado;
  })();

  const empleadosFiltroCalendario = Array.from(new Set(
    horariosRegistrados
      .filter((h) => !ingresoCentro || h.centro === ingresoCentro)
      .map((h) => h.empleado)
  ))
    .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

  useEffect(() => {
    if (filtroEmpleadoCalendario && !empleadosFiltroCalendario.includes(filtroEmpleadoCalendario)) {
      setFiltroEmpleadoCalendario('');
    }
  }, [filtroEmpleadoCalendario, empleadosFiltroCalendario]);

  const cumpleFiltrosCalendario = (ev: HorarioRegistrado): boolean => {
    if (!ingresoCentro) return false;
    if (ev.centro !== ingresoCentro) return false;

    const esAdicionalODomingo = ev.adicional || esFechaDomingo(ev.fecha);
    if (filtroEstado === 'adicionales' && !esAdicionalODomingo) return false;
    if (filtroEstado === 'general' && esAdicionalODomingo) return false;
    if (filtroEmpleadoCalendario && ev.empleado !== filtroEmpleadoCalendario) return false;
    return true;
  };
  
  const startW = currentWeekDays[0];
  const endW = currentWeekDays[6];
  const weekHeaderText = `${monthNames[startW.m - 1]} ${startW.d.toString().padStart(2, '0')} – ${endW.d.toString().padStart(2, '0')}`;
  const headerText = calendarView === 'semana' ? weekHeaderText : `${currentMonthName} ${currentYear}`;

  const handleGuardarHorario = async () => {
    if (!ingresoCentro || !ingresoEmpleado || !ingresoFecha || !ingresoHoraEntrada || !ingresoHoraSalida) {
      alert('Por favor, completa todos los campos del horario.');
      return;
    }

    const centro = parseCentroCompuesto(ingresoCentro);
    if (!centro.centroCostoId) {
      alert('Selecciona un centro de costo valido.');
      return;
    }

    const empleadoAsignado = empleadosValet.find((emp) =>
      emp.centro === ingresoCentro && emp.nombre === ingresoEmpleado && Boolean(emp.cedula)
    );

    if (!empleadoAsignado?.cedula) {
      alert('No se pudo identificar la cedula del empleado seleccionado.');
      return;
    }

    const entradaMin = parseHora24AMinutos(ingresoHoraEntrada);
    const salidaMin = parseHora24AMinutos(ingresoHoraSalida);
    if (entradaMin === null || salidaMin === null) {
      alert('Las horas deben tener formato valido HH:MM.');
      return;
    }

    if (salidaMin <= entradaMin) {
      alert('La hora de salida debe ser mayor que la hora de entrada.');
      return;
    }

    const existeSolape = horariosRegistrados
      .filter((item) => {
        if (item.centro !== ingresoCentro || item.empleado !== ingresoEmpleado) return false;
        if (item.recurrencia) {
          const itemDate = parseFechaLocal(item.fecha);
          const ingresoDate = parseFechaLocal(ingresoFecha);
          if (!itemDate || !ingresoDate) return false;
          const fechaFin = item.finRecurrencia ? parseFechaLocal(item.finRecurrencia) : null;
          return itemDate.getDay() === ingresoDate.getDay() && ingresoDate >= itemDate && (!fechaFin || ingresoDate <= fechaFin);
        }
        return item.fecha === ingresoFecha;
      })
      .some((item) => {
        const inicioExistente = parseHora24AMinutos(item.horaEntrada);
        const finExistente = parseHora24AMinutos(item.horaSalida);
        if (inicioExistente === null || finExistente === null) return false;
        return horariosSeSolapan(entradaMin, salidaMin, inicioExistente, finExistente);
      });

    if (existeSolape) {
      alert('No se puede guardar porque el rango horario se cruza con otro ya registrado ese mismo dia.');
      return;
    }

    const valorFijoEmpleado = Number(String(empleadoAsignado.valor || '0').replace(',', '.'));
    if (!Number.isFinite(valorFijoEmpleado) || valorFijoEmpleado < 0) {
      alert('El empleado seleccionado no tiene un valor fijo valido.');
      return;
    }

    let evidenciaBase64 = '';
    if (ingresoAdicional && ingresoEvidencia) {
      try {
        evidenciaBase64 = await fileToBase64(ingresoEvidencia);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'No se pudo procesar la imagen de evidencia.');
        return;
      }
    }

    const esRecurrente = valorFijoEmpleado > 0 && !ingresoAdicional && !esFechaDomingo(ingresoFecha);

    setGuardandoHorario(true);
    try {
      const response = await dbApi.valets.horarios.save<ValetHorarioSaveResponse>({
        centroCostoId: centro.centroCostoId,
        centroCostoNombre: centro.centroCostoNombre,
        empleadoCedula: empleadoAsignado.cedula,
        empleadoNombre: empleadoAsignado.nombre,
        valorFijo: valorFijoEmpleado,
        fechaTurno: ingresoFecha,
        horaEntrada: ingresoHoraEntrada,
        horaSalida: ingresoHoraSalida,
        esAdicional: ingresoAdicional,
        recurrencia: esRecurrente,
        observacion: ingresoAdicional ? ingresoObservacion.trim() : '',
        evidenciaBase64: ingresoAdicional ? evidenciaBase64 : '',
        evidenciaMimeType: ingresoAdicional && ingresoEvidencia ? String(ingresoEvidencia.type || '').trim() : '',
        evidenciaNombreArchivo: ingresoAdicional && ingresoEvidencia ? String(ingresoEvidencia.name || '').trim() : '',
        aprobado: true,
      });

      const registro = response?.registro;
      const nuevoHorario: HorarioRegistrado = {
        id: String(registro?.id || `${centro.centroCostoId}-${empleadoAsignado.cedula}-${ingresoFecha}`),
        centro: composeCentroDisplay(
          String(registro?.centroCostoId || centro.centroCostoId),
          String(registro?.centroCostoNombre || centro.centroCostoNombre)
        ),
        empleado: String(registro?.empleadoNombre || empleadoAsignado.nombre),
        fecha: String(registro?.fechaTurno || ingresoFecha),
        horaEntrada: String(registro?.horaEntrada || ingresoHoraEntrada),
        horaSalida: String(registro?.horaSalida || ingresoHoraSalida),
        adicional: Boolean(registro?.esAdicional ?? ingresoAdicional),
        recurrencia: Boolean(registro?.recurrencia ?? esRecurrente),
        finRecurrencia: String(registro?.finRecurrencia || ''),
        observacion: String(registro?.observacion || (ingresoAdicional ? ingresoObservacion.trim() : '')),
        evidenciaBase64: String(registro?.evidenciaBase64 || (ingresoAdicional ? evidenciaBase64 : '')),
        evidenciaMimeType: String(registro?.evidenciaMimeType || (ingresoAdicional && ingresoEvidencia ? ingresoEvidencia.type : '')),
        evidenciaNombreArchivo: String(registro?.evidenciaNombreArchivo || (ingresoAdicional && ingresoEvidencia ? ingresoEvidencia.name : '')),
        aprobado: registro?.aprobado === undefined ? true : Boolean(registro.aprobado),
      };

      setHorariosRegistrados((prev) => {
        const sinDuplicado = prev.filter((item) => item.id !== nuevoHorario.id);
        return [...sinDuplicado, nuevoHorario];
      });

      setShowSuccessHorario(true);
      setTimeout(() => setShowSuccessHorario(false), 3000);
      setIngresoFecha('');
      setIngresoHoraEntrada('');
      setIngresoHoraSalida('');
      setIngresoAdicional(false);
      setIngresoObservacion('');
      setIngresoEvidencia(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo guardar el horario en la base de datos.');
    } finally {
      setGuardandoHorario(false);
    }
  };

  const handleGuardarEmpleado = async () => {
    const valorEmpleado = empleadoBusqueda.trim();
    if (!gestionarCentro || !valorEmpleado || !valorFijo.trim()) {
      alert('Por favor selecciona un centro, un empleado activo y completa el valor fijo.');
      return;
    }

    const criterio = valorEmpleado.toLowerCase();
    const empleadoSeleccionado = empleadosActivos.find((emp) => `${emp.nombreCompleto} - ${emp.cedula}`.toLowerCase() === criterio)
      || empleadosActivos.find((emp) => emp.cedula.toLowerCase() === criterio)
      || empleadosActivos.find((emp) => emp.nombreCompleto.toLowerCase() === criterio);

    if (!empleadoSeleccionado) {
      alert('No se encontro el empleado seleccionado.');
      return;
    }

    const valorFijoNormalizado = Number(valorFijo.replace(',', '.').trim());
    if (!Number.isFinite(valorFijoNormalizado) || valorFijoNormalizado < 0) {
      alert('El valor fijo debe ser numerico y mayor o igual a 0.');
      return;
    }

    const centro = parseCentroCompuesto(gestionarCentro);
    if (!centro.centroCostoId) {
      alert('Selecciona un centro de costo valido.');
      return;
    }

    setGuardandoEmpleado(true);
    try {
      const response = await dbApi.valets.empleados.save<ValetEmpleadoSaveResponse>({
        centroCostoId: centro.centroCostoId,
        centroCostoNombre: centro.centroCostoNombre,
        empleadoCedula: empleadoSeleccionado.cedula,
        empleadoNombre: empleadoSeleccionado.nombreCompleto,
        valorFijo: valorFijoNormalizado,
      });

      const registro = response?.registro;
      const nuevoEmpleado: EmpleadoValet = {
        id: String(registro?.id || `${centro.centroCostoId}-${empleadoSeleccionado.cedula}`),
        centro: composeCentroDisplay(
          String(registro?.centroCostoId || centro.centroCostoId),
          String(registro?.centroCostoNombre || centro.centroCostoNombre)
        ),
        nombre: String(registro?.empleadoNombre || empleadoSeleccionado.nombreCompleto),
        valor: Number(registro?.valorFijo ?? valorFijoNormalizado).toFixed(2),
        cedula: String(registro?.empleadoCedula || empleadoSeleccionado.cedula),
      };

      setEmpleadosValet((prev) => {
        const sinDuplicado = prev.filter((item) => !(item.centro === nuevoEmpleado.centro && item.cedula === nuevoEmpleado.cedula));
        return [...sinDuplicado, nuevoEmpleado];
      });

      setShowSuccessGuardado(true);
      setTimeout(() => setShowSuccessGuardado(false), 3000);
      setShowGestionarEmpleadosModal(false);
      setEmpleadoBusqueda('');
      setValorFijo('');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo guardar el empleado en la base de datos.');
    } finally {
      setGuardandoEmpleado(false);
    }
  };

  const handleEliminarEmpleado = async (empleado: EmpleadoValet) => {
    if (!empleado.cedula) {
      alert('No se puede eliminar este empleado porque no tiene cedula asociada.');
      return;
    }

    const centro = parseCentroCompuesto(empleado.centro);
    if (!centro.centroCostoId) {
      alert('No se pudo identificar el centro de costo para eliminar este registro.');
      return;
    }

    setEliminandoEmpleadoId(empleado.id);
    try {
      await dbApi.valets.empleados.delete(centro.centroCostoId, empleado.cedula);
      setEmpleadosValet((prev) => prev.filter((item) => item.id !== empleado.id));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo eliminar el empleado del centro de costo.');
    } finally {
      setEliminandoEmpleadoId('');
    }
  };

  const handleEliminarHorario = async (horario: HorarioRegistrado) => {
    const idNumerico = Number(String(horario.id || '').trim());
    if (!Number.isInteger(idNumerico) || idNumerico <= 0) {
      alert('No se pudo eliminar el horario porque su identificador no es valido.');
      return;
    }

    const fechaBase = parseFechaLocal(horario.fecha);
    if (!fechaBase) {
      alert('No se pudo interpretar la fecha del horario.');
      return;
    }

    const registroBase = horariosRegistrados.find((item) => item.id === horario.id);
    const fechaCreacionRecurrencia = parseFechaLocal(registroBase?.fecha || horario.fecha);
    const esOcurrenciaBase = Boolean(horario.recurrencia && fechaCreacionRecurrencia && formatFechaLocal(fechaCreacionRecurrencia) === horario.fecha);
    const mensajeConfirm = horario.recurrencia && !esOcurrenciaBase
      ? `Deseas cortar la recurrencia de ${horario.empleado} (${horario.horaEntrada} - ${horario.horaSalida}) hasta la semana anterior a ${horario.fecha}?`
      : horario.recurrencia
        ? `Deseas eliminar por completo el horario recurrente de ${horario.empleado} (${horario.horaEntrada} - ${horario.horaSalida})?`
        : `Deseas eliminar este horario de ${horario.empleado} (${horario.horaEntrada} - ${horario.horaSalida})?`;
    if (!window.confirm(mensajeConfirm)) return;

    try {
      if (horario.recurrencia && !esOcurrenciaBase) {
        const fechaFin = new Date(fechaBase);
        fechaFin.setDate(fechaFin.getDate() - 7);
        const fechaFinIso = formatFechaLocal(fechaFin);
        const response = await dbApi.valets.horarios.update<ValetHorarioSaveResponse>({
          id: idNumerico,
          finRecurrencia: fechaFinIso,
        });
        const registro = response?.registro;
        setHorariosRegistrados((prev) => prev.map((item) => (
          item.id === horario.id
            ? { ...item, finRecurrencia: String(registro?.finRecurrencia || fechaFinIso) }
            : item
        )));
        return;
      }

      await dbApi.valets.horarios.delete<ValetHorarioDeleteResponse>(String(idNumerico));
      setHorariosRegistrados((prev) => prev.filter((item) => item.id !== horario.id));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo eliminar el horario seleccionado.';

      if (message.toLowerCase().includes('no se encontro el horario solicitado')) {
        setHorariosRegistrados((prev) => prev.filter((item) => item.id !== horario.id));
        alert('Ese horario ya no existe en la base de datos. Se removio de la vista para sincronizar.');
        return;
      }

      if (message.toLowerCase() === 'not found') {
        alert('No se encontro la ruta DELETE de horarios en el backend. Reinicia el backend para cargar los ultimos cambios.');
        return;
      }

      alert(message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative w-full max-w-full">
      
      {/* MODAL: Gestionar empleados */}
      {showGestionarEmpleadosModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setShowGestionarEmpleadosModal(false)} />
          <div className="relative bg-white rounded-3xl w-full max-w-[500px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-6 flex justify-between items-start border-b border-slate-100">
              <div>
                <h3 className="font-black text-xl text-[#001F3F]">Gestionar empleados</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Centro: {gestionarCentro}</p>
              </div>
              <button onClick={() => setShowGestionarEmpleadosModal(false)} className="px-4 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                Cerrar
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1.5 block">Empleado activo</label>
                  <input
                    type="text"
                    list="valets-empleados-activos"
                    value={empleadoBusqueda}
                    onChange={(e) => setEmpleadoBusqueda(e.target.value)}
                    placeholder={loadingCatalogos ? 'Cargando empleados activos...' : 'Selecciona o escribe un empleado'}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-[#2563EB] transition-all shadow-sm placeholder:text-slate-400"
                  />
                  <datalist id="valets-empleados-activos">
                    {empleadosActivosFiltrados.map((emp) => (
                      <option key={emp.cedula} value={`${emp.nombreCompleto} - ${emp.cedula}`} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1.5 block">Valor fijo a pagar</label>
                  <input 
                    type="text" 
                    value={valorFijo}
                    onChange={(e) => setValorFijo(e.target.value)}
                    placeholder="0.00" 
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-[#2563EB] transition-all shadow-sm placeholder:text-slate-400" 
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-5 bg-white flex justify-end gap-3 border-t border-slate-100">
              <button 
                onClick={() => setShowGestionarEmpleadosModal(false)} 
                className="px-6 py-2.5 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button 
                disabled={guardandoEmpleado}
                className="px-6 py-2.5 rounded-xl bg-[#001F3F] text-white font-bold hover:bg-blue-900 transition-all text-sm shadow-md active:scale-95"
                onClick={() => {
                  void handleGuardarEmpleado();
                }}
              >
                {guardandoEmpleado ? 'Guardando...' : 'Guardar empleado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Detalles de adicionales */}
      {showDetallesModal && detalleEmpleado && (() => {
        const empAdicionales = horariosRegistrados.filter(h => 
          (h.adicional || esFechaDomingo(h.fecha)) && 
          h.empleado === detalleEmpleado.nombre && 
          h.centro === detalleEmpleado.centro
        );
        
        const toggleAprobado = (id: string) => {
          setHorariosRegistrados(prev => prev.map(h => h.id === id ? { ...h, aprobado: !h.aprobado } : h));
        };

        let totalCalculado = 0;
        const dias: Array<{ id: string; fecha: string; dia: string; horario: string; valor: string; aprobado: boolean; observacion: string; evidenciaBase64: string; evidenciaMimeType: string; evidenciaNombreArchivo: string }> = [];
        const domingosMap = new Map<string, { id: string; fecha: string; aprobado: boolean; horarios: string[] }>();
        
        empAdicionales.forEach(ev => {
          const d = new Date(`${ev.fecha}T12:00:00`);
          const isSunday = d.getDay() === 0;
          const dayName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][d.getDay()];
          const isAprobado = ev.aprobado !== false;
          
          if (isSunday && !ev.adicional) {
            const horario = `${ev.horaEntrada} - ${ev.horaSalida}`;
            if(!domingosMap.has(ev.fecha)) {
              domingosMap.set(ev.fecha, { id: ev.id, fecha: ev.fecha, aprobado: isAprobado, horarios: [horario] });
            } else {
              const existente = domingosMap.get(ev.fecha);
              if (existente && !existente.horarios.includes(horario)) {
                existente.horarios.push(horario);
              }
            }
          } else {
            const val = calcularValorStr(ev.horaEntrada, ev.horaSalida);
            dias.push({ 
              id: ev.id, 
              fecha: ev.fecha, 
              dia: dayName, 
              horario: `${ev.horaEntrada} - ${ev.horaSalida}`,
              valor: val,
              aprobado: isAprobado,
              observacion: String(ev.observacion || ''),
              evidenciaBase64: String(ev.evidenciaBase64 || ''),
              evidenciaMimeType: String(ev.evidenciaMimeType || ''),
              evidenciaNombreArchivo: String(ev.evidenciaNombreArchivo || ''),
            });
          }
        });
        const domingosUnicos = Array.from(domingosMap.values());

        dias.forEach((d: any) => { if (d.aprobado) totalCalculado += parseFloat(d.valor); });
        domingosUnicos.forEach((dom: any) => { if (dom.aprobado) totalCalculado += 10.00; });

        return (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setShowDetallesModal(false)} />
            <div className="relative bg-white rounded-3xl w-full max-w-[650px] max-h-[85vh] shadow-2xl overflow-x-hidden overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200">
              <div className="px-8 py-8 flex justify-between items-start">
                <div>
                  <h3 className="font-black text-[22px] text-[#1c2938] tracking-tight mb-2">Detalles de adicionales</h3>
                  <p className="text-[13px] text-slate-500">Empleado: {detalleEmpleado.nombre}</p>
                  <p className="text-[13px] text-slate-500">Centro: {detalleEmpleado.centro}</p>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <button onClick={() => setShowDetallesModal(false)} className="px-5 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
                    Cerrar
                  </button>
                  <div className="bg-[#F0F8FF] border border-[#2173B9]/20 px-4 py-2 rounded-lg text-right">
                    <span className="text-[11px] font-bold text-slate-500 uppercase block leading-none mb-1">Total Aprobado</span>
                    <span className="text-xl font-black text-[#2173B9]">{totalCalculado.toFixed(2)} $</span>
                  </div>
                </div>
              </div>
              
              <div className="px-8 pb-10 space-y-5">
                {/* Días adicionales Card */}
                <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/30 shadow-sm">
                  <div className="flex justify-between items-center mb-5">
                    <h4 className="font-bold text-[16px] text-[#1c2938]">Días adicionales</h4>
                  </div>
                  
                  {dias.length > 0 ? (
                    <div className="space-y-3">
                      {dias.map((d: any) => (
                        <div key={d.id} className="border border-slate-100 rounded-xl p-4 bg-white shadow-sm hover:border-slate-200 transition-colors space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 sm:gap-8 flex-1">
                              <span className="text-[13px] font-medium text-[#1c2938] shrink-0 w-20 sm:w-24">{d.fecha}</span>
                              <span className="font-bold text-[13px] sm:text-[14px] text-[#1c2938] shrink-0 w-20">{d.dia}</span>
                              <span className="text-[13px] sm:text-[14px] font-medium text-slate-600">{d.horario}</span>
                            </div>
                            <div className="flex items-center gap-3 sm:gap-4 shrink-0 pl-2">
                              <span className={`font-black text-[14px] sm:text-[15px] ${d.aprobado ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{d.valor} $</span>
                              <button 
                                onClick={() => toggleAprobado(d.id)}
                                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border-2 flex items-center justify-center shadow-inner transition-colors cursor-pointer ${d.aprobado ? 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}
                              >
                                {d.aprobado && <Check size={16} className="text-emerald-600" strokeWidth={3} />}
                              </button>
                            </div>
                          </div>
                          {(d.observacion || d.evidenciaBase64) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                              <div>
                                <div className="text-[11px] font-bold text-slate-500 uppercase mb-1">Observacion</div>
                                <div className="text-[13px] text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 min-h-[40px]">
                                  {d.observacion || 'Sin observacion'}
                                </div>
                              </div>
                              <div>
                                <div className="text-[11px] font-bold text-slate-500 uppercase mb-1">Evidencia</div>
                                {d.evidenciaBase64 ? (
                                  <div className="space-y-2">
                                    <img
                                      src={`data:${d.evidenciaMimeType || 'image/jpeg'};base64,${d.evidenciaBase64}`}
                                      alt="Evidencia adicional"
                                      className="w-full max-h-36 object-cover rounded-lg border border-slate-200"
                                    />
                                    {d.evidenciaNombreArchivo && (
                                      <div className="text-[11px] text-slate-500 truncate">{d.evidenciaNombreArchivo}</div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-[13px] text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">Sin imagen adjunta</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[13px] text-slate-400 py-3 font-medium">No hay días adicionales registrados.</div>
                  )}
                </div>

                {/* Domingos Card */}
                <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/30 shadow-sm">
                  <div className="flex justify-between items-center mb-5">
                    <h4 className="font-bold text-[16px] text-[#1c2938]">Domingos</h4>
                  </div>
                  
                  {domingosUnicos.length > 0 ? (
                    <div className="space-y-3">
                      {domingosUnicos.map((dom: any) => (
                        <div key={dom.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-4 sm:gap-8 flex-1">
                            <div className="px-4 py-1.5 border border-slate-200 rounded-xl text-[13px] font-medium text-[#1c2938] shadow-sm bg-white">
                              <div>{dom.fecha}</div>
                              <div className="text-[12px] font-medium text-slate-500 mt-1">
                                {Array.isArray(dom.horarios) && dom.horarios.length > 0 ? dom.horarios.join(' | ') : 'Sin horario registrado'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 sm:gap-4 shrink-0 pl-2">
                            <span className={`font-black text-[14px] sm:text-[15px] ${dom.aprobado ? 'text-slate-800' : 'text-slate-400 line-through'}`}>10.00 $</span>
                            <button 
                              onClick={() => toggleAprobado(dom.id)}
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border-2 flex items-center justify-center shadow-inner transition-colors cursor-pointer ${dom.aprobado ? 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}
                            >
                              {dom.aprobado && <Check size={16} className="text-emerald-600" strokeWidth={3} />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[13px] text-slate-400 py-2 font-medium">No hay domingos adicionales registrados.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="flex items-center gap-4 mb-2">
        <div className="flex bg-white rounded-xl border border-slate-200 p-1 shadow-sm w-fit">
          <button
            onClick={() => setActiveSubTab('ingreso')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeSubTab === 'ingreso' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Ingreso Horario
          </button>
          <button
            onClick={() => setActiveSubTab('gestionar')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeSubTab === 'gestionar' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Gestionar valet
          </button>
        </div>
      </div>

      {catalogosError && (
        <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-medium">
          Error al cargar catalogos n8n: {catalogosError}
        </div>
      )}

      {activeSubTab === 'ingreso' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 lg:p-8 shadow-sm animate-in fade-in duration-300">
          
          {showSuccessHorario && (
            <div className="mb-6 p-4 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl text-[#059669] text-sm font-medium animate-in fade-in">
              Horario guardado correctamente en la base de datos y agregado al calendario.
            </div>
          )}

          {loadingHorariosDb && (
            <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-sm font-medium animate-in fade-in">
              Cargando horarios planificados desde la base de datos...
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="text-[12px] font-medium text-slate-600 mb-2 block">Centro de costo</label>
              <div className="relative">
                <select 
                  className={`w-full pl-4 pr-10 py-2.5 border rounded-lg text-sm outline-none appearance-none text-slate-700 shadow-sm cursor-pointer transition-colors ${ingresoCentro ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200 focus:border-[#2563EB]'}`}
                  value={ingresoCentro}
                  onChange={(e) => {
                    setIngresoCentro(e.target.value);
                    setIngresoEmpleado('');
                  }}
                >
                  <option value="" disabled>{loadingCatalogos ? 'Cargando centros de costo...' : 'Selecciona un centro de costo'}</option>
                  {centrosCostoValet.map((centro) => (
                    <option key={centro.IDCENTROCOSTO} value={`${centro.IDCENTROCOSTO} - ${centro.CENTROCOSTO}`}>
                      {centro.IDCENTROCOSTO} - {centro.CENTROCOSTO}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              </div>
            </div>
            <div>
              <label className="text-[12px] font-medium text-slate-600 mb-2 block">Empleado</label>
              <div className="relative">
                <select 
                  className={`w-full pl-4 pr-10 py-2.5 border rounded-lg text-sm outline-none appearance-none text-slate-700 shadow-sm cursor-pointer transition-colors ${!ingresoCentro ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed' : 'border-slate-200 focus:border-[#2563EB] bg-white'}`}
                  disabled={!ingresoCentro}
                  value={ingresoEmpleado}
                  onChange={(e) => setIngresoEmpleado(e.target.value)}
                >
                  <option value="" disabled>
                    {!ingresoCentro ? 'Selecciona primero un centro de costo' : (empleadosParaIngreso.length === 0 ? 'No hay empleados en este centro' : 'Selecciona un empleado')}
                  </option>
                  {empleadosParaIngreso.map((emp, idx) => (
                    <option key={idx} value={emp.nombre}>{emp.nombre}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-100 p-5 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-6 mb-6 items-end">
            <div>
              <label className="text-[12px] font-medium text-slate-600 mb-2 block">Fecha</label>
              <input 
                type="date" 
                value={ingresoFecha}
                onChange={(e) => setIngresoFecha(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-[#2563EB] text-slate-700 shadow-sm cursor-pointer"
              />
            </div>
            <div>
              <label className="text-[12px] font-medium text-slate-600 mb-2 block">Hora de entrada</label>
              <input 
                type="time" 
                value={ingresoHoraEntrada}
                onChange={(e) => setIngresoHoraEntrada(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-[#2563EB] text-slate-700 shadow-sm cursor-pointer"
              />
            </div>
            <div>
              <label className="text-[12px] font-medium text-slate-600 mb-2 block">Hora de salida</label>
              <input 
                type="time" 
                value={ingresoHoraSalida}
                onChange={(e) => setIngresoHoraSalida(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-[#2563EB] text-slate-700 shadow-sm cursor-pointer"
              />
            </div>
            <div className="flex items-center pb-3">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${ingresoAdicional ? 'bg-[#F97316] border-[#F97316]' : 'border-slate-300 bg-white'}`}>
                  {ingresoAdicional && <Check size={14} className="text-white" strokeWidth={3} />}
                </div>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={ingresoAdicional}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIngresoAdicional(checked);
                    if (!checked) {
                      setIngresoObservacion('');
                      setIngresoEvidencia(null);
                    }
                  }}
                />
                <span className="text-[12px] font-bold text-slate-600 select-none">Adicional</span>
              </label>
            </div>
          </div>

          {ingresoAdicional && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 animate-in fade-in duration-200">
              <div>
                <label className="text-[12px] font-medium text-slate-700 mb-2 block">Observacion</label>
                <input
                  type="text"
                  value={ingresoObservacion}
                  onChange={(e) => setIngresoObservacion(e.target.value)}
                  placeholder="Describe brevemente el motivo del adicional"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-[#2563EB] text-slate-700 shadow-sm"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-slate-700 mb-2 block">Adjuntar evidencia</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setIngresoEvidencia(e.target.files?.[0] ?? null)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-[#2563EB] text-slate-700 shadow-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-slate-100 file:text-slate-700"
                />
                {ingresoEvidencia && (
                  <p className="mt-1 text-[11px] text-slate-500 truncate">Archivo: {ingresoEvidencia.name}</p>
                )}
              </div>
            </div>
          )}

          <div className="mb-10 flex">
            <button 
              disabled={guardandoHorario}
              onClick={() => {
                void handleGuardarHorario();
              }}
              className="px-8 py-2.5 bg-[#001F3F] text-white rounded-lg text-sm font-bold hover:bg-blue-900 transition-all shadow-sm active:scale-95"
            >
              {guardandoHorario ? 'Guardando...' : 'Guardar'}
            </button>
          </div>

          {/* CONTENEDOR DEL CALENDARIO */}
          <div className="pt-6 border-t border-slate-200 animate-in fade-in duration-500">
            <div className="flex flex-col xl:flex-row justify-between items-start mb-6 gap-6">
              {/* Controles Izquierdos */}
              <div className="space-y-4">
                <div className="flex items-center gap-1 border border-slate-200 rounded-full p-1 shadow-sm w-fit bg-white">
                  <button 
                    onClick={() => { setCalendarView('semana'); setCalendarOffset(0); }} 
                    className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors ${calendarView === 'semana' ? 'font-bold text-blue-600 border border-blue-200 bg-blue-50' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Semana
                  </button>
                  <button 
                    onClick={() => { setCalendarView('mes'); setCalendarOffset(0); }} 
                    className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors ${calendarView === 'mes' ? 'font-bold text-blue-600 border border-blue-200 bg-blue-50' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Mes
                  </button>
                </div>
                {/* Navegación de fecha */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCalendarOffset((o) => o - 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors text-sm font-bold"
                    title="Anterior"
                  >
                    ‹
                  </button>
                  {calendarOffset !== 0 && (
                    <button
                      onClick={() => setCalendarOffset(0)}
                      className="px-3 py-1 text-[11px] font-bold rounded-full border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                    >
                      Hoy
                    </button>
                  )}
                  <button
                    onClick={() => setCalendarOffset((o) => o + 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors text-sm font-bold"
                    title="Siguiente"
                  >
                    ›
                  </button>
                </div>
              </div>

              {/* Controles Derechos */}
              <div className="flex flex-col items-end gap-3 w-full xl:w-auto">
                <div className="flex flex-wrap md:flex-nowrap items-center gap-3 w-full xl:w-auto justify-end">
                  <div>
                    <label className="text-[10px] text-slate-400 mb-1 block">Estado</label>
                    <div className="relative">
                      <select 
                        value={filtroEstado}
                        onChange={(e) => setFiltroEstado(e.target.value)}
                        className="pl-3 pr-8 py-1.5 text-[11px] border border-slate-200 rounded-full outline-none text-slate-500 cursor-pointer appearance-none bg-white min-w-[140px] shadow-sm"
                      >
                        <option value="">Todos</option>
                        <option value="general">General</option>
                        <option value="adicionales">Adicionales</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={14} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 mb-1 block">Empleado</label>
                    <div className="relative">
                      <select
                        value={filtroEmpleadoCalendario}
                        onChange={(e) => setFiltroEmpleadoCalendario(e.target.value)}
                        className="pl-3 pr-8 py-1.5 text-[11px] border border-slate-200 rounded-full outline-none text-slate-500 cursor-pointer appearance-none bg-white min-w-[220px] shadow-sm"
                      >
                        <option value="">Todos</option>
                        {empleadosFiltroCalendario.map((empleado) => (
                          <option key={empleado} value={empleado}>{empleado}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={14} />
                    </div>
                  </div>
                </div>
                <h3 className="text-[17px] font-medium text-[#2173B9] capitalize">
                  {headerText}
                </h3>
              </div>
            </div>

            {/* VISTA MES */}
            {calendarView === 'mes' && (
              <div className="w-full overflow-x-auto rounded-xl">
                <div className="border-l border-t border-slate-200 bg-white grid grid-cols-7 min-w-[800px] animate-in fade-in duration-300">
                  {daysOfWeek.map((day, idx) => (
                    <div key={idx} className="p-3 border-r border-b border-slate-200 text-[#2173B9] text-sm capitalize">
                      {day}
                    </div>
                  ))}
                  
                  {currentCalendarGrid.map((dayObj, idx) => {
                    const eventosDia = dayObj.curr ? horariosCalendario.filter(h => {
                      if (!cumpleFiltrosCalendario(h)) return false;

                      const parts = h.fecha.split('-');
                      if(parts.length === 3) {
                        return parseInt(parts[2], 10) === dayObj.d && parseInt(parts[1], 10) === dayObj.m && parseInt(parts[0], 10) === dayObj.y;
                      }
                      return false;
                    }) : [];

                    return (
                      <div key={idx} className={`relative min-h-[140px] border-r border-b border-slate-200 p-1 flex flex-col ${dayObj.curr ? 'bg-white' : 'bg-slate-50/50'}`}>
                        {eventosDia.length > 0 && (
                          <div className="flex flex-col gap-1 mt-6 z-10">
                            {eventosDia.map((ev, eIdx) => {
                              const nombreCentro = ev.centro.split('-')[1]?.trim() || ev.centro;
                              const nombreCorto = ev.empleado.split(' ')[0] || ev.empleado;
                              const isAdic = ev.adicional;

                              return (
                                <div key={`${ev.id}-${eIdx}`} className={`relative flex items-center gap-1.5 text-[9px] font-medium bg-white border rounded p-1 pr-4 shadow-sm whitespace-nowrap overflow-hidden text-ellipsis w-full ${isAdic ? 'border-amber-200 text-amber-700' : 'border-slate-200 text-slate-600'}`}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void handleEliminarHorario(ev);
                                    }}
                                    className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-white/90 border border-slate-300 text-slate-500 hover:text-red-600 hover:border-red-300 leading-none flex items-center justify-center"
                                    title="Eliminar horario"
                                  >
                                    x
                                  </button>
                                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isAdic ? 'bg-amber-500' : 'bg-[#2173B9]'}`}></div>
                                  <span className={`font-bold shrink-0 ${isAdic ? 'text-amber-600' : 'text-[#2173B9]'}`}>{ev.horaEntrada}</span>
                                  <span className="truncate" title={`${nombreCentro} - ${ev.empleado}`}>{nombreCentro} - {nombreCorto}</span>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        <div className="absolute bottom-2 right-2 flex items-center justify-center pointer-events-none">
                          {dayObj.active ? (
                            <div className="w-6 h-6 flex items-center justify-center rounded-full border border-blue-400 text-[#2173B9] font-bold bg-white text-xs">
                              {dayObj.d}
                            </div>
                          ) : (
                            <span className={`text-xs ${dayObj.curr ? 'text-slate-600' : 'text-slate-400 font-light'}`}>
                              {dayObj.d}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* VISTA SEMANA */}
            {calendarView === 'semana' && (
              <div className="w-full overflow-x-auto rounded-xl">
                <div className="border border-slate-200 bg-white min-w-[800px] animate-in fade-in duration-300">
                  {/* Encabezados de días */}
                  <div className="flex border-b border-slate-200 bg-white">
                    <div className="w-16 shrink-0 border-r border-slate-200"></div>
                    {currentWeekDays.map(day => (
                      <div key={day.d} className={`flex-1 min-w-[120px] py-4 text-center border-r border-slate-200 last:border-r-0 ${day.active ? 'bg-[#F0F8FF]' : ''}`}>
                        <div className={`mx-auto flex items-center justify-center rounded-full text-lg ${day.active ? 'w-8 h-8 bg-[#2173B9] text-white font-bold' : 'text-slate-700'}`}>
                          {day.d}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 capitalize">{day.n}</div>
                      </div>
                    ))}
                  </div>

                  {/* Grid con flex: columna de horas + grid de días/bloques */}
                  <div className="flex h-[600px] overflow-y-auto custom-scrollbar">
                    {/* Columna izquierda: horas */}
                    <div className="w-16 shrink-0 border-r border-slate-200">
                      {hours.map(h => (
                        <div key={`hour-${h}`} className="h-24 border-b border-slate-100 p-3 text-right text-[11px] font-bold text-[#2173B9] flex items-start justify-end">
                          {h}:00
                        </div>
                      ))}
                    </div>

                    {/* Columna derecha: cuadrícula de días + bloques */}
                    <div className="flex-1 relative" style={{ position: 'relative' }}>
                      {/* Filas de horas como referencia */}
                      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, width: '100%', height: `${24 * 96}px` }}>
                        {hours.map(h => (
                          <div key={`hour-row-${h}`} className="flex border-b border-slate-100 h-24">
                            {currentWeekDays.map(day => (
                              <div key={`cell-${day.d}-${h}`} className={`flex-1 min-w-[120px] border-r border-slate-100 last:border-r-0 transition-colors ${day.active ? 'bg-[#F4F9FF]' : 'hover:bg-slate-50'}`}></div>
                            ))}
                          </div>
                        ))}
                      </div>

                      {/* Bloques de eventos posicionados absolutamente */}
                      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, width: '100%', height: `${24 * 96}px` }}>
                        {currentWeekDays.map((day, dayIdx) => {
                          const eventosDelDia = horariosCalendario.filter(ev => {
                            if (!cumpleFiltrosCalendario(ev)) return false;

                            const parts = ev.fecha.split('-');
                            if(parts.length === 3 && parseInt(parts[2], 10) === day.d && parseInt(parts[1], 10) === day.m && parseInt(parts[0], 10) === day.y) {
                              return true;
                            }
                            return false;
                          });

                          const bloques = calcularBloquesCalendario(eventosDelDia);
                          const pixelsPorMinuto = 96 / 60;

                          return bloques.map((bloque) => {
                            const nombreCentro = bloque.evento.centro.split('-')[1]?.trim() || bloque.evento.centro;
                            const nombreCorto = bloque.evento.empleado.split(' ')[0] || bloque.evento.empleado;
                            const isAdic = bloque.evento.adicional;
                            const alturaBloque = Math.max(32, bloque.duracionMin * pixelsPorMinuto);
                            const topPx = bloque.inicioMin * pixelsPorMinuto;
                            const anchoColumnaDia = 100 / currentWeekDays.length;
                            const anchoLane = anchoColumnaDia / bloque.lanesTotal;
                            const leftPercent = (dayIdx * anchoColumnaDia) + (bloque.lane * anchoLane);

                            return (
                              <div
                                key={bloque.id}
                                className={`absolute rounded-lg shadow-md overflow-hidden transition-all hover:shadow-lg hover:z-50 border flex flex-col justify-start p-1.5 text-[9px] font-medium ${isAdic ? 'border-amber-400/60 bg-amber-50/90 text-amber-700' : 'border-[#2173B9]/40 bg-[#E0F0FF]/90 text-slate-700'}`}
                                style={{
                                  top: `${topPx}px`,
                                  left: `${leftPercent}%`,
                                  width: `${anchoLane}%`,
                                  height: `${alturaBloque}px`,
                                  zIndex: 10,
                                }}
                                title={`${bloque.evento.horaEntrada}-${bloque.evento.horaSalida}: ${nombreCentro} - ${bloque.evento.empleado}`}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void handleEliminarHorario(bloque.evento);
                                  }}
                                  className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-white/90 border border-slate-300 text-slate-500 hover:text-red-600 hover:border-red-300 leading-none flex items-center justify-center"
                                  title="Eliminar horario"
                                >
                                  x
                                </button>
                                <div className="flex items-center gap-1 mb-0.5">
                                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isAdic ? 'bg-amber-500' : 'bg-[#2173B9]'}`}></div>
                                  <span className={`font-bold shrink-0 ${isAdic ? 'text-amber-600' : 'text-[#2173B9]'}`}>{bloque.evento.horaEntrada}</span>
                                </div>
                                <span className="truncate leading-tight">{nombreCentro}</span>
                                <span className="truncate leading-tight">{nombreCorto}</span>
                                {alturaBloque > 50 && (
                                  <span className="text-[8px] opacity-75 mt-0.5">{bloque.evento.horaSalida}</span>
                                )}
                              </div>
                            );
                          });
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'gestionar' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 lg:p-8 shadow-sm animate-in fade-in duration-300">
          
          {showSuccessGuardado && (
            <div className="mb-6 p-4 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl text-[#059669] text-sm font-medium animate-in fade-in">
              Empleado guardado correctamente en la base de datos.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="text-[12px] font-medium text-slate-600 mb-2 block">Centro de costo</label>
              <div className="relative">
                <select 
                  className={`w-full pl-4 pr-10 py-2.5 border rounded-lg text-sm outline-none appearance-none text-slate-700 shadow-sm cursor-pointer transition-colors ${gestionarCentro ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200 focus:border-[#2563EB]'}`}
                  value={gestionarCentro}
                  onChange={(e) => setGestionarCentro(e.target.value)}
                >
                  <option value="" disabled>{loadingCatalogos ? 'Cargando centros de costo...' : 'Escribe para buscar centro de costo'}</option>
                  {centrosCostoValet.map((centro) => (
                    <option key={centro.IDCENTROCOSTO} value={`${centro.IDCENTROCOSTO} - ${centro.CENTROCOSTO}`}>
                      {centro.IDCENTROCOSTO} - {centro.CENTROCOSTO}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              </div>
            </div>
          </div>

          {gestionarCentro ? (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Panel Izquierdo */}
              <div className="xl:col-span-4 border border-slate-200 rounded-xl p-6 bg-slate-50/50 flex flex-col justify-between min-h-[160px]">
                <div>
                  <h5 className="text-[11px] font-bold text-slate-400 mb-4 tracking-wide">Centro seleccionado</h5>
                  <h3 className="text-lg font-black text-slate-800 mb-4 break-words">{gestionarCentro}</h3>
                  <p className="text-[13px] text-slate-600 mb-2 font-medium">Empleados pertenecientes: <span className="font-black text-slate-800">{empleadosCentroGestion.length}</span></p>
                  
                  {centroAutorizadoList[gestionarCentro] && (
                    <p className="text-[13px] text-slate-600 mb-6 font-medium border-t border-slate-200 pt-3 animate-in fade-in duration-300">
                      Adicional: <span className="font-black text-emerald-600">{calcularTotalCentro(gestionarCentro).toFixed(2)} $</span>
                    </p>
                  )}
                </div>
                <div className={!centroAutorizadoList[gestionarCentro] ? 'mt-6' : ''}>
                  <button 
                    onClick={() => setShowGestionarEmpleadosModal(true)}
                    className="px-6 py-2.5 bg-[#001F3F] text-white font-bold rounded-lg text-sm hover:bg-blue-900 transition-colors shadow-sm active:scale-95"
                  >
                    Gestionar empleados
                  </button>
                </div>
              </div>
              
              {/* Panel Derecho */}
              <div className="xl:col-span-8 flex flex-col gap-4">
                <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col min-h-[160px] bg-white">
                  {loadingEmpleadosDb ? (
                    <div className="p-8 flex items-center justify-center flex-1 bg-white">
                      <p className="text-[13px] font-medium text-slate-400">Cargando empleados asignados...</p>
                    </div>
                  ) : empleadosCentroGestion.length > 0 ? (
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50/80 border-b border-slate-100">
                          <tr>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-600">Empleado</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-600 text-center">Valor fijo a pagar</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-600 text-center">Detalles</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-600 text-center">Eliminar</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {empleadosCentroGestion.map((emp, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="text-[12px] font-bold text-slate-700 uppercase max-w-[240px] leading-tight break-words">
                                  {emp.nombre}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center text-[13px] font-black text-slate-800">
                                ${emp.valor}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <button 
                                  onClick={() => {
                                    setDetalleEmpleado(emp);
                                    setShowDetallesModal(true);
                                  }}
                                  className="p-2 border border-slate-200 rounded-lg text-slate-400 hover:text-[#001F3F] hover:bg-slate-100 hover:border-slate-300 transition-colors shadow-sm bg-white mx-auto block"
                                >
                                  <Eye size={18} />
                                </button>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <button 
                                  disabled={eliminandoEmpleadoId === emp.id}
                                  onClick={() => {
                                    void handleEliminarEmpleado(emp);
                                  }}
                                  className="p-2 border border-slate-200 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors shadow-sm bg-white mx-auto block"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <>
                      <div className="bg-slate-50/80 border-b border-slate-200 p-4">
                        <div className="grid grid-cols-4 gap-2 text-center items-center">
                          <span className="text-[11px] font-bold text-slate-600">Empleado</span>
                          <span className="text-[11px] font-bold text-slate-600">Valor fijo a pagar</span>
                          <span className="text-[11px] font-bold text-slate-600">Detalles</span>
                          <span className="text-[11px] font-bold text-slate-600">Eliminar</span>
                        </div>
                      </div>
                      <div className="p-8 flex items-center justify-center flex-1 bg-white">
                        <p className="text-[13px] font-medium text-slate-400">Empleados no asignados</p>
                      </div>
                    </>
                  )}
                </div>

                {empleadosCentroGestion.length > 0 && (
                  <div className="flex justify-end animate-in fade-in duration-300">
                    <button 
                      onClick={() => setCentroAutorizadoList(prev => ({...prev, [gestionarCentro]: true}))}
                      className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-lg text-sm hover:bg-emerald-700 transition-colors shadow-sm active:scale-95 flex items-center gap-2"
                    >
                      <CheckCircle2 size={16} strokeWidth={2.5} />
                      Autorizar Adicionales
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg p-5 text-[13px] font-medium text-slate-500 bg-slate-50/50">
              Selecciona un centro de costo para ver los detalles de valet.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ValetsFijosView;
