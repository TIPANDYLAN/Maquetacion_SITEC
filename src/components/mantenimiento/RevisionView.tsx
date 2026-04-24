import { Fragment, useState } from 'react';
import type { AccesorioTipo, OrdenCompraResumen } from './SolicitudAccesoriosTabsView';
import ExcelJS from 'exceljs';

interface RevisionViewProps {
  ordenesCompra: OrdenCompraResumen[];
  onGuardarRevision: (solicitudId: string, data: { facturasPorAccesorio: Partial<Record<AccesorioTipo, string>>; cuotasPorAccesorio: Record<string, string> }) => Promise<boolean>;
}

const RevisionView = ({ ordenesCompra, onGuardarRevision }: RevisionViewProps) => {
  const [expandedOrden, setExpandedOrden] = useState<string | null>(null);
  const [ordenEnRevision, setOrdenEnRevision] = useState<OrdenCompraResumen | null>(null);
  const [facturasPorAccesorio, setFacturasPorAccesorio] = useState<Partial<Record<AccesorioTipo, string>>>({});
  const [cuotasPorAccesorio, setCuotasPorAccesorio] = useState<Record<string, string>>({});
  const [guardandoRevision, setGuardandoRevision] = useState(false);

  const formatUsd = (value: number) =>
    new Intl.NumberFormat('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

  const tiposDeOrden = (orden: OrdenCompraResumen): AccesorioTipo[] =>
    [...new Set(orden.filas.map((f) => f.accesorio))];

  const abrirRevision = (orden: OrdenCompraResumen) => {
    setOrdenEnRevision(orden);
    setFacturasPorAccesorio(orden.facturasPorAccesorio ?? {});
    setCuotasPorAccesorio(orden.cuotasPorAccesorio ?? {});
  };

  const cerrarRevision = () => {
    setOrdenEnRevision(null);
    setFacturasPorAccesorio({});
    setCuotasPorAccesorio({});
  };

  const guardarRevision = async () => {
    if (!ordenEnRevision || guardandoRevision) return;
    const tipos = tiposDeOrden(ordenEnRevision);
    const faltaFactura = tipos.find((t) => !facturasPorAccesorio[t]?.trim());
    if (faltaFactura) {
      window.alert(`Ingrese el número de factura para ${faltaFactura}.`);
      return;
    }

    setGuardandoRevision(true);
    const ok = await onGuardarRevision(ordenEnRevision.solicitudId, {
      facturasPorAccesorio,
      cuotasPorAccesorio,
    });
    setGuardandoRevision(false);

    if (ok) {
      cerrarRevision();
    }
  };

  const ordenRevisada = (orden: OrdenCompraResumen) => {
    const tipos = tiposDeOrden(orden);
    if (tipos.length === 0) return false;
    const todasTienenFactura = tipos.every((t) => Boolean(orden.facturasPorAccesorio?.[t]?.trim()));
    if (!todasTienenFactura) return false;

    return orden.filas.every((fila) => {
      const cuota = orden.cuotasPorAccesorio?.[fila.id];
      return Boolean(cuota && String(cuota).trim());
    });
  };

  const exportarExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Revision Accesorios');

    const headers = [
      'factura',
      'orden de compra',
      'fecha emision',
      'documento',
      'nombre',
      'accesorio',
      'talla',
      'codigo',
      'centro de costo',
      'cuotas',
      'valor',
    ];

    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true, size: 11 };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };

    const parseCentro = (centroCosto: string) => {
      const [codigoRaw, ...resto] = centroCosto.split(' - ');
      return {
        codigo: (codigoRaw || '').trim(),
        centro: resto.join(' - ').trim() || centroCosto.trim(),
      };
    };

    const ordenesRevisadas = ordenesCompra.filter((orden) => ordenRevisada(orden));

    if (ordenesRevisadas.length === 0) {
      window.alert('No hay ordenes en estado revisado para exportar.');
      return;
    }

    ordenesRevisadas.forEach((orden) => {
      orden.filas.forEach((fila) => {
        const centro = parseCentro(fila.centroCosto);
        const cuotas = orden.cuotasPorAccesorio?.[fila.id] || '';

        worksheet.addRow([
          orden.facturasPorAccesorio?.[fila.accesorio] || '',
          orden.numeroOrden,
          orden.fecha,
          fila.empleadoCedula,
          fila.empleadoNombre,
          fila.accesorio === 'botas' ? 'botas' : 'auriculares',
          fila.accesorio === 'botas' ? fila.talla : '',
          centro.codigo,
          centro.centro,
          cuotas,
          fila.valor != null ? fila.valor : '',
        ]);
      });
    });

    worksheet.columns = [
      { width: 16 },
      { width: 18 },
      { width: 14 },
      { width: 16 },
      { width: 28 },
      { width: 14 },
      { width: 10 },
      { width: 12 },
      { width: 28 },
      { width: 10 },
      { width: 10 },
    ];

    const fileName = `Revision_Accesorios_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 pt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">Visualiza las compras de accesorios realizadas</p>
        <button
          onClick={() => void exportarExcel()}
          className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition"
        >
          Descargar Excel
        </button>
      </div>

      <div className="p-6">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50 text-slate-400 uppercase font-bold tracking-wider border-b border-slate-200 sticky top-0">
              <tr>
                <th className="px-4 py-3 w-8"></th>
                <th className="px-4 py-3 min-w-[180px]">Número Orden</th>
                <th className="px-4 py-3 min-w-[220px]">Archivo Orden</th>
                <th className="px-4 py-3 min-w-[120px]">Fecha</th>
                <th className="px-4 py-3 min-w-[160px]">Factura</th>
                <th className="px-4 py-3 text-right min-w-[120px]">Total Valor</th>
                <th className="px-4 py-3 text-center min-w-[160px]">Revisión</th>
              </tr>
            </thead>

            <tbody>
              {ordenesCompra.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    Aun no hay ordenes de compra subidas.
                  </td>
                </tr>
              ) : (
                ordenesCompra.map((orden, index) => {
                  const esExpandible = orden.filas.length > 0;
                  const estaAbierto = expandedOrden === orden.numeroOrden;
                  const revisada = ordenRevisada(orden);

                  return (
                    <Fragment key={`${orden.numeroOrden}-${index}`}>
                      <tr
                        className={`border-b cursor-pointer hover:bg-slate-50 ${estaAbierto ? 'bg-slate-50' : ''}`}
                        onClick={() => esExpandible && setExpandedOrden(estaAbierto ? null : orden.numeroOrden)}
                      >
                        <td className="px-4 py-3 text-center">
                          {esExpandible && (
                            <span className={`inline-block transition-transform duration-200 ${estaAbierto ? 'rotate-0' : '-rotate-90'} font-bold text-slate-500`}>
                              ▼
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-700">{orden.numeroOrden}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {orden.archivoOrdenNombre || 'Pendiente'}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{orden.fecha}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {orden.facturasPorAccesorio
                            ? Object.entries(orden.facturasPorAccesorio)
                                .map(([acc, fac]) => `${acc.charAt(0).toUpperCase() + acc.slice(1)}: ${fac}`)
                                .join(' / ')
                            : 'Pendiente revisión'}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">${formatUsd(orden.totalValor)}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              abrirRevision(orden);
                            }}
                            className={`inline-flex items-center justify-center px-3 py-1.5 text-white rounded-lg text-[11px] font-semibold transition ${
                              revisada ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                          >
                            {revisada ? 'Revisado' : 'Revisar'}
                          </button>
                        </td>
                      </tr>

                      {estaAbierto && (
                        <tr className="bg-white border-b">
                          <td colSpan={7} className="p-0">
                            <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-200">
                              <div className="space-y-2">
                                {orden.filas.map((fila, i) => (
                                  <div
                                    key={`${orden.numeroOrden}-${fila.id}-${i}`}
                                    className="grid grid-cols-[minmax(220px,2fr)_minmax(140px,1fr)_minmax(180px,1.4fr)_100px_140px] gap-4 items-center px-4 py-3 border border-slate-100 last:mb-0 bg-white text-[10px]"
                                  >
                                    <div className="text-slate-700 font-semibold">{fila.empleadoNombre}</div>
                                    <div className="text-slate-600">{fila.empleadoCedula}</div>
                                    <div className="text-slate-700">{fila.accesorio === 'botas' ? `Botas talla ${fila.talla}` : 'Auriculares'}</div>
                                    <div className="text-slate-600">
                                      {orden.cuotasPorAccesorio?.[fila.id]
                                        ? `${orden.cuotasPorAccesorio[fila.id]} cuota(s)`
                                        : 'Pendiente revisión'}
                                    </div>
                                    <div className="text-right font-semibold text-slate-800">{fila.valor != null ? `$${formatUsd(fila.valor)}` : '—'}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {ordenEnRevision && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Revisar Orden {ordenEnRevision.numeroOrden}</h3>
                <p className="text-sm text-slate-500">Agrega numero de factura y cuotas por accesorio.</p>
              </div>
              <button
                onClick={cerrarRevision}
                className="px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cerrar
              </button>
            </div>

            <div className="p-6 space-y-6">
              {tiposDeOrden(ordenEnRevision).map((tipo) => {
                const filasDelTipo = ordenEnRevision.filas.filter((f) => f.accesorio === tipo);
                return (
                  <div key={tipo} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-700 capitalize">{tipo}</span>
                      <div className="flex-1 flex items-center gap-2">
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">Número de factura</label>
                        <input
                          type="text"
                          value={facturasPorAccesorio[tipo] ?? ''}
                          onChange={(e) =>
                            setFacturasPorAccesorio((prev) => ({ ...prev, [tipo]: e.target.value }))
                          }
                          className="w-48 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                          placeholder="Número de factura"
                        />
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <div className="grid grid-cols-[minmax(220px,2fr)_minmax(180px,1.6fr)_100px_140px] gap-4 px-4 py-3 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500 border-b border-slate-200">
                        <div>Persona</div>
                        <div>Accesorio</div>
                        <div>Valor</div>
                        <div>Cuota</div>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {filasDelTipo.map((fila) => (
                          <div key={fila.id} className="grid grid-cols-[minmax(220px,2fr)_minmax(180px,1.6fr)_100px_140px] gap-4 px-4 py-3 items-center text-sm bg-white">
                            <div className="font-semibold text-slate-700">{fila.empleadoNombre}</div>
                            <div className="text-slate-700">{fila.accesorio === 'botas' ? `Botas talla ${fila.talla}` : 'Auriculares'}</div>
                            <div className="text-slate-600 font-semibold">{fila.valor != null ? `$${formatUsd(fila.valor)}` : '—'}</div>
                            <input
                              type="number"
                              min="1"
                              value={cuotasPorAccesorio[fila.id] ?? ''}
                              onChange={(e) =>
                                setCuotasPorAccesorio((prev) => ({
                                  ...prev,
                                  [fila.id]: e.target.value,
                                }))
                              }
                              className="no-spinner px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                              placeholder="Cuota"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={cerrarRevision}
                disabled={guardandoRevision}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => void guardarRevision()}
                disabled={guardandoRevision}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition disabled:opacity-50"
              >
                {guardandoRevision ? 'Guardando...' : 'Guardar revisión'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevisionView;
