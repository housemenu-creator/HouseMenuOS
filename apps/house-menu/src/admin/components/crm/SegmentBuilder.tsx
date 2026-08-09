import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Filter,
  Save,
  Trash2,
  Clock,
  TrendingUp,
  ShoppingBag,
  Award,
  Download,
  Sparkles,
  Loader2,
  Bookmark,
} from 'lucide-react';
import SegmentPreview from './SegmentPreview';
import type { SegmentFilters, SavedSegment } from '../../hooks/crm/useCustomerSegments';

const TIER_OPTIONS = [
  { value: 'bronze', label: 'Bronce' },
  { value: 'silver', label: 'Plata' },
  { value: 'gold', label: 'Oro' },
  { value: 'platinum', label: 'Platino' },
];

interface SegmentBuilderProps {
  segmentFilters: SegmentFilters;
  setSegmentFilter: (key: keyof SegmentFilters, value: any) => void;
  resetSegmentFilters: () => void;
  segmentCount: number;
  segmentCustomers: any[];
  savedSegments: SavedSegment[];
  onSaveSegment: (name: string) => void;
  onLoadSegment: (segment: SavedSegment) => void;
  onDeleteSegment: (id: string) => void;
  onBulkAddPoints: (points: number) => Promise<any>;
  onBulkExport: () => any[];
  loading?: boolean;
}

export default function SegmentBuilder({
  segmentFilters,
  setSegmentFilter,
  resetSegmentFilters,
  segmentCount,
  segmentCustomers,
  savedSegments,
  onSaveSegment,
  onLoadSegment,
  onDeleteSegment,
  onBulkAddPoints,
  onBulkExport,
  loading = false,
}: SegmentBuilderProps) {
  const [saveName, setSaveName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [bulkPoints, setBulkPoints] = useState(10);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ success: number; failed: number } | null>(null);

  const hasActiveFilters =
    segmentFilters.tiers.length > 0 ||
    segmentFilters.minSpent !== null ||
    segmentFilters.maxSpent !== null ||
    segmentFilters.minOrders !== null ||
    segmentFilters.recencyDays !== null;

  const handleSave = () => {
    if (!saveName.trim()) return;
    onSaveSegment(saveName.trim());
    setSaveName('');
    setShowSaveInput(false);
  };

  const handleBulkPoints = async () => {
    if (bulkPoints <= 0 || segmentCount === 0) return;
    setBulkSending(true);
    setBulkResult(null);
    try {
      const result = await onBulkAddPoints(bulkPoints);
      setBulkResult(result);
    } catch {
      setBulkResult({ success: 0, failed: segmentCount });
    }
    setBulkSending(false);
  };

  const handleExport = () => {
    const data = onBulkExport();
    if (!data.length) return;
    const csv = [
      ['Nombre', 'Email', 'Teléfono', 'Tier', 'Gasto Total', 'Pedidos', 'Puntos', 'Último Pedido'],
      ...data.map((c: any) => [
        c.name || '',
        c.email || '',
        c.phone || '',
        c.tier || '',
        c.totalSpent ?? 0,
        c.orderCount ?? 0,
        c.points ?? 0,
        c.lastOrderAt || '',
      ]),
    ]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `segmento-clientes-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Filters column */}
      <div className="space-y-4 lg:col-span-1">
        {/* ── Filter card ── */}
        <div className="rounded-xl border border-cm-border bg-cm-surface p-4 shadow-cm-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-cm-accent" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-cm-text-secondary">
                Segmentar
              </h3>
            </div>
            {hasActiveFilters && (
              <button
                onClick={resetSegmentFilters}
                className="text-[10px] text-cm-text-secondary underline hover:text-cm-text transition-colors"
              >
                Limpiar
              </button>
            )}
          </div>

          <div className="space-y-4">
            {/* Tier multi-select */}
            <div>
              <label className="flex items-center gap-1.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-cm-text-secondary">
                <Award className="h-3 w-3" /> Tiers
              </label>
              <div className="flex flex-wrap gap-1.5">
                {TIER_OPTIONS.map((t) => {
                  const selected = segmentFilters.tiers.includes(t.value as any);
                  return (
                    <button
                      key={t.value}
                      onClick={() => {
                        const next = selected
                          ? segmentFilters.tiers.filter((v) => v !== t.value)
                          : [...segmentFilters.tiers, t.value];
                        setSegmentFilter('tiers', next);
                      }}
                      className={`rounded-lg px-3 py-1.5 text-[10px] font-bold transition-all ${
                        selected
                          ? 'bg-cm-accent text-white shadow-sm'
                          : 'border border-cm-border text-cm-text-secondary hover:border-cm-accent/50'
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Min/Max spent */}
            <div>
              <label className="flex items-center gap-1.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-cm-text-secondary">
                <TrendingUp className="h-3 w-3" /> Gasto total
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  placeholder="Mín"
                  value={segmentFilters.minSpent ?? ''}
                  onChange={(e) => setSegmentFilter('minSpent', e.target.value ? Number(e.target.value) : null)}
                  className="w-full rounded-lg border border-cm-border bg-cm-bg px-3 py-1.5 text-xs text-cm-text placeholder:text-cm-text-tertiary focus:border-cm-accent focus:outline-none"
                />
                <span className="text-xs text-cm-text-tertiary">—</span>
                <input
                  type="number"
                  min={0}
                  placeholder="Máx"
                  value={segmentFilters.maxSpent ?? ''}
                  onChange={(e) => setSegmentFilter('maxSpent', e.target.value ? Number(e.target.value) : null)}
                  className="w-full rounded-lg border border-cm-border bg-cm-bg px-3 py-1.5 text-xs text-cm-text placeholder:text-cm-text-tertiary focus:border-cm-accent focus:outline-none"
                />
              </div>
            </div>

            {/* Min orders */}
            <div>
              <label className="flex items-center gap-1.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-cm-text-secondary">
                <ShoppingBag className="h-3 w-3" /> Mínimo de pedidos
              </label>
              <input
                type="number"
                min={0}
                placeholder="Ej: 5"
                value={segmentFilters.minOrders ?? ''}
                onChange={(e) => setSegmentFilter('minOrders', e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-lg border border-cm-border bg-cm-bg px-3 py-1.5 text-xs text-cm-text placeholder:text-cm-text-tertiary focus:border-cm-accent focus:outline-none"
              />
            </div>

            {/* Recency */}
            <div>
              <label className="flex items-center gap-1.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-cm-text-secondary">
                <Clock className="h-3 w-3" /> Inactivos desde hace (días)
              </label>
              <input
                type="number"
                min={0}
                placeholder="Ej: 30"
                value={segmentFilters.recencyDays ?? ''}
                onChange={(e) => setSegmentFilter('recencyDays', e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-lg border border-cm-border bg-cm-bg px-3 py-1.5 text-xs text-cm-text placeholder:text-cm-text-tertiary focus:border-cm-accent focus:outline-none"
              />
              <p className="mt-0.5 text-[9px] text-cm-text-tertiary">
                Clientes sin pedidos en los últimos N días
              </p>
            </div>
          </div>
        </div>

        {/* ── Saved segments ── */}
        {savedSegments.length > 0 && (
          <div className="rounded-xl border border-cm-border bg-cm-surface p-4 shadow-cm-sm">
            <div className="flex items-center gap-2 mb-3">
              <Bookmark className="h-4 w-4 text-cm-accent" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-cm-text-secondary">
                Segmentos guardados
              </h3>
            </div>
            <div className="space-y-1">
              {savedSegments.map((seg) => (
                <div key={seg.id} className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-cm-accent/5">
                  <button
                    onClick={() => onLoadSegment(seg)}
                    className="text-left text-xs font-semibold text-cm-text hover:text-cm-accent transition-colors"
                  >
                    {seg.name}
                  </button>
                  <button
                    onClick={() => onDeleteSegment(seg.id)}
                    className="text-cm-text-tertiary hover:text-cm-error transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Bulk actions ── */}
        {segmentCount > 0 && (
          <div className="rounded-xl border border-cm-border bg-cm-surface p-4 shadow-cm-sm">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cm-text-secondary mb-3">
              <Sparkles className="h-4 w-4 text-cm-accent" />
              Acciones masivas
            </h3>

            {/* Add points */}
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-cm-text-secondary">
                Agregar puntos a {segmentCount} cliente{segmentCount !== 1 ? 's' : ''}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={bulkPoints}
                  onChange={(e) => setBulkPoints(Math.max(1, Number(e.target.value)))}
                  className="w-20 rounded-lg border border-cm-border bg-cm-bg px-3 py-1.5 text-xs text-cm-text focus:border-cm-accent focus:outline-none"
                />
                <button
                  onClick={handleBulkPoints}
                  disabled={bulkSending || segmentCount === 0}
                  className="flex items-center gap-1.5 rounded-lg bg-cm-accent/10 px-3 py-1.5 text-[10px] font-bold text-cm-accent transition-colors hover:bg-cm-accent/20 disabled:opacity-30"
                >
                  {bulkSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  Aplicar
                </button>
              </div>

              {/* Bulk result */}
              {bulkResult && (
                <p className="text-[10px] text-cm-text-secondary">
                  {bulkResult.success} ok{bulkResult.failed > 0 ? `, ${bulkResult.failed} fallos` : ''}
                </p>
              )}
            </div>

            {/* Export */}
            <button
              onClick={handleExport}
              disabled={segmentCount === 0}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-cm-border px-3 py-2 text-[10px] font-bold text-cm-text-secondary transition-colors hover:bg-cm-accent/5 disabled:opacity-30"
            >
              <Download className="h-3 w-3" /> Exportar CSV
            </button>
          </div>
        )}

        {/* ── Save segment ── */}
        {hasActiveFilters && (
          <div className="rounded-xl border border-cm-border bg-cm-surface p-4 shadow-cm-sm">
            {!showSaveInput ? (
              <button
                onClick={() => setShowSaveInput(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-cm-accent/10 px-3 py-2 text-[10px] font-bold text-cm-accent transition-colors hover:bg-cm-accent/20"
              >
                <Save className="h-3 w-3" /> Guardar segmento
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  placeholder="Nombre del segmento..."
                  className="flex-1 rounded-lg border border-cm-border bg-cm-bg px-3 py-1.5 text-xs text-cm-text placeholder:text-cm-text-tertiary focus:border-cm-accent focus:outline-none"
                />
                <button
                  onClick={handleSave}
                  disabled={!saveName.trim()}
                  className="rounded-lg bg-cm-accent px-3 py-1.5 text-[10px] font-bold text-white disabled:opacity-30"
                >
                  OK
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Preview column */}
      <div className="lg:col-span-2">
        <SegmentPreview
          count={segmentCount}
          customers={segmentCustomers}
          loading={loading}
        />
      </div>
    </div>
  );
}
