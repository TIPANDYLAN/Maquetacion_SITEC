import { useState, useEffect } from 'react';
import { Plus, X, AlertCircle, Eye } from 'lucide-react';
import { getNominaCostCenters, getNominaEmployees } from '../../services/n8nApi';

interface CentroCosto {
    IDCENTROCOSTO: string;
    CENTROCOSTO: string;
}

interface EmpleadoNomina {
    cedula: string;
    nombres: string;
    apellidos: string;
}

interface EmpleadoNominaApiItem {
    json?: {
        CEDULA?: string;
        NOMBRES?: string;
        APELLIDOS?: string;
    };
}

interface FormularioDescuento {
    tipoDescuento: string;
    usuario: string;
    valorTotal: string;
    centroCosto: string;
    observacion: string;
}

interface GuardarDescuentoResponse {
    ok: boolean;
    descuento?: {
        id: number;
        periodo: string;
        nombre: string;
        valor: string | number;
        codigo_centro_costo: string;
        centro_costo: string;
        observacion: string;
        estado: string;
        recurrencia: number;
        fecha_creacion: string;
    };
    error?: string;
    details?: string;
}

interface DescuentoRow {
    id: number;
    periodo: string;
    nombre: string;
    valor: number;
    codigo_centro_costo: string;
    centro_costo: string;
    observacion: string;
    estado: string;
    recurrencia: number;
    fecha_creacion: string;
}

interface ListarDescuentosResponse {
    ok: boolean;
    descuentos?: DescuentoRow[];
    error?: string;
    details?: string;
}

interface ActualizarEstadoDescuentoResponse {
    ok: boolean;
    descuento?: DescuentoRow;
    error?: string;
    details?: string;
}

const DescuentosView = () => {
    const [searchDescuentos, setSearchDescuentos] = useState('');
    const [estadoFiltro, setEstadoFiltro] = useState('');
    const [tipoDescuentoFiltro, setTipoDescuentoFiltro] = useState('');
    const [modalAbierto, setModalAbierto] = useState(false);
    const [tipoDescuentoSeleccionado, setTipoDescuentoSeleccionado] = useState('');
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [descuentos, setDescuentos] = useState<DescuentoRow[]>([]);
    const [cargandoDescuentos, setCargandoDescuentos] = useState(false);
    const [centrosCosto, setCentrosCosto] = useState<CentroCosto[]>([]);
    const [empleadosDisponibles, setEmpleadosDisponibles] = useState<EmpleadoNomina[]>([]);
    const [cargandoEmpleados, setCargandoEmpleados] = useState(false);
    const [cargandoCentros, setCargandoCentros] = useState(false);
    const [guardandoDescuento, setGuardandoDescuento] = useState(false);
    const [aprobandoDescuentoId, setAprobandoDescuentoId] = useState<number | null>(null);
    const [formulario, setFormulario] = useState<FormularioDescuento>({
        tipoDescuento: '',
        usuario: '',
        valorTotal: '',
        centroCosto: '',
        observacion: '',
    });

    // Cargar centros de costo cuando se selecciona "faltantes_incidentes"
    useEffect(() => {
        if (tipoDescuentoSeleccionado === 'faltantes_incidentes') {
            void cargarCentrosCosto();
            void cargarEmpleados();
        }
    }, [tipoDescuentoSeleccionado]);

    useEffect(() => {
        void cargarDescuentos();
    }, []);

    const cargarDescuentos = async () => {
        setCargandoDescuentos(true);
        try {
            const response = await fetch('/api/descuentos/incidentes-caja-chica', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json() as ListarDescuentosResponse;
            if (!response.ok || !data.ok) {
                throw new Error(data.error || 'No se pudo cargar descuentos');
            }

            setDescuentos(Array.isArray(data.descuentos) ? data.descuentos : []);
        } catch (error) {
            console.error('Error cargando descuentos:', error);
            setDescuentos([]);
        } finally {
            setCargandoDescuentos(false);
        }
    };

    const cargarEmpleados = async () => {
        setCargandoEmpleados(true);
        try {
            const data = await getNominaEmployees<EmpleadoNominaApiItem[]>();
            const empleadosApi = Array.isArray(data) ? data : [];
            const empleadosNormalizados = empleadosApi
                .map((item: EmpleadoNominaApiItem) => ({
                    cedula: String(item?.json?.CEDULA || '').trim(),
                    nombres: String(item?.json?.NOMBRES || '').trim(),
                    apellidos: String(item?.json?.APELLIDOS || '').trim(),
                }))
                .filter((emp: EmpleadoNomina) => emp.cedula && (emp.nombres || emp.apellidos));

            setEmpleadosDisponibles(empleadosNormalizados);
        } catch (error) {
            console.error('Error cargando empleados de nomina:', error);
            setEmpleadosDisponibles([]);
        } finally {
            setCargandoEmpleados(false);
        }
    };

    const cargarCentrosCosto = async () => {
        setCargandoCentros(true);
        try {
            const data = await getNominaCostCenters();
            setCentrosCosto(data);
        } catch (error) {
            console.error('Error cargando centros de costo:', error);
            setCentrosCosto([]);
        } finally {
            setCargandoCentros(false);
        }
    };

    const handleContinuar = () => {
        if (!tipoDescuentoSeleccionado) {
            alert('Por favor selecciona un tipo de descuento');
            return;
        }

        if (tipoDescuentoSeleccionado === 'faltantes_incidentes') {
            setFormulario({
                tipoDescuento: 'faltantes_incidentes',
                usuario: '',
                valorTotal: '',
                centroCosto: '',
                observacion: '',
            });
            setModalAbierto(false);
            setMostrarFormulario(true);
        }
    };

    const obtenerEmpleadosPorNombre = (termino: string): EmpleadoNomina[] => {
        const busqueda = termino.trim().toLowerCase();
        if (!busqueda) {
            return empleadosDisponibles.slice(0, 50);
        }

        return empleadosDisponibles
            .filter((emp) => `${emp.apellidos} ${emp.nombres}`.toLowerCase().includes(busqueda))
            .slice(0, 50);
    };

    const obtenerCentrosPorNombre = (termino: string): CentroCosto[] => {
        const busqueda = termino.trim().toLowerCase();
        if (!busqueda) {
            return centrosCosto.slice(0, 50);
        }

        return centrosCosto
            .filter((centro) => `${centro.IDCENTROCOSTO} ${centro.CENTROCOSTO}`.toLowerCase().includes(busqueda))
            .slice(0, 50);
    };

    const handleEnviarFormulario = async () => {
        if (!formulario.usuario.trim()) {
            alert('Por favor ingresa el usuario');
            return;
        }
        if (!formulario.valorTotal.trim()) {
            alert('Por favor ingresa el valor total');
            return;
        }
        if (!formulario.centroCosto) {
            alert('Por favor selecciona un centro de costo');
            return;
        }

        const usuarioValido = empleadosDisponibles.some(
            (emp) => `${emp.apellidos} ${emp.nombres}` === formulario.usuario
        );
        if (!usuarioValido) {
            alert('Selecciona un usuario de la lista sugerida');
            return;
        }

        const centroValido = centrosCosto.some(
            (centro) => `${centro.IDCENTROCOSTO} - ${centro.CENTROCOSTO}` === formulario.centroCosto
        );
        if (!centroValido) {
            alert('Selecciona un centro de costo de la lista sugerida');
            return;
        }

        try {
            setGuardandoDescuento(true);

            const response = await fetch('/api/descuentos/incidentes-caja-chica', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    nombre: formulario.usuario,
                    valor: formulario.valorTotal,
                    centroCosto: formulario.centroCosto,
                    observacion: formulario.observacion,
                }),
            });

            const data = await response.json() as GuardarDescuentoResponse;

            if (!response.ok || !data.ok) {
                throw new Error(data.error || 'No se pudo guardar el descuento');
            }

            const periodoGuardado = data.descuento?.periodo || 'N/A';
            if (data.descuento) {
                setDescuentos((prev) => [
                    {
                        id: Number(data.descuento?.id || 0),
                        periodo: String(data.descuento?.periodo || ''),
                        nombre: String(data.descuento?.nombre || ''),
                        valor: Number(data.descuento?.valor || 0),
                        codigo_centro_costo: String(data.descuento?.codigo_centro_costo || ''),
                        centro_costo: String(data.descuento?.centro_costo || ''),
                        observacion: String(data.descuento?.observacion || ''),
                        estado: String(data.descuento?.estado || 'pendiente revision'),
                        recurrencia: Number(data.descuento?.recurrencia || 1),
                        fecha_creacion: String(data.descuento?.fecha_creacion || new Date().toISOString()),
                    },
                    ...prev,
                ]);
            }
            alert(`Descuento guardado correctamente en periodo ${periodoGuardado}`);

            setMostrarFormulario(false);
            setModalAbierto(false);
            setTipoDescuentoSeleccionado('');
            setFormulario({
                tipoDescuento: 'faltantes_incidentes',
                usuario: '',
                valorTotal: '',
                centroCosto: '',
                observacion: '',
            });
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Error guardando descuento');
        } finally {
            setGuardandoDescuento(false);
        }
    };

    const handleAprobarDescuento = async (id: number) => {
        try {
            setAprobandoDescuentoId(id);

            const response = await fetch(`/api/descuentos/incidentes-caja-chica/${id}/estado`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ estado: 'certificado' }),
            });

            const data = await response.json() as ActualizarEstadoDescuentoResponse;
            if (!response.ok || !data.ok || !data.descuento) {
                throw new Error(data.error || 'No se pudo aprobar el descuento');
            }

            setDescuentos((prev) => prev.map((item) => (
                item.id === id
                    ? {
                        ...item,
                        ...data.descuento,
                    }
                    : item
            )));
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Error aprobando descuento');
        } finally {
            setAprobandoDescuentoId(null);
        }
    };

    const descuentosFiltrados = descuentos.filter((item) => {
        const termino = searchDescuentos.trim().toLowerCase();
        const estado = estadoFiltro.trim().toLowerCase();
        const tipo = tipoDescuentoFiltro.trim().toLowerCase();

        const coincideBusqueda =
            !termino ||
            item.nombre.toLowerCase().includes(termino) ||
            item.codigo_centro_costo.toLowerCase().includes(termino) ||
            item.observacion.toLowerCase().includes(termino) ||
            item.centro_costo.toLowerCase().includes(termino) ||
            item.periodo.toLowerCase().includes(termino);

        const coincideEstado = !estado || item.estado.toLowerCase() === estado;
        const coincideTipo =
            !tipo ||
            tipo === 'otro' ||
            tipo === 'faltantes_incidentes';

        return coincideBusqueda && coincideEstado && coincideTipo;
    });

    const formatearFecha = (fechaIso: string) => {
        if (!fechaIso) return '-';
        const fecha = new Date(fechaIso);
        if (Number.isNaN(fecha.getTime())) return '-';
        return fecha.toLocaleDateString('es-EC');
    };

    const formatearValor = (valor: number) => {
        return new Intl.NumberFormat('es-EC', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(valor || 0);
    };

    const formatearEstado = (estado: string) => {
        const valor = estado.trim().toLowerCase();
        if (valor === 'certificado') return 'aprobado';
        return estado;
    };

    return (
        <>
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-end items-center">
                    <button
                        onClick={() => setModalAbierto(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition"
                    >
                        <Plus size={16} />
                        Agregar Descuento
                    </button>
                </div>

                <div className="p-6">
                    <div className="flex gap-4 mb-6">
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="Buscar por nombre, cédula, email"
                                value={searchDescuentos}
                                onChange={(e) => setSearchDescuentos(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                            />
                        </div>
                        <div>
                            <select
                                value={estadoFiltro}
                                onChange={(e) => setEstadoFiltro(e.target.value)}
                                className="px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white min-w-[180px]"
                            >
                                <option value="">Estado - Selecciona una opción</option>
                                <option value="certificado">Aprobado</option>
                                <option value="pendiente revision">Pendiente revision</option>
                                <option value="rechazado">Rechazado</option>
                            </select>
                        </div>
                        <div>
                            <select
                                value={tipoDescuentoFiltro}
                                onChange={(e) => setTipoDescuentoFiltro(e.target.value)}
                                className="px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white min-w-[180px]"
                            >
                                <option value="">Tipo de descuento - Selecciona una opción</option>
                                <option value="faltantes_incidentes">Faltantes e incidentes caja chica</option>
                                <option value="multas">Multas por memos</option>
                                <option value="otro">Otro descuento</option>
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                        <table className="w-full table-fixed text-left text-[11px]">
                            <thead className="bg-slate-50 text-slate-400 uppercase font-bold tracking-wider border-b border-slate-200 sticky top-0">
                                <tr>
                                    <th className="px-3 py-2 w-12 text-center">ID</th>
                                    <th className="px-3 py-2 w-[120px]">F. Registro</th>
                                    <th className="px-3 py-2 w-[190px]">Nombre</th>
                                    <th className="px-3 py-2 w-[240px]">Observación</th>
                                    <th className="px-3 py-2 w-[210px]">Tipo</th>
                                    <th className="px-3 py-2 w-[95px] text-center">Recurrencia</th>
                                    <th className="px-3 py-2 w-[130px] text-center">Estado</th>
                                    <th className="px-3 py-2 w-[80px] text-center">Detalle</th>
                                    <th className="px-3 py-2 w-[130px] text-center">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cargandoDescuentos ? (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-8 text-center text-slate-400">
                                            Cargando descuentos...
                                        </td>
                                    </tr>
                                ) : descuentosFiltrados.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-8 text-center text-slate-400">
                                            No hay descuentos registrados aún
                                        </td>
                                    </tr>
                                ) : (
                                    descuentosFiltrados.map((item) => (
                                        <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="px-3 py-2 text-slate-700 text-center">{item.id}</td>
                                            <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{formatearFecha(item.fecha_creacion)}</td>
                                            <td className="px-3 py-2 text-slate-700 font-medium truncate" title={item.nombre}>{item.nombre}</td>
                                            <td className="px-3 py-2 text-slate-600 truncate" title={item.observacion || '-'}>{item.observacion || '-'}</td>
                                            <td className="px-3 py-2 text-slate-600 truncate" title={`Incidente caja chica ($${formatearValor(item.valor)})`}>
                                                Incidente caja chica (${formatearValor(item.valor)})
                                            </td>
                                            <td className="px-3 py-2 text-slate-600 text-center">{item.recurrencia}</td>
                                            <td className="px-3 py-2 text-center">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-semibold ${
                                                    item.estado === 'certificado'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : item.estado === 'rechazado'
                                                            ? 'bg-red-100 text-red-700'
                                                            : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {formatearEstado(item.estado)}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <button
                                                    type="button"
                                                    className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                                                    aria-label="Ver detalle"
                                                    title="Ver detalle"
                                                >
                                                    <Eye size={14} />
                                                </button>
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <button
                                                    onClick={() => void handleAprobarDescuento(item.id)}
                                                    disabled={item.estado === 'certificado' || aprobandoDescuentoId === item.id}
                                                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                                                        item.estado === 'certificado'
                                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                                    }`}
                                                >
                                                    {aprobandoDescuentoId === item.id ? 'Aprobando...' : 'Aprobar descuento'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {modalAbierto && (
                <div className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4">
                    <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-xl p-6">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-bold text-slate-800">Añadir descuento</h3>
                            <button
                                onClick={() => setModalAbierto(false)}
                                className="text-slate-400 hover:text-slate-600 transition"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex gap-3 mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-slate-700">
                                Por favor, selecciona el tipo de descuento y el usuario para poder añadir un nuevo descuento
                            </p>
                        </div>

                        <div className="mb-6">
                            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                                Tipo de Descuento
                            </label>
                            <select
                                value={tipoDescuentoSeleccionado}
                                onChange={(e) => setTipoDescuentoSeleccionado(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-500"
                            >
                                <option value="">Selecciona el tipo de descuento</option>
                                <option value="subsidio_enfermedad">Subsidio de enfermedad</option>
                                <option value="subsidio_maternidad">Subsidio de maternidad</option>
                                <option value="faltantes_incidentes">Faltantes e incidentes caja chica</option>
                                <option value="descuentos_varios">Descuentos varios</option>
                                <option value="multas_memos">Multas por memos</option>
                            </select>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setModalAbierto(false)}
                                className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleContinuar}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition"
                            >
                                Continuar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {mostrarFormulario && tipoDescuentoSeleccionado === 'faltantes_incidentes' && (
                <div className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4">
                    <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-xl p-6">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-bold text-slate-800">Añadir descuento</h3>
                            <button
                                onClick={() => {
                                    setMostrarFormulario(false);
                                    setTipoDescuentoSeleccionado('');
                                }}
                                className="text-slate-400 hover:text-slate-600 transition"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex gap-3 mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-slate-700">
                                Por favor, selecciona el tipo de descuento y el usuario para poder añadir un nuevo descuento
                            </p>
                        </div>

                        <div className="space-y-4">
                            {/* Tipo de Descuento */}
                            <div>
                                <label className="block text-xs font-bold text-blue-600 mb-2 uppercase tracking-wide">
                                    Tipo de Descuento
                                </label>
                                <div className="relative">
                                    <select
                                        value="faltantes_incidentes"
                                        disabled
                                        className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl text-sm bg-blue-50 font-medium text-slate-700 cursor-not-allowed"
                                    >
                                        <option value="faltantes_incidentes">Faltantes e incidentes caja chica</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Usuarios en sitec_dsp */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                                    Nombre del Empleado
                                </label>
                                <input
                                    type="text"
                                    placeholder={cargandoEmpleados ? 'Cargando usuarios...' : 'Escribe para buscar empleado'}
                                    value={formulario.usuario}
                                    onChange={(e) => setFormulario({ ...formulario, usuario: e.target.value })}
                                    list="usuarios-descuento"
                                    disabled={cargandoEmpleados}
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-500 transition-all"
                                />
                                <datalist id="usuarios-descuento">
                                    {obtenerEmpleadosPorNombre(formulario.usuario).map((emp) => (
                                        <option key={emp.cedula} value={`${emp.apellidos} ${emp.nombres}`}>
                                            {emp.cedula}
                                        </option>
                                    ))}
                                </datalist>
                            </div>

                            {/* Valor Total */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                                    Valor
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ingresa el valor total"
                                    value={formulario.valorTotal}
                                    onChange={(e) => setFormulario({ ...formulario, valorTotal: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-500 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                                    Observación
                                </label>
                                <textarea
                                    placeholder="Agrega una observación"
                                    value={formulario.observacion}
                                    onChange={(e) => setFormulario({ ...formulario, observacion: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-500 transition-all resize-none"
                                />
                            </div>

                            {/* Centro de Costo */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                                    Centro de Costo
                                </label>
                                <input
                                    type="text"
                                    placeholder={cargandoCentros ? 'Cargando centros...' : 'Escribe para buscar centro de costo'}
                                    value={formulario.centroCosto}
                                    onChange={(e) => setFormulario({ ...formulario, centroCosto: e.target.value })}
                                    list="centros-costo-descuento"
                                    disabled={cargandoCentros}
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-500 transition-all"
                                />
                                <datalist id="centros-costo-descuento">
                                    {obtenerCentrosPorNombre(formulario.centroCosto).map((centro) => (
                                        <option
                                            key={centro.IDCENTROCOSTO}
                                            value={`${centro.IDCENTROCOSTO} - ${centro.CENTROCOSTO}`}
                                        />
                                    ))}
                                </datalist>
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end mt-6">
                            <button
                                onClick={() => {
                                    setMostrarFormulario(false);
                                    setTipoDescuentoSeleccionado('');
                                }}
                                className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleEnviarFormulario}
                                disabled={guardandoDescuento}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2"
                            >
                                <span>{guardandoDescuento ? 'Guardando...' : 'Enviar'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default DescuentosView;
