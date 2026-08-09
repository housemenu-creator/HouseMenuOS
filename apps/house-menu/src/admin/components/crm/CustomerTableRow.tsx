import { Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, ShoppingBag, Sparkles, Award } from 'lucide-react';
import { formatCurrency } from '../../../lib/format';

const TIER_CONFIG = {
  bronze: { label: 'Bronce', bg: 'bg-amber-700/20 text-amber-600 dark:text-amber-400' },
  silver: { label: 'Plata', bg: 'bg-slate-400/20 text-slate-500 dark:text-slate-300' },
  gold: { label: 'Oro', bg: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' },
  platinum: { label: 'Platino', bg: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' },
};

function TierBadge({ tier }) {
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG.bronze;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cfg.bg}`}>
      <Award className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

export default function CustomerTableRow({
  customer,
  isExpanded,
  onToggleExpand,
  onSelect,
  formatDate,
}) {
  if (!customer) return null;

  const tierCfg = TIER_CONFIG[customer.tier] || TIER_CONFIG.bronze;
  const lastOrder = customer.lastOrderAt ? formatDate(customer.lastOrderAt) : '—';
  const daysSinceLast = customer.lastOrderAt
    ? Math.floor((Date.now() - new Date(customer.lastOrderAt).getTime()) / 86400000)
    : null;
  const isInactive = daysSinceLast !== null && daysSinceLast > 90;

  return (
    <Fragment>
      <tr
        className={`transition-colors cursor-pointer hover:bg-cm-accent/5 ${
          isInactive ? 'opacity-60' : ''
        }`}
        onClick={() => onToggleExpand(customer.id)}
      >
        {/* Expand chevron */}
        <td className="w-8 px-2 py-3 text-cm-text-tertiary">
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </td>

        {/* Name / Email */}
        <td className="px-3 py-3">
          <div className="flex flex-col">
            <span className="font-semibold text-cm-text">
              {customer.name || 'Sin nombre'}
            </span>
            {customer.email && (
              <span className="text-xs text-cm-text-secondary">{customer.email}</span>
            )}
          </div>
        </td>

        {/* Tier */}
        <td className="px-3 py-3">
          <TierBadge tier={customer.tier} />
        </td>

        {/* Total spent */}
        <td className="px-3 py-3 text-right font-semibold text-cm-text">
          {formatCurrency(customer.totalSpent ?? 0)}
        </td>

        {/* Orders */}
        <td className="px-3 py-3 text-right text-sm text-cm-text-secondary">
          {customer.orderCount ?? 0}
        </td>

        {/* Points */}
        <td className="hidden px-3 py-3 text-right text-sm text-cm-text-secondary md:table-cell">
          <span className="inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-cm-accent" />
            {customer.points ?? 0}
          </span>
        </td>

        {/* Last order */}
        <td className="hidden px-3 py-3 text-right text-xs text-cm-text-secondary lg:table-cell">
          {lastOrder}
        </td>
      </tr>

      {/* Expanded detail panel */}
      {isExpanded && (
        <tr key={`${customer.id}-detail`}>
          <td colSpan={7} className="px-0 py-0">
            <AnimatePresence>
              <motion.div
                key={`${customer.id}-expand`}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="border-t border-cm-border bg-cm-bg-alt/50 px-6 py-4">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {/* Phone */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-cm-text-secondary">
                        Teléfono
                      </p>
                      <p className="text-sm text-cm-text">
                        {customer.phone || '—'}
                      </p>
                    </div>

                    {/* Referral */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-cm-text-secondary">
                        Código ref.
                      </p>
                      <p className="font-mono text-sm text-cm-text">
                        {customer.referralCode || '—'}
                      </p>
                    </div>

                    {/* Referrals count */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-cm-text-secondary">
                        Referidos
                      </p>
                      <p className="text-sm text-cm-text">
                        {customer.referralsCount ?? 0}
                      </p>
                    </div>

                    {/* Created */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-cm-text-secondary">
                        Cliente desde
                      </p>
                      <p className="text-sm text-cm-text">
                        {customer.createdAt ? formatDate(customer.createdAt) : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-cm-border/50 pt-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect && onSelect(customer);
                      }}
                      className="flex items-center gap-1.5 rounded-lg bg-cm-accent/10 px-3 py-1.5 text-xs font-semibold text-cm-accent transition-colors hover:bg-cm-accent/20"
                    >
                      <ShoppingBag className="h-3.5 w-3.5" /> Ver perfil
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </td>
        </tr>
      )}
    </Fragment>
  );
}
