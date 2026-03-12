import { useState } from 'react';
import DescuentosView from './DescuentosView';
import MovimientosHumanaView from './MovimientosHumanaView';
import ProveedorHumanaView from './ProveedorHumanaView';

type TabPrincipal = 'gestion_descuentos' | 'descuentos_humana';
type TabHumana = 'movimientos_humana' | 'proveedor_humana';

const GestionDescuentosTabsView = () => {
  const [tabPrincipal, setTabPrincipal] = useState<TabPrincipal>('gestion_descuentos');
  const [tabHumana, setTabHumana] = useState<TabHumana>('movimientos_humana');
  const [hayCambiosPendientesMovimientos, setHayCambiosPendientesMovimientos] = useState(false);

  const confirmarSalidaDeMovimientos = () => {
    if (!hayCambiosPendientesMovimientos) return true;
    return window.confirm('¿Está seguro de cambiar de pestaña? Los datos de Movimientos Humana se perderán si continúa.');
  };

  const handleTabPrincipalChange = (nextTab: TabPrincipal) => {
    if (nextTab === tabPrincipal) return;

    if (tabPrincipal === 'descuentos_humana' && tabHumana === 'movimientos_humana' && !confirmarSalidaDeMovimientos()) {
      return;
    }

    if (tabPrincipal === 'descuentos_humana' && tabHumana === 'movimientos_humana') {
      setHayCambiosPendientesMovimientos(false);
    }

    setTabPrincipal(nextTab);
  };

  const handleTabHumanaChange = (nextTab: TabHumana) => {
    if (nextTab === tabHumana) return;

    if (tabHumana === 'movimientos_humana' && !confirmarSalidaDeMovimientos()) {
      return;
    }

    if (tabHumana === 'movimientos_humana') {
      setHayCambiosPendientesMovimientos(false);
    }

    setTabHumana(nextTab);
  };

  const renderContenido = () => {
    if (tabPrincipal === 'gestion_descuentos') {
      return <DescuentosView />;
    }

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-2 inline-flex gap-2">
          <button
            onClick={() => handleTabHumanaChange('movimientos_humana')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              tabHumana === 'movimientos_humana'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Movimientos Humana
          </button>
          <button
            onClick={() => handleTabHumanaChange('proveedor_humana')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              tabHumana === 'proveedor_humana'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Proveedor Humana
          </button>
        </div>

        {tabHumana === 'movimientos_humana' ? <MovimientosHumanaView onUnsavedChangesChange={setHayCambiosPendientesMovimientos} /> : <ProveedorHumanaView />}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-2 inline-flex gap-2">
        <button
          onClick={() => handleTabPrincipalChange('gestion_descuentos')}
          className={`px-6 py-2 rounded-xl text-sm font-semibold transition min-w-[240px] ${
            tabPrincipal === 'gestion_descuentos'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'text-slate-600 hover:bg-slate-100 border border-transparent'
          }`}
        >
          Gestion de descuentos
        </button>
        <button
          onClick={() => handleTabPrincipalChange('descuentos_humana')}
          className={`px-6 py-2 rounded-xl text-sm font-semibold transition min-w-[240px] ${
            tabPrincipal === 'descuentos_humana'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'text-slate-600 hover:bg-slate-100 border border-transparent'
          }`}
        >
          Descuentos Humana
        </button>
      </div>

      {renderContenido()}
    </div>
  );
};

export default GestionDescuentosTabsView;
