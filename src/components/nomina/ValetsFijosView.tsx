import { useEffect, useMemo, useState } from 'react';
import {
  Banknote,
  Building,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  CreditCard,
  FileText,
  FileUp,
  Image,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Save,
  Settings2,
  Trash2,
  Unlock,
  User,
  Users,
  X,
} from 'lucide-react';
import { dbApi } from '../../services/dbApi';
import { ListarValetsFijos, getNominaEmployeesActive, type NominaCostCenter } from '../../services/n8nApi';
import type { EmpleadoNominaApiItem } from '../../types/nomina';

type SubTabValet = 'historial' | 'gestionar';
type EstadoDia = 'Normal' | 'Adicional' | 'Domingo' | 'Domingo Adicional' | 'Libre';

interface DiaRegistro {
  id: string;
  parqueadero: string;
  estadoDia: EstadoDia;
  horaEntrada: string;
  horaSalida: string;
  aprobado: boolean | null;
  respaldoNombre?: string;
}

interface HorarioValetRow {
  id: string;
  empleado: string;
  ci: string;
  periodo: string;
  codCC: string;
  centro: string;
  estado: 'creado' | 'pendiente' | 'procesado';
  diasRegistro: Record<string, DiaRegistro[]>;
}

interface EmpleadoCatalogo {
  nombre: string;
  ci: string;
  centro: string;
  codCC: string;
}

interface SemanaPeriodo {
  semNum: number;
  wkNum: number;
  start: Date;
  end: Date;
  dias: Array<{ fecha: string; diaNombre: string; diaSemana: number }>;
}

interface CostosConfig {
  Normal: { horas: string; valor: string };
  Adicional: { horas: string; valor: string };
  Domingo: { horas: string; valor: string };
  'Domingo Adicional': { horas: string; valor: string };
}

interface ValetEmpleadoDbItem {
  id: string;
  centroCostoId: string;
  centroCostoNombre: string;
  empleadoCedula: string;
  empleadoNombre: string;
  valorFijo: number;
}

interface ValetHorarioDbItem {
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
  observacion?: string;
}

interface ValetCentroDbItem {
  centroCostoId: string;
  centroCostoNombre: string;
  activo: boolean;
}

interface ValetConfiguracionDbItem {
  centroCostoId: string;
  horasNormalLimite: number;
  valorNormal: number;
  valorAdicional: number;
  valorDomingo: number;
  valorDomingoAdicional: number;
}

interface ValetHorarioMeta {
  estadoDia?: EstadoDia;
  parqueadero?: string;
  respaldoNombre?: string;
}

const composeCentroDisplay = (centroCostoId: string, centroCostoNombre: string): string => {
  const id = String(centroCostoId || '').trim();
  const nombre = String(centroCostoNombre || '').trim();
  if (id && nombre) return `${id} - ${nombre}`;
  return id || nombre;
};

const parseCentroCompuesto = (valor: string): { centroCostoId: string; centroCostoNombre: string } => {
  const raw = String(valor || '').trim();
  const match = raw.match(/^([^\-]+?)\s*-\s*(.+)$/);
  if (!match) return { centroCostoId: '', centroCostoNombre: raw };
  return {
    centroCostoId: String(match[1] || '').trim(),
    centroCostoNombre: String(match[2] || '').trim(),
  };
};

const calcHoras = (ent: string, sal: string): number => {
  if (!ent || !sal) return 0;
  const [h1, m1] = ent.split(':').map(Number);
  const [h2, m2] = sal.split(':').map(Number);
  let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (diff < 0) diff += 24 * 60;
  return diff / 60;
};

const getParqName = (c: string): string => {
  const parts = String(c || '').split('-');
  return parts.length > 1 ? parts.slice(1).join('-').trim() : c;
};

const getSemanasPeriodo = (periodo: string): SemanaPeriodo[] => {
  const [y, m] = periodo.split('-').map(Number);
  const firstDay = new Date(y, m - 1, 1);
  const lastDay = new Date(y, m, 0);
  const semanas: SemanaPeriodo[] = [];

  const cursor = new Date(firstDay);
  const dow = cursor.getDay();
  cursor.setDate(cursor.getDate() - (dow === 0 ? 6 : dow - 1));

  let semNum = 1;
  while (cursor <= lastDay) {
    const start = new Date(cursor);
    const end = new Date(cursor);
    end.setDate(end.getDate() + 6);

    const dias: SemanaPeriodo['dias'] = [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(cursor);
      d.setDate(d.getDate() + i);
      const names = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
      dias.push({
        fecha: d.toISOString().slice(0, 10),
        diaNombre: names[d.getDay()],
        diaSemana: d.getDay(),
      });
    }

    const jan4 = new Date(start.getFullYear(), 0, 4);
    const wkNum = Math.ceil(((start.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7);

    semanas.push({ semNum, wkNum, start, end, dias });
    cursor.setDate(cursor.getDate() + 7);
    semNum += 1;
  }

  return semanas;
};

const fmtFecha = (fechaIso: string): string => {
  const dt = new Date(`${fechaIso}T12:00:00`);
  return dt.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' });
};

const parseHorarioMeta = (raw: string): ValetHorarioMeta => {
  const text = String(raw || '').trim();
  if (!text) return {};

  try {
    const parsed = JSON.parse(text) as ValetHorarioMeta;
    return {
      estadoDia: parsed.estadoDia,
      parqueadero: parsed.parqueadero,
      respaldoNombre: parsed.respaldoNombre,
    };
  } catch {
    return {};
  }
};

const serializeHorarioMeta = (meta: ValetHorarioMeta): string => {
  return JSON.stringify({
    estadoDia: meta.estadoDia || 'Normal',
    parqueadero: meta.parqueadero || '',
    respaldoNombre: meta.respaldoNombre || '',
  });
};

const DEFAULT_COSTOS_CONFIG: CostosConfig = {
  Normal: { horas: '40', valor: '3.50' },
  Adicional: { horas: '', valor: '3.00' },
  Domingo: { horas: '', valor: '10.00' },
  'Domingo Adicional': { horas: '', valor: '15.00' },
};

const createDefaultCostosConfig = (): CostosConfig => ({
  Normal: { ...DEFAULT_COSTOS_CONFIG.Normal },
  Adicional: { ...DEFAULT_COSTOS_CONFIG.Adicional },
  Domingo: { ...DEFAULT_COSTOS_CONFIG.Domingo },
  'Domingo Adicional': { ...DEFAULT_COSTOS_CONFIG['Domingo Adicional'] },
});

const normalizeCostosConfig = (config?: Partial<CostosConfig>): CostosConfig => {
  const base = createDefaultCostosConfig();
  if (!config) return base;

  return {
    Normal: {
      horas: String(config.Normal?.horas ?? base.Normal.horas),
      valor: String(config.Normal?.valor ?? base.Normal.valor),
    },
    Adicional: {
      horas: String(config.Adicional?.horas ?? base.Adicional.horas),
      valor: String(config.Adicional?.valor ?? base.Adicional.valor),
    },
    Domingo: {
      horas: String(config.Domingo?.horas ?? base.Domingo.horas),
      valor: String(config.Domingo?.valor ?? base.Domingo.valor),
    },
    'Domingo Adicional': {
      horas: String(config['Domingo Adicional']?.horas ?? base['Domingo Adicional'].horas),
      valor: String(config['Domingo Adicional']?.valor ?? base['Domingo Adicional'].valor),
    },
  };
};

interface SeleccionarEmpleadoModalProps {
  periodo: string;
  centrosValet: string[];
  empleados: EmpleadoCatalogo[];
  onClose: () => void;
  onSeleccionar: (empleado: EmpleadoCatalogo) => void | Promise<void>;
}

const SeleccionarEmpleadoModal = ({ periodo, centrosValet, empleados, onClose, onSeleccionar }: SeleccionarEmpleadoModalProps) => {
  const [nombre, setNombre] = useState('');
  const [ci, setCi] = useState('');
  const [centro, setCentro] = useState('');

  const empleadosFiltrados = useMemo(() => {
    const query = nombre.trim().toLowerCase();
    if (!query) return empleados;
    return empleados.filter((emp) => emp.nombre.toLowerCase().includes(query) || emp.ci.includes(query));
  }, [empleados, nombre]);

  const seleccionarEmpleadoPorLinea = (linea: string) => {
    const valor = String(linea || '').trim().toLowerCase();
    const encontrado = empleados.find((emp) => `${emp.nombre} - ${emp.ci}`.toLowerCase() === valor)
      || empleados.find((emp) => emp.ci.toLowerCase() === valor)
      || empleados.find((emp) => emp.nombre.toLowerCase() === valor);

    if (encontrado) {
      setNombre(encontrado.nombre);
      setCi(encontrado.ci);
      setCentro(encontrado.centro);
    }
  };

  const empleadoResuelto = useMemo(() => {
    if (!nombre.trim()) return null;

    const nombreNorm = nombre.trim().toLowerCase();
    const centroNorm = centro.trim().toLowerCase();

    const porCi = ci.trim()
      ? empleados.find((emp) => emp.ci.trim().toLowerCase() === ci.trim().toLowerCase())
      : null;

    if (porCi) return porCi;

    if (centroNorm) {
      const porNombreCentro = empleados.find((emp) => emp.nombre.trim().toLowerCase() === nombreNorm
        && emp.centro.trim().toLowerCase() === centroNorm);
      if (porNombreCentro) return porNombreCentro;
    }

    return empleados.find((emp) => emp.nombre.trim().toLowerCase() === nombreNorm) || null;
  }, [centro, ci, empleados, nombre]);

  const puedeContinuar = Boolean(nombre && centro && empleadoResuelto?.ci);

  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[500px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-8 py-6">
          <h3 className="text-[17px] font-bold text-slate-800">Anadir nuevo empleado al periodo {periodo}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-8 py-6">
          <div>
            <label className="mb-1 block text-[13px] font-bold text-slate-700">Nombre completo</label>
            <input
              type="text"
              list="empleados-valet-catalogo"
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                seleccionarEmpleadoPorLinea(e.target.value);
              }}
              placeholder="Ej. JUAN PABLO ALVAREZ"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] text-slate-700 shadow-sm outline-none transition-all focus:border-[#001F3F]"
            />
            <datalist id="empleados-valet-catalogo">
              {empleadosFiltrados.map((emp) => (
                <option key={emp.ci} value={`${emp.nombre} - ${emp.ci}`} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="mb-1 block text-[13px] font-bold text-slate-700">Centro de Costo (Valet)</label>
            <div className="relative">
              <select
                value={centro}
                onChange={(e) => setCentro(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] text-slate-700 shadow-sm outline-none transition-all focus:border-[#001F3F]"
              >
                <option value="">-- Seleccione un valet --</option>
                {centrosValet.map((v, i) => (
                  <option key={`${v}-${i}`} value={v}>{v}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-8 py-5">
          <button
            onClick={() => {
              if (!puedeContinuar) return;
              if (!empleadoResuelto) return;
              const centroParseado = parseCentroCompuesto(centro);
              onSeleccionar({
                nombre: empleadoResuelto.nombre,
                ci: empleadoResuelto.ci,
                centro: centro.trim(),
                codCC: centroParseado.centroCostoId || empleadoResuelto.codCC || '00000000',
              });
            }}
            disabled={!puedeContinuar}
            className={`rounded-xl px-8 py-2.5 text-[13px] font-bold shadow-md transition-all ${
              puedeContinuar
                ? 'bg-[#001F3F] text-white hover:bg-blue-900 active:scale-95'
                : 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
            }`}
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
};

interface RegistroAsistenciaModalProps {
  empleadoSel: EmpleadoCatalogo;
  periodo: string;
  registroRow: HorarioValetRow;
  costosConfig: CostosConfig;
  centrosValet: string[];
  onClose: () => void;
  onGuardar: (nuevosDias: Record<string, DiaRegistro[]>) => void | Promise<void>;
}

const RegistroAsistenciaModal = ({ empleadoSel, periodo, registroRow, costosConfig, centrosValet, onClose, onGuardar }: RegistroAsistenciaModalProps) => {
  const semanas = useMemo(() => getSemanasPeriodo(periodo), [periodo]);
  const [activeSem, setActiveSem] = useState(0);
  const [saved, setSaved] = useState(true);
  const [filtroTipoDia, setFiltroTipoDia] = useState<'todos' | EstadoDia>('todos');
  const [filtroEstadoAdicional, setFiltroEstadoAdicional] = useState<'todos' | 'pendiente' | 'aprobado' | 'rechazado'>('todos');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [uploadName, setUploadName] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string>>(new Set());

  const initRows = (): Record<string, DiaRegistro[]> => {
    const rows: Record<string, DiaRegistro[]> = {};
    semanas.forEach((semana) => {
      semana.dias.forEach((dia) => {
        if (registroRow?.diasRegistro?.[dia.fecha]) {
          rows[dia.fecha] = registroRow.diasRegistro[dia.fecha];
        } else {
          rows[dia.fecha] = [{
            id: `${dia.fecha}-0`,
            parqueadero: empleadoSel.centro || '',
            estadoDia: 'Libre',
            horaEntrada: '00:00',
            horaSalida: '00:00',
            aprobado: true,
          }];
        }
      });
    });
    return rows;
  };

  const [rows, setRows] = useState<Record<string, DiaRegistro[]>>(initRows);

  const getEstadoAprobacion = (registro: DiaRegistro): 'pendiente' | 'aprobado' | 'rechazado' => {
    if (registro.aprobado === true) return 'aprobado';
    if (registro.aprobado === false) return 'rechazado';
    return 'pendiente';
  };

  const updateRow = (fecha: string, index: number, field: keyof DiaRegistro, val: string | boolean | null) => {
    setRows((prev) => {
      const newDayRows = [...(prev[fecha] || [])];
      const curr = newDayRows[index];
      if (!curr) return prev;
      const updated = { ...curr, [field]: val } as DiaRegistro;

      if (field === 'estadoDia') {
        const nuevoEstado = val as EstadoDia;
        if (nuevoEstado === 'Libre') {
          updated.aprobado = true;
        } else {
          updated.aprobado = null;
        }
      }

      newDayRows[index] = updated;
      return { ...prev, [fecha]: newDayRows };
    });
  };

  const duplicateRow = (fecha: string, indexToCopy: number) => {
    setRows((prev) => {
      const newDayRows = [...(prev[fecha] || [])];
      const rowToCopy = newDayRows[indexToCopy];
      if (!rowToCopy) return prev;
      newDayRows.push({
        ...rowToCopy,
        id: `${fecha}-${Date.now()}`,
        estadoDia: 'Adicional',
        horaEntrada: '00:00',
        horaSalida: '00:00',
        aprobado: null,
      });
      return { ...prev, [fecha]: newDayRows };
    });
  };

  const deleteRow = (fecha: string, index: number) => {
    setRows((prev) => {
      const newDayRows = [...(prev[fecha] || [])];
      if (newDayRows.length <= 1) {
        newDayRows[0] = {
          ...newDayRows[0],
          estadoDia: 'Libre',
          horaEntrada: '00:00',
          horaSalida: '00:00',
          aprobado: true,
        };
      } else {
        newDayRows.splice(index, 1);
      }
      return { ...prev, [fecha]: newDayRows };
    });
  };

  const calcValor = (horas: number, tipo: EstadoDia): number => {
    if (tipo === 'Libre') return 0;
    const conf = costosConfig[tipo as keyof CostosConfig];
    if (!conf) return 0;
    if (tipo === 'Domingo') return Number.parseFloat(conf.valor) || 0;
    return horas * (Number.parseFloat(conf.valor) || 0);
  };

  const sem = semanas[activeSem];
  const ESTADOS_DIA: EstadoDia[] = ['Normal', 'Adicional', 'Domingo', 'Domingo Adicional', 'Libre'];

  const shouldShowRowByFilters = (registro: DiaRegistro): boolean => {
    if (filtroTipoDia !== 'todos' && registro.estadoDia !== filtroTipoDia) return false;

    if (filtroEstadoAdicional !== 'todos') {
      const esAdicional = registro.estadoDia === 'Adicional' || registro.estadoDia === 'Domingo Adicional';
      if (!esAdicional) return false;
      return getEstadoAprobacion(registro) === filtroEstadoAdicional;
    }

    return true;
  };

  const handleGuardar = () => {
    const diasToSave: Record<string, DiaRegistro[]> = {};
    semanas.forEach((s) => {
      s.dias.forEach((d) => {
        const dayRows = rows[d.fecha] || [];
        const validRows = dayRows.filter((r) => r.estadoDia !== 'Libre');
        if (validRows.length > 0) {
          diasToSave[d.fecha] = validRows;
        }
      });
    });
    void onGuardar(diasToSave);
    setSaved(true);
  };

  const handleSimUpload = () => {
    setUploadStatus('loading');
    setUploadName('documento_soporte.png');
    setTimeout(() => setUploadStatus('done'), 1800);
  };

  const getRowSelectionKey = (fecha: string, row: DiaRegistro): string => `${fecha}::${row.id}`;

  const visibleRowsMeta = useMemo(() => {
    return sem.dias.flatMap((d) => {
      const dayRows = rows[d.fecha] || [];
      return dayRows
        .map((row, rowIndex) => ({ fecha: d.fecha, row, rowIndex }))
        .filter(({ row }) => shouldShowRowByFilters(row) && row.estadoDia !== 'Libre');
    });
  }, [rows, sem.dias, filtroTipoDia, filtroEstadoAdicional]);

  const visibleRowSelectionKeys = useMemo(() => {
    return visibleRowsMeta.map(({ fecha, row }) => getRowSelectionKey(fecha, row));
  }, [visibleRowsMeta]);

  const allVisibleSelected = visibleRowSelectionKeys.length > 0
    && visibleRowSelectionKeys.every((key) => selectedRowKeys.has(key));

  const selectedVisibleRowsMeta = useMemo(() => {
    return visibleRowsMeta.filter(({ fecha, row }) => selectedRowKeys.has(getRowSelectionKey(fecha, row)));
  }, [selectedRowKeys, visibleRowsMeta]);

  const toggleSelectVisible = (checked: boolean) => {
    setSelectedRowKeys((prev) => {
      const next = new Set(prev);
      visibleRowSelectionKeys.forEach((key) => {
        if (checked) {
          next.add(key);
        } else {
          next.delete(key);
        }
      });
      return next;
    });
  };

  const toggleSelectRow = (fecha: string, row: DiaRegistro, checked: boolean) => {
    const key = getRowSelectionKey(fecha, row);
    setSelectedRowKeys((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const applyEstadoToSelected = (aprobar: boolean) => {
    const keys = new Set(selectedVisibleRowsMeta.map(({ fecha, row }) => getRowSelectionKey(fecha, row)));
    if (keys.size === 0) return;

    setRows((prev) => {
      const next = { ...prev };
      visibleRowsMeta.forEach(({ fecha, row, rowIndex }) => {
        const key = getRowSelectionKey(fecha, row);
        if (!keys.has(key)) return;

        const dayRows = [...(next[fecha] || [])];
        const target = dayRows[rowIndex];
        if (!target || target.estadoDia === 'Libre') return;
        dayRows[rowIndex] = { ...target, aprobado: aprobar };
        next[fecha] = dayRows;
      });
      return next;
    });

    setSelectedRowKeys(new Set());
  };

  useEffect(() => {
    if (selectedRowKeys.size === 0) return;

    const validKeys = new Set(visibleRowSelectionKeys);
    setSelectedRowKeys((prev) => {
      let changed = false;
      const next = new Set<string>();
      prev.forEach((key) => {
        if (validKeys.has(key)) {
          next.add(key);
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [selectedRowKeys.size, visibleRowSelectionKeys]);

  const hasSelectedRows = selectedVisibleRowsMeta.length > 0;

  const canApproveSelected = hasSelectedRows && selectedVisibleRowsMeta.some(({ row }) => row.aprobado !== true);
  const canRejectSelected = hasSelectedRows && selectedVisibleRowsMeta.some(({ row }) => row.aprobado !== false);

  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto p-2 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative my-2 flex h-[calc(100vh-1rem)] w-full max-w-[1280px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:my-4 sm:h-[calc(100vh-2rem)]">
        <div className="shrink-0 flex items-center justify-between border-b border-slate-100 px-8 py-5">
          <h3 className="text-[15px] font-bold text-slate-800">Registro de asistencia del periodo: <span className="text-slate-600">{periodo}</span></h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
        </div>

        <div className="shrink-0 flex gap-0 overflow-x-auto border-b border-slate-200">
          {semanas.map((s, i) => (
            <button
              key={`${s.semNum}-${s.wkNum}`}
              onClick={() => setActiveSem(i)}
              className={`whitespace-nowrap border-b-2 px-5 py-3 text-[12px] font-bold transition-all ${
                activeSem === i ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              SEMANA {s.semNum} ({s.wkNum})
            </button>
          ))}
        </div>

        <div className="shrink-0 space-y-1 border-b border-slate-100 bg-slate-50/40 px-8 py-4">
          <p className="text-[12px] text-slate-600"><span className="text-[11px] font-black uppercase tracking-wider text-slate-800">Nombre: </span>{empleadoSel.nombre}</p>
          <p className="text-[12px] text-slate-600">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-800">Desde: </span>{fmtFecha(sem.start.toISOString().slice(0, 10))}
            <span className="ml-4 text-[11px] font-black uppercase tracking-wider text-slate-800">Hasta: </span>{fmtFecha(sem.end.toISOString().slice(0, 10))}
          </p>
        </div>

        <div className="shrink-0 grid grid-cols-1 gap-3 border-b border-slate-100 bg-white px-8 py-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Tipo de dia</label>
            <div className="relative">
              <select
                value={filtroTipoDia}
                onChange={(e) => setFiltroTipoDia(e.target.value as 'todos' | EstadoDia)}
                className="w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-[12px] text-slate-700 outline-none focus:border-blue-400"
              >
                <option value="todos">Todos</option>
                {ESTADOS_DIA.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Estado de adicionales</label>
            <div className="relative">
              <select
                value={filtroEstadoAdicional}
                onChange={(e) => setFiltroEstadoAdicional(e.target.value as 'todos' | 'pendiente' | 'aprobado' | 'rechazado')}
                className="w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-[12px] text-slate-700 outline-none focus:border-blue-400"
              >
                <option value="todos">Todos</option>
                <option value="pendiente">Pendientes</option>
                <option value="aprobado">Aprobados</option>
                <option value="rechazado">Rechazados</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            </div>
          </div>
        </div>

        {saved ? (
          <div className="min-h-0 flex-1 overflow-y-scroll p-0 [scrollbar-gutter:stable]">
            <div className="overflow-x-auto border-b border-slate-100">
              <table className="w-full min-w-[1100px] text-left">
                <thead className="sticky top-0 z-10 border-b border-slate-100 bg-white">
                  <tr>
                    {['DIA', 'PARQUEADERO TRABAJADO', 'E. DIA', 'INGRESO', 'SALIDA', 'ESTADO', 'HORAS', 'VALOR ($)', 'ACCIONES'].map((h) => (
                      <th key={h} className="whitespace-nowrap px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 first:text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sem.dias.map((d, i) => {
                    const dayRows = rows[d.fecha] || [{ id: `${d.fecha}-0`, parqueadero: '', estadoDia: 'Libre', horaEntrada: '00:00', horaSalida: '00:00', aprobado: true }];
                    const visibleRows = dayRows.filter(shouldShowRowByFilters);
                    return visibleRows.map((r, rowIndex) => {
                      const horas = r.estadoDia !== 'Libre' ? calcHoras(r.horaEntrada, r.horaSalida) : 0;
                      const valor = r.estadoDia !== 'Libre' ? calcValor(horas, r.estadoDia) : 0;
                      const isFirst = rowIndex === 0;
                      const estadoAprobacion = getEstadoAprobacion(r);

                      return (
                        <tr key={`${i}-${rowIndex}`} className={r.estadoDia !== 'Libre' ? 'bg-blue-50/20 transition-colors hover:bg-blue-50/40' : 'transition-colors hover:bg-slate-50/60'}>
                          <td className="px-3 py-3">
                            {isFirst ? (
                              <div className="whitespace-nowrap text-[11px] font-medium leading-tight text-slate-700">
                                {d.diaNombre},<br />
                                <span className="text-[10px] text-slate-500">{d.fecha.split('-').reverse().join('/')}</span>
                              </div>
                            ) : null}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-center text-[11px] font-medium text-slate-700">{r.parqueadero || '—'}</td>
                          <td className="px-3 py-3 text-center text-[11px] text-slate-700">
                            {r.estadoDia !== 'Libre' ? (
                              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${r.estadoDia === 'Normal' ? 'bg-blue-100 text-blue-700' : r.estadoDia === 'Adicional' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {r.estadoDia}
                              </span>
                            ) : 'Libre'}
                          </td>
                          <td className="px-3 py-3 text-center font-mono text-[11px] text-slate-700">{r.horaEntrada}</td>
                          <td className="px-3 py-3 text-center font-mono text-[11px] text-slate-700">{r.horaSalida}</td>
                          <td className="px-3 py-3 text-center">
                            {r.estadoDia !== 'Libre' ? (
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                estadoAprobacion === 'aprobado'
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                                  : estadoAprobacion === 'rechazado'
                                    ? 'border-red-200 bg-red-50 text-red-600'
                                    : 'border-amber-200 bg-amber-50 text-amber-600'
                              }`}>
                                {estadoAprobacion === 'aprobado' ? <Check size={10} /> : estadoAprobacion === 'rechazado' ? <X size={10} /> : null}
                                {estadoAprobacion === 'aprobado' ? 'Aprobado' : estadoAprobacion === 'rechazado' ? 'Rechazado' : 'Pendiente'}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-3 py-3 text-center text-[11px] font-bold text-[#001F3F]">{r.estadoDia !== 'Libre' ? horas.toFixed(2) : '-'}</td>
                          <td className="px-3 py-3 text-center text-[11px] font-bold text-emerald-600">{r.estadoDia !== 'Libre' ? `$${valor.toFixed(2)}` : '-'}</td>
                          <td className="px-3 py-3 text-center">
                            {r.estadoDia !== 'Libre' ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  title="Eliminar registro"
                                  onClick={() => deleteRow(d.fecha, rowIndex)}
                                  className="rounded-lg border border-slate-200 p-1.5 text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end border-b border-slate-100 px-8 py-3">
              <button onClick={() => setSaved(false)} className="flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-2 text-[12px] font-bold text-[#2563EB] shadow-sm transition-colors hover:bg-blue-50">
                <Pencil size={13} />Editar Asistencia
              </button>
            </div>

            <div className="space-y-4 px-8 py-6">
              <div className="flex items-start gap-5">
                <div
                  onClick={handleSimUpload}
                  className={`min-h-[140px] w-64 cursor-pointer rounded-xl border-2 border-dashed transition-all ${
                    uploadStatus === 'done' ? 'border-emerald-400 bg-emerald-50' : uploadStatus === 'loading' ? 'border-blue-300 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/30'
                  } flex flex-col items-center justify-center gap-3`}
                >
                  {uploadStatus === 'loading' ? (
                    <>
                      <Loader2 size={28} className="animate-spin text-blue-500" />
                      <span className="text-[11px] font-medium text-blue-500">Subiendo archivo...</span>
                    </>
                  ) : uploadStatus === 'done' ? (
                    <>
                      <div className="rounded-full bg-emerald-100 p-2.5"><Check size={20} className="text-emerald-600" /></div>
                      <span className="text-[12px] font-bold text-emerald-600">Archivo cargado</span>
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-500">{uploadName}</span>
                    </>
                  ) : (
                    <>
                      <div className="rounded-lg bg-slate-50 p-2.5"><FileUp size={26} className="text-blue-500" /></div>
                      <span className="px-4 text-center text-[11px] font-medium leading-snug text-slate-500">Arrastra y suelta aqui el archivo para cargar</span>
                    </>
                  )}
                </div>
                <div className="flex flex-1 items-start pt-4"><p className="text-[12px] leading-relaxed text-slate-400">Seleccione un archivo con el documento de soporte (jpg, png, pdf)</p></div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-scroll [scrollbar-gutter:stable]">
              <table className="w-full min-w-[1100px] text-left">
                <thead className="sticky top-0 z-10 border-b border-slate-100 bg-white">
                  <tr>
                    <th className="w-24 px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <label className="group flex cursor-pointer items-center justify-center gap-2">
                        <div className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${allVisibleSelected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 bg-white group-hover:border-emerald-400'}`}>
                          {allVisibleSelected ? <Check size={12} className="text-white" strokeWidth={3} /> : null}
                        </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={allVisibleSelected}
                          onChange={(e) => toggleSelectVisible(e.target.checked)}
                          disabled={visibleRowsMeta.length === 0}
                        />
                      </label>
                    </th>
                    <th className="w-32 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">DIA</th>
                    <th className="w-48 px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">PARQUEADERO TRABAJADO</th>
                    <th className="w-36 px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">E. DIA</th>
                    <th className="w-24 px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">INGRESO</th>
                    <th className="w-24 px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">SALIDA</th>
                    <th className="w-24 px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">ESTADO</th>
                    <th className="w-20 px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">HORAS</th>
                    <th className="w-24 px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">VALOR ($)</th>
                    <th className="w-16 px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">RESPALDO</th>
                    <th className="w-12 px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sem.dias.map((d, i) => {
                    const dayRows = rows[d.fecha] || [{ id: `${d.fecha}-0`, parqueadero: '', estadoDia: 'Libre', horaEntrada: '00:00', horaSalida: '00:00', aprobado: true }];
                    const esFinde = d.diaSemana === 0 || d.diaSemana === 6;
                    const visibleRows = dayRows.filter(shouldShowRowByFilters);

                    return visibleRows.map((r, rowIndex) => {
                      const horasCalculadas = r.estadoDia !== 'Libre' ? calcHoras(r.horaEntrada, r.horaSalida) : 0;
                      const valorCalculado = r.estadoDia !== 'Libre' ? calcValor(horasCalculadas, r.estadoDia) : 0;
                      const isFirst = rowIndex === 0;
                      const estadoAprobacion = getEstadoAprobacion(r);

                      return (
                        <tr key={`${i}-${rowIndex}`} className={esFinde ? 'bg-slate-50/60 transition-colors' : 'transition-colors hover:bg-blue-50/20'}>
                          <td className="px-3 py-3 text-center">
                            {r.estadoDia !== 'Libre' ? (
                              <label className="group flex cursor-pointer items-center justify-center gap-2">
                                <div className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${selectedRowKeys.has(getRowSelectionKey(d.fecha, r)) ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 bg-white group-hover:border-emerald-400'}`}>
                                  {selectedRowKeys.has(getRowSelectionKey(d.fecha, r)) ? <Check size={12} className="text-white" strokeWidth={3} /> : null}
                                </div>
                                <input
                                  type="checkbox"
                                  className="hidden"
                                  checked={selectedRowKeys.has(getRowSelectionKey(d.fecha, r))}
                                  onChange={(e) => toggleSelectRow(d.fecha, r, e.target.checked)}
                                />
                              </label>
                            ) : null}
                          </td>

                          <td className="px-4 py-3">
                            {isFirst ? (
                              <div className={`text-[12px] font-medium leading-tight ${esFinde ? 'text-slate-400' : 'text-slate-700'}`}>
                                {d.diaNombre},<br />
                                <span className="text-[11px]">{d.fecha.split('-').reverse().join('/')}</span>
                              </div>
                            ) : null}
                          </td>

                          <td className="px-3 py-3">
                            <div className="relative">
                              <select
                                value={r.parqueadero}
                                onChange={(e) => updateRow(d.fecha, rowIndex, 'parqueadero', e.target.value)}
                                className="w-full cursor-pointer appearance-none truncate rounded border border-slate-200 bg-white py-1.5 pl-3 pr-7 text-[11px] text-slate-700 outline-none focus:border-blue-400"
                              >
                                <option value="">— Seleccionar —</option>
                                {centrosValet.map((p, pi) => <option key={`${p}-${pi}`} value={p}>{p}</option>)}
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                            </div>
                          </td>

                          <td className="px-3 py-3">
                            <div className="relative">
                              <select
                                value={r.estadoDia}
                                onChange={(e) => updateRow(d.fecha, rowIndex, 'estadoDia', e.target.value as EstadoDia)}
                                className="w-full cursor-pointer appearance-none rounded border border-slate-200 bg-white py-1.5 pl-3 pr-7 text-[11px] text-slate-700 outline-none focus:border-blue-400"
                              >
                                {ESTADOS_DIA.map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                            </div>
                          </td>

                          <td className="px-3 py-3">
                            <input
                              type="time"
                              disabled={r.estadoDia === 'Libre'}
                              value={r.horaEntrada}
                              onChange={(e) => updateRow(d.fecha, rowIndex, 'horaEntrada', e.target.value)}
                              className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-[12px] text-slate-700 outline-none focus:border-blue-400 disabled:bg-slate-50"
                            />
                          </td>

                          <td className="px-3 py-3">
                            <input
                              type="time"
                              disabled={r.estadoDia === 'Libre'}
                              value={r.horaSalida}
                              onChange={(e) => updateRow(d.fecha, rowIndex, 'horaSalida', e.target.value)}
                              className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-[12px] text-slate-700 outline-none focus:border-blue-400 disabled:bg-slate-50"
                            />
                          </td>

                          <td className="px-3 py-3 text-center">
                            {r.estadoDia !== 'Libre' ? (
                              <span className={`rounded border px-2 py-1 text-[10px] font-bold ${
                                estadoAprobacion === 'aprobado'
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                                  : estadoAprobacion === 'rechazado'
                                    ? 'border-red-200 bg-red-50 text-red-600'
                                    : 'border-amber-200 bg-amber-50 text-amber-600'
                              }`}>
                                {estadoAprobacion === 'aprobado' ? 'Aprobado' : estadoAprobacion === 'rechazado' ? 'Rechazado' : 'Pendiente'}
                              </span>
                            ) : '-'}
                          </td>

                          <td className="px-3 py-3 text-center text-[11px] font-bold text-slate-600">{r.estadoDia !== 'Libre' ? horasCalculadas.toFixed(2) : '-'}</td>
                          <td className="px-3 py-3 text-center text-[11px] font-bold text-blue-600">{r.estadoDia !== 'Libre' ? `$${valorCalculado.toFixed(2)}` : '-'}</td>

                          <td className="px-3 py-3 text-center">
                            {r.estadoDia === 'Adicional' || r.estadoDia === 'Domingo Adicional' ? (
                              <label
                                title={r.respaldoNombre || 'Subir respaldo'}
                                className={`mx-auto inline-flex cursor-pointer items-center justify-center rounded-lg border p-1.5 transition-colors ${
                                  r.respaldoNombre
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                                }`}
                              >
                                <Image size={14} />
                                <input
                                  type="file"
                                  accept=".jpg,.jpeg,.png,.pdf"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    updateRow(d.fecha, rowIndex, 'respaldoNombre', file?.name || '');
                                  }}
                                />
                              </label>
                            ) : '-'}
                          </td>

                          <td className="px-3 py-3 text-center">
                            <div className="flex justify-center gap-1">
                              <button title="Duplicar turno en este dia" onClick={() => duplicateRow(d.fecha, rowIndex)} className="rounded-lg border border-transparent p-1.5 text-blue-400 transition-colors hover:border-slate-200 hover:bg-slate-100 hover:text-blue-600"><Copy size={14} /></button>
                              <button title="Eliminar registro" onClick={() => deleteRow(d.fecha, rowIndex)} className="rounded-lg border border-transparent p-1.5 text-slate-400 transition-colors hover:border-slate-200 hover:bg-red-50 hover:text-red-500"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>

            <div className="shrink-0 flex justify-end gap-3 border-t border-slate-100 bg-white px-8 py-3">
              <button
                onClick={() => applyEstadoToSelected(true)}
                disabled={!canApproveSelected}
                className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-2 text-[12px] font-bold text-emerald-700 shadow-sm transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check size={13} />Aprobar seleccionados
              </button>

              <button
                onClick={() => applyEstadoToSelected(false)}
                disabled={!canRejectSelected}
                className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-5 py-2 text-[12px] font-bold text-red-700 shadow-sm transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={13} />Rechazar seleccionados
              </button>
            </div>

            <div className="shrink-0 flex items-center justify-between border-t border-slate-100 bg-white px-8 py-4">
              <div />
              <div className="flex items-center gap-3">
                <button onClick={onClose} className="rounded-lg border border-slate-200 px-5 py-2 text-[13px] font-bold text-slate-600 transition-colors hover:bg-slate-50">Cancelar</button>
                <button onClick={handleGuardar} className="flex items-center gap-2 rounded-lg bg-[#001F3F] px-6 py-2 text-[13px] font-bold text-white shadow-md transition-all hover:bg-blue-900 active:scale-95"><Save size={14} />Guardar y Calcular</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const ValetsFijosView = () => {
  const [activeSubTab, setActiveSubTab] = useState<SubTabValet>('historial');
  const [gestionarCentro, setGestionarCentro] = useState('');
  const [centrosGestionados, setCentrosGestionados] = useState<string[]>([]);
  const [gestionModalMode, setGestionModalMode] = useState<'agregar' | 'editar'>('agregar');
  const [showGestionarModal, setShowGestionarModal] = useState(false);
  const [showSelEmpleadoModal, setShowSelEmpleadoModal] = useState(false);
  const [showRegistroModal, setShowRegistroModal] = useState(false);
  const [registroRow, setRegistroRow] = useState<HorarioValetRow | null>(null);
  const [showDetallesModal, setShowDetallesModal] = useState(false);
  const [detalleEmpleado] = useState<{ nombre: string; centro: string; valorFijo: string } | null>(null);

  const [filtroPeriodo, setFiltroPeriodo] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const [loadingCatalogos, setLoadingCatalogos] = useState(false);
  const [catalogosError, setCatalogosError] = useState('');
  const [persistenciaError, setPersistenciaError] = useState('');

  const [centrosValet, setCentrosValet] = useState<string[]>([]);
  const [empleadosCatalogo, setEmpleadosCatalogo] = useState<EmpleadoCatalogo[]>([]);
  const [horarios, setHorarios] = useState<HorarioValetRow[]>([]);
  const [costosPorCentro, setCostosPorCentro] = useState<Record<string, CostosConfig>>({});

  const upsertHorarioLocal = (row: HorarioValetRow) => {
    setHorarios((prev) => {
      const idx = prev.findIndex((item) => item.id === row.id);
      if (idx === -1) return [row, ...prev];
      const next = [...prev];
      next[idx] = row;
      return next;
    });
  };

  const syncEmpleadoToDb = async (row: HorarioValetRow) => {
    const centro = parseCentroCompuesto(row.centro);
    await dbApi.valets.empleados.save({
      centroCostoId: row.codCC,
      centroCostoNombre: centro.centroCostoNombre || row.centro,
      empleadoCedula: row.ci,
      empleadoNombre: row.empleado,
      valorFijo: 0,
    });
  };

  const syncHorarioRowToDb = async (row: HorarioValetRow) => {
    const existentesRaw = await dbApi.valets.horarios.list<{ registros?: ValetHorarioDbItem[] }>();
    const existentes = Array.isArray(existentesRaw?.registros) ? existentesRaw.registros : [];

    const delMismoPeriodo = existentes.filter((item) => item.centroCostoId === row.codCC
      && item.empleadoCedula === row.ci
      && String(item.fechaTurno || '').startsWith(row.periodo));

    await Promise.all(delMismoPeriodo.map(async (item) => {
      if (item.id) {
        await dbApi.valets.horarios.delete(item.id);
      }
    }));

    const centro = parseCentroCompuesto(row.centro);
    const registros = Object.entries(row.diasRegistro)
      .flatMap(([fecha, turns]) => turns
        .filter((turn) => turn.estadoDia !== 'Libre')
        .map((turn) => ({ fecha, turn })));

    await Promise.all(registros.map(async ({ fecha, turn }) => {
      await dbApi.valets.horarios.save({
        centroCostoId: row.codCC,
        centroCostoNombre: centro.centroCostoNombre || row.centro,
        empleadoCedula: row.ci,
        empleadoNombre: row.empleado,
        fechaTurno: fecha,
        horaEntrada: turn.horaEntrada,
        horaSalida: turn.horaSalida,
        esAdicional: turn.estadoDia === 'Adicional' || turn.estadoDia === 'Domingo Adicional',
        aprobado: typeof turn.aprobado === 'boolean' ? turn.aprobado : undefined,
        observacion: serializeHorarioMeta({
          estadoDia: turn.estadoDia,
          parqueadero: turn.parqueadero,
          respaldoNombre: turn.respaldoNombre,
        }),
      });
    }));
  };

  const [costosModal, setCostosModal] = useState<CostosConfig>(() => createDefaultCostosConfig());

  const getCostosForCentro = (centro: string): CostosConfig => {
    const key = String(centro || '').trim();
    return normalizeCostosConfig(costosPorCentro[key]);
  };

  const guardarGestionValet = async () => {
    const centro = String(gestionarCentro || '').trim();
    if (!centro) return;

    const centroParseado = parseCentroCompuesto(centro);
    const centroCostoId = centroParseado.centroCostoId || centro;
    const centroCostoNombre = centroParseado.centroCostoNombre || centro;
    const config = normalizeCostosConfig(costosModal);

    try {
      await dbApi.valets.centros.save({
        centroCostoId,
        centroCostoNombre,
        activo: true,
      });

      await dbApi.valets.configuracion.save({
        centroCostoId,
        horasNormalLimite: Number.parseFloat(config.Normal.horas) || 0,
        valorNormal: Number.parseFloat(config.Normal.valor) || 0,
        valorAdicional: Number.parseFloat(config.Adicional.valor) || 0,
        valorDomingo: Number.parseFloat(config.Domingo.valor) || 0,
        valorDomingoAdicional: Number.parseFloat(config['Domingo Adicional'].valor) || 0,
        metadata: {},
      });

      setCentrosGestionados((prev) => {
        if (prev.includes(centro)) return prev;
        return [...prev, centro].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
      });
      setCostosPorCentro((prev) => ({ ...prev, [centro]: config }));
      setPersistenciaError('');
      setShowGestionarModal(false);
    } catch (error) {
      setPersistenciaError(error instanceof Error ? error.message : 'No se pudo guardar la configuracion del valet.');
    }
  };

  useEffect(() => {
    let isMounted = true;

    const cargarCatalogos = async () => {
      setLoadingCatalogos(true);
      setCatalogosError('');

      try {
        const [centrosRaw, empleadosRaw] = await Promise.all([
          ListarValetsFijos(),
          getNominaEmployeesActive<EmpleadoNominaApiItem[]>(),
        ]);

        const centros = (Array.isArray(centrosRaw) ? centrosRaw : [])
          .filter((cc: NominaCostCenter) => cc.IDCENTROCOSTO || cc.CENTROCOSTO)
          .map((cc: NominaCostCenter) => composeCentroDisplay(cc.IDCENTROCOSTO, cc.CENTROCOSTO));

        const empleadosMap = new Map<string, EmpleadoCatalogo>();
        (Array.isArray(empleadosRaw) ? empleadosRaw : []).forEach((item) => {
          const payload = (item?.json ?? item ?? {}) as Record<string, unknown>;
          const ci = String(payload?.CEDULA || payload?.DOCI_MFEMP || payload?.COD_MFEMP || '').trim();
          const nombres = String(payload?.NOMBRES || '').trim();
          const apellidos = String(payload?.APELLIDOS || '').trim();
          const nombre = `${apellidos} ${nombres}`.trim();

          const centroIdDirecto = String(payload?.COD_MFCC || payload?.IDCENTROCOSTO || '').trim();
          const centroNombreDirecto = String(payload?.DSC_MFCC || payload?.CENTROCOSTO || '').trim();
          const centroCompuesto = parseCentroCompuesto(centroNombreDirecto || centroIdDirecto);
          const codCC = centroIdDirecto || centroCompuesto.centroCostoId || '';
          const centroNombre = centroNombreDirecto || centroCompuesto.centroCostoNombre || '';
          const centro = composeCentroDisplay(codCC, centroNombre);

          if (!ci || !nombre || !centro) return;
          if (!empleadosMap.has(ci)) {
            empleadosMap.set(ci, { nombre, ci, centro, codCC: codCC || '00000000' });
          }
        });

        const empleadosNormalizados = Array.from(empleadosMap.values())
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));

        const centrosDerivadosEmpleados = Array.from(new Set(empleadosNormalizados.map((e) => e.centro)));
        const centrosUnicos = Array.from(new Set([...centros, ...centrosDerivadosEmpleados]))
          .filter((v) => Boolean(v))
          .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

        if (!isMounted) return;
        setCentrosValet(centrosUnicos);
        setEmpleadosCatalogo(empleadosNormalizados);
      } catch (error) {
        if (!isMounted) return;
        setCatalogosError(error instanceof Error ? error.message : 'No se pudieron cargar catalogos de n8n.');
      } finally {
        if (isMounted) setLoadingCatalogos(false);
      }
    };

    void cargarCatalogos();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const cargarPersistenciaValets = async () => {
      setPersistenciaError('');

      try {
        const [empleadosData, horariosData, centrosData, configuracionData] = await Promise.all([
          dbApi.valets.empleados.list<{ registros?: ValetEmpleadoDbItem[] }>(),
          dbApi.valets.horarios.list<{ registros?: ValetHorarioDbItem[] }>(),
          dbApi.valets.centros.list<{ registros?: ValetCentroDbItem[] }>(true),
          dbApi.valets.configuracion.list<{ registros?: ValetConfiguracionDbItem[] }>(),
        ]);

        const empleadosDb = Array.isArray(empleadosData?.registros) ? empleadosData.registros : [];
        const horariosDb = Array.isArray(horariosData?.registros) ? horariosData.registros : [];
        const centrosDb = Array.isArray(centrosData?.registros) ? centrosData.registros : [];
        const configuracionesDb = Array.isArray(configuracionData?.registros) ? configuracionData.registros : [];

        const centrosPersistidos = centrosDb
          .filter((row) => row.activo !== false)
          .map((row) => composeCentroDisplay(row.centroCostoId, row.centroCostoNombre))
          .filter((row) => Boolean(row));

        const costosIniciales: Record<string, CostosConfig> = {};
        configuracionesDb.forEach((cfg) => {
          const centroMatch = centrosPersistidos.find((item) => {
            const parsed = parseCentroCompuesto(item);
            return parsed.centroCostoId === cfg.centroCostoId;
          });

          if (!centroMatch) return;

          costosIniciales[centroMatch] = normalizeCostosConfig({
            Normal: {
              horas: String(cfg.horasNormalLimite ?? DEFAULT_COSTOS_CONFIG.Normal.horas),
              valor: String(cfg.valorNormal ?? DEFAULT_COSTOS_CONFIG.Normal.valor),
            },
            Adicional: {
              horas: '',
              valor: String(cfg.valorAdicional ?? DEFAULT_COSTOS_CONFIG.Adicional.valor),
            },
            Domingo: {
              horas: '',
              valor: String(cfg.valorDomingo ?? DEFAULT_COSTOS_CONFIG.Domingo.valor),
            },
            'Domingo Adicional': {
              horas: '',
              valor: String(cfg.valorDomingoAdicional ?? DEFAULT_COSTOS_CONFIG['Domingo Adicional'].valor),
            },
          });
        });

        const rowsMap = new Map<string, HorarioValetRow>();

        empleadosDb.forEach((emp) => {
          const centroDisplay = composeCentroDisplay(emp.centroCostoId, emp.centroCostoNombre);
          const key = `${emp.centroCostoId}-${emp.empleadoCedula}-${filtroPeriodo}`;
          rowsMap.set(key, {
            id: key,
            empleado: emp.empleadoNombre,
            ci: emp.empleadoCedula,
            periodo: filtroPeriodo,
            codCC: emp.centroCostoId,
            centro: centroDisplay,
            estado: 'creado',
            diasRegistro: {},
          });
        });

        horariosDb.forEach((h) => {
          const fecha = String(h.fechaTurno || '');
          if (!fecha) return;
          const periodo = fecha.slice(0, 7);
          const centroDisplay = composeCentroDisplay(h.centroCostoId, h.centroCostoNombre);
          const key = `${h.centroCostoId}-${h.empleadoCedula}-${periodo}`;
          const meta = parseHorarioMeta(h.observacion || '');
          const day = new Date(`${fecha}T12:00:00`).getDay();
          const estadoFallback: EstadoDia = h.esAdicional ? (day === 0 ? 'Domingo Adicional' : 'Adicional') : (day === 0 ? 'Domingo' : 'Normal');
          const estadoDia = meta.estadoDia || estadoFallback;

          const base = rowsMap.get(key) || {
            id: key,
            empleado: h.empleadoNombre,
            ci: h.empleadoCedula,
            periodo,
            codCC: h.centroCostoId,
            centro: centroDisplay,
            estado: 'pendiente' as const,
            diasRegistro: {},
          };

          const dayRows = [...(base.diasRegistro[fecha] || [])];
          dayRows.push({
            id: h.id || `${fecha}-${dayRows.length}`,
            parqueadero: meta.parqueadero || centroDisplay,
            estadoDia,
            horaEntrada: h.horaEntrada || '00:00',
            horaSalida: h.horaSalida || '00:00',
            aprobado: typeof h.aprobado === 'boolean' ? h.aprobado : null,
            respaldoNombre: meta.respaldoNombre || '',
          });

          rowsMap.set(key, {
            ...base,
            estado: base.estado === 'creado' ? 'pendiente' : base.estado,
            diasRegistro: {
              ...base.diasRegistro,
              [fecha]: dayRows,
            },
          });
        });

        if (!isMounted) return;
        setCentrosGestionados(Array.from(new Set(centrosPersistidos))
          .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })));
        setCostosPorCentro(costosIniciales);
        setHorarios(Array.from(rowsMap.values()));
      } catch (error) {
        if (!isMounted) return;
        setPersistenciaError(error instanceof Error ? error.message : 'No se pudo cargar persistencia de valets.');
      }
    };

    void cargarPersistenciaValets();

    return () => {
      isMounted = false;
    };
  }, [filtroPeriodo]);

  const periodosOpciones = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, idx) => {
      const d = new Date(now.getFullYear(), now.getMonth() - idx, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
  }, []);

  const filteredHorarios = useMemo(() => {
    return horarios.filter((r) => {
      if (r.periodo !== filtroPeriodo) return false;
      if (filtroEstado && r.estado !== filtroEstado) return false;
      if (filtroBusqueda) {
        const s = filtroBusqueda.toLowerCase();
        return r.empleado.toLowerCase().includes(s) || r.ci.includes(s) || getParqName(r.centro).toLowerCase().includes(s);
      }
      return true;
    });
  }, [horarios, filtroBusqueda, filtroEstado, filtroPeriodo]);

  const centrosDisponiblesGestion = useMemo(() => {
    const usados = new Set(centrosGestionados);
    return centrosValet.filter((c) => !usados.has(c));
  }, [centrosGestionados, centrosValet]);

  const resumenCentrosGestion = useMemo(() => {
    return centrosGestionados
      .map((centro) => {
        const rowsCentro = horarios.filter((h) => h.periodo === filtroPeriodo && h.centro === centro);
        const configCentro = getCostosForCentro(centro);
        const empleadosUnicos = Array.from(new Set(rowsCentro.map((r) => r.empleado)));

        const totalFijo = empleadosUnicos.reduce((accFijo, empName) => {
          let horasNormalesTrabajadas = 0;

          rowsCentro
            .filter((h) => h.empleado === empName)
            .forEach((h) => {
              Object.values(h.diasRegistro || {}).flat().forEach((dia) => {
                if (dia.estadoDia === 'Normal' && dia.aprobado === true) {
                  horasNormalesTrabajadas += calcHoras(dia.horaEntrada, dia.horaSalida);
                }
              });
            });

          const limiteNormal = Number.parseFloat(configCentro.Normal.horas) || 0;
          const valorPorHoraNormal = Number.parseFloat(configCentro.Normal.valor) || 0;
          const horasNormalesPagadas = limiteNormal > 0 ? Math.min(horasNormalesTrabajadas, limiteNormal) : horasNormalesTrabajadas;

          return accFijo + (horasNormalesPagadas * valorPorHoraNormal);
        }, 0);

        const totalExtras = rowsCentro.reduce((accExtra, h) => {
          let extra = 0;
          Object.values(h.diasRegistro || {}).flat().forEach((dia) => {
            if (dia.estadoDia !== 'Normal' && dia.estadoDia !== 'Libre' && dia.aprobado === true) {
              const conf = configCentro[dia.estadoDia as keyof CostosConfig];
              const tarifa = conf ? (Number.parseFloat(conf.valor) || 0) : 0;
              if (dia.estadoDia === 'Domingo') {
                extra += tarifa;
              } else {
                extra += calcHoras(dia.horaEntrada, dia.horaSalida) * tarifa;
              }
            }
          });
          return accExtra + extra;
        }, 0);

        return {
          centro,
          totalEmpleados: empleadosUnicos.length,
          totalFijo,
          totalExtras,
        };
      })
      .filter((item) => Boolean(item.centro));
  }, [centrosGestionados, costosPorCentro, filtroPeriodo, horarios]);

  const resumenCentroActivo = useMemo(() => {
    return resumenCentrosGestion.find((item) => item.centro === gestionarCentro) || null;
  }, [gestionarCentro, resumenCentrosGestion]);

  useEffect(() => {
    if (gestionModalMode !== 'editar') return;
    if (!gestionarCentro) return;
    if (!centrosGestionados.includes(gestionarCentro)) {
      setGestionarCentro('');
    }
  }, [centrosGestionados, gestionarCentro, gestionModalMode]);

  useEffect(() => {
    if (!showGestionarModal) return;
    if (!gestionarCentro) {
      setCostosModal(createDefaultCostosConfig());
      return;
    }

    setCostosModal(getCostosForCentro(gestionarCentro));
  }, [costosPorCentro, gestionarCentro, showGestionarModal]);

  const uniqueEmployees = useMemo(() => new Set(filteredHorarios.map((h) => h.empleado)).size, [filteredHorarios]);

  const totalFijoCalc = useMemo(() => {
    const empleadosFiltrados = Array.from(new Set(filteredHorarios.map((h) => h.empleado)));

    return empleadosFiltrados.reduce((accTotal, empName) => {
      let horasNormalesTrabajadas = 0;

      filteredHorarios
        .filter((h) => h.empleado === empName)
        .forEach((h) => {
          Object.values(h.diasRegistro || {}).flat().forEach((dia) => {
            if (dia.estadoDia === 'Normal' && dia.aprobado === true) {
              horasNormalesTrabajadas += calcHoras(dia.horaEntrada, dia.horaSalida);
            }
          });
        });

      const configEmpleado = getCostosForCentro(filteredHorarios.find((h) => h.empleado === empName)?.centro || '');
      const limiteNormal = Number.parseFloat(configEmpleado.Normal.horas) || 0;
      const valorPorHoraNormal = Number.parseFloat(configEmpleado.Normal.valor) || 0;
      const horasNormalesPagadas = limiteNormal > 0 ? Math.min(horasNormalesTrabajadas, limiteNormal) : horasNormalesTrabajadas;
      return accTotal + (horasNormalesPagadas * valorPorHoraNormal);
    }, 0);
  }, [costosPorCentro, filteredHorarios]);

  const totalAdicionalesCalc = useMemo(() => {
    return filteredHorarios.reduce((accTotal, h) => {
      let extra = 0;
      const configCentro = getCostosForCentro(h.centro);
      Object.values(h.diasRegistro || {}).flat().forEach((dia) => {
        if (dia.estadoDia !== 'Normal' && dia.estadoDia !== 'Libre' && dia.aprobado === true) {
          const conf = configCentro[dia.estadoDia as keyof CostosConfig];
          const tarifa = conf ? (Number.parseFloat(conf.valor) || 0) : 0;
          if (dia.estadoDia === 'Domingo') {
            extra += tarifa;
          } else {
            extra += calcHoras(dia.horaEntrada, dia.horaSalida) * tarifa;
          }
        }
      });
      return accTotal + extra;
    }, 0);
  }, [costosPorCentro, filteredHorarios]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-2 text-[#001F3F] shadow-sm"><Clock size={22} strokeWidth={2.5} /></div>
          <div>
            <h2 className="text-2xl font-normal text-slate-800">Valet Fijos</h2>
            <p className="text-sm text-slate-500">Gestion y Registro de Valet</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSubTab('gestionar')}
            className={`rounded-lg px-5 py-2 text-sm font-bold shadow-sm transition-all ${
              activeSubTab === 'gestionar'
                ? 'bg-[#2563EB] text-white hover:bg-blue-600'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            Gestionar valet
          </button>
          <button
            onClick={() => setActiveSubTab('historial')}
            className={`rounded-lg px-4 py-2 text-sm font-bold shadow-sm transition-all ${
              activeSubTab === 'historial'
                ? 'bg-[#2563EB] text-white hover:bg-blue-600'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            Historial
          </button>
        </div>
      </div>

      {catalogosError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">Error al cargar catalogos n8n: {catalogosError}</div>
      ) : null}

      {persistenciaError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">Persistencia de valets: {persistenciaError}</div>
      ) : null}

      {activeSubTab === 'historial' ? (
        <div className="space-y-5">
          <div className="flex flex-col items-end justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row">
            <div className="flex flex-wrap items-end gap-4">
              <button className="flex h-11 w-11 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-500 transition-colors hover:bg-red-100"><Unlock size={20} /></button>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">PERIODO</label>
                <div className="relative">
                  <select
                    value={filtroPeriodo}
                    onChange={(e) => setFiltroPeriodo(e.target.value)}
                    className="min-w-[120px] cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-4 pr-10 text-sm text-slate-700 shadow-sm outline-none"
                  >
                    {periodosOpciones.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-orange-400" size={16} />
                </div>
              </div>

              <div className="min-w-[200px] flex-1">
                <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">BUSCAR</label>
                <input
                  type="text"
                  placeholder="nombre, ci, parqueadero"
                  value={filtroBusqueda}
                  onChange={(e) => setFiltroBusqueda(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-4 text-sm text-slate-700 shadow-sm outline-none transition-colors focus:border-[#0EA5E9]"
                />
              </div>
            </div>

            <div className="flex items-end gap-4">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-[#0EA5E9]">ESTADO</label>
                <div className="relative">
                  <select
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                    className="min-w-[200px] cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-4 pr-10 text-sm text-slate-500 shadow-sm outline-none"
                  >
                    <option value="">Selecciona una opcion</option>
                    <option value="procesado">Procesado</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="creado">Creado</option>
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-300">
                    <ChevronUp size={12} className="-mb-1" />
                    <ChevronDown size={12} />
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowSelEmpleadoModal(true)}
                className="flex h-[42px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
              >
                <Plus size={16} className="stroke-[3px] text-orange-500" /> Anadir registro
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-500"><Users size={24} /></div>
              <div><p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Valets (Filtrado)</p><p className="text-2xl font-black text-slate-800">{uniqueEmployees}</p></div>
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500"><Banknote size={24} /></div>
              <div><p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Fijo A Pagar (Filtrado)</p><p className="text-2xl font-black text-slate-800">${totalFijoCalc.toFixed(2)}</p></div>
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-500"><Clock size={24} /></div>
              <div><p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Extras / Domingos (Filtrado)</p><p className="text-2xl font-black text-slate-800">${totalAdicionalesCalc.toFixed(2)}</p></div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-slate-100 bg-slate-50/50">
                  <tr>
                    {[
                      ['ID', ''],
                      ['NOMBRE', 'User'],
                      ['CI', 'CreditCard'],
                      ['PERIODO', 'Calendar'],
                      ['COD C.C.', 'MoreVertical'],
                      ['PARQUEADERO', 'Building'],
                      ['ESTADO', 'Settings2'],
                      ['', ''],
                    ].map(([h, icn], i) => (
                      <th key={`${h}-${i}`} className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        {icn ? (
                          <div className="flex items-center gap-2">
                            {icn === 'User' ? <User size={14} /> : null}
                            {icn === 'CreditCard' ? <CreditCard size={14} /> : null}
                            {icn === 'Calendar' ? <Calendar size={14} /> : null}
                            {icn === 'MoreVertical' ? <MoreVertical size={14} /> : null}
                            {icn === 'Building' ? <Building size={14} /> : null}
                            {icn === 'Settings2' ? <Settings2 size={14} /> : null}
                            {h}
                          </div>
                        ) : h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHorarios.map((row) => (
                    <tr key={row.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4 text-[13px] text-slate-600">{row.id}</td>
                      <td className="px-6 py-4 text-[13px] font-medium text-slate-700">{row.empleado}</td>
                      <td className="px-6 py-4 text-[13px] text-slate-600">{row.ci}</td>
                      <td className="px-6 py-4 text-[13px] text-slate-600">{row.periodo}</td>
                      <td className="px-6 py-4 text-[13px] text-slate-600">{row.codCC}</td>
                      <td className="px-6 py-4 text-[13px] text-slate-600">{getParqName(row.centro)}</td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${row.estado === 'creado' ? 'bg-orange-100 text-orange-700' : row.estado === 'pendiente' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {row.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setRegistroRow(row);
                            setShowRegistroModal(true);
                          }}
                          className="rounded-lg border border-blue-100 bg-blue-50 p-2 text-blue-500 transition-colors hover:bg-blue-100"
                        >
                          <FileText size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredHorarios.length === 0 ? <tr><td colSpan={8} className="py-12 text-center text-sm text-slate-400">No hay registros.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <Building size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Gestion de valets por centro</h2>
                <p className="text-sm text-slate-500">Primero agrega un valet y luego aparecera en la seccion para editar configuracion.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setGestionModalMode('agregar');
                setGestionarCentro(centrosDisponiblesGestion[0] || '');
                setShowGestionarModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <Plus size={16} />
              Agregar valet
            </button>
          </div>

          <div className="space-y-5 px-6 py-5">
            {resumenCentrosGestion.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-slate-500">
                No hay valets agregados para editar configuracion.
              </div>
            ) : (
              <div className="space-y-4">
                {resumenCentrosGestion.map((item, idx) => (
                  <div key={`${item.centro}-${idx}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-800">{item.centro}</div>
                        <div className="text-xs text-slate-500">{item.totalEmpleados} empleado(s) en el periodo {filtroPeriodo}</div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                          Fijo: ${item.totalFijo.toFixed(2)}
                        </span>
                        <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700">
                          Extras: ${item.totalExtras.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setGestionModalMode('editar');
                            setGestionarCentro(item.centro);
                            setCostosModal(getCostosForCentro(item.centro));
                            setShowGestionarModal(true);
                          }}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                          <Settings2 size={14} />
                          Editar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>
      )}

      {showGestionarModal ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Configurar valet fijo</h3>
                <p className="mt-1 text-sm text-slate-500">{gestionModalMode === 'agregar' ? 'Agrega un nuevo valet y configura sus tarifas.' : 'Edita configuracion del valet seleccionado.'}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowGestionarModal(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <label className="space-y-2 text-sm font-medium text-slate-600">
                  <span>Centro de costo valet</span>
                  <select
                    value={gestionarCentro}
                    onChange={(e) => setGestionarCentro(e.target.value)}
                    disabled={gestionModalMode === 'editar'}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400"
                  >
                    <option value="">Selecciona un centro</option>
                    {gestionModalMode === 'agregar'
                      ? centrosDisponiblesGestion.map((v, i) => <option key={`${v}-${i}`} value={v}>{v}</option>)
                      : (gestionarCentro ? [<option key={gestionarCentro} value={gestionarCentro}>{gestionarCentro}</option>] : null)}
                  </select>
                </label>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <div className="font-semibold text-slate-700">Empleados del centro</div>
                  <div className="mt-1 text-lg font-bold text-slate-800">{resumenCentroActivo?.totalEmpleados || 0}</div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Tipo de jornada</th>
                      <th className="px-4 py-3">Horas limite</th>
                      <th className="px-4 py-3">Valor por hora / dia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(['Normal', 'Adicional', 'Domingo', 'Domingo Adicional'] as Array<keyof CostosConfig>).map((tipo) => (
                      <tr key={tipo}>
                        <td className="px-4 py-3 font-semibold text-slate-700">{tipo}</td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            disabled={tipo !== 'Normal'}
                            value={costosModal[tipo].horas}
                            onChange={(e) => setCostosModal((prev) => ({ ...prev, [tipo]: { ...prev[tipo], horas: e.target.value } }))}
                            className="w-36 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 disabled:bg-slate-100 disabled:text-slate-400"
                            placeholder={tipo !== 'Normal' ? 'N/A' : '0'}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={costosModal[tipo].valor}
                            onChange={(e) => setCostosModal((prev) => ({ ...prev, [tipo]: { ...prev[tipo], valor: e.target.value } }))}
                            className="w-36 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {gestionModalMode === 'agregar'
                  ? 'Solo se muestran centros no agregados. Al guardar se agregara al listado de edicion.'
                  : 'En modo editar, el centro de costo se mantiene fijo.'}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 px-6 py-5">
              <button
                type="button"
                onClick={() => setShowGestionarModal(false)}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  void guardarGestionValet();
                }}
                disabled={!gestionarCentro}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-800 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900"
              >
                <Save size={16} />
                {gestionModalMode === 'agregar' ? 'Guardar valet' : 'Guardar configuracion'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showDetallesModal && detalleEmpleado ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto p-4">
          <div className="absolute inset-0 bg-[#001F3F]/60 backdrop-blur-sm" onClick={() => setShowDetallesModal(false)} />
          <div className="relative w-full max-w-[700px] overflow-hidden rounded-3xl bg-white shadow-2xl">
            {(() => {
              const hRecord = horarios.find((h) => h.periodo === filtroPeriodo && h.empleado === detalleEmpleado.nombre && h.centro === detalleEmpleado.centro);
              const diasExtras = hRecord?.diasRegistro
                ? Object.entries(hRecord.diasRegistro)
                  .flatMap(([fecha, dias]) => dias.map((d) => ({ fecha, ...d })))
                  .filter((d) => d.estadoDia !== 'Normal' && d.estadoDia !== 'Libre')
                : [];

              const totalAprobado = diasExtras
                .filter((d) => d.aprobado === true)
                .reduce((acc, d) => {
                  const h = calcHoras(d.horaEntrada, d.horaSalida);
                  const confCentro = getCostosForCentro(detalleEmpleado.centro);
                  const conf = confCentro[d.estadoDia as keyof CostosConfig];
                  const tarifa = conf ? (Number.parseFloat(conf.valor) || 0) : 0;
                  if (d.estadoDia === 'Domingo') return acc + tarifa;
                  return acc + (h * tarifa);
                }, 0);

              const domingosTrabajados = diasExtras.filter((d) => d.estadoDia === 'Domingo');
              const horasExtras = diasExtras.filter((d) => d.estadoDia === 'Adicional' || d.estadoDia === 'Domingo Adicional');

              const toggleAprobacion = async (fecha: string, turnId: string) => {
                if (!hRecord) return;
                const rowActualizada = {
                  ...hRecord,
                  diasRegistro: {
                    ...hRecord.diasRegistro,
                    [fecha]: (hRecord.diasRegistro[fecha] || []).map((t) => (t.id === turnId ? { ...t, aprobado: !t.aprobado } : t)),
                  },
                };

                setHorarios((cur) => cur.map((row) => {
                  if (row.id !== hRecord.id) return row;
                  return rowActualizada;
                }));

                try {
                  await syncHorarioRowToDb({ ...rowActualizada, estado: 'pendiente' });
                } catch (error) {
                  setPersistenciaError(error instanceof Error ? error.message : 'No se pudo persistir la aprobacion del turno.');
                }
              };

              return (
                <>
                  <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/50 px-8 py-6">
                    <div>
                      <h3 className="mb-1 text-xl font-black text-slate-800">Detalles de Extras</h3>
                      <p className="text-xs font-bold uppercase text-slate-500">{detalleEmpleado.nombre}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button onClick={() => setShowDetallesModal(false)} className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-100"><X size={16} /></button>
                      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-1.5 text-right shadow-sm">
                        <span className="block text-[10px] font-bold uppercase text-blue-600">Total Aprobado</span>
                        <span className="text-lg font-black text-blue-800">${totalAprobado.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="max-h-[60vh] space-y-6 overflow-y-auto px-8 py-6 [scrollbar-gutter:stable]">
                    <div>
                      <h4 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700"><Clock size={16} className="text-orange-500" /> Horas Extras (Adicional / Dom. Adicional)</h4>
                      {horasExtras.length > 0 ? (
                        <div className="space-y-2">
                          {horasExtras.map((d, index) => {
                            const dayName = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'][new Date(`${d.fecha}T12:00:00`).getDay()];
                            const hCalc = calcHoras(d.horaEntrada, d.horaSalida);
                            const valCalc = hCalc * (Number.parseFloat(getCostosForCentro(detalleEmpleado.centro)[d.estadoDia as keyof CostosConfig]?.valor || '0') || 0);

                            return (
                              <div key={`${d.fecha}-${index}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-colors hover:border-blue-300">
                                <div className="flex items-center gap-4">
                                  <span className="rounded bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-600">{d.fecha}</span>
                                  <span className="w-8 text-[13px] font-bold text-slate-800">{dayName}</span>
                                  <span className="rounded border border-slate-100 bg-slate-50 px-2 py-1 text-[12px] font-medium text-slate-500">{d.horaEntrada} - {d.horaSalida} <span className="ml-1 text-slate-400">({hCalc.toFixed(2)}h)</span></span>
                                  <span className="ml-2 text-[10px] font-bold uppercase text-slate-400">{d.estadoDia}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className={`text-[15px] font-black ${d.aprobado === true ? 'text-[#001F3F]' : 'text-slate-300 line-through'}`}>${valCalc.toFixed(2)}</span>
                                  <button onClick={() => toggleAprobacion(d.fecha, d.id)} className={`flex h-8 w-8 items-center justify-center rounded-lg border-2 transition-all ${d.aprobado === true ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-slate-200 bg-slate-50'}`}>
                                    {d.aprobado === true ? <Check size={16} className="text-emerald-600" strokeWidth={3} /> : null}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center text-sm text-slate-400">No hay horas extras registradas.</div>
                      )}
                    </div>

                    <div>
                      <h4 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700"><Calendar size={16} className="text-orange-500" /> Domingos Trabajados (Tarifa Plana)</h4>
                      {domingosTrabajados.length > 0 ? (
                        <div className="space-y-2">
                          {domingosTrabajados.map((d, index) => {
                            const dayName = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'][new Date(`${d.fecha}T12:00:00`).getDay()];
                            const valCalc = Number.parseFloat(getCostosForCentro(detalleEmpleado.centro)[d.estadoDia as keyof CostosConfig]?.valor || '0') || 0;

                            return (
                              <div key={`${d.fecha}-${index}`} className="flex items-center justify-between rounded-xl border border-orange-100 bg-orange-50/30 p-3.5 shadow-sm">
                                <div className="flex items-center gap-4">
                                  <span className="rounded-lg border border-orange-200 bg-white px-3 py-1 font-mono text-[12px] font-bold text-orange-800">{d.fecha}</span>
                                  <span className="w-8 text-[13px] font-bold text-slate-800">{dayName}</span>
                                  <span className="rounded border border-orange-200 bg-white px-2 py-1 text-[12px] font-medium text-orange-800/70">{d.estadoDia}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className={`text-[15px] font-black ${d.aprobado === true ? 'text-orange-600' : 'text-slate-300 line-through'}`}>${valCalc.toFixed(2)}</span>
                                  <button onClick={() => toggleAprobacion(d.fecha, d.id)} className={`flex h-8 w-8 items-center justify-center rounded-lg border-2 transition-all ${d.aprobado === true ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-slate-200 bg-white'}`}>
                                    {d.aprobado === true ? <Check size={16} className="text-emerald-600" strokeWidth={3} /> : null}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center text-sm text-slate-400">No hay domingos trabajados en este periodo.</div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end border-t border-slate-100 bg-slate-50 p-6">
                    <button onClick={() => setShowDetallesModal(false)} className="rounded-xl bg-[#001F3F] px-8 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-900">Hecho</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      ) : null}

      {showSelEmpleadoModal ? (
        <SeleccionarEmpleadoModal
          periodo={filtroPeriodo}
          centrosValet={centrosGestionados}
          empleados={empleadosCatalogo}
          onClose={() => setShowSelEmpleadoModal(false)}
          onSeleccionar={async (emp) => {
            const nuevoRegistro: HorarioValetRow = {
              id: `${emp.codCC || '00000000'}-${emp.ci || '0000000000'}-${filtroPeriodo}`,
              empleado: emp.nombre,
              ci: emp.ci || '0000000000',
              periodo: filtroPeriodo,
              codCC: emp.codCC || '00000000',
              centro: emp.centro || '',
              estado: 'creado',
              diasRegistro: {},
            };

            upsertHorarioLocal(nuevoRegistro);
            setShowSelEmpleadoModal(false);

            try {
              await syncEmpleadoToDb(nuevoRegistro);
            } catch (error) {
              setPersistenciaError(error instanceof Error ? error.message : 'No se pudo guardar el empleado en persistencia.');
            }
          }}
        />
      ) : null}

      {showRegistroModal && registroRow ? (
        <RegistroAsistenciaModal
          empleadoSel={{
            nombre: registroRow.empleado,
            ci: registroRow.ci,
            codCC: registroRow.codCC,
            centro: registroRow.centro,
          }}
          periodo={registroRow.periodo || filtroPeriodo}
          registroRow={registroRow}
          costosConfig={getCostosForCentro(registroRow.centro)}
          centrosValet={centrosGestionados.length > 0 ? centrosGestionados : [registroRow.centro]}
          onClose={() => {
            setShowRegistroModal(false);
            setRegistroRow(null);
          }}
          onGuardar={async (nuevosDias) => {
            const actualizado: HorarioValetRow = {
              ...registroRow,
              estado: 'pendiente',
              diasRegistro: nuevosDias,
            };

            upsertHorarioLocal(actualizado);

            try {
              await syncEmpleadoToDb(actualizado);
              await syncHorarioRowToDb(actualizado);
            } catch (error) {
              setPersistenciaError(error instanceof Error ? error.message : 'No se pudo persistir el horario guardado.');
            }
          }}
        />
      ) : null}

      {loadingCatalogos ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">Cargando catalogos desde n8n...</div>
      ) : null}
    </div>
  );
};

export default ValetsFijosView;
