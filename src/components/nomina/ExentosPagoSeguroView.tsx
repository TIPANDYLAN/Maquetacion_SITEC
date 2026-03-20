import { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { getNominaEmployeesActive } from '../../services/n8nApi';
import { dbApi } from '../../services/dbApi';
import type { EmpleadoNominaApiItem, NominaApiListResponse, NominaApiRecordResponse } from '../../types/nomina';

interface EmpleadoOption {
  cedula: string;
  nombre: string;
}

interface ExentoPagoSeguroRow {
  id: number;
  cedula: string;
  nombre: string;
  porcentaje_exento: number;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

type ListarExentosResponse = NominaApiListResponse<ExentoPagoSeguroRow>;

type GuardarExentoResponse = NominaApiRecordResponse<ExentoPagoSeguroRow>;

const ExentosPagoSeguroView = () => {
  const [registros, setRegistros] = useState<ExentoPagoSeguroRow[]>([]);
  const [empleados, setEmpleados] = useState<EmpleadoOption[]>([]);
  const [loadingRegistros, setLoadingRegistros] = useState(false);
  const [loadingEmpleados, setLoadingEmpleados] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [empleadoInput, setEmpleadoInput] = useState('');
  const [porcentaje, setPorcentaje] = useState('');

  useEffect(() => {
    void cargarRegistros();
    void cargarEmpleados();
  }, []);

  const cargarRegistros = async () => {
    setLoadingRegistros(true);
    try {
      const data = await dbApi.exentosPagoSeguro.list<ListarExentosResponse>();
      if (!data.ok) {
        throw new Error(data.error || 'No se pudo cargar exentos pago seguro');
      }

      setRegistros(Array.isArray(data.registros) ? data.registros : []);
    } catch (error) {
      console.error('Error cargando exentos pago seguro:', error);
      setRegistros([]);
    } finally {
      setLoadingRegistros(false);
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
          const cedula = String(payload?.CEDULA || '').trim();
          const nombres = String(payload?.NOMBRES || '').trim();
          const apellidos = String(payload?.APELLIDOS || '').trim();
          const nombre = `${apellidos} ${nombres}`.trim();
          return { cedula, nombre };
        })
        .filter((item: EmpleadoOption) => item.cedula && item.nombre)
        .sort((a: EmpleadoOption, b: EmpleadoOption) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));

      setEmpleados(empleadosNormalizados);
    } catch (error) {
      console.error('Error cargando empleados para exentos:', error);
      setEmpleados([]);
    } finally {
      setLoadingEmpleados(false);
    }
  };

  const empleadoSeleccionado = useMemo(
    () => {
      const valor = empleadoInput.trim();
      if (!valor) return null;

      const porCedula = empleados.find((emp) => emp.cedula === valor);
      if (porCedula) return porCedula;

      return empleados.find((emp) => `${emp.nombre} - ${emp.cedula}`.toLowerCase() === valor.toLowerCase()) || null;
    },
    [empleados, empleadoInput]
  );

  const formatearFecha = (fechaIso: string): string => {
    if (!fechaIso) return '-';
    const date = new Date(fechaIso);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('es-EC');
  };

  const formatearPorcentaje = (valor: number): string => {
    return new Intl.NumberFormat('es-EC', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor);
  };

  const limpiarFormulario = () => {
    setEmpleadoInput('');
    setPorcentaje('');
  };

  const handleGuardar = async () => {
    if (!empleadoInput.trim()) {
      alert('Selecciona un empleado');
      return;
    }

    const valorPorcentaje = Number(String(porcentaje).replace(',', '.'));
    if (!Number.isFinite(valorPorcentaje) || valorPorcentaje < 0 || valorPorcentaje > 100) {
      alert('El porcentaje debe estar entre 0 y 100');
      return;
    }

    if (!empleadoSeleccionado) {
      alert('El empleado seleccionado no es válido');
      return;
    }

    try {
      setSaving(true);
      const data = await dbApi.exentosPagoSeguro.save<GuardarExentoResponse>({
        cedula: empleadoSeleccionado.cedula,
        nombre: empleadoSeleccionado.nombre,
        porcentajeExento: valorPorcentaje,
      });

      if (!data.ok || !data.registro) {
        throw new Error(data.error || 'No se pudo guardar el exento de pago seguro');
      }

      setRegistros((prev) => {
        const sinDuplicado = prev.filter((item) => item.cedula !== data.registro?.cedula);
        return [data.registro as ExentoPagoSeguroRow, ...sinDuplicado];
      });

      setModalOpen(false);
      limpiarFormulario();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error guardando exento de pago seguro');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-end items-center">
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition"
        >
          <Plus size={16} />
          Agregar Empleado
        </button>
      </div>

      <div className="p-6">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50 text-slate-400 uppercase font-bold tracking-wider border-b border-slate-200 sticky top-0">
              <tr>
                <th className="px-4 py-3 w-12 text-center">ID</th>
                <th className="px-4 py-3 min-w-[140px]">Cedula</th>
                <th className="px-4 py-3 min-w-[220px]">Nombre</th>
                <th className="px-4 py-3 min-w-[140px]">Porcentaje Exento</th>
                <th className="px-4 py-3 min-w-[180px]">F. Actualizacion</th>
              </tr>
            </thead>
            <tbody>
              {loadingRegistros ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">Cargando registros...</td>
                </tr>
              ) : registros.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">No hay exentos de pago seguro registrados</td>
                </tr>
              ) : (
                registros.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700 text-center">{item.id}</td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{item.cedula}</td>
                    <td className="px-4 py-3 text-slate-700">{item.nombre}</td>
                    <td className="px-4 py-3 text-slate-700">{formatearPorcentaje(item.porcentaje_exento)}%</td>
                    <td className="px-4 py-3 text-slate-600">{formatearFecha(item.fecha_actualizacion || item.fecha_creacion)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-xl p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-slate-800">Agregar exento de pago seguro</h3>
              <button
                onClick={() => {
                  setModalOpen(false);
                  limpiarFormulario();
                }}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                  Empleado
                </label>
                <input
                  type="text"
                  list="empleados-exentos-seguro"
                  placeholder={loadingEmpleados ? 'Cargando empleados...' : 'Escribe para buscar empleado'}
                  value={empleadoInput}
                  onChange={(e) => setEmpleadoInput(e.target.value)}
                  disabled={loadingEmpleados}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-500 transition-all"
                />
                <datalist id="empleados-exentos-seguro">
                  {empleados.map((emp) => (
                    <option key={emp.cedula} value={`${emp.nombre} - ${emp.cedula}`} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                  Porcentaje Exento
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="Ejemplo: 25"
                  value={porcentaje}
                  onChange={(e) => setPorcentaje(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setModalOpen(false);
                  limpiarFormulario();
                }}
                className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => void handleGuardar()}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-semibold transition"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExentosPagoSeguroView;
