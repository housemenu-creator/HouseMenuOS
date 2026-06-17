import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Phone, Mail, MapPin, FileText, Pencil, XCircle, Loader2 } from 'lucide-react';
import type { VendedorCuenta } from '../vendedorTypes';
import { CUENTA_TYPE_LABELS, CUENTA_STATUS_COLORS } from '../vendedorTypes';
import type { Order } from '../../worker/workerTypes';
import { ordersService } from '../../lib/ordersService';

interface CuentaDetailProps {
  cuenta: VendedorCuenta;
  orders: Order[];
  onBack: () => void;
  onNewOrder: () => void;
  onEditCuenta: () => void;
}

function formatCurrency(amount: number): string {
  return `S/ ${amount.toFixed(2)}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_ORDER_LABELS: Record<string, string> = {
  recibido: 'Recibido',
  preparando: 'Preparándose',
  listo: 'Listo',
  en_camino: 'En camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
  programado: 'Programado',
};

export default function CuentaDetail({ cuenta, orders, onBack, onNewOrder, onEditCuenta }: CuentaDetailProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'pedidos'>('info');
  const [cancellingOrder, setCancellingOrder] = useState<string | null>(null);

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('¿Cancelar este pedido? Esta acción no se puede deshacer.')) return;
    setCancellingOrder(orderId);
    try {
      await ordersService.updateOrderStatus('', orderId, 'cancelado', 'vendedor');
    } catch (e) {
      console.error('Error cancelando pedido:', e);
    } finally {
      setCancellingOrder(null);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-cm-text-secondary hover:text-cm-text transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-cm-text">{cuenta.name}</h1>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${CUENTA_STATUS_COLORS[cuenta.status] || 'text-cm-muted bg-cm-muted/10'}`}>
                {cuenta.status === 'activa' ? 'Activa' : cuenta.status === 'inactiva' ? 'Inactiva' : 'Suspendida'}
              </span>
            </div>
            <p className="text-sm text-cm-text-secondary">
              {CUENTA_TYPE_LABELS[cuenta.type || 'minorista']}
              {cuenta.taxId && ` · RUC ${cuenta.taxId}`}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={onEditCuenta}
              className="flex items-center gap-1.5 px-3 py-2 border border-cm-border text-cm-text-secondary rounded-lg text-xs font-bold hover:bg-cm-surface-hover transition-colors">
              <Pencil className="w-3 h-3" /> Editar
            </button>
            <button onClick={onNewOrder}
              className="flex items-center gap-1.5 px-4 py-2 bg-cm-accent text-white rounded-lg text-xs font-bold hover:bg-cm-accent/90 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Nuevo Pedido
            </button>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-cm-surface border border-cm-border rounded-xl p-4">
          <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">Total gastado</p>
          <p className="text-lg font-black text-cm-text">{formatCurrency(cuenta.totalSpent || 0)}</p>
        </div>
        <div className="bg-cm-surface border border-cm-border rounded-xl p-4">
          <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">Pedidos</p>
          <p className="text-lg font-black text-cm-text">{cuenta.totalOrders || 0}</p>
        </div>
        {cuenta.creditLimit != null && (
          <div className="bg-cm-surface border border-cm-border rounded-xl p-4">
            <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">Límite crédito</p>
            <p className="text-lg font-black text-cm-text">{formatCurrency(cuenta.creditLimit)}</p>
          </div>
        )}
        {cuenta.lastOrderAt && (
          <div className="bg-cm-surface border border-cm-border rounded-xl p-4">
            <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-1">Último pedido</p>
            <p className="text-lg font-bold text-cm-text">{formatDate(cuenta.lastOrderAt)}</p>
          </div>
        )}
      </div>

      <nav className="flex gap-1 border-b border-cm-border">
        {(['info', 'pedidos'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors -mb-[1px] ${
              activeTab === tab
                ? 'border-cm-accent text-cm-text'
                : 'border-transparent text-cm-text-secondary hover:text-cm-text'
            }`}>
            {tab === 'info' ? 'Información' : `Pedidos (${orders.length})`}
          </button>
        ))}
      </nav>

      {activeTab === 'info' ? (
        <div className="space-y-4">
          <section className="bg-cm-surface border border-cm-border rounded-xl p-5">
            <h3 className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Contacto
            </h3>
            <div className="space-y-2">
              {cuenta.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-3.5 h-3.5 text-cm-text-tertiary" />
                  <span className="text-cm-text">{cuenta.phone}</span>
                </div>
              )}
              {cuenta.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-3.5 h-3.5 text-cm-text-tertiary" />
                  <span className="text-cm-text">{cuenta.email}</span>
                </div>
              )}
              {!cuenta.phone && !cuenta.email && (
                <p className="text-sm text-cm-text-tertiary">Sin datos de contacto</p>
              )}
            </div>
          </section>

          {cuenta.legalName && (
            <section className="bg-cm-surface border border-cm-border rounded-xl p-5">
              <h3 className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Datos fiscales
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-cm-text-tertiary">Razón social</p>
                  <p className="font-semibold text-cm-text">{cuenta.legalName}</p>
                </div>
                {cuenta.taxId && (
                  <div>
                    <p className="text-xs text-cm-text-tertiary">RUC</p>
                    <p className="font-semibold text-cm-text">{cuenta.taxId}</p>
                  </div>
                )}
                {cuenta.fiscalAddress && (
                  <div className="col-span-2">
                    <p className="text-xs text-cm-text-tertiary">Dirección fiscal</p>
                    <p className="font-semibold text-cm-text">{cuenta.fiscalAddress}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {cuenta.deliveryAddresses && cuenta.deliveryAddresses.length > 0 && (
            <section className="bg-cm-surface border border-cm-border rounded-xl p-5">
              <h3 className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Direcciones de entrega
              </h3>
              <div className="space-y-2">
                {cuenta.deliveryAddresses.map((addr) => (
                  <div key={addr.id} className="flex items-start gap-2 text-sm">
                    <MapPin className="w-3.5 h-3.5 text-cm-text-tertiary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-cm-text">{addr.label}</p>
                      <p className="text-cm-text-secondary text-xs">{addr.address}{addr.reference ? ` (${addr.reference})` : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {cuenta.notes && (
            <section className="bg-cm-surface border border-cm-border rounded-xl p-5">
              <h3 className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-2">Notas</h3>
              <p className="text-sm text-cm-text whitespace-pre-wrap">{cuenta.notes}</p>
            </section>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-cm-text-tertiary">No hay pedidos para esta cuenta</p>
            </div>
          ) : (
            orders.map((order) => {
              const isFinal = order.status === 'entregado' || order.status === 'cancelado';
              return (
                <div key={order.id} className="bg-cm-surface border border-cm-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-cm-text-secondary">#{order.id.slice(-6).toUpperCase()}</span>
                    <span className="text-xs text-cm-text-tertiary">
                      {new Date(order.createdAt).toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                      order.status === 'entregado' ? 'text-cm-success bg-cm-success/10' :
                      order.status === 'cancelado' ? 'text-cm-error bg-cm-error/10' :
                      'text-cm-warning bg-cm-warning/10'
                    }`}>
                      {STATUS_ORDER_LABELS[order.status] || order.status}
                    </span>
                    <div className="flex items-center gap-2">
                      {!isFinal && (
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          disabled={cancellingOrder === order.id}
                          className="p-1.5 rounded-lg text-cm-error hover:bg-cm-error/10 transition-colors disabled:opacity-50"
                          title="Cancelar pedido"
                        >
                          {cancellingOrder === order.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <XCircle className="w-3.5 h-3.5" />
                          }
                        </button>
                      )}
                      <span className="text-sm font-bold text-cm-text">
                        {formatCurrency(order.financials?.total || 0)}
                      </span>
                    </div>
                  </div>
                  {order.items && order.items.length > 0 && (
                    <p className="text-xs text-cm-text-tertiary mt-1 truncate">
                      {order.items.map((i) => `${i.name} x${i.quantity}`).join(', ')}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
