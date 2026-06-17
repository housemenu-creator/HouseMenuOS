import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2, User, Phone, Mail, Building2, FileText, MapPin, CreditCard, Tag, StickyNote } from 'lucide-react';
import { cuentaService } from '../../lib/cuentaService';
import { useBranch } from '../../context/BranchContext';
import { useAuth } from '../../context/AuthContext';
import type { VendedorCuenta, CuentaType, PaymentTerms, DeliveryAddress } from '../vendedorTypes';

interface CuentaFormModalProps {
  cuenta?: VendedorCuenta | null; // null = crear, valor = editar
  onClose: () => void;
  onSaved: () => void;
}

const initialForm = {
  name: '',
  type: 'minorista' as CuentaType,
  phone: '',
  email: '',
  legalName: '',
  taxId: '',
  fiscalAddress: '',
  creditLimit: 0,
  paymentTerms: 'contado' as PaymentTerms,
  notes: '',
  deliveryAddressLabel: '',
  deliveryAddress: '',
};

type FormData = typeof initialForm;

export default function CuentaFormModal({ cuenta, onClose, onSaved }: CuentaFormModalProps) {
  const { activeBranchId } = useBranch();
  const { user } = useAuth();
  const isEditing = !!cuenta;

  const [form, setForm] = useState<FormData>(() => ({
    name: cuenta?.name || '',
    type: cuenta?.type || 'minorista',
    phone: cuenta?.phone || '',
    email: cuenta?.email || '',
    legalName: cuenta?.legalName || '',
    taxId: cuenta?.taxId || '',
    fiscalAddress: cuenta?.fiscalAddress || '',
    creditLimit: cuenta?.creditLimit || 0,
    paymentTerms: cuenta?.paymentTerms || 'contado',
    notes: cuenta?.notes || '',
    deliveryAddressLabel: '',
    deliveryAddress: '',
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('El nombre del cliente es obligatorio');
      return;
    }
    if (!activeBranchId) return;

    setSaving(true);
    setError('');

    try {
      const deliveryAddresses: DeliveryAddress[] = [];
      if (form.deliveryAddress.trim()) {
        deliveryAddresses.push({
          id: `addr-${Date.now()}`,
          label: form.deliveryAddressLabel.trim() || 'Principal',
          address: form.deliveryAddress.trim(),
        });
      }

      const baseData = {
        name: form.name.trim(),
        type: form.type,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        legalName: form.legalName.trim() || undefined,
        taxId: form.taxId.trim() || undefined,
        fiscalAddress: form.fiscalAddress.trim() || undefined,
        creditLimit: form.creditLimit > 0 ? form.creditLimit : undefined,
        paymentTerms: form.paymentTerms,
        notes: form.notes.trim() || undefined,
        assignedVendedor: user?.email || '',
        deliveryAddresses: deliveryAddresses.length > 0 ? deliveryAddresses : undefined,
        status: 'activa',
        isActive: true,
      };

      if (isEditing && cuenta) {
        await cuentaService.updateCuenta(activeBranchId, cuenta.id, baseData);
      } else {
        await cuentaService.createCuenta(activeBranchId, {
          ...baseData,
          createdBy: user?.email || '',
        });
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error('Error saving cuenta:', err);
      setError('Error al guardar. Verificá la conexión.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-cm-bg rounded-2xl border border-cm-border shadow-cm-lg w-full max-w-lg max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-cm-border">
            <div>
              <h2 className="text-base font-bold text-cm-text">
                {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <p className="text-xs text-cm-text-secondary mt-0.5">
                {isEditing ? 'Actualizá los datos del cliente' : 'Registrá un nuevo cliente'}
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-cm-accent/5 text-cm-text-secondary">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && (
              <div className="text-sm text-cm-error bg-cm-error-soft rounded-lg px-4 py-2.5">{error}</div>
            )}

            {/* Nombre */}
            <div>
              <label className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <User className="w-3 h-3" /> Nombre *
              </label>
              <input
                type="text" value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Razón social o nombre comercial"
                className="w-full px-3 py-2 bg-cm-surface border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent"
              />
            </div>

            {/* Tipo + Condición pago */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3 h-3" /> Tipo
                </label>
                <select value={form.type} onChange={(e) => updateField('type', e.target.value as CuentaType)}
                  className="w-full px-3 py-2 bg-cm-surface border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent">
                  <option value="minorista">Minorista</option>
                  <option value="mayorista">Mayorista</option>
                  <option value="corporativo">Corporativo</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <CreditCard className="w-3 h-3" /> Pago
                </label>
                <select value={form.paymentTerms} onChange={(e) => updateField('paymentTerms', e.target.value as PaymentTerms)}
                  className="w-full px-3 py-2 bg-cm-surface border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent">
                  <option value="contado">Contado</option>
                  <option value="15d">15 días</option>
                  <option value="30d">30 días</option>
                  <option value="60d">60 días</option>
                </select>
              </div>
            </div>

            {/* Contacto */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3 h-3" /> Teléfono
                </label>
                <input type="text" value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="+51 999 999 999"
                  className="w-full px-3 py-2 bg-cm-surface border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent" />
              </div>
              <div>
                <label className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3 h-3" /> Email
                </label>
                <input type="email" value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="cliente@ejemplo.com"
                  className="w-full px-3 py-2 bg-cm-surface border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent" />
              </div>
            </div>

            {/* Datos fiscales */}
            <div className="border-t border-cm-border pt-4">
              <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <FileText className="w-3 h-3" /> Datos fiscales
              </p>
              <div className="space-y-3">
                <input type="text" value={form.legalName}
                  onChange={(e) => updateField('legalName', e.target.value)}
                  placeholder="Razón social"
                  className="w-full px-3 py-2 bg-cm-surface border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" value={form.taxId}
                    onChange={(e) => updateField('taxId', e.target.value)}
                    placeholder="RUC"
                    className="w-full px-3 py-2 bg-cm-surface border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent" />
                  <input type="text" value={form.creditLimit}
                    onChange={(e) => updateField('creditLimit', Number(e.target.value))}
                    placeholder="Límite crédito S/"
                    className="w-full px-3 py-2 bg-cm-surface border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent" />
                </div>
                <input type="text" value={form.fiscalAddress}
                  onChange={(e) => updateField('fiscalAddress', e.target.value)}
                  placeholder="Dirección fiscal"
                  className="w-full px-3 py-2 bg-cm-surface border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent" />
              </div>
            </div>

            {/* Dirección de entrega */}
            <div className="border-t border-cm-border pt-4">
              <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <MapPin className="w-3 h-3" /> Dirección de entrega
              </p>
              <div className="space-y-3">
                <input type="text" value={form.deliveryAddressLabel}
                  onChange={(e) => updateField('deliveryAddressLabel', e.target.value)}
                  placeholder="Etiqueta (ej: Principal, Oficina)"
                  className="w-full px-3 py-2 bg-cm-surface border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent" />
                <input type="text" value={form.deliveryAddress}
                  onChange={(e) => updateField('deliveryAddress', e.target.value)}
                  placeholder="Dirección"
                  className="w-full px-3 py-2 bg-cm-surface border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent" />
              </div>
            </div>

            {/* Notas */}
            <div className="border-t border-cm-border pt-4">
              <label className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <StickyNote className="w-3 h-3" /> Notas
              </label>
              <textarea value={form.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                rows={3}
                placeholder="Observaciones, referencias, etc."
                className="w-full px-3 py-2 bg-cm-surface border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent resize-none" />
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-5 border-t border-cm-border">
            <button onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-cm-text-secondary hover:text-cm-text transition-colors">
              Cancelar
            </button>
            <button onClick={handleSubmit} disabled={saving || !form.name.trim()}
              className="flex items-center gap-1.5 px-5 py-2 bg-cm-accent text-white rounded-lg text-sm font-bold hover:bg-cm-accent-hover transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEditing ? 'Guardar Cambios' : 'Crear Cliente'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
