import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Truck, MapPin, Plus, X, Edit3, Trash2, CheckCircle2, Phone, Clock,
  Bike, Car, Footprints, Package, Award, TrendingUp, Users, Navigation,
  AlertTriangle, Loader2, DollarSign, Mail, KeyRound
} from 'lucide-react';
import { deliveryService } from '../../lib/deliveryService';
import { createUser } from '../../lib/authService';
import { useBranch } from '../../context/BranchContext';
import { useToast } from '../../components/ToastContext';

const VEHICLE_ICONS = { Moto: Bike, Auto: Car, Bicicleta: Bike, 'A Pie': Footprints };

export default function DeliveryManager({ branchId }) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('drivers');
  const [loading, setLoading] = useState({ drivers: true, zones: true, logs: true, tariff: true });
  const [subscriptionError, setSubscriptionError] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [zones, setZones] = useState([]);
  const [logs, setLogs] = useState([]);
  const [tariffConfig, setTariffConfig] = useState({ tarifaBase: 3.5, precioPorKm: 1, kmGratis: 1 });
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [editingZone, setEditingZone] = useState(null);
  const [driverForm, setDriverForm] = useState({ name: '', phone: '', vehicle: 'Moto', email: '', pin: '', createUser: false, userId: '' });
  const [zoneForm, setZoneForm] = useState({ name: '', fee: '0', freeThreshold: '', estimatedMinutes: '15', priority: '0' });

  useEffect(() => {
    if (!branchId) return;
    setSubscriptionError(null);
    setLoading({ drivers: true, zones: true, logs: true, tariff: true });
    const unsub1 = deliveryService.subscribeToDrivers(branchId, (data) => {
      setDrivers(data);
      setLoading(prev => ({ ...prev, drivers: false }));
    }, (err) => { setSubscriptionError(err.message); setLoading(prev => ({ ...prev, drivers: false, zones: false, logs: false, tariff: false })); });
    const unsub2 = deliveryService.subscribeToZones(branchId, (data) => {
      setZones(data);
      setLoading(prev => ({ ...prev, zones: false }));
    }, (err) => { setSubscriptionError(err.message); setLoading(prev => ({ ...prev, drivers: false, zones: false, logs: false, tariff: false })); });
    const unsub3 = deliveryService.subscribeToDeliveryLogs(branchId, (data) => {
      setLogs(data);
      setLoading(prev => ({ ...prev, logs: false }));
    }, (err) => { setSubscriptionError(err.message); setLoading(prev => ({ ...prev, drivers: false, zones: false, logs: false, tariff: false })); });
    const unsub4 = deliveryService.subscribeToTariffConfig(branchId, (data) => {
      setTariffConfig(data);
      setLoading(prev => ({ ...prev, tariff: false }));
    }, (err) => { setSubscriptionError(err.message); setLoading(prev => ({ ...prev, drivers: false, zones: false, logs: false, tariff: false })); });
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, [branchId]);

  const isReady = !loading.drivers && !loading.zones && !loading.logs;
  const allLoaded = isReady || subscriptionError;

  // ─── Drivers ───────────────────────────────────────

  const openDriverForm = (driver = null) => {
    if (driver) {
      setEditingDriver(driver);
      setDriverForm({ name: driver.name, phone: driver.phone, vehicle: driver.vehicle, email: driver.email || '', pin: '', createUser: false, userId: driver.userId || '' });
    } else {
      setEditingDriver(null);
      setDriverForm({ name: '', phone: '', vehicle: 'Moto', email: '', pin: '', createUser: false });
    }
    setShowDriverModal(true);
  };

  const handleSaveDriver = async () => {
    if (!driverForm.name.trim()) return;
    const data = { name: driverForm.name.trim(), phone: driverForm.phone.trim(), vehicle: driverForm.vehicle };
    if (driverForm.email.trim()) data.email = driverForm.email.trim();
    try {
      if (editingDriver) {
        const r = await deliveryService.updateDriver(branchId, editingDriver.id, data);
        if (!r.success) { showToast('Error al actualizar repartidor', 'error'); return; }
        showToast('Repartidor actualizado correctamente');
      } else {
        let userId = null;
        if (driverForm.createUser && driverForm.email.trim() && driverForm.pin) {
          const userResult = await createUser({ email: driverForm.email.trim(), name: driverForm.name.trim(), role: 'delivery', pin: driverForm.pin });
          if (userResult.success) userId = userResult.userId;
        }
        data.userId = userId;
        const result = await deliveryService.createDriver(branchId, data);
        if (!result.success) { showToast('Error al crear repartidor', 'error'); return; }
        showToast('Repartidor creado correctamente');
      }
      setShowDriverModal(false);
    } catch (err) {
      showToast(err.message || 'Error al guardar repartidor', 'error');
    }
  };

  // ─── Zones ──────────────────────────────────────────

  const openZoneForm = (zone = null) => {
    if (zone) {
      setEditingZone(zone);
      setZoneForm({
        name: zone.name,
        fee: String(zone.fee),
        freeThreshold: zone.freeThreshold != null ? String(zone.freeThreshold) : '',
        estimatedMinutes: String(zone.estimatedMinutes || 15),
        priority: String(zone.priority || 0),
      });
    } else {
      setEditingZone(null);
      setZoneForm({ name: '', fee: '0', freeThreshold: '', estimatedMinutes: '15', priority: '0' });
    }
    setShowZoneModal(true);
  };

  const handleSaveZone = async () => {
    if (!zoneForm.name.trim()) return;
    const data = {
      name: zoneForm.name.trim(),
      fee: parseFloat(zoneForm.fee) || 0,
      freeThreshold: zoneForm.freeThreshold ? parseFloat(zoneForm.freeThreshold) : null,
      estimatedMinutes: parseInt(zoneForm.estimatedMinutes) || 15,
      priority: parseInt(zoneForm.priority) || 0,
    };
    try {
      const result = editingZone
        ? await deliveryService.updateZone(branchId, editingZone.id, data)
        : await deliveryService.createZone(branchId, data);
      if (result.success) {
        setShowZoneModal(false);
        showToast(editingZone ? 'Zona actualizada correctamente' : 'Zona creada correctamente');
      } else {
        showToast('Error al guardar zona', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Error al guardar zona', 'error');
    }
  };

  // ─── Metrics ────────────────────────────────────────

  const todayLogs = logs.filter(l => {
    const d = new Date(l.assignedAt || l.createdAt);
    return d.toDateString() === new Date().toDateString();
  });

  const completedToday = todayLogs.filter(l => l.status === 'delivered').length;
  const activeDeliveries = todayLogs.filter(l => l.status === 'en_camino').length;
  const avgMinutes = (() => {
    const delivered = todayLogs.filter(l => l.status === 'delivered' && l.assignedAt && l.deliveredAt);
    if (!delivered.length) return 0;
    const total = delivered.reduce((sum, l) => sum + (new Date(l.deliveredAt) - new Date(l.assignedAt)), 0);
    return Math.round(total / delivered.length / 60000);
  })();

  const driverStats = drivers.map(d => {
    const driverLogs = logs.filter(l => l.driverId === d.id && l.status === 'delivered');
    return {
      ...d,
      totalToday: driverLogs.length,
    };
  });

  const TABS = [
    { key: 'drivers', label: 'Repartidores', icon: Users },
    { key: 'zones', label: 'Zonas', icon: MapPin },
    { key: 'tariffs', label: 'Tarifas', icon: DollarSign },
    { key: 'metrics', label: 'Métricas', icon: TrendingUp },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-cm-text">Gestión de Delivery</h2>
      </div>

      {subscriptionError && (
        <div className="flex items-start gap-3 bg-cm-error/5 border border-cm-error/20 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-cm-error shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-cm-error">Error de conexión</p>
            <p className="text-xs text-cm-text-secondary mt-0.5">{subscriptionError}</p>
          </div>
        </div>
      )}

      {!isReady && !subscriptionError && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-cm-accent animate-spin" />
        </div>
      )}

      {(isReady || subscriptionError) && (<>
      {/* Tabs */}
      <nav className="segmented">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`${activeTab === tab.key ? 'active' : ''}`}>
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </nav>

      {/* ─── DRIVERS TAB ─────────────────────────── */}
      {activeTab === 'drivers' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => openDriverForm()}
              className="flex items-center gap-2 px-4 py-2 bg-cm-accent text-white text-sm font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors">
              <Plus className="w-4 h-4" /> Nuevo Repartidor
            </button>
          </div>

          <div className="grid gap-4">
            {drivers.map(d => {
              const VIcon = VEHICLE_ICONS[d.vehicle] || Bike;
              return (
                <div key={d.id} className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${d.available ? 'bg-cm-success/10 border-cm-success/30' : 'bg-cm-text/5 border-cm-border'}`}>
                        <Truck className={`w-5 h-5 ${d.available ? 'text-cm-success' : 'text-cm-text-tertiary'}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-cm-text">{d.name}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          {d.phone && <span className="flex items-center gap-1 text-xs text-cm-text-secondary"><Phone className="w-3 h-3" />{d.phone}</span>}
                          <span className="flex items-center gap-1 text-xs text-cm-text-secondary"><VIcon className="w-3 h-3" />{d.vehicle}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <span className={`bdg ${d.available ? 'bdg-success' : 'bdg-neutral'}`}>
                            {d.available ? 'Disponible' : 'En ruta'}
                          </span>
                          <span className="text-xs text-cm-text-secondary">
                            <Package className="w-3 h-3 inline mr-0.5" />
                            {d.totalDeliveries || 0} entregas
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={async () => {
                        if (d.available) {
                          if (!window.confirm(`¿Marcar a "${d.name}" como ocupado?`)) return;
                        } else {
                          const hasActive = logs.some(l => l.driverId === d.id && l.status === 'en_camino');
                          if (hasActive && !window.confirm(`"${d.name}" tiene entregas activas. ¿Marcar disponible de todas formas?`)) return;
                        }
                        try {
                          await deliveryService.updateDriver(branchId, d.id, { available: !d.available });
                          showToast(`"${d.name}" marcado como ${!d.available ? 'disponible' : 'ocupado'}`);
                        } catch { showToast('Error al cambiar estado', 'error'); }
                      }}
                        className="p-2 text-cm-text-tertiary hover:text-cm-info hover:bg-cm-info/10 rounded-lg transition-colors" title={d.available ? 'Marcar ocupado' : 'Marcar disponible'}>
                        {d.available ? <CheckCircle2 className="w-4 h-4 text-cm-success" /> : <Clock className="w-4 h-4" />}
                      </button>
                      <button onClick={() => openDriverForm(d)} className="p-2 text-cm-text-tertiary hover:text-cm-accent hover:bg-cm-accent/10 rounded-lg transition-colors">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={async () => {
                        if (!window.confirm(`¿Eliminar repartidor "${d.name}"?`)) return;
                        try {
                          const r = await deliveryService.deleteDriver(branchId, d.id);
                          if (r.success) showToast(`"${d.name}" eliminado`);
                          else showToast('Error al eliminar repartidor', 'error');
                        } catch { showToast('Error al eliminar repartidor', 'error'); }
                      }}
                        className="p-2 text-cm-text-tertiary hover:text-cm-error hover:bg-cm-error/10 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {!drivers.length && (
              <div className="text-center py-12 text-cm-text-secondary">
                <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">No hay repartidores registrados</p>
                <p className="text-sm mt-1">Agrega tu primer repartidor para empezar a asignar entregas.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── ZONES TAB ───────────────────────────── */}
      {activeTab === 'zones' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => openZoneForm()}
              className="flex items-center gap-2 px-4 py-2 bg-cm-accent text-white text-sm font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors">
              <Plus className="w-4 h-4" /> Nueva Zona
            </button>
          </div>

          <div className="grid gap-4">
            {zones.filter(z => z.active !== false).sort((a, b) => (a.priority || 0) - (b.priority || 0)).map(z => (
              <div key={z.id} className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-cm-accent/10 rounded-full flex items-center justify-center border-2 border-cm-accent/20 shrink-0">
                      <MapPin className="w-5 h-5 text-cm-accent" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-cm-text">{z.name}</h3>
                        {z.priority > 0 && <span className="bdg bdg-accent">P{z.priority}</span>}
                      </div>
                      <div className="flex items-center gap-4 mt-1.5">
                        <span className="text-sm font-semibold text-cm-accent">S/ {z.fee.toFixed(2)}</span>
                        {z.freeThreshold != null && z.freeThreshold > 0 && (
                          <span className="text-xs text-cm-success font-semibold">Gratis desde S/ {z.freeThreshold.toFixed(2)}</span>
                        )}
                        <span className="flex items-center gap-1 text-xs text-cm-text-secondary">
                          <Clock className="w-3 h-3" /> ~{z.estimatedMinutes} min
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openZoneForm(z)} className="p-2 text-cm-text-tertiary hover:text-cm-accent hover:bg-cm-accent/10 rounded-lg transition-colors">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={async () => {
                      if (!window.confirm(`¿Eliminar zona "${z.name}"?`)) return;
                      try {
                        const r = await deliveryService.deleteZone(branchId, z.id);
                        if (r.success) showToast(`Zona "${z.name}" eliminada`);
                        else showToast('Error al eliminar zona', 'error');
                      } catch { showToast('Error al eliminar zona', 'error'); }
                    }}
                      className="p-2 text-cm-text-tertiary hover:text-cm-error hover:bg-cm-error/10 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {!zones.filter(z => z.active !== false).length && (
              <div className="text-center py-12 text-cm-text-secondary">
                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">No hay zonas de delivery configuradas</p>
                <p className="text-sm mt-1">Crea zonas para calcular tarifas automáticas según la ubicación.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── METRICS TAB ──────────────────────────── */}
      {activeTab === 'metrics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm p-4">
              <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">Hoy</p>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-cm-success" />
                <span className="text-2xl font-extrabold text-cm-text">{completedToday}</span>
              </div>
              <p className="text-xs text-cm-success font-semibold mt-1">entregas completadas</p>
            </div>
            <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm p-4">
              <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">En ruta</p>
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-cm-info" />
                <span className="text-2xl font-extrabold text-cm-text">{activeDeliveries}</span>
              </div>
              <p className="text-xs text-cm-info font-semibold mt-1">pedidos activos</p>
            </div>
            <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm p-4">
              <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">Tiempo promedio</p>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-cm-accent" />
                <span className="text-2xl font-extrabold text-cm-text">{avgMinutes}</span>
              </div>
              <p className="text-xs text-cm-accent font-semibold mt-1">minutos por entrega</p>
            </div>
            <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm p-4">
              <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">Repartidores</p>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-cm-warning" />
                <span className="text-2xl font-extrabold text-cm-text">{drivers.filter(d => d.available !== false).length}</span>
              </div>
              <p className="text-xs text-cm-warning font-semibold mt-1">disponibles / {drivers.length} total</p>
            </div>
          </div>

          {/* Driver ranking */}
          <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm p-5">
            <h3 className="text-sm font-semibold text-cm-text mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-cm-warning" /> Ranking de Repartidores
            </h3>
            {driverStats.filter(d => d.totalToday > 0).length > 0 ? (
              <div className="space-y-2">
                {driverStats.filter(d => d.totalToday > 0).sort((a, b) => b.totalToday - a.totalToday).map((d, i) => (
                  <div key={d.id} className="flex items-center justify-between py-2 border-b border-cm-border last:border-0">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${i === 0 ? 'bg-cm-warning/20 text-cm-warning' : i === 1 ? 'bg-cm-text/10 text-cm-text-secondary' : i === 2 ? 'bg-cm-accent/10 text-cm-accent' : 'bg-cm-bg-alt text-cm-text-tertiary'}`}>
                        {i + 1}
                      </span>
                      <span className="font-semibold text-cm-text">{d.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-cm-accent">{d.totalToday} entregas</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-cm-text-secondary text-center py-4">No hay entregas registradas hoy</p>
            )}
          </div>

          {/* Today's delivery log */}
          <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm overflow-hidden">
            <div className="p-4 border-b border-cm-border">
              <h3 className="text-sm font-semibold text-cm-text">Entregas del día</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cm-border bg-cm-bg-alt">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Repartidor</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Orden</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Estado</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Asignado</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Entregado</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Duración</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cm-border">
                  {todayLogs.slice().reverse().map(l => {
                    const assignedAt = l.assignedAt ? new Date(l.assignedAt) : null;
                    const deliveredAt = l.deliveredAt ? new Date(l.deliveredAt) : null;
                    const duration = assignedAt && deliveredAt ? Math.round((deliveredAt - assignedAt) / 60000) : null;
                    return (
                      <tr key={l.id} className="hover:bg-cm-accent/5 transition-colors">
                        <td className="px-4 py-3 font-semibold text-cm-text">{l.driverName || '-'}</td>
                        <td className="px-4 py-3 text-cm-text-secondary font-mono text-xs">#{(l.orderId || '').slice(-4).toUpperCase()}</td>
                        <td className="px-4 py-3">
                          <span className={`bdg ${l.status === 'delivered' ? 'bdg-success' : l.status === 'en_camino' ? 'bdg-info' : 'bdg-neutral'}`}>
                            {l.status === 'delivered' ? 'Entregado' : l.status === 'en_camino' ? 'En ruta' : l.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-cm-text-secondary text-right">
                          {assignedAt ? assignedAt.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td className="px-4 py-3 text-xs text-cm-text-secondary text-right">
                          {deliveredAt ? deliveredAt.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td className={`px-4 py-3 text-right font-semibold text-xs ${duration !== null && duration <= 30 ? 'text-cm-success' : duration !== null ? 'text-cm-warning' : 'text-cm-text-tertiary'}`}>
                          {duration !== null ? `${duration} min` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                  {!todayLogs.length && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-cm-text-secondary">No hay entregas registradas hoy</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TARIFFS TAB ──────────────────────────── */}
      {activeTab === 'tariffs' && (
        <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm p-6">
          <h3 className="text-sm font-semibold text-cm-text mb-4">Configurar tarifas por distancia</h3>
          <p className="text-xs text-cm-text-secondary mb-5">El costo de delivery se calcula: <strong>Tarifa base + (km - km gratis) × precio por km</strong>. La dirección del cliente se geocodifica automáticamente contra OpenStreetMap.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-cm-text-secondary mb-1.5 uppercase tracking-wider">Tarifa base (S/)</label>
              <input type="number" step="0.5" min="0" value={tariffConfig.tarifaBase}
                onChange={e => setTariffConfig({ ...tariffConfig, tarifaBase: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-cm-text-secondary mb-1.5 uppercase tracking-wider">Precio por km (S/)</label>
              <input type="number" step="0.25" min="0" value={tariffConfig.precioPorKm}
                onChange={e => setTariffConfig({ ...tariffConfig, precioPorKm: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-cm-text-secondary mb-1.5 uppercase tracking-wider">Km gratis</label>
              <input type="number" step="0.5" min="0" value={tariffConfig.kmGratis}
                onChange={e => setTariffConfig({ ...tariffConfig, kmGratis: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent" />
            </div>
          </div>

          <div className="bg-cm-bg-alt rounded-xl p-4 mb-5">
            <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-2">Ejemplo de cálculo</p>
            <div className="space-y-1 text-sm text-cm-text">
              <p>Cliente a <strong>3.5 km</strong> de distancia:</p>
              <p className="text-cm-text-secondary ml-4">= S/ {tariffConfig.tarifaBase?.toFixed(2)} + ({'3.5'} - {tariffConfig.kmGratis?.toFixed(1)}) × S/ {tariffConfig.precioPorKm?.toFixed(2)}</p>
              <p className="font-bold text-cm-accent ml-4">= S/ {(
                tariffConfig.tarifaBase + Math.max(0, 3.5 - tariffConfig.kmGratis) * tariffConfig.precioPorKm
              ).toFixed(2)}</p>
            </div>
          </div>

          <button onClick={async () => {
            const r = await deliveryService.updateTariffConfig(branchId, tariffConfig);
            if (r.success) showToast('Tarifas guardadas');
            else showToast('Error al guardar tarifas', 'error');
          }} className="px-6 py-2.5 bg-cm-accent text-white text-sm font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors">
            Guardar configuración
          </button>
        </div>
      )}
      </>)}

      {/* ─── DRIVER MODAL ─────────────────────────── */}
      {showDriverModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowDriverModal(false)}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-cm-surface rounded-xl shadow-cm-lg p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-cm-text mb-4">{editingDriver ? 'Editar Repartidor' : 'Nuevo Repartidor'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Nombre</label>
                <input type="text" value={driverForm.name} onChange={e => setDriverForm({ ...driverForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" placeholder="Nombre del repartidor" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Teléfono</label>
                <input type="text" value={driverForm.phone} onChange={e => setDriverForm({ ...driverForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" placeholder="999 888 777" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Vehículo</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Moto', 'Auto', 'Bicicleta', 'A Pie'].map(v => (
                    <button key={v} type="button" onClick={() => setDriverForm({ ...driverForm, vehicle: v })}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-all ${driverForm.vehicle === v ? 'bg-cm-accent border-cm-accent text-white' : 'bg-cm-bg-alt border-cm-border text-cm-text-secondary'}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {!editingDriver && (
                <>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="createUser" checked={driverForm.createUser}
                      onChange={e => setDriverForm({ ...driverForm, createUser: e.target.checked })}
                      className="w-4 h-4 rounded border-cm-border text-cm-accent focus:ring-cm-accent" />
                    <label htmlFor="createUser" className="text-xs font-semibold text-cm-text-secondary cursor-pointer">Crear usuario para login</label>
                  </div>

                  {driverForm.createUser && (
                    <div className="space-y-3 pl-6 border-l-2 border-cm-accent/30">
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cm-muted pointer-events-none" />
                        <input type="email" value={driverForm.email} onChange={e => setDriverForm({ ...driverForm, email: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 border border-cm-border rounded-lg text-sm text-cm-text focus:outline-none focus:border-cm-accent transition-colors" placeholder="correo@ejemplo.com" />
                      </div>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cm-muted pointer-events-none" />
                        <input type="password" value={driverForm.pin} onChange={e => setDriverForm({ ...driverForm, pin: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 border border-cm-border rounded-lg text-sm text-cm-text text-center tracking-[0.3em] focus:outline-none focus:border-cm-accent transition-colors" placeholder="PIN" maxLength={6} />
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowDriverModal(false)} className="flex-1 py-2 border border-cm-border text-sm font-semibold text-cm-text rounded-lg hover:bg-cm-surface-hover transition-colors">Cancelar</button>
                <button onClick={handleSaveDriver} disabled={!driverForm.name.trim()}
                  className="flex-1 py-2 bg-cm-accent text-white text-sm font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors disabled:opacity-50">
                  {editingDriver ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* ─── ZONE MODAL ───────────────────────────── */}
      {showZoneModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowZoneModal(false)}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-cm-surface rounded-xl shadow-cm-lg p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-cm-text mb-4">{editingZone ? 'Editar Zona' : 'Nueva Zona de Delivery'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Nombre de la zona</label>
                <input type="text" value={zoneForm.name} onChange={e => setZoneForm({ ...zoneForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" placeholder="Ej. Centro, San Isidro" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Costo delivery (S/)</label>
                  <input type="number" step="0.5" min="0" value={zoneForm.fee} onChange={e => setZoneForm({ ...zoneForm, fee: e.target.value })}
                    className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Tiempo estimado (min)</label>
                  <input type="number" min="1" value={zoneForm.estimatedMinutes} onChange={e => setZoneForm({ ...zoneForm, estimatedMinutes: e.target.value })}
                    className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Gratis desde (S/)</label>
                  <input type="number" step="5" min="0" value={zoneForm.freeThreshold} onChange={e => setZoneForm({ ...zoneForm, freeThreshold: e.target.value })}
                    className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" placeholder="0 = umbral global" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Prioridad</label>
                  <input type="number" min="0" value={zoneForm.priority} onChange={e => setZoneForm({ ...zoneForm, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" placeholder="0 = más baja" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowZoneModal(false)} className="flex-1 py-2 border border-cm-border text-sm font-semibold text-cm-text rounded-lg hover:bg-cm-surface-hover transition-colors">Cancelar</button>
                <button onClick={handleSaveZone} disabled={!zoneForm.name.trim()}
                  className="flex-1 py-2 bg-cm-accent text-white text-sm font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors disabled:opacity-50">
                  {editingZone ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
