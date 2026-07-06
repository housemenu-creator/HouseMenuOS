import { useState, useEffect, useMemo } from 'react';
import { ref, get, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import {
  Users, TrendingUp, ShoppingCart, Star, Award, Gift, DollarSign,
  Flame, Target, BarChart3, PieChart, Activity, UserPlus,
} from 'lucide-react';
import KpiCard from '../charts/KpiCard';
import BarChartWidget from '../charts/BarChartWidget';
import PieChartWidget from '../charts/PieChartWidget';
import LineChartWidget from '../charts/LineChartWidget';

function fmtCurrency(n) {
  return `S/ ${Number(n).toFixed(2)}`;
}

export default function CustomerAnalyticsTab() {
  const [customers, setCustomers] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubCustomers = onValue(ref(db, 'customers'), (snap) => {
      const data = snap.val();
      if (!data) { setCustomers([]); return; }
      setCustomers(Object.entries(data).map(([id, c]) => ({ id, ...c })));
    });

    // Load all orders from all branches
    async function loadOrders() {
      const branchesSnap = await get(ref(db, 'branches'));
      const branches = branchesSnap.val() || {};
      const orders = [];
      for (const [branchId, branchData] of Object.entries(branches)) {
        if (!branchData.orders) continue;
        for (const [orderId, order] of Object.entries(branchData.orders)) {
          orders.push({ ...order, id: orderId, branchId });
        }
      }
      setAllOrders(orders);
      setLoading(false);
    }
    loadOrders();

    return () => unsubCustomers();
  }, []);

  // ── Computed metrics ──

  const metrics = useMemo(() => {
    const total = customers.length;
    const withEmail = customers.filter((c) => c.email).length;
    const registered = customers.filter((c) => c.id && c.id.length > 10).length; // uid-based
    const active30d = customers.filter((c) => {
      if (!c.lastOrderAt) return false;
      return Date.now() - new Date(c.lastOrderAt).getTime() < 30 * 86400000;
    }).length;

    const totalSpent = customers.reduce((s, c) => s + (c.totalSpent || 0), 0);
    const totalOrders = customers.reduce((s, c) => s + (c.orderCount || 0), 0);
    const avgTicket = totalOrders > 0 ? totalSpent / totalOrders : 0;
    const avgOrderPerCustomer = total > 0 ? (totalOrders / total) : 0;

    const repeatCustomers = customers.filter((c) => (c.orderCount || 0) >= 2).length;
    const retentionRate = total > 0 ? (repeatCustomers / total) * 100 : 0;

    const totalPointsEarned = customers.reduce((s, c) => s + (c.lifetimePoints || 0), 0);
    const totalPointsRedeemed = customers.reduce((s, c) => s + (c.redeemedPoints || 0), 0);
    const totalPointsBalance = customers.reduce((s, c) => s + (c.points || 0), 0);

    const totalReferrals = customers.reduce((s, c) => s + (c.referralsCount || 0), 0);
    const totalReferralBonus = customers.reduce((s, c) => s + (c.referralBonusEarned || 0), 0);

    return {
      total, withEmail, registered, active30d,
      totalSpent, totalOrders, avgTicket, avgOrderPerCustomer,
      repeatCustomers, retentionRate,
      totalPointsEarned, totalPointsRedeemed, totalPointsBalance,
      totalReferrals, totalReferralBonus,
    };
  }, [customers]);

  // ── Tier distribution ──

  const tierDistribution = useMemo(() => {
    const counts = { bronze: 0, silver: 0, gold: 0, platinum: 0, unknown: 0 };
    customers.forEach((c) => {
      const t = c.tier || 'bronze';
      if (counts[t] !== undefined) counts[t]++; else counts.unknown++;
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }));
  }, [customers]);

  // ── Customer acquisition (by month) ──

  const acquisitionData = useMemo(() => {
    const map = new Map();
    customers.forEach((c) => {
      if (!c.createdAt) return;
      const d = new Date(c.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([label, count]) => ({ label, count }));
  }, [customers]);

  // ── Order frequency histogram ──

  const orderFrequency = useMemo(() => {
    const buckets = { '1': 0, '2-3': 0, '4-10': 0, '11+': 0 };
    customers.forEach((c) => {
      const o = c.orderCount || 0;
      if (o === 1) buckets['1']++;
      else if (o <= 3) buckets['2-3']++;
      else if (o <= 10) buckets['4-10']++;
      else buckets['11+']++;
    });
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [customers]);

  // ── LTV distribution ──

  const ltvData = useMemo(() => {
    const buckets = { 'S/0-100': 0, 'S/100-500': 0, 'S/500-2000': 0, 'S/2000+': 0 };
    customers.forEach((c) => {
      const s = c.totalSpent || 0;
      if (s <= 100) buckets['S/0-100']++;
      else if (s <= 500) buckets['S/100-500']++;
      else if (s <= 2000) buckets['S/500-2000']++;
      else buckets['S/2000+']++;
    });
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [customers]);

  // ── Points economy ──

  const pointsData = useMemo(() => [
    { name: 'Emitidos', value: metrics.totalPointsEarned },
    { name: 'Canjeados', value: metrics.totalPointsRedeemed },
    { name: 'Saldo', value: metrics.totalPointsBalance },
  ], [metrics]);

  // ── Top customers ──

  const topCustomers = useMemo(() => {
    return [...customers]
      .filter((c) => c.email || c.name)
      .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
      .slice(0, 10)
      .map((c, i) => ({
        rank: i + 1,
        name: c.name || c.email || 'Anónimo',
        email: c.email || '',
        spent: c.totalSpent || 0,
        orders: c.orderCount || 0,
        tier: c.tier || 'bronze',
      }));
  }, [customers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-sm text-cm-text-secondary">Cargando analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-cm-accent" />
        <h2 className="text-lg font-bold text-cm-text">Customer Analytics</h2>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Clientes" value={metrics.total}
          sublabel={`${metrics.active30d} activos (30d)`}
          icon={Users} color="accent" />
        <KpiCard label="Gasto Total" value={fmtCurrency(metrics.totalSpent)}
          sublabel={fmtCurrency(metrics.avgTicket) + ' avg'}
          icon={DollarSign} color="info" />
        <KpiCard label="Retención" value={`${metrics.retentionRate.toFixed(1)}%`}
          sublabel={`${metrics.repeatCustomers} recurrentes`}
          icon={Target} color="success" />
        <KpiCard label="Puntos emitidos" value={metrics.totalPointsEarned}
          sublabel={`${metrics.totalPointsRedeemed} canjeados`}
          icon={Award} color="warning" />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Registrados" value={metrics.registered}
          sublabel={`${metrics.withEmail} con email`}
          icon={UserPlus} color="info" />
        <KpiCard label="Pedidos totales" value={metrics.totalOrders}
          sublabel={`${metrics.avgOrderPerCustomer.toFixed(1)} / cliente`}
          icon={ShoppingCart} color="accent" />
        <KpiCard label="Referidos" value={metrics.totalReferrals}
          sublabel={`${metrics.totalReferralBonus} pts bonus`}
          icon={Gift} color="success" />
        <KpiCard label="Racha máxima" value={Math.max(...customers.map(c => c.bestStreak || 0), 0)}
          sublabel={`clientes con streak`}
          icon={Flame} color="warning" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Adquisición por mes */}
        <div className="bg-cm-surface border border-cm-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-cm-text mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cm-accent" />
            Nuevos clientes por mes
          </h3>
          {acquisitionData.length === 0 ? (
            <div className="text-xs text-cm-text-secondary text-center py-8">Sin datos</div>
          ) : (
            <BarChartWidget
              data={acquisitionData}
              dataKeys={[{ dataKey: 'count', name: 'Clientes', color: '#C2410C' }]}
              xKey="label"
              height={260}
            />
          )}
        </div>

        {/* Tier distribution */}
        <div className="bg-cm-surface border border-cm-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-cm-text mb-4 flex items-center gap-2">
            <Star className="w-4 h-4 text-cm-accent" />
            Distribución por Tier
          </h3>
          {tierDistribution.length === 0 ? (
            <div className="text-xs text-cm-text-secondary text-center py-8">Sin datos</div>
          ) : (
            <PieChartWidget
              data={tierDistribution}
              title=""
              dataKey="value"
              nameKey="name"
              height={260}
              colors={['#CD7F32', '#C0C0C0', '#FFD700', '#E5E4E2', '#666']}
            />
          )}
        </div>
      </div>

      {/* Second charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Frecuencia de pedidos */}
        <div className="bg-cm-surface border border-cm-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-cm-text mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-cm-accent" />
            Pedidos por cliente
          </h3>
          {orderFrequency.length === 0 ? (
            <div className="text-xs text-cm-text-secondary text-center py-8">Sin datos</div>
          ) : (
            <PieChartWidget
              data={orderFrequency}
              title=""
              dataKey="value"
              nameKey="name"
              height={240}
            />
          )}
        </div>

        {/* LTV distribution */}
        <div className="bg-cm-surface border border-cm-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-cm-text mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-cm-accent" />
            Distribución LTV
          </h3>
          {ltvData.length === 0 ? (
            <div className="text-xs text-cm-text-secondary text-center py-8">Sin datos</div>
          ) : (
            <PieChartWidget
              data={ltvData}
              title=""
              dataKey="value"
              nameKey="name"
              height={240}
            />
          )}
        </div>

        {/* Points economy */}
        <div className="bg-cm-surface border border-cm-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-cm-text mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-cm-accent" />
            Economía de puntos
          </h3>
          {pointsData.length === 0 ? (
            <div className="text-xs text-cm-text-secondary text-center py-8">Sin datos</div>
          ) : (
            <PieChartWidget
              data={pointsData}
              title=""
              dataKey="value"
              nameKey="name"
              height={240}
            />
          )}
        </div>
      </div>

      {/* Top Customers Table */}
      <div className="bg-cm-surface border border-cm-border rounded-xl p-6">
        <h3 className="text-sm font-semibold text-cm-text mb-4 flex items-center gap-2">
          <Star className="w-4 h-4 text-cm-accent" />
          Top 10 clientes por gasto
        </h3>
        {topCustomers.length === 0 ? (
          <div className="text-xs text-cm-text-secondary text-center py-8">Sin datos</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-cm-text-secondary border-b border-cm-border">
                  <th className="text-left font-semibold py-2 pr-4">#</th>
                  <th className="text-left font-semibold py-2 pr-4">Cliente</th>
                  <th className="text-right font-semibold py-2 px-3">Gasto total</th>
                  <th className="text-right font-semibold py-2 px-3">Pedidos</th>
                  <th className="text-center font-semibold py-2 px-3">Ticket prom.</th>
                  <th className="text-center font-semibold py-2 px-3">Tier</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((c) => (
                  <tr key={c.rank} className="border-b border-cm-border/50 hover:bg-cm-accent/5 transition-colors">
                    <td className="py-2 pr-4 text-cm-text-secondary font-bold">{c.rank}</td>
                    <td className="py-2 pr-4">
                      <div className="font-medium text-cm-text">{c.name}</div>
                      {c.email && <div className="text-cm-text-secondary">{c.email}</div>}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-cm-text">{fmtCurrency(c.spent)}</td>
                    <td className="py-2 px-3 text-right text-cm-text-secondary">{c.orders}</td>
                    <td className="py-2 px-3 text-center text-cm-text-secondary">
                      {c.orders > 0 ? fmtCurrency(c.spent / c.orders) : '—'}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`text-[0.6rem] font-bold px-2 py-0.5 rounded-full ${
                        c.tier === 'platinum' ? 'bg-cm-bg-alt text-cm-text' :
                        c.tier === 'gold' ? 'bg-cm-warning-soft text-cm-warning' :
                        c.tier === 'silver' ? 'bg-cm-bg-alt text-cm-text-secondary' :
                        'bg-cm-accent-light text-cm-accent'
                      }`}>
                        {c.tier}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
