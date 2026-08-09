import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Award,
  Sparkles,
  ShoppingBag,
  Calendar,
  TrendingUp,
  Gift,
  Phone,
  Mail,
  Hash,
  Users,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Plus,
  Minus,
} from 'lucide-react';
import { formatCurrency } from '../../../lib/format';
import { addCustomerPoints } from '../../../lib/customerService';
import CustomerProfileOrders from './CustomerProfileOrders';
import CustomerTimeline from './CustomerTimeline';
import type { CustomerProfileData } from '../../hooks/crm/useCustomerProfile';

// ── Tier config ──

const TIER_CONFIG = {
  bronze: { label: 'Bronce', color: 'bg-amber-700/20 text-amber-600 dark:text-amber-400', icon: '🥉' },
  silver: { label: 'Plata', color: 'bg-slate-400/20 text-slate-500 dark:text-slate-300', icon: '🥈' },
  gold: { label: 'Oro', color: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400', icon: '🥇' },
  platinum: { label: 'Platino', color: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400', icon: '👑' },
};

const NEXT_TIER = {
  bronze: { name: 'Plata', threshold: 500 },
  silver: { name: 'Oro', threshold: 2000 },
  gold: { name: 'Platino', threshold: 5000 },
  platinum: null,
};

// ── Stats card ──

function StatCard({ icon: Icon, label, value, accent = false }: any) {
  return (
    <div className="rounded-xl border border-cm-border bg-cm-surface p-4 shadow-cm-sm">
      <div className="flex items-center gap-2 text-cm-text-secondary">
        <Icon className={`h-4 w-4 ${accent ? 'text-cm-accent' : ''}`} />
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <p className={`mt-1 text-lg font-bold ${accent ? 'text-cm-accent' : 'text-cm-text'}`}>
        {value}
      </p>
    </div>
  );
}

// ── Tier Progress Bar ──

function TierProgress({ tierProgress }: { tierProgress: CustomerProfileData['tierProgress'] }) {
  const currentCfg = TIER_CONFIG[tierProgress.current as keyof typeof TIER_CONFIG] || TIER_CONFIG.bronze;
  const nextTier = NEXT_TIER[tierProgress.current as keyof typeof NEXT_TIER];

  return (
    <div className="rounded-xl border border-cm-border bg-cm-surface p-4 shadow-cm-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-cm-accent" />
          <span className="text-xs font-bold uppercase tracking-widest text-cm-text-secondary">
            Progreso de tier
          </span>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${currentCfg.color}`}>
          {currentCfg.label}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-cm-text-secondary">
          <span>Actual: S/ {tierProgress.currentSpent.toFixed(2)}</span>
          {nextTier ? (
            <span>Siguiente: S/ {nextTier.threshold.toFixed(2)}</span>
          ) : (
            <span className="text-cm-accent">¡Tier máximo!</span>
          )}
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-cm-border">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${tierProgress.progress}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-cm-accent to-cm-accent/60"
          />
        </div>
        {nextTier && (
          <p className="text-center text-[10px] text-cm-text-tertiary">
            Faltan S/ {(nextTier.threshold - tierProgress.currentSpent).toFixed(2)} para {nextTier.name}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Points adjuster ──

function PointsAdjuster({ customerId, currentPoints, onUpdate }: any) {
  const [amount, setAmount] = useState(0);
  const [isAdding, setIsAdding] = useState(false);

  const handleAdjust = async (delta: number) => {
    if (delta === 0) return;
    setIsAdding(true);
    try {
      await addCustomerPoints(customerId, delta);
      onUpdate?.();
    } catch (err) {
      // handled silently
    }
    setIsAdding(false);
    setAmount(0);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center rounded-lg border border-cm-border">
        <button
          onClick={() => setAmount(Math.max(0, amount - 10))}
          className="px-2 py-1 text-cm-text-secondary hover:text-cm-text transition-colors"
          disabled={isAdding}
        >
          <Minus className="h-3 w-3" />
        </button>
        <input
          type="number"
          min={0}
          value={amount}
          onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
          className="w-16 border-x border-cm-border bg-transparent py-1 text-center text-xs font-semibold text-cm-text focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          onClick={() => setAmount(amount + 10)}
          className="px-2 py-1 text-cm-text-secondary hover:text-cm-text transition-colors"
          disabled={isAdding}
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
      <button
        onClick={() => handleAdjust(amount)}
        disabled={amount <= 0 || isAdding}
        className="flex items-center gap-1 rounded-lg bg-cm-accent/10 px-3 py-1.5 text-xs font-semibold text-cm-accent transition-colors hover:bg-cm-accent/20 disabled:opacity-30"
      >
        {isAdding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
        Ajustar
      </button>
    </div>
  );
}

// ── Main Component ──

export default function CustomerProfile({
  profile,
  loading = false,
  error = null as string | null,
  onBack = () => {},
  onRetry = () => {},
}: {
  profile: CustomerProfileData | null;
  loading?: boolean;
  error?: string | null;
  onBack?: () => void;
  onRetry?: () => void;
}) {
  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-cm-accent" />
          <p className="text-sm text-cm-text-secondary">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <AlertTriangle className="h-10 w-10 text-cm-error" />
        <p className="text-sm font-semibold text-cm-text-secondary">{error}</p>
        <button
          onClick={onRetry}
          className="flex items-center gap-2 rounded-lg bg-cm-accent px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-cm-accent-hover"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Reintentar
        </button>
      </div>
    );
  }

  // ── Empty / no profile selected ──
  if (!profile?.customer) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <Users className="h-12 w-12 text-cm-text-tertiary" />
        <p className="text-sm font-semibold text-cm-text-secondary">Seleccioná un cliente para ver su perfil</p>
      </div>
    );
  }

  const { customer, orders, milestones, daysSinceLastOrder, avgTicket, tierProgress } = profile;
  const tierCfg = TIER_CONFIG[customer.tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.bronze;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={customer.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.2 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-start gap-4">
          <button
            onClick={onBack}
            className="mt-1 rounded-lg p-2 text-cm-text-secondary transition-colors hover:bg-cm-accent/10 hover:text-cm-accent"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-cm-text">{customer.name || 'Sin nombre'}</h2>
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${tierCfg.color}`}>
                {tierCfg.icon} {tierCfg.label}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-cm-text-secondary">
              {customer.email && (
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {customer.email}
                </span>
              )}
              {customer.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {customer.phone}
                </span>
              )}
              {customer.referralCode && (
                <span className="inline-flex items-center gap-1 font-mono">
                  <Hash className="h-3 w-3" /> {customer.referralCode}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={ShoppingBag}
            label="Pedidos"
            value={customer.orderCount ?? 0}
          />
          <StatCard
            icon={TrendingUp}
            label="Ticket promedio"
            value={formatCurrency(avgTicket)}
          />
          <StatCard
            icon={Sparkles}
            label="Puntos"
            value={customer.points ?? 0}
            accent
          />
          <StatCard
            icon={Calendar}
            label={daysSinceLastOrder !== null ? `Hace ${daysSinceLastOrder} días` : 'Sin pedidos'}
            value={customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString('es-PE') : '—'}
          />
        </div>

        {/* Tier progress + Points adjuster */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TierProgress tierProgress={tierProgress} />
          </div>
          <div className="rounded-xl border border-cm-border bg-cm-surface p-4 shadow-cm-sm">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="h-4 w-4 text-cm-accent" />
              <span className="text-xs font-bold uppercase tracking-widest text-cm-text-secondary">
                Ajustar puntos
              </span>
            </div>
            <PointsAdjuster customerId={customer.id} currentPoints={customer.points ?? 0} />
          </div>
        </div>

        {/* Referral info */}
        {customer.referredBy && (
          <div className="rounded-xl border border-cm-border bg-cm-surface p-4 shadow-cm-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-cm-accent" />
              <span className="text-xs font-bold uppercase tracking-widest text-cm-text-secondary">
                Invitado por
              </span>
            </div>
            <p className="mt-1 text-sm font-mono text-cm-text">{customer.referredBy}</p>
            {customer.referralsCount > 0 && (
              <p className="mt-1 text-xs text-cm-text-secondary">
                Ha referido a {customer.referralsCount} persona(s)
              </p>
            )}
          </div>
        )}

        {/* Orders + Timeline */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <CustomerProfileOrders orders={orders} />
          <CustomerTimeline milestones={milestones} customer={customer} />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
