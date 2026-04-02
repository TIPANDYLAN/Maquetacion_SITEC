import { useEffect, useState } from 'react';
import { Plus, Trash2, ShoppingBag } from 'lucide-react';
import { getNominaCostCenters, getNominaEmployeesActive } from '../../services/n8nApi';
import type { EmpleadoNominaApiItem, NominaCentroCosto } from '../../types/nomina';
import { ConfirmacionModal } from '../modals/ConfirmacionModal';
import type { FilaEmpleado } from './SolicitudAccesoriosTabsView';

type Accesorio = 'botas' | 'auriculares';

interface EmpleadoOpcion {
  cedula: string;
  nombre: string;
}

interface SolicitarViewProps {
  onGuardar: (filas: FilaEmpleado[]) => void;
}

const crearFilaVacia = (): Omit<FilaEmpleado, 'id'> => ({
  empleadoNombre: '',
  empleadoCedula: '',
  centroCosto: '',
  accesorio: 'botas',
  talla: '',
});

const SolicitarView = ({ onGuardar }: SolicitarViewProps) => {
  const [empleados, setEmpleados] = useState<EmpleadoOpcion[]>([]);
  const [centros, setCentros] = useState<NominaCentroCosto[]>([]);
  const [cargando, setCargando] = useState(true);

  const [forma, setForma] = useState<Omit<FilaEmpleado, 'id'>>(crearFilaVacia());
  const [filas, setFilas] = useState<FilaEmpleado[]>([]);

  // autocomplete helpers
  const [busquedaEmpleado, setBusquedaEmpleado] = useState('');
  const [busquedaCentro, setBusquedaCentro] = useState('');
  const [showSugEmp, setShowSugEmp] = useState(false);
  const [showSugCentro, setShowSugCentro] = useState(false);

  // modal helpers
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [mostrarExito, setMostrarExito] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      try {
        const [dataEmp, dataCentros] = await Promise.all([
          getNominaEmployeesActive<EmpleadoNominaApiItem[]>(),
          getNominaCostCenters(),
        ]);

        const empNorm: EmpleadoOpcion[] = (Array.isArray(dataEmp) ? dataEmp : [])
          .map((item) => {
            const p = (item?.json ?? item ?? {}) as Record<string, unknown>;
            const cedula = String(p.CEDULA || p.DOCI_MFEMP || '').trim();
            const nombre = `${String(p.APELLIDOS || '').trim()} ${String(p.NOMBRES || '').trim()}`.trim();
            return { cedula, nombre };
          })
          .filter((e) => e.cedula && e.nombre)
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

        setEmpleados(empNorm);
        setCentros(Array.isArray(dataCentros) ? dataCentros : []);
      } catch {
        // silencioso — tabla queda vacía
      } finally {
        setCargando(false);
      }
    };
    void cargar();
  }, []);

  const empSugeridos = busquedaEmpleado.length > 1
    ? empleados.filter((e) =>
        `${e.nombre} ${e.cedula}`.toLowerCase().includes(busquedaEmpleado.toLowerCase())
      ).slice(0, 8)
    : [];

  const centrosSugeridos = busquedaCentro.length > 1
    ? centros.filter((c) =>
        `${c.CENTROCOSTO} ${c.IDCENTROCOSTO}`.toLowerCase().includes(busquedaCentro.toLowerCase())
      ).slice(0, 8)
    : [];

  const seleccionarEmpleado = (emp: EmpleadoOpcion) => {
    setForma((prev) => ({ ...prev, empleadoNombre: emp.nombre, empleadoCedula: emp.cedula }));
    setBusquedaEmpleado(emp.nombre);
    setShowSugEmp(false);
  };

  const seleccionarCentro = (c: NominaCentroCosto) => {
    setForma((prev) => ({ ...prev, centroCosto: `${c.IDCENTROCOSTO} - ${c.CENTROCOSTO}` }));
    setBusquedaCentro(`${c.IDCENTROCOSTO} - ${c.CENTROCOSTO}`);
    setShowSugCentro(false);
  };

  const handleAgregar = () => {
    if (!forma.empleadoCedula || !forma.centroCosto || !forma.accesorio) return;
    if (forma.accesorio === 'botas' && !forma.talla) return;

    setFilas((prev) => [
      ...prev,
      { ...forma, id: `${Date.now()}-${Math.random()}` },
    ]);
    setForma(crearFilaVacia());
    setBusquedaEmpleado('');
    setBusquedaCentro('');
  };

  const handleEliminarFila = (id: string) => {
    setFilas((prev) => prev.filter((f) => f.id !== id));
  };

  const formularioValido =
    Boolean(forma.empleadoCedula) &&
    Boolean(forma.centroCosto) &&
    Boolean(forma.accesorio) &&
    (forma.accesorio !== 'botas' || Boolean(forma.talla));

  return (
    <div className="space-y-6">
      {/* FORMULARIO */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <ShoppingBag size={18} className="text-blue-500" />
          </div>
          <h3 className="text-base font-bold text-slate-700">Nueva solicitud</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* Empleado */}
          <div className="relative flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Empleado</label>
            <input
              type="text"
              value={busquedaEmpleado}
              onChange={(e) => {
                setBusquedaEmpleado(e.target.value);
                setForma((prev) => ({ ...prev, empleadoNombre: '', empleadoCedula: '' }));
                setShowSugEmp(true);
              }}
              onFocus={() => setShowSugEmp(true)}
              onBlur={() => setTimeout(() => setShowSugEmp(false), 150)}
              placeholder={cargando ? 'Cargando…' : 'Buscar empleado…'}
              disabled={cargando}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 bg-slate-50"
            />
            {showSugEmp && empSugeridos.length > 0 && (
              <ul className="absolute top-full mt-1 left-0 right-0 z-20 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto text-sm">
                {empSugeridos.map((e) => (
                  <li
                    key={e.cedula}
                    onMouseDown={() => seleccionarEmpleado(e)}
                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
                  >
                    <span className="font-medium">{e.nombre}</span>
                    <span className="ml-2 text-slate-400 text-xs">{e.cedula}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Centro de costo */}
          <div className="relative flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Centro de costo</label>
            <input
              type="text"
              value={busquedaCentro}
              onChange={(e) => {
                setBusquedaCentro(e.target.value);
                setForma((prev) => ({ ...prev, centroCosto: '' }));
                setShowSugCentro(true);
              }}
              onFocus={() => setShowSugCentro(true)}
              onBlur={() => setTimeout(() => setShowSugCentro(false), 150)}
              placeholder={cargando ? 'Cargando…' : 'Buscar centro…'}
              disabled={cargando}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 bg-slate-50"
            />
            {showSugCentro && centrosSugeridos.length > 0 && (
              <ul className="absolute top-full mt-1 left-0 right-0 z-20 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto text-sm">
                {centrosSugeridos.map((c) => (
                  <li
                    key={c.IDCENTROCOSTO}
                    onMouseDown={() => seleccionarCentro(c)}
                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
                  >
                    <span className="font-medium">{c.CENTROCOSTO.trim()}</span>
                    <span className="ml-2 text-slate-400 text-xs">{c.IDCENTROCOSTO}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Accesorio */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Accesorio</label>
            <select
              value={forma.accesorio}
              onChange={(e) => setForma((prev) => ({ ...prev, accesorio: e.target.value as Accesorio, talla: '' }))}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 bg-slate-50"
            >
              <option value="botas">Botas</option>
              <option value="auriculares">Auriculares</option>
            </select>
          </div>

          {/* Talla (solo botas) */}
          {forma.accesorio === 'botas' ? (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Talla</label>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={forma.talla}
                onChange={(e) => setForma((prev) => ({ ...prev, talla: e.target.value }))}
                placeholder="Escribir talla"
                className="no-spinner px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 bg-slate-50"
              />
            </div>
          ) : (
            <div /> /* placeholder para mantener el grid */
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={handleAgregar}
            disabled={!formularioValido}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-sm font-semibold transition"
          >
            <Plus size={16} />
            Agregar
          </button>
        </div>
      </div>

      {/* TABLA DE EMPLEADOS AGREGADOS */}
      {filas.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-700">
              Empleados en solicitud
              <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{filas.length}</span>
            </h4>
            <button
              onClick={() => setMostrarConfirmacion(true)}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition"
            >
              Generar solicitud
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left font-semibold">Empleado</th>
                  <th className="px-4 py-3 text-left font-semibold">Cédula</th>
                  <th className="px-4 py-3 text-left font-semibold">Centro de costo</th>
                  <th className="px-4 py-3 text-left font-semibold">Accesorio</th>
                  <th className="px-4 py-3 text-center font-semibold">Talla</th>
                  <th className="px-4 py-3 text-center font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila, idx) => (
                  <tr key={fila.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="px-4 py-3 font-medium text-slate-700">{fila.empleadoNombre}</td>
                    <td className="px-4 py-3 text-slate-500">{fila.empleadoCedula}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-[220px] truncate">{fila.centroCosto}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        fila.accesorio === 'botas'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-violet-50 text-violet-700 border border-violet-200'
                      }`}>
                        {fila.accesorio === 'botas' ? 'Botas' : 'Auriculares'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">
                      {fila.accesorio === 'botas' ? fila.talla : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleEliminarFila(fila.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODALES */}
      {mostrarConfirmacion && (
        <ConfirmacionModal
          tipo="confirmacion"
          titulo="Confirmar solicitud"
          mensaje={`¿Está seguro de que desea guardar esta solicitud con ${filas.length} ${filas.length === 1 ? 'artículo' : 'artículos'}?`}
          textoBtnConfirm="Guardar solicitud"
          onConfirm={() => {
            setMostrarConfirmacion(false);
            setMostrarExito(true);
          }}
          onClose={() => setMostrarConfirmacion(false)}
        />
      )}

      {mostrarExito && (
        <ConfirmacionModal
          tipo="exito"
          titulo="¡Guardado con éxito!"
          mensaje="La solicitud ha sido creada correctamente. Puede revisarla en la pestaña de Orden de Compra."
          onConfirm={() => {
            setMostrarExito(false);
            onGuardar(filas);
            setFilas([]);
            setForma(crearFilaVacia());
            setBusquedaEmpleado('');
            setBusquedaCentro('');
          }}
          onClose={() => setMostrarExito(false)}
        />
      )}
    </div>
  );
};

export default SolicitarView;
