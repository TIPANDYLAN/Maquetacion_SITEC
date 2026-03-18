import { useEffect, useMemo, useState } from 'react';

type SeccionValets = 'horario_fijo' | 'gestionar_valet';
type DiaLaboralKey = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';

interface EmpleadoNominaApiItem {
  json?: {
    CEDULA?: string;
    NOMBRES?: string;
    APELLIDOS?: string;
  };
}

interface EmpleadoOption {
  cedula: string;
  nombre: string;
}

interface CentroCosto {
  IDCENTROCOSTO: string;
  CENTROCOSTO: string;
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

const OPCIONES_HORA_MEDIA = Array.from({ length: 48 }, (_, index) => {
  const horas = Math.floor(index / 2);
  const minutos = index % 2 === 0 ? '00' : '30';
  return `${String(horas).padStart(2, '0')}:${minutos}`;
});

const etiquetaEmpleado = (empleado: EmpleadoOption): string => `${empleado.nombre} - ${empleado.cedula}`;
const etiquetaCentro = (centro: CentroCosto): string => `${centro.IDCENTROCOSTO} - ${centro.CENTROCOSTO}`;

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

const esMediaHoraValida = (hora: string): boolean => {
  const partes = hora.split(':');
  if (partes.length < 2) return false;
  const minutos = Number(partes[1]);
  return minutos === 0 || minutos === 30;
};

const ValetsFijosView = () => {
  const hoy = new Date();
  const [empleados, setEmpleados] = useState<EmpleadoOption[]>([]);
  const [centrosCosto, setCentrosCosto] = useState<CentroCosto[]>([]);
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
  const [modalEmpleadoInput, setModalEmpleadoInput] = useState('');
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
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error' | null; text: string }>({
    type: null,
    text: '',
  });

  useEffect(() => {
    void cargarEmpleados();
    void cargarCentrosCosto();
  }, []);

  const cargarEmpleados = async () => {
    setLoadingEmpleados(true);
    try {
      const response = await fetch('/api/n8n/webhook/lista/empleados/nomina', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`No se pudo cargar empleados: ${response.statusText}`);
      }

      const rawData = await response.json();
      const empleadosApi = Array.isArray(rawData) ? rawData : [];

      const empleadosNormalizados = empleadosApi
        .map((item: EmpleadoNominaApiItem) => {
          const cedula = String(item?.json?.CEDULA || '').trim();
          const nombres = String(item?.json?.NOMBRES || '').trim();
          const apellidos = String(item?.json?.APELLIDOS || '').trim();
          const nombre = `${apellidos} ${nombres}`.trim();
          return { cedula, nombre };
        })
        .filter((item: EmpleadoOption) => item.cedula && item.nombre)
        .sort((a: EmpleadoOption, b: EmpleadoOption) =>
          a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }),
        );

      const unicos = Array.from(
        new Map(empleadosNormalizados.map((item: EmpleadoOption) => [item.cedula, item])).values(),
      );

      setEmpleados(unicos);
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
      const response = await fetch('/api/n8n/webhook/centro/costo/nomina', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`No se pudo cargar centros de costo: ${response.statusText}`);
      }

      const data = await response.json();
      const centrosFormateados = Array.isArray(data)
        ? data
            .map((item: unknown) => {
              const row = (item ?? {}) as { json?: { IDCENTROCOSTO?: string; CENTROCOSTO?: string } };
              return {
                IDCENTROCOSTO: String(row.json?.IDCENTROCOSTO || '').trim(),
                CENTROCOSTO: String(row.json?.CENTROCOSTO || '').trim(),
              };
            })
            .filter((c: CentroCosto) => c.IDCENTROCOSTO && c.CENTROCOSTO)
        : [];

      const unicos = Array.from(
        new Map(
          centrosFormateados.map((centro: CentroCosto) => [
            `${centro.IDCENTROCOSTO}|${centro.CENTROCOSTO}`,
            centro,
          ]),
        ).values(),
      );

      setCentrosCosto(unicos);
    } catch (error) {
      console.error('Error cargando centros de costo para valets fijos:', error);
      setCentrosCosto([]);
      setMensaje({ type: 'error', text: 'No se pudo cargar la lista de centros de costo desde n8n.' });
    } finally {
      setLoadingCentros(false);
    }
  };

  const centroHorarioSeleccionado = useMemo(() => {
    const valor = centroHorarioInput.trim();
    if (!valor) return null;

    const porCodigo = centrosCosto.find((item) => item.IDCENTROCOSTO === valor);
    if (porCodigo) return porCodigo;

    return centrosCosto.find((item) => etiquetaCentro(item).toLowerCase() === valor.toLowerCase()) || null;
  }, [centroHorarioInput, centrosCosto]);

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

  const abrirModalAdicionales = (empleado: ValetAsignadoCentro) => {
    const configGuardada = adicionalesPorEmpleado[empleado.id];
    setEmpleadoAdicionalSeleccionado(empleado);
    setModalHabilitarDiaAdicional(configGuardada?.habilitarDiaAdicional ?? false);
    setModalDiaAdicionalAnio(configGuardada?.diaAdicionalAnio ?? hoy.getFullYear());
    setModalDiaAdicionalMes(configGuardada?.diaAdicionalMes ?? hoy.getMonth() + 1);
    setModalDiaAdicionalSemanas(
      SEMANAS_DISPONIBLES.map((semana) => {
        const guardada = configGuardada?.diaAdicionalSemanas?.find((item) => item.semana === semana);
        return {
          semana,
          habilitado: guardada?.habilitado ?? false,
          dias: (guardada?.dias ?? []).filter((d) => d.dia !== 'domingo'),
        };
      }),
    );
    setModalHabilitarDomingo(configGuardada?.habilitarDomingo ?? false);
    setModalDomingoAnio(configGuardada?.domingoAnio ?? hoy.getFullYear());
    setModalDomingoMes(configGuardada?.domingoMes ?? hoy.getMonth() + 1);
    setModalDomingoSemanas(
      (configGuardada?.domingoSemanas ?? [])
        .filter((semana) => SEMANAS_DISPONIBLES.includes(semana))
        .sort((a, b) => a - b),
    );
    setModalAdicionalesOpen(true);
  };

  const cerrarModalAdicionales = () => {
    setModalAdicionalesOpen(false);
    setEmpleadoAdicionalSeleccionado(null);
  };

  const handleToggleDiaAdicionalSemana = (semana: number, habilitado: boolean) => {
    setModalDiaAdicionalSemanas((prev) => prev.map((item) => (
      item.semana === semana ? { ...item, habilitado, dias: habilitado ? item.dias : [] } : item
    )));
  };

  const handleAgregarDiaAdicional = (semana: number) => {
    setModalDiaAdicionalSemanas((prev) => prev.map((item) => {
      if (item.semana !== semana) return item;
      return {
        ...item,
        dias: [...item.dias, { dia: 'lunes', horaEntrada: '', horaSalida: '' }],
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
      return {
        ...item,
        dias: item.dias.map((d, idx) => {
          if (idx !== indexDia) return d;
          if (campo === 'dia') {
            return { ...d, dia: valor as DiaLaboralKey };
          }
          return { ...d, [campo]: valor };
        }),
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

  const handleGuardarAdicionales = () => {
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

          if (!esMediaHoraValida(diaDia.horaEntrada) || !esMediaHoraValida(diaDia.horaSalida)) {
            setMensaje({ type: 'error', text: `Las horas de semana ${semanaDia.semana} deben estar en punto o media (:00 o :30).` });
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

    setMensaje({
      type: 'success',
      text: `Adicionales actualizados para ${empleadoAdicionalSeleccionado.empleadoNombre}.`,
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

    if (!esMediaHoraValida(horaEntradaHorario) || !esMediaHoraValida(horaSalidaHorario)) {
      setMensaje({ type: 'error', text: 'Las horas deben estar en punto o media (:00 o :30).' });
      return;
    }

    if (calcularHorasTrabajadas(horaEntradaHorario, horaSalidaHorario) <= 0) {
      setMensaje({ type: 'error', text: 'La hora de salida debe ser mayor a la hora de entrada.' });
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
      dia: diaHorario,
      horaEntrada: horaEntradaHorario,
      horaSalida: horaSalidaHorario,
    };

    setHorariosFijosGuardados((prev) => {
      const sinDuplicado = prev.filter((item) => !(
        item.empleadoCedula === nuevoHorario.empleadoCedula
        && item.anio === nuevoHorario.anio
        && item.mes === nuevoHorario.mes
        && item.semana === nuevoHorario.semana
        && item.dia === nuevoHorario.dia
      ));
      return [nuevoHorario, ...sinDuplicado];
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
      text: `Horario guardado para ${empleadoSeleccionado.nombre} en semana ${semanaHorario}, ${DIAS_LABORALES.find((d) => d.key === diaHorario)?.label || diaHorario}.`,
    });

    setHoraEntradaHorario('');
    setHoraSalidaHorario('');
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

    setAsignacionesCentro((prev) => {
      const sinDuplicado = prev.filter((item) => !(
        item.centroCostoId === nuevaAsignacion.centroCostoId
        && item.empleadoCedula === nuevaAsignacion.empleadoCedula
      ));
      return [nuevaAsignacion, ...sinDuplicado];
    });

    setModalAgregarOpen(false);
    setModalEmpleadoInput('');
    setModalValorFijo('');
    setMensaje({ type: 'success', text: 'Empleado agregado correctamente al centro de costo.' });
  };

  const horariosEmpleadoPeriodo = useMemo(() => {
    if (!empleadoSeleccionado) return [];
    return horariosFijosGuardados
      .filter((item) => item.empleadoCedula === empleadoSeleccionado.cedula && item.anio === anio && item.mes === mes)
      .sort((a, b) => a.semana - b.semana || DIAS_LABORALES.findIndex((d) => d.key === a.dia) - DIAS_LABORALES.findIndex((d) => d.key === b.dia));
  }, [horariosFijosGuardados, empleadoSeleccionado, anio, mes]);

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
            list="valets-fijos-centros"
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

      {centroHorarioSeleccionado && empleadosCentroHorario.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-700">
          No existen empleados dentro de ese centro de costo.
        </div>
      )}

      <div className="space-y-3 max-w-4xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
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
        </div>

        <div className="border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 max-w-sm">
          <p className="text-[11px] font-semibold text-slate-600">Semana</p>
          <select
            value={semanaHorario}
            onChange={(e) => setSemanaHorario(Number(e.target.value))}
            className="w-full mt-1 border border-slate-300 rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[1, 2, 3, 4, 5].map((semana) => (
              <option key={semana} value={semana}>Semana {semana}</option>
            ))}
          </select>
        </div>
      </div>

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

      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="min-w-full bg-white text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left text-xs font-bold text-slate-600 px-4 py-3">Centro de costo</th>
              <th className="text-left text-xs font-bold text-slate-600 px-4 py-3">Semana</th>
              <th className="text-left text-xs font-bold text-slate-600 px-4 py-3">Dia</th>
              <th className="text-left text-xs font-bold text-slate-600 px-4 py-3">Hora entrada</th>
              <th className="text-left text-xs font-bold text-slate-600 px-4 py-3">Hora salida</th>
            </tr>
          </thead>
          <tbody>
            {!empleadoSeleccionado && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">Selecciona un empleado para ver horarios guardados.</td>
              </tr>
            )}
            {empleadoSeleccionado && horariosEmpleadoPeriodo.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">No hay horario guardado para este empleado en el periodo.</td>
              </tr>
            )}
            {horariosEmpleadoPeriodo.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{item.centroCostoId} - {item.centroCostoNombre}</td>
                <td className="px-4 py-3">Semana {item.semana}</td>
                <td className="px-4 py-3">{DIAS_LABORALES.find((dia) => dia.key === item.dia)?.label || item.dia}</td>
                <td className="px-4 py-3">{item.horaEntrada}</td>
                <td className="px-4 py-3">{item.horaSalida}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
                      setModalEmpleadoInput('');
                      setModalValorFijo('');
                    }}
                    className="px-4 py-2 rounded-lg bg-[#001F3F] text-white text-sm font-semibold hover:bg-blue-900 transition-colors"
                  >
                    Agregar empleado
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-600">Empleado</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-600">Valor fijo a pagar</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-600">Gestionar adicionales</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalleCentroSeleccionado.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
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
                <h4 className="text-lg font-black text-slate-800">Agregar empleado</h4>
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
                onClick={handleGuardarEmpleadoCentro}
                className="px-4 py-2 rounded-lg bg-[#001F3F] text-white text-sm font-semibold hover:bg-blue-900 transition-colors"
              >
                Guardar empleado
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
                    <p className="text-xs font-semibold text-slate-600">Semanas (maximo 5)</p>
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
                              className="px-2 py-1 text-xs rounded-lg border border-blue-300 bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 transition-colors"
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
                                      {DIAS_LABORALES_SIN_DOMINGO.map((dia) => (
                                        <option key={`dia-sel-${semanaConfig.semana}-${indexDia}-${dia.key}`} value={dia.key}>{dia.label}</option>
                                      ))}
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
      </div>
    </div>
  );
};

export default ValetsFijosView;
