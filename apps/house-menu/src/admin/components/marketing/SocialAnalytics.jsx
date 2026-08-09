import { motion } from 'framer-motion';
import { TrendingUp, Users, Eye, ThumbsUp, MessageCircle, Share2, Instagram, Facebook, TrendingDown, BarChart3, Loader2 } from 'lucide-react';

function StatCard({ icon: Icon, label, value, trend, color = 'text-cm-accent', loading }) {
  if (loading) {
    return (
      <div className="bg-cm-surface border border-cm-border rounded-xl p-4 animate-pulse">
        <div className="h-4 w-20 bg-cm-bg rounded mb-2" />
        <div className="h-8 w-16 bg-cm-bg rounded mb-1" />
        <div className="h-3 w-12 bg-cm-bg rounded" />
      </div>
    );
  }

  return (
    <div className="bg-cm-surface border border-cm-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[0.55rem] font-bold uppercase tracking-wider text-cm-text-secondary">{label}</span>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className="text-2xl font-black text-cm-text">{value ?? '-'}</p>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-1 text-[0.55rem] font-bold ${trend >= 0 ? 'text-cm-success' : 'text-cm-error'}`}>
          {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(trend).toFixed(1)}%
        </div>
      )}
    </div>
  );
}

function PlatformCard({ platform, Icon, data, loading, color }) {
  if (loading) {
    return (
      <div className="bg-cm-surface border border-cm-border rounded-xl p-4 animate-pulse space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-cm-bg rounded" />
          <div className="h-4 w-24 bg-cm-bg rounded" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-3 w-full bg-cm-bg rounded" />)}
      </div>
    );
  }

  return (
    <div className="bg-cm-surface border border-cm-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded-lg ${color}/10`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <span className="text-xs font-bold text-cm-text">{platform}</span>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-[0.55rem]">
          <span className="text-cm-text-secondary">Seguidores</span>
          <span className="font-bold text-cm-text">{(data?.followers ?? 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-[0.55rem]">
          <span className="text-cm-text-secondary">Alcance (30d)</span>
          <span className="font-bold text-cm-text">{(data?.reach30d ?? 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-[0.55rem]">
          <span className="text-cm-text-secondary">Interacción</span>
          <span className="font-bold text-cm-text">{data?.engagementRate ?? '0'}%</span>
        </div>
        <div className="flex justify-between text-[0.55rem]">
          <span className="text-cm-text-secondary">Publicaciones (30d)</span>
          <span className="font-bold text-cm-text">{data?.posts30d ?? 0}</span>
        </div>
      </div>
    </div>
  );
}

export default function SocialAnalytics({ insights, loading }) {
  const stats = [
    { icon: Eye, label: 'Impresiones totales', value: insights?.totalImpressions?.toLocaleString(), trend: insights?.trends?.impressions, color: 'text-blue-400' },
    { icon: Users, label: 'Alcance total', value: insights?.totalReach?.toLocaleString(), trend: insights?.trends?.reach, color: 'text-green-400' },
    { icon: ThumbsUp, label: 'Interacciones', value: insights?.totalEngagement?.toLocaleString(), trend: insights?.trends?.engagement, color: 'text-cm-accent' },
    { icon: Share2, label: 'Veces compartido', value: insights?.totalShares?.toLocaleString(), trend: insights?.trends?.shares, color: 'text-purple-400' },
  ];

  const platformData = {
    instagram: insights?.instagram,
    facebook: insights?.facebook,
  };

  return (
    <div className="space-y-5">
      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => <StatCard key={s.label} {...s} loading={loading} />)}
      </div>

      {/* Platform breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <PlatformCard platform="Instagram" Icon={Instagram} data={platformData.instagram} loading={loading} color="text-pink-400" />
        <PlatformCard platform="Facebook" Icon={Facebook} data={platformData.facebook} loading={loading} color="text-blue-400" />
      </div>
    </div>
  );
}
