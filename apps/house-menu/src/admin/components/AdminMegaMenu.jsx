import { useState, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search, X, LayoutDashboard, ClipboardList, UtensilsCrossed, Package, Store, Users,
  DollarSign, Truck, Receipt, TrendingUp, Megaphone, BarChart3, UserCircle,
  Warehouse, Boxes, ShoppingBag, ArrowRight
} from 'lucide-react';

// ── Definición de categorías con descripciones y metadatos ─────────────────────
const MENU_ITEMS = [
  { key: 'dashboard',  label: 'Dashboard',   group: 'General',     desc: 'Resumen de ventas y KPIs operacionales', icon: LayoutDashboard },
  
  // Operaciones
  { key: 'orders',     label: 'Pedidos',     group: 'Operaciones', desc: 'Gestión de órdenes en cocina y ruta',      icon: ClipboardList, badge: 'activeOrders' },
  { key: 'caja',       label: 'Caja',        group: 'Operaciones', desc: 'Control de arqueos y sesiones de caja',   icon: DollarSign },
  { key: 'mesas',      label: 'Mesas',       group: 'Operaciones', desc: 'Monitoreo físico de salones y mesas',      icon: ShoppingBag },
  
  // Producto
  { key: 'menu',       label: 'Menú',        group: 'Producto',    desc: 'Editor de platos, precios y categorías',     icon: UtensilsCrossed },
  { key: 'inventory',  label: 'Inventario',  group: 'Producto',    desc: 'Control de stock de insumos y almacén',      icon: Warehouse },
  { key: 'logistics',  label: 'Logística',   group: 'Producto',    desc: 'Distribución y almacén secundario',           icon: Boxes },
  
  // Crecimiento
  { key: 'analytics',  label: 'Analytics',   group: 'Crecimiento', desc: 'Gráficas de ventas y comportamiento',        icon: BarChart3 },
  { key: 'finanzas',   label: 'Finanzas',    group: 'Crecimiento', desc: 'Egresos, costos y flujo de caja',           icon: TrendingUp },
  { key: 'marketing',  label: 'Marketing',   group: 'Crecimiento', desc: 'Booster de ventas, ofertas y cupones',        icon: Megaphone },
  { key: 'customers',  label: 'Clientes',    group: 'Crecimiento', desc: 'Historial de compras y fidelización',       icon: UserCircle },
  
  // Sistema
  { key: 'users',      label: 'Usuarios',    group: 'Sistema',     desc: 'Permisos y roles del sistema',                icon: Users },
  { key: 'sucursales', label: 'Sucursales',  group: 'Sistema',     desc: 'Configuración global de locales',             icon: Store },
  { key: 'delivery',   label: 'Delivery',    group: 'Sistema',     desc: 'Zonas de reparto y tarifas',                  icon: Truck },
  { key: 'fiscal',     label: 'Facturación', group: 'Sistema',     desc: 'Configuración de boletas y facturas',         icon: Receipt },
  { key: 'employees',  label: 'Personal',    group: 'Sistema',     desc: 'Asistencia y control de trabajadores',        icon: Package },
];

export default function AdminMegaMenu({ isOpen, onClose, activeTab, onTabChange, availableTabs, activeOrdersCount }) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Limpiar el buscador al abrir el menú y enfocar el input
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Filtrar ítems permitidos y que coincidan con la búsqueda
  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const allowed = MENU_ITEMS.filter(item => availableTabs.includes(item.key));
    if (!query) return allowed;
    return allowed.filter(item => 
      item.label.toLowerCase().includes(query) ||
      item.group.toLowerCase().includes(query) ||
      item.desc.toLowerCase().includes(query)
    );
  }, [search, availableTabs]);

  // Ajustar el índice seleccionado para que no se salga del rango filtrado
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems]);

  // Navegación con teclado (Flecha Arriba, Flecha Abajo, Enter, Escape)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          onTabChange(filteredItems[selectedIndex].key);
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onTabChange, onClose]);

  // Organizar ítems por grupo cuando no hay búsqueda
  const groupedItems = useMemo(() => {
    const groups = {};
    const allowed = MENU_ITEMS.filter(item => availableTabs.includes(item.key));
    allowed.forEach(item => {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item);
    });
    return groups;
  }, [availableTabs]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 md:p-16">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Panel */}
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.98 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="bg-cm-surface border border-cm-border rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh] z-10"
        >
          {/* Header Search Bar */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-cm-border shrink-0">
            <Search className="w-5 h-5 text-cm-muted shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar sección o herramienta... (esc para salir)"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent border-0 text-sm text-cm-text placeholder-cm-muted focus:outline-none focus:ring-0"
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-black text-cm-muted/50 border border-cm-border bg-cm-bg-alt px-1.5 py-0.5 rounded shadow-sm">ESC</span>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-cm-muted hover:bg-cm-accent/8 hover:text-cm-text transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {search.trim() ? (
              // ── Modo Búsqueda Activa (Lista Plana) ──
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-cm-muted tracking-wider mb-2 px-2">Secciones Encontradas</p>
                {filteredItems.map((item, idx) => {
                  const Icon = item.icon;
                  const isSelected = idx === selectedIndex;
                  const isCurrent = activeTab === item.key;
                  const badgeCount = item.badge === 'activeOrders' ? activeOrdersCount : 0;

                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        onTabChange(item.key);
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center gap-3.5 p-3 rounded-xl text-left border transition-all duration-150 group ${
                        isSelected
                          ? 'bg-cm-accent border-cm-accent text-white shadow-sm'
                          : 'bg-transparent border-transparent text-cm-text hover:bg-cm-accent/5'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-cm-bg-alt border border-cm-border text-cm-accent group-hover:text-cm-accent'
                      }`}>
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-black truncate ${isSelected ? 'text-white' : 'text-cm-text'}`}>{item.label}</p>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            isSelected ? 'bg-white/10 text-white' : 'bg-cm-bg-alt text-cm-muted border border-cm-border'
                          }`}>
                            {item.group}
                          </span>
                        </div>
                        <p className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-white/80' : 'text-cm-muted'}`}>{item.desc}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {badgeCount > 0 && (
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-cm-accent text-white'
                          }`}>
                            {badgeCount}
                          </span>
                        )}
                        {isSelected && <ArrowRight className="w-4 h-4 text-white/80" />}
                        {isCurrent && !isSelected && <span className="w-1.5 h-1.5 rounded-full bg-cm-accent" />}
                      </div>
                    </button>
                  );
                })}
                {filteredItems.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-sm font-bold text-cm-text-secondary">No encontramos secciones que coincidan</p>
                    <p className="text-xs text-cm-muted mt-1">Intenta buscar con otros términos como "menú" o "caja"</p>
                  </div>
                )}
              </div>
            ) : (
              // ── Modo Agrupado (Vista por Categorías Grid) ──
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(groupedItems).map(([groupName, items]) => (
                  <div key={groupName} className="space-y-2.5">
                    <h4 className="text-[10px] font-black uppercase text-cm-muted tracking-wider px-1 border-b border-cm-border/50 pb-1 flex items-center justify-between">
                      <span>{groupName}</span>
                      <span className="text-[9px] font-medium opacity-65">{items.length} items</span>
                    </h4>
                    
                    <div className="grid grid-cols-1 gap-1.5">
                      {items.map((item) => {
                        const Icon = item.icon;
                        const isCurrent = activeTab === item.key;
                        const badgeCount = item.badge === 'activeOrders' ? activeOrdersCount : 0;

                        return (
                          <button
                            key={item.key}
                            onClick={() => {
                              onTabChange(item.key);
                              onClose();
                            }}
                            className={`w-full flex items-center gap-3 p-2 rounded-xl text-left border border-transparent transition-all group hover:border-cm-border hover:bg-cm-bg-alt hover:shadow-sm ${
                              isCurrent ? 'bg-cm-accent/5 border-cm-accent/15' : 'bg-transparent'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                              isCurrent ? 'bg-cm-accent text-white' : 'bg-cm-bg-alt border border-cm-border text-cm-muted group-hover:text-cm-accent'
                            }`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-bold leading-tight ${isCurrent ? 'text-cm-accent font-black' : 'text-cm-text'}`}>
                                {item.label}
                              </p>
                              <p className="text-[9px] text-cm-muted truncate mt-0.5">{item.desc}</p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {badgeCount > 0 && (
                                <span className="text-[9px] font-black bg-cm-accent text-white px-1.5 py-0.5 rounded-full">
                                  {badgeCount}
                                </span>
                              )}
                              {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-cm-accent" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Shortcuts */}
          <div className="px-5 py-3 border-t border-cm-border bg-cm-bg-alt shrink-0 flex items-center justify-between text-[10px] text-cm-muted font-semibold">
            <div className="flex items-center gap-1.5">
              <span>Atajo de teclado global:</span>
              <kbd className="px-1.5 py-0.5 bg-cm-surface border border-cm-border rounded shadow-sm text-cm-text font-black">Ctrl</kbd>
              <span>+</span>
              <kbd className="px-1.5 py-0.5 bg-cm-surface border border-cm-border rounded shadow-sm text-cm-text font-black">K</kbd>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <span><kbd className="px-1 font-mono">↑↓</kbd> Navegar</span>
              <span><kbd className="px-1 font-mono">Enter</kbd> Seleccionar</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
