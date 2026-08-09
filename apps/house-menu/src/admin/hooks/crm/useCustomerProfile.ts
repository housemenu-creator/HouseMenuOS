import { useState, useMemo } from 'react';
import { findCustomerAndOrders } from '../../../lib/customerService';
import type { Customer } from './useCustomerList';

// ── Types ──

export interface CustomerOrder {
  id: string;
  branchId: string;
  branchName?: string;
  createdAt: string | number;
  status: string;
  financials?: { total?: number };
  total?: number;
  items?: Array<{ name: string; quantity: number; price: number }>;
  customerName?: string;
  [key: string]: any;
}

export interface CustomerMilestone {
  id: string;
  type: 'tier_upgrade' | 'streak_bonus' | 'referral' | 'birthday_bonus' | 'points_milestone';
  label: string;
  date: number;
  details?: string;
  icon?: string;
}

export interface CustomerProfileData {
  customer: Customer | null;
  orders: CustomerOrder[];
  milestones: CustomerMilestone[];
  loading: boolean;
  error: string | null;
  // Computed
  daysSinceLastOrder: number | null;
  avgTicket: number;
  tierProgress: {
    current: string;
    next: string | null;
    nextThreshold: number;
    currentSpent: number;
    progress: number; // 0-100
  };
}

const TIER_THRESHOLDS = [
  { tier: 'platinum', minSpent: 5000 },
  { tier: 'gold', minSpent: 2000 },
  { tier: 'silver', minSpent: 500 },
  { tier: 'bronze', minSpent: 0 },
];

function computeTier(totalSpent: number): string {
  for (const t of TIER_THRESHOLDS) {
    if (totalSpent >= t.minSpent) return t.tier;
  }
  return 'bronze';
}

function getNextTier(currentTier: string): { next: string | null; nextThreshold: number } {
  const idx = TIER_THRESHOLDS.findIndex((t) => t.tier === currentTier);
  if (idx <= 0) return { next: null, nextThreshold: 0 };
  return { next: TIER_THRESHOLDS[idx - 1].tier, nextThreshold: TIER_THRESHOLDS[idx - 1].minSpent };
}

function buildMilestones(customer: Customer): CustomerMilestone[] {
  const milestones: CustomerMilestone[] = [];

  // Tier upgrades are stored as milestones in RTDB if they exist
  if (customer.milestones) {
    const raw = customer.milestones;
    Object.entries(raw).forEach(([id, m]: [string, any]) => {
      if (m.type === 'tier_upgrade') {
        milestones.push({
          id,
          type: 'tier_upgrade',
          label: `Subió a ${m.tierLabel || m.tier}`,
          date: m.timestamp || 0,
          details: `Gasto total: S/ ${(m.totalSpent || 0).toFixed(2)}`,
          icon: m.tier === 'platinum' ? '👑' : m.tier === 'gold' ? '🥇' : m.tier === 'silver' ? '🥈' : '🥉',
        });
      }
      if (m.type === 'streak_bonus') {
        milestones.push({
          id,
          type: 'streak_bonus',
          label: `Racha de ${m.streak} pedidos`,
          date: m.timestamp || 0,
          details: `+${m.points || 0} pts`,
          icon: '🔥',
        });
      }
      if (m.type === 'birthday_bonus') {
        milestones.push({
          id,
          type: 'birthday_bonus',
          label: 'Bonus de cumpleaños',
          date: m.timestamp || 0,
          details: `+${m.points || 0} pts`,
          icon: '🎂',
        });
      }
      if (m.type === 'referral_bonus') {
        milestones.push({
          id,
          type: 'referral',
          label: 'Bonus por referido',
          date: m.timestamp || 0,
          details: `+${m.points || 0} pts`,
          icon: '🎁',
        });
      }
    });
  }

  // Sort by date descending
  milestones.sort((a, b) => b.date - a.date);

  return milestones;
}

interface UseCustomerProfileReturn {
  profile: CustomerProfileData | null;
  loadProfile: (email: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  clearProfile: () => void;
}

export default function useCustomerProfile(): UseCustomerProfileReturn {
  const [profile, setProfile] = useState<CustomerProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = async (email: string) => {
    if (!email) return;
    setLoading(true);
    setError(null);

    try {
      const { customer, orders } = await findCustomerAndOrders(email);

      if (!customer) {
        setError('Cliente no encontrado');
        setLoading(false);
        return;
      }

      const milestones = buildMilestones(customer);

      const daysSinceLastOrder = customer.lastOrderAt
        ? Math.floor((Date.now() - new Date(customer.lastOrderAt).getTime()) / 86400000)
        : null;

      const orderCount = customer.orderCount || 0;
      const totalSpent = customer.totalSpent || 0;
      const avgTicket = orderCount > 0 ? totalSpent / orderCount : 0;

      const currentTier = customer.tier || computeTier(totalSpent);
      const { next, nextThreshold } = getNextTier(currentTier);
      const progress = nextThreshold > 0
        ? Math.min(100, ((totalSpent - (TIER_THRESHOLDS.find((t) => t.tier === currentTier)?.minSpent || 0)) / (nextThreshold - (TIER_THRESHOLDS.find((t) => t.tier === currentTier)?.minSpent || 0))) * 100)
        : 100;

      setProfile({
        customer,
        orders: orders as CustomerOrder[],
        milestones,
        loading: false,
        error: null,
        daysSinceLastOrder,
        avgTicket,
        tierProgress: {
          current: currentTier,
          next,
          nextThreshold,
          currentSpent: totalSpent,
          progress: Math.max(0, Math.min(100, progress)),
        },
      });
    } catch (err: any) {
      setError(err.message || 'Error al cargar perfil');
    }
    setLoading(false);
  };

  const clearProfile = () => {
    setProfile(null);
    setError(null);
  };

  return { profile, loadProfile, loading, error, clearProfile };
}
