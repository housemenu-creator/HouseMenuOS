import { useState, useEffect, useMemo } from 'react';
import { ref, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { Search, Users, DollarSign, ShoppingCart, Star, ChevronDown, ChevronUp, Mail, Phone } from 'lucide-react';
import { getCustomerOrders } from '../../lib/customerService';

function fmtCurrency(n) {
  return `S/ ${Number(n).toFixed(2)}`;
}

export default function CustomersTab({ allOrders }) {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const customersRef = ref(db, 'customers');
    const unsub = onValue(customersRef, (snap) => {
      const data = snap.val();
      if (!data) { setCustomers([]); return; }
      setCustomers(Object.entries(data).map(([id, c]) => ({ id, ...c })));
    });
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q)
    );
  }, [customers, search]);

  if (customers.length === 0) {
    return (
      <div className="text-center py-16">
        <Users className="w-12 h-12 text-cm-text-tertiary mx-auto mb-4" />
        <h3 className="text-base font-semibold text-cm-text mb-1">Sin clientes aún</h3>
        <p className="text-xs text-cm-text-secondary">Los clientes se registran automáticamente cuando hacen un pedido con email.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-cm-accent" />
          <h2 className="text-lg font-bold text-cm-text">Clientes</h2>
          <span className="text-xs text-cm-text-secondary ml-1">({customers.length})</span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-text-tertiary pointer-events-none" />
          <input type="text" placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-64 bg-cm-bg-alt border border-cm-border rounded-lg pl-9 pr-4 py-2 text-xs font-medium focus:outline-none focus:border-cm-accent text-cm-text placeholder:text-cm-text-tertiary" />
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-cm-surface border border-cm-border rounded-xl p-3">
          <div className="text-[0.6rem] text-cm-text-secondary uppercase font-semibold">Total clientes</div>
          <div className="text-lg font-bold text-cm-text mt-1">{customers.length}</div>
        </div>
        <div className="bg-cm-surface border border-cm-border rounded-xl p-3">
          <div className="text-[0.6rem] text-cm-text-secondary uppercase font-semibold">Gasto total</div>
          <div className="text-lg font-bold text-cm-text mt-1">{fmtCurrency(customers.reduce((s, c) => s + (c.totalSpent || 0), 0))}</div>
        </div>
        <div className="bg-cm-surface border border-cm-border rounded-xl p-3">
          <div className="text-[0.6rem] text-cm-text-secondary uppercase font-semibold">Ticket promedio</div>
          <div className="text-lg font-bold text-cm-text mt-1">{fmtCurrency(customers.reduce((s, c) => s + (c.totalSpent || 0), 0) / Math.max(customers.reduce((s, c) => s + (c.orderCount || 0), 0), 1))}</div>
        </div>
        <div className="bg-cm-surface border border-cm-border rounded-xl p-3">
          <div className="text-[0.6rem] text-cm-text-secondary uppercase font-semibold">Puntos emitidos</div>
          <div className="text-lg font-bold text-cm-text mt-1">{customers.reduce((s, c) => s + (c.points || 0), 0)}</div>
        </div>
      </div>

      {/* Customer list */}
      <div className="bg-cm-surface border border-cm-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-cm-text-secondary border-b border-cm-border bg-cm-bg-alt/50">
                <th className="text-left font-semibold py-3 pl-4 pr-4">Cliente</th>
                <th className="text-left font-semibold py-3 px-3">Contacto</th>
                <th className="text-right font-semibold py-3 px-3">Pedidos</th>
                <th className="text-right font-semibold py-3 px-3">Gasto total</th>
                <th className="text-right font-semibold py-3 px-3">Ticket prom.</th>
                <th className="text-right font-semibold py-3 px-3">Puntos</th>
                <th className="text-center font-semibold py-3 pl-3 pr-4">Último pedido</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const avgTicket = c.orderCount > 0 ? (c.totalSpent || 0) / c.orderCount : 0;
                const isExpanded = expandedId === c.id;
                return (
                  <tr key={c.id} className="border-b border-cm-border/50 hover:bg-cm-accent/5 transition-colors cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : c.id)}>
                    <td className="py-3 pl-4 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-cm-accent/10 flex items-center justify-center text-xs font-bold text-cm-accent flex-shrink-0">
                          {(c.name || '?')[0].toUpperCase()}
                        </div>
                        <span className="font-medium text-cm-text">{c.name || 'Sin nombre'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="space-y-0.5">
                        {c.email && <div className="flex items-center gap-1 text-cm-text-secondary"><Mail className="w-3 h-3" />{c.email}</div>}
                        {c.phone && <div className="flex items-center gap-1 text-cm-text-secondary"><Phone className="w-3 h-3" />{c.phone}</div>}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right text-cm-text font-medium">{c.orderCount || 0}</td>
                    <td className="py-3 px-3 text-right text-cm-text font-medium">{fmtCurrency(c.totalSpent || 0)}</td>
                    <td className="py-3 px-3 text-right text-cm-text-secondary">{fmtCurrency(avgTicket)}</td>
                    <td className="py-3 px-3 text-right">
                      <span className="text-sm font-bold text-cm-accent">{c.points || 0}</span>
                    </td>
                    <td className="py-3 pl-3 pr-4 text-center text-cm-text-secondary">
                      {c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString('es-PE') : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer detail modal or inline */}
      {expandedId && (
        <CustomerDetail customer={customers.find(c => c.id === expandedId)} allOrders={allOrders} onClose={() => setExpandedId(null)} />
      )}
    </div>
  );
}

function CustomerDetail({ customer, allOrders, onClose }) {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    getCustomerOrders(allOrders, customer.email, customer.phone).then(setOrders);
  }, [customer, allOrders]);

  return (
    <div className="bg-cm-surface border border-cm-border rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-cm-accent/10 flex items-center justify-center text-sm font-bold text-cm-accent">
            {(customer.name || '?')[0].toUpperCase()}
          </div>
          <div>
            <h3 className="text-sm font-bold text-cm-text">{customer.name || 'Sin nombre'}</h3>
            <div className="text-[0.6rem] text-cm-text-secondary space-x-3">
              {customer.email && <span>{customer.email}</span>}
              {customer.phone && <span>{customer.phone}</span>}
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-cm-accent/10 text-cm-text-secondary">
          <ChevronUp className="w-4 h-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-cm-bg-alt rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-cm-text">{customer.orderCount || 0}</div>
          <div className="text-[0.55rem] text-cm-text-secondary uppercase tracking-wider">Pedidos</div>
        </div>
        <div className="bg-cm-bg-alt rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-cm-text">{fmtCurrency(customer.totalSpent || 0)}</div>
          <div className="text-[0.55rem] text-cm-text-secondary uppercase tracking-wider">Gastado</div>
        </div>
        <div className="bg-cm-bg-alt rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-cm-text">{fmtCurrency(customer.orderCount > 0 ? (customer.totalSpent || 0) / customer.orderCount : 0)}</div>
          <div className="text-[0.55rem] text-cm-text-secondary uppercase tracking-wider">Ticket prom.</div>
        </div>
        <div className="bg-cm-bg-alt rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-cm-accent">{customer.points || 0}</div>
          <div className="text-[0.55rem] text-cm-text-secondary uppercase tracking-wider">Puntos</div>
        </div>
      </div>

      {/* Order history */}
      <div>
        <h4 className="text-[0.6rem] font-semibold text-cm-text-secondary uppercase mb-2">Historial de pedidos</h4>
        {orders.length === 0 ? (
          <p className="text-xs text-cm-text-secondary text-center py-4">Sin pedidos registrados</p>
        ) : (
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {orders.map(o => (
              <div key={o.id} className="flex items-center justify-between bg-cm-bg-alt rounded-lg px-3 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-cm-text-secondary">#{o.id?.slice(-4)}</span>
                  <span className="text-cm-text">{fmtCurrency(o.financials?.total || 0)}</span>
                  <span className={`text-[0.55rem] font-semibold px-1.5 py-0.5 rounded-full ${
                    o.status === 'entregado' ? 'bg-cm-success/10 text-cm-success' :
                    o.status === 'cancelado' ? 'bg-cm-error/10 text-cm-error' :
                    'bg-cm-warning/10 text-cm-warning'
                  }`}>
                    {o.status?.replace('_', ' ')}
                  </span>
                </div>
                <span className="text-cm-text-secondary">{new Date(o.createdAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
