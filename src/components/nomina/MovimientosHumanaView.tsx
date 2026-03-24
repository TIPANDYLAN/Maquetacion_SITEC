import { useCallback, useState, useEffect } from 'react';
import { Plus, Trash2, Send, CheckCircle2, AlertCircle, Edit2, Download } from 'lucide-react';
import ExcelJS from 'exceljs';
import type { HumanaEmployeeData } from '../../types/humana';
import type { EmpleadoNominaApiItem, EmpleadoNominaApiPayload } from '../../types/nomina';
import { dbApi } from '../../services/dbApi';
import { getNominaEmployees, getNominaEmployeesActive, N8N_API_CATALOG, n8nPostDirect } from '../../services/n8nApi';

interface MovimientosHumanaViewProps {
  onUnsavedChangesChange: (hasUnsavedChanges: boolean) => void;
}

const obtenerPayloadEmpleadoNomina = (item: EmpleadoNominaApiItem): EmpleadoNominaApiPayload => {
  if (item?.json && typeof item.json === 'object') {
    return item.json as EmpleadoNominaApiPayload;
  }
  return item as EmpleadoNominaApiPayload;
};

interface DependienteForm {
  id: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  fechaNacimiento: string;
  parentesco: string;
  genero: 'M' | 'F' | '';
  estadoCivil: string;
  // Datos bancarios (solo si es mayor de edad)
  banco: string;
  tipoCuenta: string;
  numeroCuenta: string;
  correo: string;
}

interface MovimientoRow {
  id: string;
  empleadoNombre: string;
  empleadoCedula: string;
  tipoAccion: 'retirar' | 'ingresar' | 'cambiar_tarifa' | 'eliminar_dependiente' | '';
  fechaIngreso?: string;
  fechaSalida: string;
  tarifaActual: string;
  tarifaNueva: string;
  tipoPlan: string;
  dependientes: DependienteForm[];
}

interface FamiliarDisponible {
  nombre: string;
  cedula: string;
  genero: 'M' | 'F' | '';
  fechaNacimiento: string;
  parentesco: string;
  estadoCivil: string;
}

interface DatosExcelEmpleado {
  tarifa: string;
  plan: string;
  fechaIngreso: string;
  fechaNacimiento: string;
  parentesco: string;
  genero: string;
  estadoCivil: string;
  banco: string;
  tipoCuenta: string;
  numeroCuenta: string;
  correo: string;
}

const DATOS_EXCEL_EMPLEADO_VACIO: DatosExcelEmpleado = {
  tarifa: '',
  plan: '',
  fechaIngreso: '',
  fechaNacimiento: '',
  parentesco: '',
  genero: '',
  estadoCivil: '',
  banco: '',
  tipoCuenta: '',
  numeroCuenta: '',
  correo: '',
};

const crearDependienteVacio = (id: string): DependienteForm => ({
  id,
  nombres: '',
  apellidos: '',
  cedula: '',
  fechaNacimiento: '',
  parentesco: '',
  genero: '',
  estadoCivil: '',
  banco: '',
  tipoCuenta: '',
  numeroCuenta: '',
  correo: '',
});

const crearMovimientoVacio = (id: string): MovimientoRow => ({
  id,
  empleadoNombre: '',
  empleadoCedula: '',
  tipoAccion: '',
  fechaIngreso: '',
  fechaSalida: '',
  tarifaActual: '',
  tarifaNueva: '',
  tipoPlan: '',
  dependientes: [],
});

const normalizarPlanApi = (valorPlan: string) => {
  const valor = String(valorPlan || '').trim().toUpperCase();
  if (!valor) return '';
  if (valor.includes('10')) return 'PLAN 10';
  if (valor.includes('5')) return 'PLAN 5';
  return valorPlan;
};

const normalizarTarifaApi = (valorTarifa: string) => {
  const valor = String(valorTarifa || '').trim().toUpperCase();
  if (!valor) return '';
  if (valor === 'TS') return 'T';
  if (valor === 'TD') return 'T+1';
  if (valor === 'TF') return 'T+FAMILIAR';
  if (valor.includes('FAMILIAR') || valor.includes('FAMILIA')) return 'T+FAMILIAR';
  if (valor.includes('+1')) return 'T+1';
  if (valor === 'T') return 'T';
  return valorTarifa;
};

const normalizarFechaISOaInput = (iso: string) => {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toISOString().slice(0, 10);
};

const obtenerFechaActualInput = () => new Date().toISOString().slice(0, 10);

const MovimientosHumanaView = ({ onUnsavedChangesChange }: MovimientosHumanaViewProps) => {
  const [movimientos, setMovimientos] = useState<MovimientoRow[]>([]);
  const [empleadosDisponibles, setEmpleadosDisponibles] = useState<HumanaEmployeeData[]>([]);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [loading, setLoading] = useState(false);
  const [generandoMovimientos, setGenerandoMovimientos] = useState(false);
  const [excelValidado, setExcelValidado] = useState(false);
  const [confirmacionExcelValidado, setConfirmacionExcelValidado] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modoModal, setModoModal] = useState<'crear' | 'editar'>('crear');
  const [movimientoEditandoId, setMovimientoEditandoId] = useState<string | null>(null);
  const [movimientoModal, setMovimientoModal] = useState<MovimientoRow>(crearMovimientoVacio('1'));
  const [datosActivosPorCedula, setDatosActivosPorCedula] = useState<Record<string, DatosExcelEmpleado>>({});
  const [cargandoFechaApi] = useState(false);
  const [familiaresDisponibles, setFamiliaresDisponibles] = useState<FamiliarDisponible[]>([]);
  const [cargandoFamiliares, setCargandoFamiliares] = useState(false);
  const [familiaresSeleccionados, setFamiliaresSeleccionados] = useState<Record<string, string>>({});

  const EMPRESA_FIJA = 'ESTACIONAMIENTOS URBANOS URBAPARK SA';
  const CONTRATO_FIJO = '384799';

  const mapearEmpleadoDesdeApi = useCallback((item: EmpleadoNominaApiItem): HumanaEmployeeData => {
    const json = obtenerPayloadEmpleadoNomina(item);
    const planApi =
      String(
        json.PLAN
        || json.TIPO_PLAN
        || json.PLAN_CONTRATADO
        || json.PLAN_CONTRATADO_SALUD
        || ''
      ).trim();
    const tarifaApi = normalizarTarifaApi(String(json.TARIFA || ''));

    return {
      apellidos: String(json.APELLIDOS || '').trim(),
      nombres: String(json.NOMBRES || '').trim(),
      cedula: String(json.CEDULA || '').trim(),
      centroCosto: '',
      fechaNacimiento: '',
      estadoCivil: '',
      tarifa: tarifaApi,
      parentesco: '',
      genero: '',
      fechaSolicitud: '',
      fechaInclusion: '',
      fechaExclusion: '',
      plan: normalizarPlanApi(planApi),
      cobertura: 0,
      prima: 0,
      ajuste: 0,
      humanaAssist: 0,
      seguroCampesino: 0,
      urbapark: 0,
      sssCampesino: 0,
      totalUrbapark: 0,
      trabajador: 0,
      total: 0,
      diferencia: 0,
    };
  }, []);

  // Cargar empleados desde API de nomina para selector
  useEffect(() => {
    const cargarEmpleados = async () => {
      try {
        const data = await getNominaEmployeesActive<EmpleadoNominaApiItem[]>();
        const empleadosApi = Array.isArray(data) ? data : [];
        const datosPorCedula: Record<string, DatosExcelEmpleado> = {};
        const empleadosNormalizados = empleadosApi
          .map((item: EmpleadoNominaApiItem) => {
            const payload = obtenerPayloadEmpleadoNomina(item);
            const raw = (item?.json ?? item ?? {}) as Record<string, unknown>;
            const payloadRaw = payload as Record<string, unknown>;
            const cedula = String(payload.CEDULA || '').trim();

            if (cedula) {
              const actual = datosPorCedula[cedula] || DATOS_EXCEL_EMPLEADO_VACIO;
              datosPorCedula[cedula] = {
                tarifa: actual.tarifa || normalizarTarifaApi(String(payload.TARIFA || raw.TARIFA_ACTUAL || raw.TIPO_TARIFA || '')),
                plan: actual.plan || normalizarPlanApi(String(payload.PLAN || payload.TIPO_PLAN || payload.PLAN_CONTRATADO || payload.PLAN_CONTRATADO_SALUD || '')),
                fechaIngreso: actual.fechaIngreso || String(payload.INGRESO || payload.FechaIngreso || raw.INGRESO || raw.FechaIngreso || '').trim(),
                fechaNacimiento: actual.fechaNacimiento || String(raw.FEC_NAC || raw.FECHA_NACIMIENTO || '').trim(),
                parentesco: actual.parentesco || String(payloadRaw.COD_PARENTESCO || raw.COD_PARENTESCO || payloadRaw.PARENTESCO || raw.PARENTESCO || raw.TIPO_PARENTESCO || '').trim().toUpperCase(),
                genero: actual.genero || String(raw.SEXO || '').trim().toUpperCase(),
                estadoCivil: actual.estadoCivil || String(raw.EST_CIVIL || raw.ESTADO_CIVIL || '').trim().toUpperCase(),
                banco: actual.banco || String(raw.BANCO || '').trim(),
                tipoCuenta: actual.tipoCuenta || String(raw.TIPO_CUENTA || raw.TIPOCUENTA || '').trim().toUpperCase(),
                numeroCuenta: actual.numeroCuenta || String(raw.CUENTA_BNCO || raw.NUMERO_CUENTA || '').trim(),
                correo: actual.correo || String(raw.CORREO || '').trim(),
              };
            }

            return mapearEmpleadoDesdeApi(item);
          })
          .filter((emp: HumanaEmployeeData) => emp.cedula && (emp.apellidos || emp.nombres));

        // Deduplicar por cédula para evitar que el mismo empleado aparezca varias veces en el selector
        const vistos = new Set<string>();
        const empleadosSinDuplicados = empleadosNormalizados
          .filter((emp: HumanaEmployeeData) => {
            if (vistos.has(emp.cedula)) return false;
            vistos.add(emp.cedula);
            return true;
          })
          .sort((a: HumanaEmployeeData, b: HumanaEmployeeData) =>
            `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`, 'es')
          );

        setEmpleadosDisponibles(empleadosSinDuplicados);
        setDatosActivosPorCedula(datosPorCedula);
      } catch (error) {
        console.error('Error cargando empleados desde API de nomina:', error);
        setEmpleadosDisponibles([]);
        setDatosActivosPorCedula({});
      }
    };

    void cargarEmpleados();
  }, [mapearEmpleadoDesdeApi]);

  useEffect(() => {
    // Si cambia cualquier movimiento, se requiere volver a validar el Excel.
    setExcelValidado(false);
    setConfirmacionExcelValidado(false);
  }, [movimientos]);

  const tieneCambiosPendientes = movimientos.length > 0 || modalAbierto;

  useEffect(() => {
    onUnsavedChangesChange(tieneCambiosPendientes);
  }, [onUnsavedChangesChange, tieneCambiosPendientes]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!tieneCambiosPendientes) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      onUnsavedChangesChange(false);
    };
  }, [onUnsavedChangesChange, tieneCambiosPendientes]);

  const calcularEdad = (fechaNacimiento: string): number => {
    if (!fechaNacimiento) return 0;
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  };

  const obtenerPlanTarifaActualDesdeBd = async (empleadoNombre: string) => {
    try {
      const data = await dbApi.humana.getEmployeeLatest<{ found?: boolean; tarifa?: string; plan?: string }>(empleadoNombre);
      if (data?.found === false) {
        return { tarifa: '', plan: '' };
      }

      return {
        tarifa: normalizarTarifaApi(String(data?.tarifa || '')),
        plan: normalizarPlanApi(String(data?.plan || '')),
      };
    } catch (error) {
      console.error('Error obteniendo tarifa/plan actual desde BD:', error);
      return { tarifa: '', plan: '' };
    }
  };

  const convertirNombreAFicha = (nombreCompleto: string) => {
    const partes = nombreCompleto.trim().split(/\s+/).filter(Boolean);
    if (partes.length <= 1) {
      return { apellidos: partes[0] || '', nombres: '' };
    }
    if (partes.length === 2) {
      return { apellidos: partes[0], nombres: partes[1] };
    }
    return {
      apellidos: `${partes[0]} ${partes[1]}`,
      nombres: partes.slice(2).join(' '),
    };
  };

  const cargarFamiliaresDisponibles = useCallback(async (cedula: string) => {
    if (!cedula) {
      setFamiliaresDisponibles([]);
      return;
    }

    setCargandoFamiliares(true);
    try {
      const data = await n8nPostDirect<{ familiares?: unknown[] }>({
        url: N8N_API_CATALOG.familiaresEmpleados,
        payload: { Cedula: cedula },
      });
      const familiares = Array.isArray(data?.familiares) ? data.familiares : [];

      const normalizados: FamiliarDisponible[] = familiares.map((f: unknown) => {
        const familiar = (f ?? {}) as Record<string, unknown>;
        const generoRaw = String(familiar.SEXO_FAM || '').toUpperCase();
        const genero: FamiliarDisponible['genero'] = generoRaw === 'M' ? 'M' : generoRaw === 'F' ? 'F' : '';
        return {
          nombre: String(familiar.NOMBRE_FAM || '').trim(),
          cedula: String(familiar.CEDULA_FAM || familiar.CEDULA || familiar.IDENTIFICACION_FAM || familiar.IDENTIFICACION || '').trim(),
          genero,
          fechaNacimiento: normalizarFechaISOaInput(String(familiar.NACIMIENTO_FAM || '')),
          parentesco: String(familiar.PARENTESCO || familiar.TIPO_PARENTESCO || '').trim().toUpperCase(),
          estadoCivil: String(familiar.EST_CIVIL || familiar.ESTADO_CIVIL || '').trim().toUpperCase(),
        };
      }).filter((f: FamiliarDisponible) => f.nombre);

      setFamiliaresDisponibles(normalizados);
    } catch (error) {
      console.error('Error consultando familiares:', error);
      setFamiliaresDisponibles([]);
    } finally {
      setCargandoFamiliares(false);
    }
  }, []);

  useEffect(() => {
    if (movimientoModal.tipoAccion !== 'eliminar_dependiente' || !movimientoModal.empleadoCedula) {
      return;
    }

    void cargarFamiliaresDisponibles(movimientoModal.empleadoCedula);
    setMovimientoModal((prev) => ({
      ...prev,
      fechaSalida: prev.fechaSalida || obtenerFechaActualInput(),
    }));
  }, [movimientoModal.tipoAccion, movimientoModal.empleadoCedula, cargarFamiliaresDisponibles]);

  const guardarEnAPIFecha = async (empleadoNombre: string, empleadoCedula: string, tipoAccion: 'retirar' | 'ingresar', fecha: string) => {
    try {
      console.log(`Guardando ${tipoAccion} para ${empleadoNombre} (${empleadoCedula}) con fecha: ${fecha}`);
      // API call simulada - en producción iría aquí el endpoint real
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log(`${tipoAccion} guardado exitosamente en la API`);
      return true;
    } catch (error) {
      console.error(`Error al guardar ${tipoAccion}:`, error);
      return false;
    }
  };

  const obtenerSiguienteId = () => String(Math.max(0, ...movimientos.map(m => parseInt(m.id, 10) || 0)) + 1);

  const convertirFechaApiAInput = (fechaStr: string) => {
    const valor = String(fechaStr || '').trim();
    if (!valor) return '';

    if (/^\d{4}-\d{2}-\d{2}T/.test(valor)) {
      return valor.slice(0, 10);
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;

    if (/^\d{2}-\d{2}-\d{4}$/.test(valor)) {
      const [dia, mes, anio] = valor.split('-');
      if (!dia || !mes || !anio) return '';
      return `${anio}-${mes}-${dia}`;
    }

    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return '';
    return fecha.toISOString().slice(0, 10);
  };

  const generarMovimientosDesdeApi = async () => {
    setGenerandoMovimientos(true);
    try {
      const data = await getNominaEmployees<EmpleadoNominaApiItem[]>();
      const empleadosApi = (Array.isArray(data) ? data : []) as EmpleadoNominaApiItem[];
      const empleados = empleadosApi
        .map((item) => {
          const payload = obtenerPayloadEmpleadoNomina(item);
          return {
            cedula: String(payload.CEDULA || '').trim(),
            nombre: `${String(payload.APELLIDOS || '').trim()} ${String(payload.NOMBRES || '').trim()}`.trim(),
            ingreso: String(payload.INGRESO || payload.FechaIngreso || '').trim(),
            salida: String(payload.SALIDA || payload.FechaSalida || '').trim(),
            tarifa: normalizarTarifaApi(String(payload.TARIFA || '')),
          };
        })
        .filter((emp) => emp.cedula);

      let siguienteId = Math.max(0, ...movimientos.map((m) => parseInt(m.id, 10) || 0)) + 1;
      const existentes = new Set(
        movimientos.map((m) => `${m.empleadoCedula}|${m.tipoAccion}|${m.fechaSalida}`)
      );

      const nuevos: MovimientoRow[] = [];
      empleados.forEach((emp) => {
        const fechaIngresoInput = convertirFechaApiAInput(emp.ingreso);
        const fechaSalidaInput = convertirFechaApiAInput(emp.salida);

        if (fechaSalidaInput) {
          const claveSalida = `${emp.cedula}|retirar|${fechaSalidaInput}`;
          if (!existentes.has(claveSalida)) {
            existentes.add(claveSalida);
            nuevos.push({
              id: String(siguienteId++),
              empleadoNombre: emp.nombre,
              empleadoCedula: emp.cedula,
              tipoAccion: 'retirar',
              fechaIngreso: fechaIngresoInput,
              fechaSalida: fechaSalidaInput,
              tarifaActual: emp.tarifa,
              tarifaNueva: '',
              tipoPlan: '',
              dependientes: [],
            });
          }
          return;
        }

        if (fechaIngresoInput) {
          const claveIngreso = `${emp.cedula}|ingresar|${fechaIngresoInput}`;
          if (!existentes.has(claveIngreso)) {
            existentes.add(claveIngreso);
            nuevos.push({
              id: String(siguienteId++),
              empleadoNombre: emp.nombre,
              empleadoCedula: emp.cedula,
              tipoAccion: 'ingresar',
              fechaIngreso: fechaIngresoInput,
              fechaSalida: fechaIngresoInput,
              tarifaActual: emp.tarifa,
              tarifaNueva: '',
              tipoPlan: '',
              dependientes: [],
            });
          }
        }
      });

      if (nuevos.length === 0) {
        setUploadStatus({
          type: 'error',
          message: '⚠️ No se encontraron nuevos ingresos o exclusiones en la información de la API.',
        });
        return;
      }

      const totalIngresos = nuevos.filter((m) => m.tipoAccion === 'ingresar').length;
      const totalExclusiones = nuevos.filter((m) => m.tipoAccion === 'retirar').length;

      setMovimientos((prev) => [...prev, ...nuevos]);
      setUploadStatus({
        type: 'success',
        message: `✓ Se agregaron ${nuevos.length} movimientos (${totalIngresos} ingresos, ${totalExclusiones} exclusiones). Completa plan y tarifa en ingresos antes de exportar/enviar.`,
      });
    } catch (error) {
      console.error('Error generando movimientos desde API:', error);
      setUploadStatus({
        type: 'error',
        message: '⚠️ Error al generar movimientos desde la API de empleados',
      });
    } finally {
      setGenerandoMovimientos(false);
    }
  };

  const abrirModalNuevo = () => {
    setModoModal('crear');
    setMovimientoEditandoId(null);
    setModalError('');
    setMovimientoModal(crearMovimientoVacio(obtenerSiguienteId()));
    setFamiliaresDisponibles([]);
    setFamiliaresSeleccionados({});
    setModalAbierto(true);
  };

  const abrirModalEdicion = (movimientoId: string) => {
    const movimiento = movimientos.find(m => m.id === movimientoId);
    if (!movimiento) return;
    setModoModal('editar');
    setModalError('');
    setMovimientoEditandoId(movimientoId);
    setMovimientoModal({ ...movimiento, dependientes: [...movimiento.dependientes] });
    setFamiliaresSeleccionados({});
    if (movimiento.empleadoCedula) {
      void cargarFamiliaresDisponibles(movimiento.empleadoCedula);
    }
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalError('');
    setModalAbierto(false);
  };

  const eliminarMovimiento = (id: string) => {
    setMovimientos(movimientos.filter(m => m.id !== id));
  };

  const actualizarMovimientoModal = <K extends keyof MovimientoRow>(campo: K, valor: MovimientoRow[K]) => {
    if (modalError) setModalError('');
    setMovimientoModal(prev => {
      const updated = { ...prev, [campo]: valor };

      if (campo === 'empleadoNombre' && valor) {
        const empleado = empleadosDisponibles.find(emp => `${emp.apellidos} ${emp.nombres}` === valor);
        if (empleado) {
          updated.tarifaActual = normalizarTarifaApi(empleado.tarifa);
          updated.empleadoCedula = empleado.cedula;
          updated.tarifaNueva = normalizarTarifaApi(empleado.tarifa);
          updated.tipoPlan = empleado.plan || '';

          void obtenerPlanTarifaActualDesdeBd(`${empleado.apellidos} ${empleado.nombres}`.trim()).then(({ tarifa, plan }) => {
            setMovimientoModal((m) => ({
              ...m,
              tarifaActual: tarifa || m.tarifaActual,
              tarifaNueva: tarifa || m.tarifaNueva,
              tipoPlan: plan || m.tipoPlan,
            }));
          });

          if (prev.tarifaNueva === 'T+1' || prev.tarifaNueva === 'T+FAMILIAR') {
            void cargarFamiliaresDisponibles(empleado.cedula);
          }
        }
      }

      if (campo === 'tipoAccion' && valor === 'cambiar_tarifa') {
        updated.dependientes = [];
        setFamiliaresSeleccionados({});
        updated.fechaSalida = '';
      }

      if (campo === 'tipoAccion' && valor === 'eliminar_dependiente') {
        updated.tarifaNueva = '';
        updated.tipoPlan = '';
        updated.dependientes = [];
        updated.fechaSalida = obtenerFechaActualInput();
        setFamiliaresSeleccionados((estado) => ({ ...estado, retiro_dependiente: '' }));
      }

      if (campo === 'tarifaNueva') {
        const movimientoSiguiente: MovimientoRow = { ...updated, tarifaNueva: String(valor) };
        const requiereRetiro = requiereRetiroDependienteCambioTarifa(movimientoSiguiente);

        if (requiereRetiro) {
          updated.dependientes = [];
          setFamiliaresSeleccionados((estado) => ({ ...estado, retiro_dependiente: '' }));

          if (prev.empleadoCedula) {
            void cargarFamiliaresDisponibles(prev.empleadoCedula);
          }
          return updated;
        }

        if (valor === 'T' && prev.dependientes.length > 0) {
          updated.dependientes = [];
          setFamiliaresSeleccionados({});
        }

        if ((valor === 'T+1' || valor === 'T+FAMILIAR') && prev.dependientes.length === 0) {
          updated.dependientes = [crearDependienteVacio('1')];
          setFamiliaresSeleccionados({});
          if (prev.empleadoCedula) {
            void cargarFamiliaresDisponibles(prev.empleadoCedula);
          }
        }
      }

      return updated;
    });
  };

  const agregarDependienteModal = () => {
    if (movimientoModal.empleadoCedula) {
      void cargarFamiliaresDisponibles(movimientoModal.empleadoCedula);
    }
    setMovimientoModal(prev => {
      const nuevoDepId = String(Math.max(0, ...prev.dependientes.map(d => parseInt(d.id, 10) || 0)) + 1);
      return { ...prev, dependientes: [...prev.dependientes, crearDependienteVacio(nuevoDepId)] };
    });
  };

  const eliminarDependienteModal = (dependienteId: string) => {
    setMovimientoModal(prev => ({ ...prev, dependientes: prev.dependientes.filter(d => d.id !== dependienteId) }));
  };

  const actualizarDependienteModal = <K extends keyof DependienteForm>(dependienteId: string, campo: K, valor: DependienteForm[K]) => {
    if (modalError) setModalError('');
    setMovimientoModal(prev => ({
      ...prev,
      dependientes: prev.dependientes.map(d => (d.id === dependienteId ? { ...d, [campo]: valor } : d)),
    }));
  };

  const seleccionarFamiliarDependiente = (dependienteId: string, nombreFamiliar: string) => {
    setFamiliaresSeleccionados(prev => ({ ...prev, [dependienteId]: nombreFamiliar }));

    const familiar = familiaresDisponibles.find(f => f.nombre === nombreFamiliar);
    if (!familiar) return;

    const nombreSeparado = convertirNombreAFicha(familiar.nombre);

    setMovimientoModal(prev => ({
      ...prev,
      dependientes: prev.dependientes.map(d => d.id === dependienteId
        ? {
            ...d,
            apellidos: nombreSeparado.apellidos,
            nombres: nombreSeparado.nombres,
            genero: familiar.genero,
            fechaNacimiento: familiar.fechaNacimiento,
            parentesco: familiar.parentesco,
            estadoCivil: familiar.estadoCivil,
          }
        : d),
    }));
  };

  const seleccionarDependienteARetirar = (nombreFamiliar: string) => {
    if (modalError) setModalError('');
    setFamiliaresSeleccionados((prev) => ({ ...prev, retiro_dependiente: nombreFamiliar }));

    const familiar = familiaresDisponibles.find((f) => f.nombre === nombreFamiliar);
    if (!familiar) {
      setMovimientoModal((prev) => ({ ...prev, dependientes: [] }));
      return;
    }

    const nombreSeparado = convertirNombreAFicha(familiar.nombre);
    const dependiente = {
      ...crearDependienteVacio('1'),
      apellidos: nombreSeparado.apellidos,
      nombres: nombreSeparado.nombres,
      cedula: familiar.cedula,
      genero: familiar.genero,
      fechaNacimiento: familiar.fechaNacimiento,
      parentesco: familiar.parentesco,
      estadoCivil: familiar.estadoCivil,
    };

    setMovimientoModal((prev) => ({ ...prev, dependientes: [dependiente] }));
  };

  const esCorreoValido = (correo: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim());

  const obtenerErrorMovimiento = (m: MovimientoRow): string | null => {
    if (!m.empleadoNombre || !m.tipoAccion) return '⚠️ Completa empleado y tipo de movimiento';

    if ((m.tipoAccion === 'retirar' || m.tipoAccion === 'ingresar' || m.tipoAccion === 'eliminar_dependiente') && !m.fechaSalida) {
      return '⚠️ No se pudo obtener la fecha desde la API para este movimiento';
    }

    const esCambioRetiroDependiente = requiereRetiroDependienteCambioTarifa(m);
    const esEliminarDependiente = m.tipoAccion === 'eliminar_dependiente';

    if ((m.tipoAccion === 'ingresar' || (m.tipoAccion === 'cambiar_tarifa' && !esCambioRetiroDependiente)) && !m.tipoPlan) {
      return '⚠️ Debes seleccionar el tipo de plan';
    }

    if ((m.tipoAccion === 'ingresar' || m.tipoAccion === 'cambiar_tarifa') && !m.tarifaNueva) {
      return '⚠️ Debes seleccionar la tarifa';
    }

    if (esCambioRetiroDependiente && !m.fechaSalida) {
      return '⚠️ No se pudo obtener la fecha de exclusión desde la API';
    }

    const requiereDependientes =
      (m.tarifaNueva === 'T+1' || m.tarifaNueva === 'T+FAMILIAR') &&
      !esCambioRetiroDependiente;

    if (esCambioRetiroDependiente && m.dependientes.length !== 1) {
      return '⚠️ Debes seleccionar el dependiente a eliminar';
    }

    if (esEliminarDependiente && m.dependientes.length !== 1) {
      return '⚠️ Debes seleccionar el dependiente a eliminar';
    }

    if (esEliminarDependiente) {
      const dependiente = m.dependientes[0];
      if (!dependiente || (!dependiente.apellidos && !dependiente.nombres)) {
        return '⚠️ Debes seleccionar el dependiente a eliminar';
      }
      if (!dependiente.cedula) {
        return '⚠️ El dependiente seleccionado debe tener cédula';
      }
      return null;
    }

    if (requiereDependientes && m.dependientes.length === 0) {
      return '⚠️ Debes registrar al menos un dependiente para la tarifa seleccionada';
    }

    for (let i = 0; i < m.dependientes.length; i += 1) {
      const dependiente = m.dependientes[i];
      const etiqueta = `Dependiente #${i + 1}`;

      if (!dependiente.apellidos || !dependiente.nombres || !dependiente.cedula || !dependiente.fechaNacimiento || !dependiente.parentesco || !dependiente.genero) {
        return `⚠️ ${etiqueta}: completa apellidos, nombres, cédula, fecha de nacimiento, parentesco y género`;
      }

      if (dependiente.correo && !esCorreoValido(dependiente.correo)) {
        return `⚠️ ${etiqueta}: ingresa un correo válido`;
      }
    }

    return null;
  };

  const validarMovimiento = (m: MovimientoRow) => obtenerErrorMovimiento(m) === null;

  const guardarMovimientoModal = async () => {
    const errorMovimiento = obtenerErrorMovimiento(movimientoModal);
    if (errorMovimiento) {
      setModalError(errorMovimiento);
      return;
    }

    // Guardar en API si es retirar o ingresar
    if (movimientoModal.tipoAccion === 'retirar' || movimientoModal.tipoAccion === 'ingresar') {
      const tipoParaAPI = movimientoModal.tipoAccion === 'retirar' ? 'retirar' : 'ingresar';
      const resultado = await guardarEnAPIFecha(
        movimientoModal.empleadoNombre,
        movimientoModal.empleadoCedula,
        tipoParaAPI,
        movimientoModal.fechaSalida
      );
      if (!resultado) {
        setModalError(`⚠️ Error al guardar ${tipoParaAPI} en la API`);
        return;
      }
    }

    if (modoModal === 'crear') {
      setMovimientos(prev => [...prev, movimientoModal]);
    } else if (movimientoEditandoId) {
      setMovimientos(prev => prev.map(m => (m.id === movimientoEditandoId ? movimientoModal : m)));
    }

    setModalError('');
    setUploadStatus({ type: 'success', message: '✓ Movimiento guardado correctamente' });
    cerrarModal();
  };

  const obtenerEmpleadosPorNombre = (valor: string) => {
    const vistos = new Set<string>();
    const sinDuplicados = empleadosDisponibles
      .filter(emp => {
        if (vistos.has(emp.cedula)) return false;
        vistos.add(emp.cedula);
        return true;
      })
      .sort((a, b) =>
        `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`, 'es')
      );
    if (!valor.trim()) return sinDuplicados;
    const busqueda = valor.toLowerCase();
    return sinDuplicados.filter(emp =>
      `${emp.apellidos} ${emp.nombres}`.toLowerCase().includes(busqueda)
    );
  };

  const enviarMovimientos = async () => {
    if (movimientos.length === 0) {
      setUploadStatus({
        type: 'error',
        message: '⚠️ Debes agregar al menos un movimiento antes de enviar',
      });
      return;
    }

    if (!excelValidado || !confirmacionExcelValidado) {
      setUploadStatus({
        type: 'error',
        message: '⚠️ Debes exportar el Excel y marcarlo como validado antes de enviar a Humana',
      });
      return;
    }

    const movimientosValidos = movimientos.every(validarMovimiento);

    if (!movimientosValidos) {
      setUploadStatus({
        type: 'error',
        message: '⚠️ Por favor completa todos los campos requeridos',
      });
      return;
    }

    setLoading(true);
    try {
      // Preparar asunto del email: "Movimientos UrbaPark mes año"
      const hoy = new Date();
      const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const mesNombre = meses[hoy.getMonth()];
      const asunto = `Movimientos UrbaPark ${mesNombre} ${hoy.getFullYear()}`;
      const sello = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
      const nombreArchivo = `Movimientos_Humana_${sello}.xlsx`;

      // Abrir cliente de Outlook con mailto
      const destinatario = 'paolacardenas@multiapoyo.com.ec';
      const cuerpo = `Adjunto se envía el archivo ${nombreArchivo} con los movimientos de nómina para procesar.`;
      const mailtoLink = `mailto:${destinatario}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
      
      // Abrir el cliente de Outlook
      window.open(mailtoLink);

      setUploadStatus({
        type: 'success',
        message: `✓ Se abrirá tu cliente de correo. Por favor adjunta el archivo ${nombreArchivo} que se descargó y envía a ${destinatario}`,
      });

    } catch {
      setUploadStatus({
        type: 'error',
        message: 'Error al preparar el envío de movimientos a Humana',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatearFechaDDMMYYYY = (fecha: string) => {
    if (!fecha) return '';
    const [anio, mes, dia] = fecha.split('-');
    if (!anio || !mes || !dia) return '';
    return `${dia}/${mes}/${anio}`;
  };

  const formatearFechaDesdeApiADdMmYyyy = (fecha: string) => {
    if (!fecha) return '';
    const valor = String(fecha).trim();
    if (!valor) return '';

    if (/^\d{2}-\d{2}-\d{4}$/.test(valor)) {
      const [dia, mes, anio] = valor.split('-');
      return `${dia}/${mes}/${anio}`;
    }

    const iso = valor.includes('T') ? valor.split('T')[0] : valor;
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      return formatearFechaDDMMYYYY(iso);
    }

    return '';
  };

  const separarDosApellidosDosNombres = (nombreCompleto: string) => {
    const partes = String(nombreCompleto || '').trim().split(/\s+/).filter(Boolean);
    return {
      apellidoPaterno: partes[0] || '',
      apellidoMaterno: partes[1] || '',
      primerNombre: partes[2] || '',
      segundoNombre: partes.slice(3).join(' '),
    };
  };

  const obtenerTarifaArchivo = (movimiento: MovimientoRow) => {
    const valor = (movimiento.tarifaNueva || movimiento.tarifaActual || '').toUpperCase();
    if (valor === 'TS' || valor === 'TD' || valor === 'TF') return valor;
    if (valor === 'T') return 'TS';
    if (valor === 'T+1') return 'TD';
    if (valor === 'T+FAMILIAR') return 'TF';
    if (movimiento.dependientes.length > 1) return 'TF';
    if (movimiento.dependientes.length === 1) return 'TD';
    return 'TS';
  };

  const tipoMovimientoNumerico = (tipoAccion: MovimientoRow['tipoAccion']) => {
    if (tipoAccion === 'retirar' || tipoAccion === 'eliminar_dependiente') return 11;
    return 10;
  };

  const obtenerCodigoPlanExcel = (tipoPlan: string) => {
    const valor = String(tipoPlan || '').trim().toUpperCase();
    if (valor.includes('10')) return 'PH-10000';
    return 'PH-5000';
  };

  const obtenerCantidadDependientesTarifa = (tarifa: string) => {
    const valor = String(tarifa || '').trim().toUpperCase();
    if (valor === 'T' || valor === 'TS') return 0;
    if (valor === 'T+1' || valor === 'TD') return 1;
    if (valor === 'T+FAMILIAR' || valor === 'TF') return 2;
    return 0;
  };

  const requiereRetiroDependienteCambioTarifa = (m: MovimientoRow) => {
    if (m.tipoAccion !== 'cambiar_tarifa') return false;
    const actual = obtenerCantidadDependientesTarifa(m.tarifaActual);
    const nueva = obtenerCantidadDependientesTarifa(m.tarifaNueva);
    return actual > 0 && nueva < actual;
  };

  const aplicarFormatoHojaPrincipal = (worksheet: ExcelJS.Worksheet, titulo: string, subtitulo: string) => {
    const headers = [
      'EMPRESA',
      'CONTRATO',
      'TIPO DE MOVIMIENTO',
      'IDENTIFICACION',
      'APELLIDO PATERNO',
      'APELLIDO MATERNO',
      'PRIMER NOMBRE',
      'SEGUNDO NOMBRE',
      'FECHA DE NACIMIENTO DD/MM/AA',
      'PARENTESCO',
      'SEXO',
      'F / M',
      'ESTADO CIVIL',
      'FECHA APLICACION MOVIMIENTO DD/MM/AAAA',
      'PLAN CONTRATADO SALUD',
      'TARIFA',
      'BANCO',
      'TIPO DE CUENTA',
      'NUMERO DE CUENTA',
      'CORREO ELECTRONICO',
      'OBSERVACION',
    ];

    worksheet.mergeCells('A1:U1');
    worksheet.getCell('A1').value = titulo;
    worksheet.getCell('A1').font = { bold: true, size: 12 };
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells('A2:U2');
    worksheet.getCell('A2').value = subtitulo;
    worksheet.getCell('A2').font = { bold: true, italic: true, size: 11 };
    worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.getCell('A3').value = 'F02V01-PRO-EMI-MNT-001';
    worksheet.getCell('A3').font = { size: 10 };

    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E4A93' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Combinar SEXO y F/M en una sola celda de encabezado (K4:L4)
    worksheet.mergeCells('K4:L4');
    const sexoHeader = worksheet.getCell('K4');
    sexoHeader.value = 'SEXO / F/M';
    sexoHeader.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
    sexoHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E4A93' } };
    sexoHeader.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    sexoHeader.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };

    worksheet.views = [{ state: 'frozen', ySplit: 4 }];
    worksheet.getRow(4).height = 34;

    worksheet.columns = [
      { width: 42 },
      { width: 10 },
      { width: 14 },
      { width: 16 },
      { width: 18 },
      { width: 18 },
      { width: 16 },
      { width: 16 },
      { width: 18 },
      { width: 12 },
      { width: 8 },
      { width: 8 },
      { width: 14 },
      { width: 24 },
      { width: 20 },
      { width: 10 },
      { width: 14 },
      { width: 18 },
      { width: 16 },
      { width: 22 },
      { width: 16 },
    ];
  };

  const aplicarFormatoHojaExclusiones = (worksheet: ExcelJS.Worksheet) => {
    const headers = [
      'CONTRATO',
      'TIPO MOVI.',
      'IDENTIFICACION',
      'NOMBRES COMPLETOS DEL AFILIADO',
      'PARENTESCO',
      'FECHA EXCLUSION',
      'MOTIVO',
      'OBSERVACIÓN',
    ];

    worksheet.mergeCells('A1:H1');
    worksheet.getCell('A1').value = 'REPORTE DE MOVIMIENTOS';
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 22;

    worksheet.mergeCells('A2:H2');
    worksheet.getCell('A2').value = 'EXCLUSIONES';
    worksheet.getCell('A2').font = { bold: true, underline: true, size: 13 };
    worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(2).height = 20;

    worksheet.mergeCells('A3:H3');
    worksheet.getCell('A3').value = 'F02V01-PRO-EMI-MNT-001';
    worksheet.getCell('A3').font = { size: 10 };
    worksheet.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };

    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E4A93' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    worksheet.views = [{ state: 'frozen', ySplit: 4 }];
    worksheet.getRow(4).height = 28;

    worksheet.columns = [
      { width: 12 },
      { width: 12 },
      { width: 16 },
      { width: 40 },
      { width: 12 },
      { width: 20 },
      { width: 16 },
      { width: 20 },
    ];
  };

  const agregarFilaExclusion = (worksheet: ExcelJS.Worksheet, values: (string | number)[]) => {
    const row = worksheet.addRow(values);
    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      cell.font = { size: 10 };
      cell.alignment = { vertical: 'middle' };
      // CONTRATO y IDENTIFICACION: izquierda; TIPO MOVI: derecha; PARENTESCO: centro
      if (colNumber === 2) cell.alignment = { horizontal: 'right', vertical: 'middle' };
      if (colNumber === 5) cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
  };

  const agregarFilaConBordes = (worksheet: ExcelJS.Worksheet, values: (string | number)[]) => {
    const row = worksheet.addRow(values);
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      cell.alignment = { vertical: 'middle' };
      cell.font = { size: 9 };
    });
  };

  const exportarMovimientosExcel = async () => {
    if (movimientos.length === 0) {
      setExcelValidado(false);
      setConfirmacionExcelValidado(false);
      setUploadStatus({
        type: 'error',
        message: '⚠️ No hay movimientos para exportar.',
      });
      return;
    }

    const movimientosValidos = movimientos.every(validarMovimiento);
    const ingresosSinPlanOTarifa = movimientos.filter(
      (m) => m.tipoAccion === 'ingresar' && (!m.tipoPlan || !m.tarifaNueva)
    );

    if (!movimientosValidos) {
      setExcelValidado(false);
      setConfirmacionExcelValidado(false);

      if (ingresosSinPlanOTarifa.length > 0) {
        const ingresosSinPlan = ingresosSinPlanOTarifa.filter((m) => !m.tipoPlan).length;
        const ingresosSinTarifa = ingresosSinPlanOTarifa.filter((m) => !m.tarifaNueva).length;
        setUploadStatus({
          type: 'error',
          message: `⚠️ No se pudo generar el Excel: hay ${ingresosSinPlanOTarifa.length} ingreso(s) sin plan y/o tarifa (${ingresosSinPlan} sin plan, ${ingresosSinTarifa} sin tarifa).`,
        });
        return;
      }

      setUploadStatus({
        type: 'error',
        message: '⚠️ Corrige los movimientos incompletos antes de exportar el Excel',
      });
      return;
    }

    try {
      const hoy = new Date();
      const fechaAplicacion = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;

      const workbook = new ExcelJS.Workbook();
      const hojaInclusiones = workbook.addWorksheet('INCLUSIONES Y CAMBIOS');
      const hojaExclusiones = workbook.addWorksheet('EXCLUSIONES');
      const hojaCodificacion = workbook.addWorksheet('CODIFICACIÓN');

      aplicarFormatoHojaPrincipal(
        hojaInclusiones,
        'REPORTE DE MOVIMIENTOS INCLUSIONES - CAMBIOS',
        'INCLUSIONES CAMBIOS'
      );
      aplicarFormatoHojaExclusiones(hojaExclusiones);

      const inclusionesCambios = movimientos.filter(
        (m) => m.tipoAccion === 'ingresar' || m.tipoAccion === 'cambiar_tarifa'
      );
      const exclusiones = movimientos.filter((m) => m.tipoAccion === 'retirar');
      const exclusionesDependientes = movimientos.filter((m) => m.tipoAccion === 'eliminar_dependiente');
      const exclusionesCambioTarifa = movimientos.filter(
        (m) => m.tipoAccion === 'cambiar_tarifa' && requiereRetiroDependienteCambioTarifa(m)
      );

      const obtenerDatosExcelEmpleado = (cedula: string): DatosExcelEmpleado => {
        const key = String(cedula || '').trim();
        if (!key) {
          return DATOS_EXCEL_EMPLEADO_VACIO;
        }

        return datosActivosPorCedula[key] || DATOS_EXCEL_EMPLEADO_VACIO;
      };

      for (const movimiento of inclusionesCambios) {
        const tarifa = obtenerTarifaArchivo(movimiento);
        const nombreTitular = separarDosApellidosDosNombres(movimiento.empleadoNombre);
        const esCambioRetiroDependiente = requiereRetiroDependienteCambioTarifa(movimiento);
        const datosExcelTitular = obtenerDatosExcelEmpleado(movimiento.empleadoCedula);
        const codigoPlan = obtenerCodigoPlanExcel(movimiento.tipoPlan || datosExcelTitular.plan);
        const parentescoTitular = String(datosExcelTitular.parentesco || '').trim().toUpperCase();
        const generoTitular = datosExcelTitular.genero === 'M' || datosExcelTitular.genero === 'F' ? datosExcelTitular.genero : '';

        agregarFilaConBordes(hojaInclusiones, [
          EMPRESA_FIJA,
          CONTRATO_FIJO,
          tipoMovimientoNumerico(movimiento.tipoAccion),
          movimiento.empleadoCedula,
          nombreTitular.apellidoPaterno,
          nombreTitular.apellidoMaterno,
          nombreTitular.primerNombre,
          nombreTitular.segundoNombre,
          formatearFechaDesdeApiADdMmYyyy(datosExcelTitular.fechaNacimiento),
          parentescoTitular,
          generoTitular,
          '',
          datosExcelTitular.estadoCivil,
          fechaAplicacion,
          codigoPlan,
          tarifa,
          datosExcelTitular.banco,
          datosExcelTitular.tipoCuenta,
          datosExcelTitular.numeroCuenta,
          datosExcelTitular.correo,
          '',
        ]);
        const filaT = hojaInclusiones.rowCount;
        hojaInclusiones.mergeCells(`K${filaT}:L${filaT}`);

        if (!esCambioRetiroDependiente) {
          movimiento.dependientes.forEach((dependiente) => {
            const esMenor = calcularEdad(dependiente.fechaNacimiento) < 18;
            const bancoDependiente = esMenor ? datosExcelTitular.banco : dependiente.banco;
            const tipoCuentaDependiente = esMenor ? datosExcelTitular.tipoCuenta : dependiente.tipoCuenta;
            const numeroCuentaDependiente = esMenor ? datosExcelTitular.numeroCuenta : dependiente.numeroCuenta;
            const nombreDependiente = separarDosApellidosDosNombres(`${dependiente.apellidos} ${dependiente.nombres}`);
            agregarFilaConBordes(hojaInclusiones, [
              EMPRESA_FIJA,
              CONTRATO_FIJO,
              tipoMovimientoNumerico(movimiento.tipoAccion),
              dependiente.cedula,
              nombreDependiente.apellidoPaterno,
              nombreDependiente.apellidoMaterno,
              nombreDependiente.primerNombre,
              nombreDependiente.segundoNombre,
              formatearFechaDDMMYYYY(dependiente.fechaNacimiento),
              String(dependiente.parentesco || '').trim().toUpperCase(),
              dependiente.genero,
              '',
              dependiente.estadoCivil,
              fechaAplicacion,
              codigoPlan,
              tarifa,
              bancoDependiente,
              tipoCuentaDependiente,
              numeroCuentaDependiente,
              dependiente.correo,
              '',
            ]);
            const filaD = hojaInclusiones.rowCount;
            hojaInclusiones.mergeCells(`K${filaD}:L${filaD}`);
          });
        }
      }

      exclusiones.forEach((movimiento) => {
        const nombreCompleto = String(movimiento.empleadoNombre || '').toUpperCase();
        const datosExcelTitular = obtenerDatosExcelEmpleado(movimiento.empleadoCedula);
        agregarFilaExclusion(hojaExclusiones, [
          CONTRATO_FIJO,
          tipoMovimientoNumerico(movimiento.tipoAccion),
          movimiento.empleadoCedula,
          nombreCompleto,
          String(datosExcelTitular.parentesco || '').trim().toUpperCase(),
          formatearFechaDDMMYYYY(movimiento.fechaSalida),
          'RENUNCIA',
          '',
        ]);
      });

      exclusionesDependientes.forEach((movimiento) => {
        movimiento.dependientes.forEach((dependiente) => {
          const nombreCompleto = `${dependiente.apellidos} ${dependiente.nombres}`.trim().toUpperCase();
          agregarFilaExclusion(hojaExclusiones, [
            CONTRATO_FIJO,
            11,
            dependiente.cedula || '',
            nombreCompleto,
            String(dependiente.parentesco || '').trim().toUpperCase(),
            formatearFechaDDMMYYYY(movimiento.fechaSalida),
            'RETIRO DEPENDIENTE',
            '',
          ]);
        });
      });

      exclusionesCambioTarifa.forEach((movimiento) => {
        movimiento.dependientes.forEach((dependiente) => {
          const nombreCompleto = `${dependiente.apellidos} ${dependiente.nombres}`.trim().toUpperCase();
          agregarFilaExclusion(hojaExclusiones, [
            CONTRATO_FIJO,
            11,
            dependiente.cedula || '',
            nombreCompleto,
            String(dependiente.parentesco || '').trim().toUpperCase(),
            formatearFechaDDMMYYYY(movimiento.fechaSalida),
            'CAMBIO TARIFA',
            'RETIRO DE DEPENDIENTE',
          ]);
        });
      });

      // --- CODIFICACIÓN sheet ---
      const GRIS_COD = 'FFD9D9D9';
      const SALMON_COD = 'FFFFCC99';
      const setBorder = (cell: ExcelJS.Cell) => {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      };

      hojaCodificacion.columns = [
        { width: 12 },
        { width: 50 },
        { width: 16 },
        { width: 30 },
      ];

      // Row 1: Title
      hojaCodificacion.mergeCells('A1:D1');
      const titCod = hojaCodificacion.getCell('A1');
      titCod.value = 'INCLUSIONES Y CAMBIOS';
      titCod.font = { bold: true, size: 13 };
      titCod.alignment = { horizontal: 'center', vertical: 'middle' };
      hojaCodificacion.getRow(1).height = 26;

      // Row 2: empty spacer
      hojaCodificacion.getRow(2).height = 8;

      // Row 3: section headers
      hojaCodificacion.mergeCells('A3:B3');
      const hTipo = hojaCodificacion.getCell('A3');
      hTipo.value = 'TIPO DE MOVIMIENTO';
      hTipo.font = { bold: true, size: 10 };
      hTipo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS_COD } };
      hTipo.alignment = { horizontal: 'center', vertical: 'middle' };
      setBorder(hTipo);

      // "TARIFA Y PARENTESCO" spans C3:D4 (2 rows)
      hojaCodificacion.mergeCells('C3:D4');
      const hTarPar = hojaCodificacion.getCell('C3');
      hTarPar.value = 'TARIFA Y PARENTESCO';
      hTarPar.font = { bold: true, size: 10 };
      hTarPar.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS_COD } };
      hTarPar.alignment = { horizontal: 'center', vertical: 'middle' };
      setBorder(hTarPar);
      hojaCodificacion.getRow(3).height = 20;

      // Row 4: sub-headers left side
      const hCod = hojaCodificacion.getCell('A4');
      hCod.value = 'COD.  MOVI.';
      hCod.font = { bold: true, size: 10 };
      hCod.alignment = { horizontal: 'center', vertical: 'middle' };
      setBorder(hCod);

      const hDesc = hojaCodificacion.getCell('B4');
      hDesc.value = 'DESCRIPCION DE MOVIMIENTO.';
      hDesc.font = { bold: true, size: 10 };
      hDesc.alignment = { horizontal: 'left', vertical: 'middle' };
      setBorder(hDesc);
      hojaCodificacion.getRow(4).height = 20;

      // Rows 5-10: movement codes
      const movCods: [number, string][] = [
        [2,  'INCLUSION DE NUEVOS TITULAR Y DEPENDIENTE/S'],
        [6,  'ACTUALIZACION DE DATOS ( Nombres, género, Identifica, etc.)'],
        [8,  'MATERNIDAD'],
        [9,  'ENROLAMIENTO DE TITULAR/ES  SOLO/S'],
        [10, 'INCLUSION DE DEPENDIENTE/S'],
        [13, 'CAMBIO DE MONTO DE PLAN O TARIFA'],
      ];
      movCods.forEach(([cod, desc], idx) => {
        const r = 5 + idx;
        const cCod = hojaCodificacion.getCell(`A${r}`);
        cCod.value = cod;
        cCod.font = { bold: true, size: 10 };
        cCod.alignment = { horizontal: 'center', vertical: 'middle' };
        setBorder(cCod);
        const cDesc = hojaCodificacion.getCell(`B${r}`);
        cDesc.value = desc;
        cDesc.font = { size: 10 };
        cDesc.alignment = { horizontal: 'left', vertical: 'middle' };
        setBorder(cDesc);
        hojaCodificacion.getRow(r).height = 18;
      });

      // C5:C7 merged = "TARIFA" label
      hojaCodificacion.mergeCells('C5:C7');
      const lblTarifa = hojaCodificacion.getCell('C5');
      lblTarifa.value = 'TARIFA';
      lblTarifa.font = { bold: true, size: 10 };
      lblTarifa.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS_COD } };
      lblTarifa.alignment = { horizontal: 'center', vertical: 'middle' };
      setBorder(lblTarifa);

      // D5:D7 tarifa descriptions
      const tarifaVals = ['TS = TITULAR', 'TD = TITULAR + DEPENDIENTE', 'TF = TITULAR + FAMILIA'];
      tarifaVals.forEach((val, idx) => {
        const cell = hojaCodificacion.getCell(`D${5 + idx}`);
        cell.value = val;
        cell.font = { size: 10 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        setBorder(cell);
      });

      // C8:C10 merged = "PARENTESCO" label
      hojaCodificacion.mergeCells('C8:C10');
      const lblParentesco = hojaCodificacion.getCell('C8');
      lblParentesco.value = 'PARENTESCO';
      lblParentesco.font = { bold: true, size: 10 };
      lblParentesco.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS_COD } };
      lblParentesco.alignment = { horizontal: 'center', vertical: 'middle' };
      setBorder(lblParentesco);

      // D8:D10 parentesco values with salmon background
      const parentescoVals = ['T = TITULAR', 'C = C\u00d3NYUGE', 'H = HIJO (A)'];
      parentescoVals.forEach((val, idx) => {
        const cell = hojaCodificacion.getCell(`D${8 + idx}`);
        cell.value = val;
        cell.font = { size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SALMON_COD } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        setBorder(cell);
      });

      const ahora = new Date();
      const sello = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
      const fileName = `Movimientos_Humana_${sello}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setUploadStatus({
        type: 'success',
        message: '✓ Excel generado con 3 pestañas correctamente',
      });
      setExcelValidado(true);
      setConfirmacionExcelValidado(false);
    } catch (error) {
      console.error('Error exportando Excel de movimientos:', error);
      setExcelValidado(false);
      setConfirmacionExcelValidado(false);
      setUploadStatus({
        type: 'error',
        message: '⚠️ Ocurrio un error al generar el Excel',
      });
    }
  };

  const titularesAgrupados = movimientos.reduce((acc, movimiento) => {
    const key = String(movimiento.empleadoCedula || '').trim() || String(movimiento.id);
    const existente = acc.get(key) || {
      key: `titular-${key}`,
      movimientoId: movimiento.id,
      movimientoRetiroId: '',
      movimientoIds: new Set<string>(),
      nombre: movimiento.empleadoNombre || '-',
      cedula: movimiento.empleadoCedula || '-',
      parentesco: 'TITULAR',
      tipoPlan: '-',
      tarifa: '-',
      fechaIngreso: '',
      fechaExclusion: '-',
      etiquetasMovimiento: new Set<string>(),
      esTitular: true,
      esSalida: false,
    };

    existente.movimientoIds.add(movimiento.id);

    if (movimiento.tipoAccion === 'ingresar') {
      existente.fechaIngreso = movimiento.fechaSalida || existente.fechaIngreso;
      existente.etiquetasMovimiento.add('Ingresar');
    } else if (movimiento.tipoAccion === 'retirar') {
      if (!existente.fechaIngreso && movimiento.fechaIngreso) {
        existente.fechaIngreso = movimiento.fechaIngreso;
      }
      existente.fechaExclusion = movimiento.fechaSalida || existente.fechaExclusion;
      existente.etiquetasMovimiento.add('Retirar');
      existente.esSalida = true;
      existente.movimientoRetiroId = movimiento.id;
    } else if (movimiento.tipoAccion === 'eliminar_dependiente') {
      existente.fechaExclusion = movimiento.fechaSalida || existente.fechaExclusion;
      existente.etiquetasMovimiento.add('Eliminar dependiente');
    } else if (movimiento.tipoAccion === 'cambiar_tarifa') {
      if (!existente.fechaIngreso) {
        const fechaIngresoActivo = String(datosActivosPorCedula[movimiento.empleadoCedula]?.fechaIngreso || '').trim();
        existente.fechaIngreso = convertirFechaApiAInput(fechaIngresoActivo) || existente.fechaIngreso;
      }
      existente.etiquetasMovimiento.add(
        requiereRetiroDependienteCambioTarifa(movimiento)
          ? 'Cambiar tarifa (Retirar dependiente)'
          : 'Cambiar tarifa'
      );
    }

    if (movimiento.tipoPlan) {
      existente.tipoPlan = movimiento.tipoPlan;
    }

    if (movimiento.tarifaNueva) {
      existente.tarifa = movimiento.tarifaNueva;
    }

    acc.set(key, existente);
    return acc;
  }, new Map<string, {
    key: string;
    movimientoId: string;
    movimientoRetiroId: string;
    movimientoIds: Set<string>;
    nombre: string;
    cedula: string;
    parentesco: string;
    tipoPlan: string;
    tarifa: string;
    fechaIngreso: string;
    fechaExclusion: string;
    etiquetasMovimiento: Set<string>;
    esTitular: boolean;
    esSalida: boolean;
  }>());

  const filasTitularesConsolidadas = Array.from(titularesAgrupados.values()).map((fila) => ({
    key: fila.key,
    origen: 'movimiento' as const,
    movimientoId: fila.movimientoId,
    movimientoRetiroId: fila.movimientoRetiroId,
    nombre: fila.nombre || '-',
    cedula: fila.cedula || '-',
    parentesco: fila.parentesco,
    esSalida: fila.esSalida,
    esRetiro: fila.etiquetasMovimiento.has('Retirar') && fila.fechaExclusion !== '-',
    movimiento:
      fila.etiquetasMovimiento.has('Retirar') && fila.fechaExclusion !== '-'
        ? 'Retirar'
        : (Array.from(fila.etiquetasMovimiento).join(' / ') || '-'),
    tipoPlan: fila.tipoPlan || '-',
    tarifa: fila.tarifa || '-',
    fechaIngreso: fila.fechaIngreso || '-',
    fechaExclusion: fila.fechaExclusion || '-',
    esTitular: true,
    permiteAcciones: !fila.esSalida && fila.movimientoIds.size === 1,
  }));

  const filasConsolidadas = [...filasTitularesConsolidadas];

  const opcionesTarifaNueva = [
    { value: 'T', label: 'T - Titular Solo' },
    { value: 'T+1', label: 'T+1 - Titular + 1 Dependiente' },
    { value: 'T+FAMILIAR', label: 'T+FAMILIAR - Titular + Familia' },
  ];
  const tarifaActualEnModal = normalizarTarifaApi(movimientoModal.tarifaActual);
  const incluirTarifaActual =
    Boolean(tarifaActualEnModal)
    && !opcionesTarifaNueva.some((opcion) => opcion.value === tarifaActualEnModal);

  return (
    <div className="h-full overflow-y-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pr-2">
      {generandoMovimientos && (
        <div className="fixed inset-0 z-[70] bg-slate-900/55 backdrop-blur-[1px] flex items-center justify-center">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl px-8 py-7 max-w-md w-[92%] text-center">
            <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin" />
            <h4 className="text-lg font-black text-slate-800">Generando lista de empleados</h4>
            <p className="mt-2 text-sm text-slate-600">
              Estamos consultando ingresos y exclusiones. Espera un momento para continuar.
            </p>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex justify-between items-end mb-2">
        <div>
        </div>
      </div>

      {/* ESTADO */}
      {uploadStatus.type && (
        <div className={`p-4 rounded-xl border ${uploadStatus.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          <div className="flex items-center gap-2">
            {uploadStatus.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="font-semibold text-sm">{uploadStatus.message}</span>
          </div>
        </div>
      )}

      {/* GESTIÓN COMPLETA DE MOVIMIENTOS */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <div className="mb-6">
          <h3 className="text-lg font-black text-slate-800 mb-4">Gestión Completa de Movimientos</h3>
          <p className="text-xs text-slate-500 mb-6">Visualiza, edita, agrega y elimina empleados con sus movimientos</p>

          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-800">Tabla Consolidada de Movimientos</h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void generarMovimientosDesdeApi()}
                  disabled={generandoMovimientos}
                  className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors font-semibold text-sm disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  <Plus size={16} />
                  {generandoMovimientos ? 'Generando...' : 'Generar Ingresos/Exclusiones'}
                </button>
                <button
                  onClick={abrirModalNuevo}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-semibold text-sm"
                >
                  <Plus size={16} />
                  Cambiar Tarifa
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-600">Nombre</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Cédula</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Parentesco</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Movimiento</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Plan</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Tarifa</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Fecha Ingreso</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Fecha Exclusión</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filasConsolidadas.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                        No hay movimientos agregados todavía.
                      </td>
                    </tr>
                  ) : (
                    filasConsolidadas.map((fila) => (
                      <tr key={fila.key} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">{fila.nombre || '-'}</td>
                        <td className="px-4 py-3 text-slate-600">{fila.cedula || '-'}</td>
                        <td className="px-4 py-3 text-slate-600">{fila.parentesco}</td>
                        <td className="px-4 py-3 text-slate-600">{fila.movimiento}</td>
                        <td className="px-4 py-3 text-slate-600">{fila.tipoPlan}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {fila.tarifa}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {fila.fechaIngreso}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {fila.fechaExclusion}
                        </td>
                        <td className="px-4 py-3">
                          {fila.esTitular ? (
                            fila.esRetiro && fila.movimientoRetiroId ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => eliminarMovimiento(fila.movimientoRetiroId)}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Eliminar"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ) : fila.permiteAcciones ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => abrirModalEdicion(fila.movimientoId)}
                                  className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Editar"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => eliminarMovimiento(fila.movimientoId)}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Eliminar"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ) : (
                              null
                            )
                          ) : (
                            <span className="text-xs text-slate-400">Gestionado por titular</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* MENSAJE DE ERROR ARRIBA DEL EXCEL */}
            {uploadStatus.type === 'error' && (
              <div className={`mt-4 p-4 rounded-xl border bg-red-50 border-red-200 text-red-700`}>
                <div className="flex items-center gap-2">
                  <AlertCircle size={20} />
                  <span className="font-semibold text-sm">{uploadStatus.message}</span>
                </div>
              </div>
            )}

            {/* BOTONES DE EXPORTAR Y ENVIAR */}
            <div className="mt-6 flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void exportarMovimientosExcel()}
                  className="flex items-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors font-semibold"
                >
                  <Download size={18} />
                  Exportar Excel
                </button>
                <button
                  onClick={enviarMovimientos}
                  disabled={loading || !excelValidado || !confirmacionExcelValidado}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                    loading || !excelValidado || !confirmacionExcelValidado
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-[#001F3F] text-white hover:bg-blue-900 shadow-lg'
                  }`}
                >
                  <Send size={18} />
                  {loading ? 'Enviando' : 'Enviar a Humana'}
                </button>
              </div>
              <label className={`flex items-center gap-2 text-sm ${excelValidado ? 'text-slate-700' : 'text-slate-400'}`}>
                <input
                  type="checkbox"
                  checked={confirmacionExcelValidado}
                  onChange={(e) => setConfirmacionExcelValidado(e.target.checked)}
                  disabled={!excelValidado}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed"
                />
                Excel validado
              </label>
              {(!excelValidado || !confirmacionExcelValidado) && (
                <p className="text-xs text-slate-500">Primero exporta el Excel sin errores y luego marca la casilla para habilitar el envio a Humana.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-start justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-2xl border border-slate-200 shadow-xl p-6 my-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-black text-slate-800">
                {modoModal === 'crear' ? 'Agregar Movimiento' : 'Editar Movimiento'}
              </h4>
              <button
                onClick={cerrarModal}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cerrar
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <AlertCircle size={16} />
                  <span>{modalError}</span>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Empleado *</label>
                  <input
                    type="text"
                    value={movimientoModal.empleadoNombre}
                    onChange={(e) => actualizarMovimientoModal('empleadoNombre', e.target.value)}
                    placeholder="Buscar empleado..."
                    list="empleados-modal"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <datalist id="empleados-modal">
                    {obtenerEmpleadosPorNombre(movimientoModal.empleadoNombre).map(emp => (
                      <option key={emp.cedula} value={`${emp.apellidos} ${emp.nombres}`}>
                        {emp.cedula}
                      </option>
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Tipo de Movimiento *</label>
                  <select
                    value={movimientoModal.tipoAccion}
                    onChange={(e) => actualizarMovimientoModal('tipoAccion', e.target.value as MovimientoRow['tipoAccion'])}
                    disabled={!movimientoModal.empleadoNombre}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="eliminar_dependiente">Eliminar Dependiente</option>
                    <option value="cambiar_tarifa">Cambiar Tarifa</option>
                  </select>
                </div>
              </div>

              {movimientoModal.tipoAccion === 'eliminar_dependiente' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-2">Dependiente a Eliminar *</label>
                    <select
                      value={familiaresSeleccionados.retiro_dependiente || ''}
                      onChange={(e) => seleccionarDependienteARetirar(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      disabled={cargandoFamiliares || familiaresDisponibles.length === 0}
                    >
                      <option value="">
                        {cargandoFamiliares
                          ? 'Cargando familiares...'
                          : familiaresDisponibles.length === 0
                            ? 'No se encuentran familiares disponibles'
                            : 'Seleccionar dependiente...'}
                      </option>
                      {familiaresDisponibles.map((familiar) => (
                        <option key={`${familiar.nombre}-${familiar.cedula || 'sin-cedula'}`} value={familiar.nombre}>
                          {familiar.nombre}{familiar.cedula ? ` - ${familiar.cedula}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-2">Cédula del Dependiente *</label>
                    <input
                      type="text"
                      value={movimientoModal.dependientes[0]?.cedula || ''}
                      onChange={(e) => {
                        if (movimientoModal.dependientes[0]) {
                          actualizarDependienteModal(movimientoModal.dependientes[0].id, 'cedula', e.target.value);
                        }
                      }}
                      maxLength={10}
                      placeholder="Escribe la cédula del dependiente"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {movimientoModal.tipoAccion === 'cambiar_tarifa' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-2">Tipo de Plan *</label>
                    <select
                      value={movimientoModal.tipoPlan}
                      onChange={(e) => actualizarMovimientoModal('tipoPlan', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Seleccionar plan...</option>
                      <option value="PLAN 5">PLAN 5</option>
                      <option value="PLAN 10">PLAN 10</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-2">
                      {movimientoModal.tipoAccion === 'cambiar_tarifa' ? 'Nueva Tarifa *' : 'Tarifa *'}
                    </label>
                    <select
                      value={movimientoModal.tarifaNueva}
                      onChange={(e) => actualizarMovimientoModal('tarifaNueva', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Seleccionar tarifa...</option>
                      {incluirTarifaActual && (
                        <option value={tarifaActualEnModal}>{`${tarifaActualEnModal} - Tarifa actual (API)`}</option>
                      )}
                      {opcionesTarifaNueva.map((opcion) => (
                        <option key={opcion.value} value={opcion.value}>{opcion.label}</option>
                      ))}
                    </select>
                  </div>

                  {movimientoModal.tipoAccion === 'cambiar_tarifa' && requiereRetiroDependienteCambioTarifa(movimientoModal) && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-2">Fecha de Exclusión</label>
                        <div className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-600 flex items-center">
                          {cargandoFechaApi
                            ? 'Cargando fecha...'
                            : (movimientoModal.fechaSalida || 'Sin fecha')}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-2">Dependiente a Eliminar *</label>
                        <select
                          value={familiaresSeleccionados.retiro_dependiente || ''}
                          onChange={(e) => seleccionarDependienteARetirar(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          disabled={cargandoFamiliares || familiaresDisponibles.length === 0}
                        >
                          <option value="">
                            {cargandoFamiliares
                              ? 'Cargando familiares...'
                              : familiaresDisponibles.length === 0
                                ? 'No se encuentran familiares disponibles'
                                : 'Seleccionar dependiente...'}
                          </option>
                          {familiaresDisponibles.map((familiar) => (
                            <option key={`${familiar.nombre}-${familiar.cedula || 'sin-cedula'}`} value={familiar.nombre}>
                              {familiar.nombre}{familiar.cedula ? ` - ${familiar.cedula}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {!requiereRetiroDependienteCambioTarifa(movimientoModal) && (movimientoModal.tarifaNueva === 'T+1' || movimientoModal.tarifaNueva === 'T+FAMILIAR') && (
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-semibold text-slate-800 text-sm">Datos de Dependientes</h5>
                        {movimientoModal.tarifaNueva === 'T+FAMILIAR' && (
                          <button
                            onClick={agregarDependienteModal}
                            className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-xs font-semibold hover:bg-emerald-100"
                          >
                            <Plus size={14} />
                            Agregar dependiente
                          </button>
                        )}
                      </div>

                      <div className="space-y-4">
                        {movimientoModal.dependientes.map((dependiente, index) => {
                          const edad = calcularEdad(dependiente.fechaNacimiento);
                          const esMenor = edad < 18;

                          return (
                            <div key={dependiente.id} className="p-4 bg-white rounded-lg border border-slate-200">
                              <div className="flex items-center justify-between mb-3">
                                <h6 className="font-semibold text-sm text-slate-700">
                                  Dependiente #{index + 1}
                                  {esMenor && dependiente.fechaNacimiento && (
                                    <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">
                                      Menor de edad ({edad} años)
                                    </span>
                                  )}
                                </h6>
                                {movimientoModal.tarifaNueva === 'T+FAMILIAR' && movimientoModal.dependientes.length > 1 && (
                                  <button
                                    onClick={() => eliminarDependienteModal(dependiente.id)}
                                    className="text-red-500 hover:bg-red-50 p-1 rounded"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="md:col-span-2">
                                  <label className="block text-xs font-semibold text-slate-600 mb-1">Familiar disponible</label>
                                  <select
                                    value={familiaresSeleccionados[dependiente.id] || ''}
                                    onChange={(e) => seleccionarFamiliarDependiente(dependiente.id, e.target.value)}
                                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    disabled={cargandoFamiliares || familiaresDisponibles.length === 0}
                                  >
                                    <option value="">
                                      {cargandoFamiliares
                                        ? 'Cargando familiares...'
                                        : familiaresDisponibles.length === 0
                                          ? 'No se encuentran familiares disponibles'
                                          : 'Seleccionar familiar...'}
                                    </option>
                                    {familiaresDisponibles.map((familiar) => (
                                      <option key={familiar.nombre} value={familiar.nombre}>
                                        {familiar.nombre}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-xs font-semibold text-slate-600 mb-1">Apellidos *</label>
                                  <input
                                    type="text"
                                    value={dependiente.apellidos}
                                    onChange={(e) => actualizarDependienteModal(dependiente.id, 'apellidos', e.target.value)}
                                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nombres *</label>
                                  <input
                                    type="text"
                                    value={dependiente.nombres}
                                    onChange={(e) => actualizarDependienteModal(dependiente.id, 'nombres', e.target.value)}
                                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-semibold text-slate-600 mb-1">Cédula *</label>
                                  <input
                                    type="text"
                                    value={dependiente.cedula}
                                    onChange={(e) => actualizarDependienteModal(dependiente.id, 'cedula', e.target.value)}
                                    maxLength={10}
                                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha de Nacimiento *</label>
                                  <input
                                    type="date"
                                    value={dependiente.fechaNacimiento}
                                    onChange={(e) => actualizarDependienteModal(dependiente.id, 'fechaNacimiento', e.target.value)}
                                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-semibold text-slate-600 mb-1">Género *</label>
                                  <select
                                    value={dependiente.genero}
                                    onChange={(e) => actualizarDependienteModal(dependiente.id, 'genero', e.target.value as DependienteForm['genero'])}
                                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                  >
                                    <option value="">Seleccionar...</option>
                                    <option value="M">Masculino</option>
                                    <option value="F">Femenino</option>
                                  </select>
                                </div>

                                {!esMenor && dependiente.fechaNacimiento && (
                                  <>
                                    <div className="md:col-span-2 mt-2 mb-1">
                                      <hr className="border-slate-300" />
                                      <p className="text-xs font-semibold text-slate-600 mt-2">Datos Bancarios</p>
                                    </div>

                                    <div>
                                      <label className="block text-xs font-semibold text-slate-600 mb-1">Banco</label>
                                      <input
                                        type="text"
                                        value={dependiente.banco}
                                        onChange={(e) => actualizarDependienteModal(dependiente.id, 'banco', e.target.value)}
                                        className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Nombre del banco"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo de Cuenta</label>
                                      <select
                                        value={dependiente.tipoCuenta}
                                        onChange={(e) => actualizarDependienteModal(dependiente.id, 'tipoCuenta', e.target.value)}
                                        className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                      >
                                        <option value="">Seleccionar...</option>
                                        <option value="AHORROS">Ahorros</option>
                                        <option value="CORRIENTE">Corriente</option>
                                      </select>
                                    </div>

                                    <div className="md:col-span-2">
                                      <label className="block text-xs font-semibold text-slate-600 mb-1">Número de Cuenta</label>
                                      <input
                                        type="text"
                                        value={dependiente.numeroCuenta}
                                        onChange={(e) => actualizarDependienteModal(dependiente.id, 'numeroCuenta', e.target.value)}
                                        className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Número de cuenta bancaria"
                                      />
                                    </div>

                                    <div className="md:col-span-2">
                                      <label className="block text-xs font-semibold text-slate-600 mb-1">Correo Electrónico</label>
                                      <input
                                        type="email"
                                        value={dependiente.correo}
                                        onChange={(e) => actualizarDependienteModal(dependiente.id, 'correo', e.target.value)}
                                        className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="correo@ejemplo.com"
                                      />
                                    </div>
                                  </>
                                )}

                                {esMenor && dependiente.fechaNacimiento && (
                                  <div className="md:col-span-2">
                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                                      <strong>Nota:</strong> Los datos bancarios serán los del titular que lo representa.
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={cerrarModal}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarMovimientoModal}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#001F3F] hover:bg-blue-900"
                >
                  Guardar movimiento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovimientosHumanaView;
