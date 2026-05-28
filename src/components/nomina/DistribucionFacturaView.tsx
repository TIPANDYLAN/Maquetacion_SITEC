import { useEffect, useMemo, useState } from 'react';
import ExcelJS from 'exceljs';
import { Calculator, Download, FileSpreadsheet } from 'lucide-react';
import { dbApi } from '../../services/dbApi';
import { getNominaEmployeesActive } from '../../services/n8nApi';
import type { EmpleadoNominaApiItem } from '../../types/nomina';

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
  empleadosParqueadero: number;
}

interface EmpleadoActivoDistribucion {
  empleadoId: string;
  centroCostoId: string;
  centroCostoNombre: string;
}

const normalizarTextoComparacion = (valor: string): string => {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
};

const normalizarCodigoCentro = (valor: string): string => {
  const raw = String(valor || '').trim().toUpperCase();
  if (!raw) return '';

  const primerSegmento = raw.split('-')[0].trim();
  const sinSeparadores = primerSegmento.replace(/[^A-Z0-9]/g, '');
  if (!sinSeparadores) return '';

  if (/^\d+$/.test(sinSeparadores)) {
    return sinSeparadores.replace(/^0+(?=\d)/, '');
  }

  return sinSeparadores;
};

const parseCentroCostoCompuesto = (valor: string): { codigo: string; nombre: string } => {
  const raw = String(valor || '').trim();
  if (!raw) return { codigo: '', nombre: '' };

  const match = raw.match(/^([^\-]+?)\s*-\s*(.+)$/);
  if (!match) {
    return { codigo: '', nombre: raw };
  }

  return {
    codigo: String(match[1] || '').trim(),
    nombre: String(match[2] || '').trim(),
  };
};

const normalizarEmpleadoActivoDistribucion = (item: EmpleadoNominaApiItem): EmpleadoActivoDistribucion | null => {
  const payload = (item?.json ?? item ?? {}) as Record<string, unknown>;

  const empleadoId = String(payload?.CEDULA || payload?.DOCI_MFEMP || payload?.COD_MFEMP || '').trim();
  if (!empleadoId) return null;

  const centroCodigoDirecto = String(
    payload?.COD_MFCC || payload?.IDCENTROCOSTO || payload?.CNTB_MFEDC || '',
  ).trim();
  const centroNombreDirecto = String(
    payload?.DSC_MFCC || payload?.CENTROCOSTO || payload?.CENTRO_COSTO || '',
  ).trim();

  const centroCompuesto = parseCentroCostoCompuesto(centroNombreDirecto || centroCodigoDirecto);
  const centroCostoId = String(centroCodigoDirecto || centroCompuesto.codigo || '').trim();
  const centroCostoNombre = String(centroNombreDirecto || centroCompuesto.nombre || centroCostoId || '').trim();

  return {
    empleadoId,
    centroCostoId,
    centroCostoNombre,
  };
};

const esCentroAdministracionSupervisores = (centroCostoId: string, centroCostoNombre: string): boolean => {
  const id = normalizarTextoComparacion(centroCostoId);
  const nombre = normalizarTextoComparacion(centroCostoNombre);
  const combinado = `${id} ${nombre}`.trim();

  return combinado.includes('ADMINISTRACION') && combinado.includes('SUPERVISOR');
};

const esCentroAdministracion = (centroCostoId: string, centroCostoNombre: string): boolean => {
  const id = normalizarTextoComparacion(centroCostoId);
  const nombre = normalizarTextoComparacion(centroCostoNombre);
  const combinado = `${id} ${nombre}`.trim();

  return combinado.includes('ADMINISTRACION') && !combinado.includes('SUPERVISOR');
};

const encontrarCentroPlantillaEmpleado = (
  centrosPlantilla: PlantillaCentro[],
  empleado: EmpleadoActivoDistribucion,
): PlantillaCentro | null => {
  const centroEmpleadoIdNorm = normalizarCodigoCentro(empleado.centroCostoId);
  const centroEmpleadoNombreNorm = normalizarTextoComparacion(empleado.centroCostoNombre);

  for (const centro of centrosPlantilla) {
    const centroPlantillaIdNorm = normalizarCodigoCentro(centro.centroCostoId);
    const centroPlantillaNombreNorm = normalizarTextoComparacion(centro.centroCostoNombre);

    if (centroEmpleadoIdNorm && centroPlantillaIdNorm && centroEmpleadoIdNorm === centroPlantillaIdNorm) {
      return centro;
    }

    if (centroEmpleadoNombreNorm && centroPlantillaNombreNorm && centroEmpleadoNombreNorm === centroPlantillaNombreNorm) {
      return centro;
    }
  }

  return null;
};

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
  const [empleadosActivosDistribucion, setEmpleadosActivosDistribucion] = useState<EmpleadoActivoDistribucion[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [plantillaSeleccionadaId, setPlantillaSeleccionadaId] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [valorFactura, setValorFactura] = useState('');
  const [distribucion, setDistribucion] = useState<FilaDistribucion[]>([]);
  const [personasRedistribuidasPlantilla, setPersonasRedistribuidasPlantilla] = useState(0);

  useEffect(() => {
    const cargarDatos = async () => {
      setCargando(true);
      setError(null);

      try {
        const [dataPlantillas, dataEmpleadosActivos] = await Promise.all([
          dbApi.distribucionPlantillas.list<PlantillasResponse>(),
          getNominaEmployeesActive<EmpleadoNominaApiItem[]>(),
        ]);

        const empleadosActivos = (Array.isArray(dataEmpleadosActivos) ? dataEmpleadosActivos : [])
          .map(normalizarEmpleadoActivoDistribucion)
          .filter((empleado): empleado is EmpleadoActivoDistribucion => Boolean(empleado));

        const empleadosActivosUnicos = empleadosActivos.filter(
          (empleado, index, lista) => lista.findIndex((item) => item.empleadoId === empleado.empleadoId) === index,
        );

        const totalEmpleadosActivos = empleadosActivosUnicos.length;

        const plantillasNormalizadas = (Array.isArray(dataPlantillas?.plantillas) ? dataPlantillas.plantillas : [])
          .map(normalizarPlantilla)
          .filter((plantilla) => plantilla.id > 0 && plantilla.nombre)
          .map((plantilla) => ({
            ...plantilla,
            totalEmpleados: totalEmpleadosActivos,
          }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));

        setPlantillas(plantillasNormalizadas);
        setEmpleadosActivosDistribucion(empleadosActivosUnicos);
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

    const valorTotalCentavos = Math.round(valor * 100);
    type GrupoDistribucion = {
      tipo: 'centro' | 'administracion' | 'administracion_supervisores';
      parqueadero: string;
      centroCostoId: string;
      porcentajePlantilla: number;
      empleados: number;
      valorBaseCentavos: number;
      valorRedistribuidoCentavos: number;
    };

    const gruposCentros = plantillaSeleccionada.centros.map((centro) => ({
      tipo: 'centro' as const,
      parqueadero: centro.centroCostoNombre,
      centroCostoId: centro.centroCostoId,
      porcentajePlantilla: Number(centro.porcentaje || 0),
      empleados: 0,
      valorBaseCentavos: 0,
      valorRedistribuidoCentavos: 0,
    }));

    const grupoAdministracion: GrupoDistribucion = {
      tipo: 'administracion',
      parqueadero: 'ADMINISTRACION',
      centroCostoId: 'ADMINISTRACION',
      porcentajePlantilla: 0,
      empleados: 0,
      valorBaseCentavos: 0,
      valorRedistribuidoCentavos: 0,
    };

    const grupoAdministracionSupervisores: GrupoDistribucion = {
      tipo: 'administracion_supervisores',
      parqueadero: 'ADMINISTRACION SUPERVISORES',
      centroCostoId: 'ADMINISTRACION-SUPERVISORES',
      porcentajePlantilla: 0,
      empleados: 0,
      valorBaseCentavos: 0,
      valorRedistribuidoCentavos: 0,
    };

    for (const empleado of empleadosActivosDistribucion) {
      if (esCentroAdministracionSupervisores(empleado.centroCostoId, empleado.centroCostoNombre)) {
        grupoAdministracionSupervisores.empleados += 1;
        if (empleado.centroCostoId) grupoAdministracionSupervisores.centroCostoId = empleado.centroCostoId;
        if (empleado.centroCostoNombre) grupoAdministracionSupervisores.parqueadero = empleado.centroCostoNombre;
        continue;
      }

      if (esCentroAdministracion(empleado.centroCostoId, empleado.centroCostoNombre)) {
        grupoAdministracion.empleados += 1;
        if (empleado.centroCostoId) grupoAdministracion.centroCostoId = empleado.centroCostoId;
        if (empleado.centroCostoNombre) grupoAdministracion.parqueadero = empleado.centroCostoNombre;
        continue;
      }

      const centroPlantilla = encontrarCentroPlantillaEmpleado(plantillaSeleccionada.centros, empleado);
      if (!centroPlantilla) {
        // Si no hay match con plantilla, se considera administracion para no perder personas en el total.
        grupoAdministracion.empleados += 1;
        continue;
      }

      const idxCentro = gruposCentros.findIndex((item) => item.centroCostoId === centroPlantilla.centroCostoId);
      if (idxCentro >= 0) {
        gruposCentros[idxCentro].empleados += 1;
      }
    }

    const gruposBase = [
      ...gruposCentros,
      grupoAdministracion,
      grupoAdministracionSupervisores,
    ];

    const totalEmpleadosConsiderados = empleadosActivosDistribucion.length;

    if (totalEmpleadosConsiderados === 0) {
      alert('No se encontraron empleados activos para calcular la distribución por persona.');
      return;
    }

    const baseExactos = gruposBase.map((item) => ({
      item,
      valorExactoCentavos: (valorTotalCentavos * item.empleados) / totalEmpleadosConsiderados,
    }));

    const baseAdminSupervisoresExacto =
      baseExactos.find((entry) => entry.item.tipo === 'administracion_supervisores')?.valorExactoCentavos || 0;
    const totalPorcentajePlantilla = gruposCentros.reduce((acc, item) => acc + item.porcentajePlantilla, 0);

    if (baseAdminSupervisoresExacto > 0 && totalPorcentajePlantilla <= 0) {
      alert('La plantilla no tiene porcentajes validos para redistribuir ADMINISTRACION-SUPERVISORES.');
      return;
    }

    const filasGrupos: GrupoDistribucion[] = [
      ...gruposCentros,
      grupoAdministracion,
    ];

    const filasExactas = filasGrupos.map((item, index) => {
      const baseExacto = baseExactos.find((entry) => entry.item === item)?.valorExactoCentavos || 0;
      const redistribuidoExacto = item.tipo === 'centro' && totalPorcentajePlantilla > 0
        ? (baseAdminSupervisoresExacto * item.porcentajePlantilla) / totalPorcentajePlantilla
        : 0;

      return {
        index,
        item,
        valorExactoCentavos: baseExacto + redistribuidoExacto,
      };
    });

    const filasRedondeadas = filasExactas.map((entry) => {
      const valorBaseCentavos = Math.floor(entry.valorExactoCentavos);
      return {
        ...entry,
        valorRedondeadoCentavos: valorBaseCentavos,
        resto: entry.valorExactoCentavos - valorBaseCentavos,
      };
    });

    const sumaBaseRedondeada = filasRedondeadas.reduce((acc, entry) => acc + entry.valorRedondeadoCentavos, 0);
    let pendientesRedondeo = valorTotalCentavos - sumaBaseRedondeada;

    const ordenRestoDesc = [...filasRedondeadas].sort((a, b) => {
      if (b.resto !== a.resto) return b.resto - a.resto;
      return a.index - b.index;
    });

    for (let i = 0; i < pendientesRedondeo; i += 1) {
      const item = ordenRestoDesc[i % ordenRestoDesc.length];
      item.valorRedondeadoCentavos += 1;
    }

    const filas = filasRedondeadas
      .filter((entry) => entry.item.tipo === 'administracion' || entry.valorRedondeadoCentavos > 0)
      .map((entry) => {
        const totalCentroCentavos = entry.valorRedondeadoCentavos;
        return {
          parqueadero: entry.item.parqueadero,
          centroCostoId: entry.item.centroCostoId,
          porcentaje: valorTotalCentavos > 0 ? (totalCentroCentavos / valorTotalCentavos) * 100 : 0,
          valorAsignado: totalCentroCentavos / 100,
          empleadosParqueadero: entry.item.empleados,
        };
      })
      .sort((a, b) => a.parqueadero.localeCompare(b.parqueadero, 'es', { sensitivity: 'base' }));

    if (filas.length === 0) {
      alert('No hay centros de costo destino para distribuir la factura.');
      return;
    }

    setPersonasRedistribuidasPlantilla(grupoAdministracionSupervisores.empleados);
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
      { header: 'Personas parqueadero', key: 'empleadosParqueadero', width: 20 },
      { header: 'Personas que se redistribuyen en plantilla', key: 'personasRedistribuidas', width: 34 },
      { header: 'Porcentaje', key: 'porcentaje', width: 14 },
      { header: 'Valor asignado', key: 'valorAsignado', width: 16 },
    ];

    distribucion.forEach((fila) => {
      sheet.addRow({
        factura: numeroFactura,
        plantilla: plantillaSeleccionada.nombre,
        parqueadero: fila.parqueadero,
        centroCostoId: fila.centroCostoId,
        empleadosParqueadero: fila.empleadosParqueadero,
        personasRedistribuidas: personasRedistribuidasPlantilla,
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
                  setPersonasRedistribuidasPlantilla(0);
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
                  setPersonasRedistribuidasPlantilla(0);
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
              <p>
                Personas que se redistribuyen a todos los parqueaderos (Administracion Supervisores):{' '}
                <span className="font-semibold text-slate-800">{personasRedistribuidasPlantilla}</span>
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
                    <th className="px-4 py-3 text-right">Personas</th>
                    <th className="px-4 py-3">Porcentaje</th>
                    <th className="px-4 py-3 text-right">Valor asignado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {distribucion.map((fila) => (
                    <tr key={`${fila.centroCostoId}-${fila.parqueadero}`}>
                      <td className="px-4 py-3 font-semibold text-slate-700">{fila.parqueadero}</td>
                      <td className="px-4 py-3 text-slate-600">{fila.centroCostoId}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{fila.empleadosParqueadero}</td>
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
                    <td className="px-4 py-3 font-bold text-slate-800" colSpan={4}>Total distribuido</td>
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
