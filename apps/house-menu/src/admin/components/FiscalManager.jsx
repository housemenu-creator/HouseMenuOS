import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Plus, Printer, Search, Download, AlertTriangle, CheckCircle2, Clock, Building2, Receipt, Loader2, FileSpreadsheet } from 'lucide-react';
import { ref, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { sunatService } from '../../lib/sunatService';

const DOC_TYPES = [
  { code: 'NV', label: 'Nota de Venta', icon: FileSpreadsheet, color: 'bg-cm-warning/10 text-cm-warning border-cm-warning/30' },
  { code: '03', label: 'Boleta', icon: FileText, color: 'bg-cm-info/10 text-cm-info border-cm-info/30' },
  { code: '01', label: 'Factura', icon: FileText, color: 'bg-cm-accent/10 text-cm-accent border-cm-accent/30' },
];

export default function FiscalManager({ branchId }) {
  const [activeTab, setActiveTab] = useState('config');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fiscalData, setFiscalData] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [orderSearch, setOrderSearch] = useState('');
  const [generating, setGenerating] = useState(null);

  useEffect(() => {
    if (!branchId) return;
    setError(null);
    setLoading(true);
    let resolvedCount = 0;
    const resolve = () => { resolvedCount++; if (resolvedCount >= 3) setLoading(false); };
    const unsub1 = sunatService.subscribeToFiscalData(branchId, (data) => {
      setFiscalData(data);
      setForm(data);
      resolve();
    });
    const unsub2 = sunatService.subscribeToInvoices(branchId, (data) => {
      setInvoices(data);
      resolve();
    });
    const unsub3 = onValue(ref(db, `branches/${branchId}/orders`), (snap) => {
      const data = snap.val();
      if (!data) { setAllOrders([]); resolve(); return; }
      setAllOrders(Object.keys(data).map(k => ({ id: k, ...data[k] })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      resolve();
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [branchId]);

  const handleSave = async () => {
    const result = await sunatService.saveFiscalData(branchId, form);
    if (result.success) setEditing(false);
  };

  const getDocTypeIcon = (code) => {
    const dt = DOC_TYPES.find(d => d.code === code);
    return dt?.icon || FileText;
  };

  const handleGenerate = async (order, docType) => {
    setGenerating(order.id);
    const result = await sunatService.generateInvoice(branchId, order, fiscalData, docType);
    setGenerating(null);
    if (result.success) {
      setActiveTab('history');
    }
  };

  const hasFiscalConfig = fiscalData?.ruc && fiscalData?.razonSocial;
  const hasMinConfig = fiscalData?.razonSocial;

  const TABS = [
    { key: 'config', label: 'Config. Fiscal', icon: Building2 },
    { key: 'generate', label: 'Generar CPE', icon: FileText },
    { key: 'history', label: 'Historial', icon: Receipt },
  ];

  if (loading && !error) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-cm-text">Facturación Electrónica</h2>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-cm-accent animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-cm-text">Facturación Electrónica</h2>
        <div className="flex flex-col items-center justify-center py-16 text-cm-error">
          <AlertTriangle className="w-12 h-12 mb-3" />
          <p className="font-semibold">Error al cargar datos fiscales</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-cm-text">Facturación Electrónica</h2>
        {!hasFiscalConfig && activeTab !== 'config' && (
          <span className="flex items-center gap-1 text-xs font-semibold text-cm-warning bg-cm-warning/10 px-3 py-1.5 rounded-lg border border-cm-warning/30">
            <AlertTriangle className="w-3.5 h-3.5" /> Configura tus datos fiscales primero
          </span>
        )}
      </div>

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

      {/* ─── CONFIG TAB ──────────────────────────── */}
      {activeTab === 'config' && (
        <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-cm-text">Datos del Contribuyente</h3>
            {!editing && (
              <button onClick={() => setEditing(true)} className="px-4 py-2 bg-cm-accent text-white text-xs font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors">
                Editar
              </button>
            )}
          </div>

          {editing ? (
            <div className="space-y-4 max-w-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">RUC</label>
                  <input type="text" value={form.ruc || ''} onChange={e => setForm({ ...form, ruc: e.target.value })}
                    className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" placeholder="20123456789" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Razón Social</label>
                  <input type="text" value={form.razonSocial || ''} onChange={e => setForm({ ...form, razonSocial: e.target.value })}
                    className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" placeholder="Mi Empresa S.A.C." />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Nombre Comercial</label>
                <input type="text" value={form.nombreComercial || ''} onChange={e => setForm({ ...form, nombreComercial: e.target.value })}
                  className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" placeholder="House Menu" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Dirección Fiscal</label>
                <input type="text" value={form.direccion || ''} onChange={e => setForm({ ...form, direccion: e.target.value })}
                  className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" placeholder="Av. Ejemplo 123" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Departamento</label>
                  <input type="text" value={form.departamento || ''} onChange={e => setForm({ ...form, departamento: e.target.value })}
                    className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Provincia</label>
                  <input type="text" value={form.provincia || ''} onChange={e => setForm({ ...form, provincia: e.target.value })}
                    className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Distrito</label>
                  <input type="text" value={form.distrito || ''} onChange={e => setForm({ ...form, distrito: e.target.value })}
                    className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                </div>
              </div>

              <div className="border-t border-cm-border pt-4 mt-4">
                <h4 className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-3">SUNAT (opcional)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Usuario SOL</label>
                    <input type="text" value={form.solUser || ''} onChange={e => setForm({ ...form, solUser: e.target.value })}
                      className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Clave SOL</label>
                    <input type="password" value={form.solPass || ''} onChange={e => setForm({ ...form, solPass: e.target.value })}
                      className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                  </div>
                </div>
              </div>

              <div className="border-t border-cm-border pt-4 mt-4">
                <h4 className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-3">Comprobante por defecto</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Tipo</label>
                    <select value={form.defaultDocType || 'NV'} onChange={e => setForm({ ...form, defaultDocType: e.target.value })}
                      className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors">
                      {DOC_TYPES.map(dt => <option key={dt.code} value={dt.code}>{dt.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">IGV (%)</label>
                    <input type="number" step="0.5" min="0" max="100" value={form.igvRate ?? 0} onChange={e => setForm({ ...form, igvRate: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => { setEditing(false); setForm(fiscalData); }} className="flex-1 py-2 border border-cm-border text-sm font-semibold text-cm-text rounded-lg hover:bg-cm-surface-hover transition-colors">Cancelar</button>
                <button onClick={handleSave} className="flex-1 py-2 bg-cm-accent text-white text-sm font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors">Guardar</button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-w-lg">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-cm-bg-alt p-4 rounded-xl">
                  <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">RUC</p>
                  <p className="font-semibold text-cm-text">{fiscalData?.ruc || '—'}</p>
                </div>
                <div className="bg-cm-bg-alt p-4 rounded-xl">
                  <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">Razón Social</p>
                  <p className="font-semibold text-cm-text">{fiscalData?.razonSocial || '—'}</p>
                </div>
              </div>
              {fiscalData?.direccion && (
                <div className="bg-cm-bg-alt p-4 rounded-xl">
                  <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">Dirección</p>
                  <p className="font-semibold text-cm-text">{fiscalData.direccion}</p>
                </div>
              )}
              {!hasFiscalConfig && (
                <div className="flex items-center gap-2 bg-cm-warning/10 border border-cm-warning/30 rounded-xl p-4">
                  <AlertTriangle className="w-5 h-5 text-cm-warning shrink-0" />
                  <p className="text-sm font-semibold text-cm-warning">Completa los datos fiscales para emitir comprobantes electrónicos.</p>
                </div>
              )}
              {hasFiscalConfig && (
                <div className="flex items-center gap-2 bg-cm-success/10 border border-cm-success/30 rounded-xl p-4">
                  <CheckCircle2 className="w-5 h-5 text-cm-success shrink-0" />
                  <p className="text-sm font-semibold text-cm-success">Datos fiscales configurados. Puedes emitir comprobantes.</p>
                </div>
              )}

              {!hasFiscalConfig && hasMinConfig && (
                <div className="flex items-center gap-2 bg-cm-success/10 border border-cm-success/30 rounded-xl p-4">
                  <CheckCircle2 className="w-5 h-5 text-cm-success shrink-0" />
                  <p className="text-sm font-semibold text-cm-success">Configuración mínima lista. Puedes emitir Notas de Venta.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── GENERATE TAB ────────────────────────── */}
      {activeTab === 'generate' && (
        <div className="space-y-4">
          <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm p-5">
            <h3 className="text-sm font-semibold text-cm-text mb-4">Generar Comprobante</h3>
            {!hasMinConfig ? (
              <div className="text-center py-8 text-cm-text-secondary">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">Configura tu Razón Social primero</p>
                <p className="text-sm mt-1">Ve a la pestaña "Config. Fiscal" para ingresar los datos mínimos.</p>
              </div>
            ) : (
              <>
                <input type="text" placeholder="Buscar pedido por cliente, ID o ubicación..." value={orderSearch} onChange={e => setOrderSearch(e.target.value)}
                  className="w-full mb-4 px-4 py-2.5 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {allOrders.filter(o => {
                    const q = orderSearch.toLowerCase();
                    return !q || o.customerName?.toLowerCase().includes(q) || o.id?.toLowerCase().includes(q) || o.location?.toLowerCase().includes(q);
                  }).slice(0, 20).map(o => (
                    <div key={o.id} className="flex items-center justify-between p-3 bg-cm-bg-alt/50 rounded-xl border border-cm-border hover:border-cm-accent/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-cm-text">{o.customerName || '—'}</p>
                        <p className="text-xs text-cm-text-secondary font-mono">#{(o.id || '').slice(-4).toUpperCase()} — S/ {(o.financials?.total || o.total || 0).toFixed(2)}</p>
                      </div>
                      <div className="flex gap-1.5">
                        {DOC_TYPES.map(dt => {
                          const Icon = dt.icon;
                          const disabled = dt.code === '01' && (!fiscalData?.ruc);
                          return (
                            <button key={dt.code} onClick={() => handleGenerate(o, dt.code)} disabled={generating === o.id || disabled}
                              title={disabled ? 'Se necesita RUC para emitir Factura' : dt.label}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-40 ${dt.color} hover:opacity-80`}>
                              {generating === o.id ? '...' : <><Icon className="w-3 h-3 inline mr-1" />{dt.label === 'Nota de Venta' ? 'Nota' : dt.label === 'Boleta' ? 'Boleta' : 'Factura'}</>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {!allOrders.some(o => !orderSearch || o.customerName?.toLowerCase().includes(orderSearch)) && (
                    <p className="text-center text-sm text-cm-text-secondary py-4">No se encontraron pedidos</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── HISTORY TAB ─────────────────────────── */}
      {activeTab === 'history' && (
        <div className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm overflow-hidden">
          <div className="p-4 border-b border-cm-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-cm-text">Comprobantes emitidos</h3>
            <span className="text-xs text-cm-text-secondary font-medium">{invoices.length} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cm-border bg-cm-bg-alt">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Comprobante</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Cliente</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Total</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Estado</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-cm-text-secondary uppercase tracking-wider">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cm-border">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-cm-accent/5 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-cm-text">{inv.invoiceId}</td>
                    <td className="px-4 py-3">
                      <span className={`bdg ${inv.docType === 'Factura' ? 'bdg-accent' : 'bdg-info'}`}>
                        {inv.docType}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-cm-text">{inv.customerName}</td>
                    <td className="px-4 py-3 text-right font-semibold">S/ {(inv.orderTotal || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`bdg ${
                        inv.sunatStatus === 'accepted' ? 'bdg-success' :
                        inv.sunatStatus === 'local' ? 'bdg-neutral' :
                        inv.sunatStatus === 'pending' ? 'bdg-warning' :
                        'bdg-neutral'
                      }`}>
                        {inv.sunatStatus === 'accepted' ? 'Aceptado' : inv.sunatStatus === 'local' ? 'Interno' : inv.sunatStatus === 'rejected' ? 'Rechazado' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => sunatService.printInvoice(inv)}
                        className="p-2 text-cm-text-tertiary hover:text-cm-accent hover:bg-cm-accent/10 rounded-lg transition-colors" title="Imprimir">
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {!invoices.length && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-cm-text-secondary">No hay comprobantes emitidos. Genera tu primer CPE en la pestaña "Generar CPE".</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
