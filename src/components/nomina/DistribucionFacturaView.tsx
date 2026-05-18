import { useEffect, useMemo, useState } from 'react';
import ExcelJS from 'exceljs';
import { Calculator, Download, FileSpreadsheet } from 'lucide-react';
import { dbApi } from '../../services/dbApi';

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
}

interface PlantillasResponse {
  ok?: boolean;
  plantillas?: PlantillaApiItem[];
}

interface EmpleadoPlantillaApiItem {
  empleadoId?: string;
  empleado_id?: string;
}

interface PlantillaConEmpleadosApiItem {
  plantillaId?: number | string;
  plantilla_id?: number | string;
  empleados?: EmpleadoPlantillaApiItem[];
}

interface PlantillasEmpleadosResponse {
  ok?: boolean;
  plantillas?: PlantillaConEmpleadosApiItem[];
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

interface FilaDistribucion {
  parqueadero: string;
  centroCostoId: string;
  porcentaje: number;
  valorAsignado: number;
}

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
    totalEmpleados: 0,
  };
};

const DistribucionFacturaView = () => {
  const [plantillas, setPlantillas] = useState<PlantillaDistribucion[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [plantillaSeleccionadaId, setPlantillaSeleccionadaId] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [valorFactura, setValorFactura] = useState('');
  const [distribucion, setDistribucion] = useState<FilaDistribucion[]>([]);

  useEffect(() => {
    const cargarDatos = async () => {
      setCargando(true);
      setError(null);

      try {
        const [dataPlantillas, dataAsignaciones] = await Promise.all([
          dbApi.distribucionPlantillas.list<PlantillasResponse>(),
          dbApi.distribucionPlantillasEmpleados.list<PlantillasEmpleadosResponse>(),
        ]);

        const mapEmpleados = new Map<number, number>();
        for (const item of dataAsignaciones?.plantillas || []) {
          const plantillaId = Number(item?.plantillaId || item?.plantilla_id || 0);
          const empleados = Array.isArray(item?.empleados) ? item.empleados : [];
          if (plantillaId > 0) {
            mapEmpleados.set(plantillaId, empleados.length);
          }
        }

        const plantillasNormalizadas = (Array.isArray(dataPlantillas?.plantillas) ? dataPlantillas.plantillas : [])
          .map(normalizarPlantilla)
          .filter((plantilla) => plantilla.id > 0 && plantilla.nombre)
          .map((plantilla) => ({
            ...plantilla,
            totalEmpleados: mapEmpleados.get(plantilla.id) || 0,
          }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));

        setPlantillas(plantillasNormalizadas);
      } catch (e) {
        console.error('Error cargando plantillas para distribucion por factura:', e);
        setError('No se pudieron cargar las plantillas de distribución.');
      } finally {
        setCargando(false);
      }
    };

    void cargarDatos();
  }, []);

  const plantillaSeleccionada = useMemo(() => {
    const id = Number(plantillaSeleccionadaId);
    if (!Number.isFinite(id) || id <= 0) return null;
    return plantillas.find((item) => item.id === id) || null;
  }, [plantillaSeleccionadaId, plantillas]);

  const totalDistribuido = useMemo(
    () => distribucion.reduce((acc, item) => acc + item.valorAsignado, 0),
    [distribucion],
  );

  const generarDistribucion = () => {
    if (!plantillaSeleccionada) {
      alert('Selecciona una plantilla de distribución.');
      return;
    }

    if (!numeroFactura.trim()) {
      alert('Ingresa el número de factura.');
      return;
    }

    const valor = Number(String(valorFactura).replace(',', '.'));
    if (!Number.isFinite(valor) || valor <= 0) {
      alert('Ingresa un valor de factura válido.');
      return;
    }

    const totalPorcentaje = plantillaSeleccionada.centros.reduce((acc, item) => acc + item.porcentaje, 0);
    if (Math.abs(totalPorcentaje - 100) > 0.01) {
      alert('La plantilla seleccionada no suma 100%. Ajusta la plantilla antes de continuar.');
      return;
    }

    const filas = plantillaSeleccionada.centros.map((centro) => ({
      parqueadero: centro.centroCostoNombre,
      centroCostoId: centro.centroCostoId,
      porcentaje: centro.porcentaje,
      valorAsignado: Number(((valor * centro.porcentaje) / 100).toFixed(2)),
    }));

    setDistribucion(filas);
  };

  const descargarExcel = async () => {
    if (!plantillaSeleccionada || distribucion.length === 0) {
      alert('Primero genera la distribución para descargar el Excel.');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Distribucion');

    sheet.columns = [
      { header: 'Factura', key: 'factura', width: 24 },
      { header: 'Plantilla', key: 'plantilla', width: 28 },
      { header: 'Parqueadero', key: 'parqueadero', width: 34 },
      { header: 'Centro de costo', key: 'centroCostoId', width: 18 },
      { header: 'Porcentaje', key: 'porcentaje', width: 14 },
      { header: 'Valor asignado', key: 'valorAsignado', width: 16 },
    ];

    distribucion.forEach((fila) => {
      sheet.addRow({
        factura: numeroFactura,
        plantilla: plantillaSeleccionada.nombre,
        parqueadero: fila.parqueadero,
        centroCostoId: fila.centroCostoId,
        porcentaje: fila.porcentaje / 100,
        valorAsignado: fila.valorAsignado,
      });
    });

    sheet.getRow(1).font = { bold: true };
    sheet.getColumn('porcentaje').numFmt = '0.00%';
    sheet.getColumn('valorAsignado').numFmt = '#,##0.00';

    const filaTotal = sheet.addRow({
      factura: '',
      plantilla: '',
      parqueadero: 'TOTAL',
      centroCostoId: '',
      porcentaje: 1,
      valorAsignado: totalDistribuido,
    });
    filaTotal.font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Distribucion_Factura_${numeroFactura.trim().replace(/\s+/g, '_')}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Distribución por factura</h2>
            <p className="text-sm text-slate-500">Selecciona una plantilla y genera la distribución por parqueadero.</p>
          </div>
          <button
            type="button"
            onClick={() => void descargarExcel()}
            disabled={distribucion.length === 0}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
          >
            <Download size={16} />
            Descargar Excel
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {error ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr_0.8fr_auto] lg:items-end">
            <label className="space-y-2 text-sm font-medium text-slate-600">
              <span>Plantilla</span>
              <select
                value={plantillaSeleccionadaId}
                onChange={(event) => {
                  setPlantillaSeleccionadaId(event.target.value);
                  setDistribucion([]);
                }}
                disabled={cargando}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400"
              >
                <option value="">Selecciona una plantilla</option>
                {plantillas.map((plantilla) => (
                  <option key={plantilla.id} value={plantilla.id}>
                    {plantilla.nombre} ({plantilla.totalEmpleados} empleados)
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-600">
              <span>Número de factura</span>
              <input
                type="text"
                value={numeroFactura}
                onChange={(event) => setNumeroFactura(event.target.value)}
                placeholder="Ej: FAC-2026-001"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400"
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-600">
              <span>Valor de factura</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={valorFactura}
                onChange={(event) => {
                  setValorFactura(event.target.value);
                  setDistribucion([]);
                }}
                placeholder="0.00"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400"
              />
            </label>

            <button
              type="button"
              onClick={generarDistribucion}
              disabled={cargando || plantillas.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              <Calculator size={16} />
              Generar
            </button>
          </div>

          {plantillaSeleccionada ? (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p>
                Plantilla activa: <span className="font-semibold text-slate-800">{plantillaSeleccionada.nombre}</span>
              </p>
              <p>
                Centros configurados: <span className="font-semibold text-slate-800">{plantillaSeleccionada.centros.length}</span>
              </p>
            </div>
          ) : null}

          {cargando ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-slate-500">
              Cargando plantillas de distribución...
            </div>
          ) : distribucion.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-slate-500">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400">
                <FileSpreadsheet size={24} />
              </div>
              Genera una distribución para visualizar el detalle por parqueadero.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Parqueadero</th>
                    <th className="px-4 py-3">Centro de costo</th>
                    <th className="px-4 py-3">Porcentaje</th>
                    <th className="px-4 py-3 text-right">Valor asignado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {distribucion.map((fila) => (
                    <tr key={`${fila.centroCostoId}-${fila.parqueadero}`}>
                      <td className="px-4 py-3 font-semibold text-slate-700">{fila.parqueadero}</td>
                      <td className="px-4 py-3 text-slate-600">{fila.centroCostoId}</td>
                      <td className="px-4 py-3 text-slate-600">{fila.porcentaje.toFixed(2)}%</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">
                        ${fila.valorAsignado.toLocaleString('es-EC', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-slate-200 bg-slate-50">
                  <tr>
                    <td className="px-4 py-3 font-bold text-slate-800" colSpan={3}>Total distribuido</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">
                      ${totalDistribuido.toLocaleString('es-EC', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default DistribucionFacturaView;
