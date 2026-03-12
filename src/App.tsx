import { useState } from 'react';
import { Menu, ChevronDown, ChevronRight, LogOut, Cpu, Wallet, Wrench, Users, BarChart3, Network, Key } from 'lucide-react';
import TicketsView from "./components/operaciones/TicketsView";
import PagosView from "./components/pagos/PagosView";
import HumanaView from "./components/nomina/HumanaView";
import GestionDescuentosTabsView from "./components/nomina/GestionDescuentosTabsView";
import HorasApiTestView from "./components/nomina/HorasApiTestView";
import BancosView from "./components/pagos/BancosView";
import { Placeholder } from "./components/commons/Placeholder";

interface MenuState {
  operaciones: boolean;
  contabilidad: boolean;
  nomina: boolean;
  pagos_facturacion: boolean;
  integraciones: boolean;
  mantenimiento: boolean;
}

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('descuentos');
  const [expandedMenus, setExpandedMenus] = useState<MenuState>({
    operaciones: false,
    contabilidad: false,
    nomina: true,
    pagos_facturacion: false,
    integraciones: false,
    mantenimiento: false
  });

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleMenu = (menuId: keyof MenuState) =>
    setExpandedMenus(prev => ({ ...prev, [menuId]: !prev[menuId] }));

  const isItemActive = (id: string) => activeTab === id;
  const esTabDescuentos = activeTab === 'descuentos';

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-800">
      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200 text-slate-600 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 flex flex-col overflow-hidden`}>
        {/* LOGO */}
        <div className="p-8 pb-4 flex items-center justify-start flex-shrink-0 cursor-pointer" onClick={() => setActiveTab('tickets')}>
          <div className="flex items-center gap-2 text-orange-500">
            <Cpu size={32} strokeWidth={2.5} />
            <span className="text-[32px] leading-none font-medium tracking-wide text-[#2173B9] uppercase">SITEC</span>
          </div>
        </div>

        {/* SELECTOR DE EMPRESA */}
        <div className="px-8 pb-6">
          <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="text-sm font-bold text-slate-700">Urbapark</span>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 mt-6 tracking-wider">SERVICIOS</p>
        </div>

        {/* NAVEGACION */}
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          {/* PAGOS Y FACTURACION */}
          <div>
            <button onClick={() => toggleMenu('pagos_facturacion')} className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-slate-500 hover:bg-slate-50 hover:text-slate-800">
              <div className="flex items-center gap-3"><Wallet size={20} /><span className="text-sm font-medium">Pagos y Facturación</span></div>
              {expandedMenus.pagos_facturacion ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {expandedMenus.pagos_facturacion && (
              <div className="ml-4 pl-4 border-l border-slate-100 space-y-1 mt-1 mb-2">
                <button onClick={() => setActiveTab('pagos')} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isItemActive('pagos') ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>Pagos</button>
                <button onClick={() => setActiveTab('boletas')} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isItemActive('boletas') ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>TCI boletas</button>
                <button onClick={() => setActiveTab('facturas')} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isItemActive('facturas') ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>TCI facturas</button>
                <button onClick={() => setActiveTab('niubiz')} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isItemActive('niubiz') ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>Niubiz</button>
                <button onClick={() => setActiveTab('agora')} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isItemActive('agora') ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>Ágora</button>
                <button onClick={() => setActiveTab('izipay')} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isItemActive('izipay') ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>Izipay</button>
              </div>
            )}
          </div>

          {/* OPERACIONES */}
          <div>
            <button onClick={() => toggleMenu('operaciones')} className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-slate-500 hover:bg-slate-50 hover:text-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-[20px] h-[20px] border-2 border-current rounded-full flex items-center justify-center text-[10px] font-bold">P</div>
                <span className="text-sm font-medium">Op. de Parqueaderos</span>
              </div>
              {expandedMenus.operaciones ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {expandedMenus.operaciones && (
              <div className="ml-4 pl-4 border-l border-slate-100 space-y-1 mt-1 mb-2">
                <button onClick={() => setActiveTab('matriculas')} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isItemActive('matriculas') ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>Gestión de matrículas</button>
                <button onClick={() => setActiveTab('bicicletas')} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isItemActive('bicicletas') ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>Gestión de bicicletas</button>
                <button onClick={() => setActiveTab('pagos')} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isItemActive('pagos') ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>Gestión de pagos</button>
                <button onClick={() => setActiveTab('ocupacion')} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isItemActive('ocupacion') ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>Gestión de ocupación</button>
                <button onClick={() => setActiveTab('tickets')} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isItemActive('tickets') ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>Gestión de tickets abiertos</button>
              </div>
            )}
          </div>

          {/* MANTENIMIENTO */}
          <div>
            <button onClick={() => toggleMenu('mantenimiento')} className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-slate-500 hover:bg-slate-50 hover:text-slate-800">
              <div className="flex items-center gap-3"><Wrench size={20} /><span className="text-sm font-medium">Mantenimiento</span></div>
              {expandedMenus.mantenimiento ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {expandedMenus.mantenimiento && (
              <div className="ml-4 pl-4 border-l border-slate-100 space-y-1 mt-1 mb-2">
                <button onClick={() => setActiveTab('mant_plantilla')} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isItemActive('mant_plantilla') ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>Plantilla de equipos</button>
                <button onClick={() => setActiveTab('mant_tecnicos')} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isItemActive('mant_tecnicos') ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>Técnicos</button>
                <button onClick={() => setActiveTab('mant_parqueaderos')} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isItemActive('mant_parqueaderos') ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>Parqueaderos</button>
                <button onClick={() => setActiveTab('mant_planificacion')} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isItemActive('mant_planificacion') ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>Planificación y gestión</button>
              </div>
            )}
          </div>

          {/* NOMINA */}
          <div>
            <button onClick={() => toggleMenu('nomina')} className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-slate-500 hover:bg-slate-50 hover:text-slate-800">
              <div className="flex items-center gap-3"><Users size={20} /><span className="text-sm font-medium">Gestión de Personal</span></div>
              {expandedMenus.nomina ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {expandedMenus.nomina && (
              <div className="ml-4 pl-4 border-l border-slate-100 space-y-1 mt-1 mb-2">
                <button onClick={() => setActiveTab('movilizaciones')} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isItemActive('movilizaciones') ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>Movilizaciones</button>
                <button onClick={() => setActiveTab('erol')} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isItemActive('erol') ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>E-Rol</button>
                <button onClick={() => setActiveTab('bonos')} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isItemActive('bonos') ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>Bono eventos</button>
                <button onClick={() => setActiveTab('prestamos')} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isItemActive('prestamos') ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>Préstamos</button>
                <button onClick={() => setActiveTab('celular')} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isItemActive('celular') ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>Descuento celular</button>
                <button onClick={() => setActiveTab('alimentacion')} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isItemActive('alimentacion') ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>Alimentación</button>
                <button onClick={() => setActiveTab('fondos')} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isItemActive('fondos') ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>Fondos de reserva</button>
                <button onClick={() => setActiveTab('descuentos')} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isItemActive('descuentos') ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>Gestión de descuentos</button>
                <button onClick={() => setActiveTab('horas')} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isItemActive('horas') ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>Registro de horas</button>
                <button onClick={() => setActiveTab('humana')} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isItemActive('humana') ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>Humana</button>
                <button onClick={() => setActiveTab('horas_api_test')} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isItemActive('horas_api_test') ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>Prueba API Horas</button>
              </div>
            )}
          </div>

          {/* CONTABILIDAD */}
          <div>
            <button onClick={() => toggleMenu('contabilidad')} className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-slate-500 hover:bg-slate-50 hover:text-slate-800">
              <div className="flex items-center gap-3"><BarChart3 size={20} /><span className="text-sm font-medium">Contabilidad y Finanzas</span></div>
              {expandedMenus.contabilidad ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {expandedMenus.contabilidad && (
              <div className="ml-4 pl-4 border-l border-slate-100 space-y-1 mt-1 mb-2">
                <button onClick={() => setActiveTab('bancos')} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isItemActive('bancos') ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>Bancos</button>
                <button onClick={() => setActiveTab('presupuestos')} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isItemActive('presupuestos') ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>Presupuestos</button>
                <button onClick={() => setActiveTab('cajas_chicas')} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isItemActive('cajas_chicas') ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>Cajas Chicas</button>
              </div>
            )}
          </div>

          {/* INTEGRACIONES */}
          <div>
            <button onClick={() => toggleMenu('integraciones')} className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-slate-500 hover:bg-slate-50 hover:text-slate-800">
              <div className="flex items-center gap-3"><Network size={20} /><span className="text-sm font-medium">Integraciones & APIs</span></div>
              {expandedMenus.integraciones ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {expandedMenus.integraciones && (
              <div className="ml-4 pl-4 border-l border-slate-100 space-y-1 mt-1 mb-2">
                <button onClick={() => setActiveTab('api_meypar')} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isItemActive('api_meypar') ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>Apis Meypar</button>
                <button onClick={() => setActiveTab('api_tgw')} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isItemActive('api_tgw') ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>Apis TGW</button>
                <button onClick={() => setActiveTab('api_matricula_error')} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isItemActive('api_matricula_error') ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>Apis matrícula error</button>
                <button onClick={() => setActiveTab('api_proceso_reverso')} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isItemActive('api_proceso_reverso') ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>Apis proceso reverso</button>
              </div>
            )}
          </div>
        </nav>

        {/* FOOTER USUARIO */}
        <div className="p-6 border-t border-slate-100 flex-shrink-0 mt-auto space-y-3">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">PR</div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-700 truncate">Procesos</p>
              <p className="text-xs text-slate-500 truncate">procesos@urba-park.com</p>
            </div>
          </div>
          <button className="w-full flex items-center gap-3 text-slate-500 hover:text-slate-800 text-sm font-medium"><Key size={18} />Llaves de acceso</button>
          <button className="w-full flex items-center gap-3 text-slate-500 hover:text-slate-800 text-sm font-medium"><LogOut size={18} />Cerrar sesión</button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* HEADER */}
        <header className="h-20 bg-white border-b border-slate-100 px-8 flex items-center justify-between flex-shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={toggleSidebar} className="p-2 hover:bg-slate-100 rounded-lg lg:hidden"><Menu size={24} /></button>
            {activeTab !== 'tickets' && (
              esTabDescuentos ? (
                <div>
                  <h2 className="text-lg font-bold text-slate-700">Gestión de descuentos</h2>
                  <p className="text-xs text-slate-500">Control de descuentos salariales</p>
                </div>
              ) : (
                <h2 className="text-lg font-bold text-slate-700 capitalize">{activeTab.replace('_', ' ')}</h2>
              )
            )}
          </div>
          <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full shadow-sm cursor-pointer hover:bg-slate-50 transition-colors">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="text-sm font-bold text-slate-700">Urbapark</span>
              <ChevronDown size={14} />
            </div>
            <div className="w-9 h-9 bg-slate-200 rounded-full"></div>
          </div>
        </header>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto w-full">
            {/* OPERACIONES */}
            {activeTab === 'tickets' && <TicketsView />}
            {activeTab === 'matriculas' && <Placeholder title="Matrículas" description="Gestión de matrículas de vehículos" />}
            {activeTab === 'bicicletas' && <Placeholder title="Bicicletas" description="Sistema de bikes compartidas" />}
            {activeTab === 'ocupacion' && <Placeholder title="Ocupación" description="Estado de ocupación de parqueaderos" />}

            {/* PAGOS Y FACTURACION */}
            {activeTab === 'pagos' && <PagosView />}
            {activeTab === 'boletas' && <Placeholder title="Boletas" description="Gestión de boletas de estacionamiento" />}
            {activeTab === 'facturas' && <Placeholder title="Facturas" description="Emisión y seguimiento de facturas" />}
            {activeTab === 'niubiz' && <Placeholder title="Niubiz" description="Integración de pagos Niubiz" />}
            {activeTab === 'agora' && <Placeholder title="Ágora" description="Gestión de pasarela Ágora" />}
            {activeTab === 'izipay' && <Placeholder title="Izipay" description="Integración de pagos Izipay" />}
            {activeTab === 'bancos' && <BancosView />}
            {activeTab === 'presupuestos' && <Placeholder title="Presupuestos" description="Gestión de presupuestos" />}
            {activeTab === 'cajas_chicas' && <Placeholder title="Cajas Chicas" description="Control de cajas menores" />}

            {/* NOMINA */}
            {activeTab === 'movilizaciones' && <Placeholder title="Movilizaciones" description="Asignación de movilización a empleados" />}
            {activeTab === 'erol' && <Placeholder title="EROL" description="Gestión de riesgos laborales" />}
            {activeTab === 'bonos' && <Placeholder title="Bonos" description="Asignación de bonos y gratificaciones" />}
            {activeTab === 'prestamos' && <Placeholder title="Préstamos" description="Gestión de préstamos a empleados" />}
            {activeTab === 'celular' && <Placeholder title="Celular" description="Control de líneas telefónicas" />}
            {activeTab === 'alimentacion' && <Placeholder title="Alimentación" description="Subsidio de alimentación" />}
            {activeTab === 'fondos' && <Placeholder title="Fondos" description="Gestión de fondos de solidaridad" />}
            {activeTab === 'descuentos' && <GestionDescuentosTabsView />}
            {activeTab === 'horas' && <Placeholder title="Horas" description="Gestión de horas extraordinarias" />}
            {activeTab === 'humana' && <HumanaView />}
            {activeTab === 'horas_api_test' && <HorasApiTestView />}

            {/* CONTABILIDAD */}
            {activeTab === 'contab_general' && <Placeholder title="Contabilidad General" description="Registro de asientos contables" />}
            {activeTab === 'contab_reportes' && <Placeholder title="Reportes Contables" description="Generación de reportes financieros" />}

            {/* INTEGRACIONES */}
            {activeTab === 'api_meypar' && <Placeholder title="Integración Meypar" description="Sincronización con plataforma Meypar" />}
            {activeTab === 'api_tgw' && <Placeholder title="Integración TGW" description="Gateway de pagos TGW" />}
            {activeTab === 'api_matricula_error' && <Placeholder title="API Matrícula Error" description="Gestión de incidencias de matrícula" />}
            {activeTab === 'api_proceso_reverso' && <Placeholder title="API Proceso Reverso" description="Ejecución de reversos automáticos" />}

            {/* MANTENIMIENTO */}
            {activeTab === 'mant_plantilla' && <Placeholder title="Plantilla de Mantenimiento" description="Plantillas de órdenes de trabajo" />}
            {activeTab === 'mant_tecnicos' && <Placeholder title="Técnicos" description="Gestión de técnicos de mantenimiento" />}
            {activeTab === 'mant_parqueaderos' && <Placeholder title="Parqueaderos" description="Gestión de espacios de estacionamiento" />}
            {activeTab === 'mant_planificacion' && <Placeholder title="Planificación y Gestión" description="Planificación de mantenimiento" />}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;