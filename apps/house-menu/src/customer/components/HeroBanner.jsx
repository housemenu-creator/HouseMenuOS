import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Clock, ShieldCheck, UtensilsCrossed } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTrackCampaignView } from '../../marketing/hooks/useMarketingAnalytics';
import { ROUTES } from '../../lib/routes';
import { useBranch } from '../../context/BranchContext';
import { marketingService } from '../../lib/marketingService';
import logo from '../../assets/logo.jpg';

const DEFAULT_KITCHEN_HOURS = [
  { label: 'Almuerzo', open: '11:00', close: '14:30' },
  { label: 'Cena', open: '18:00', close: '21:00' },
];

function timeToMinutes(value) {
  if (!value) return null;
  const [hours, minutes] = value.split(':').map(Number);
  if (Number.isNaN(hours)) return null;
  return hours * 60 + (minutes || 0);
}

function useKitchenStatus(kitchenHours) {
  const windows = useMemo(() => (
    (kitchenHours?.length ? kitchenHours : DEFAULT_KITCHEN_HOURS)
      .map((window) => ({
        label: window.label,
        open: window.open,
        close: window.close,
        openMinutes: timeToMinutes(window.open),
        closeMinutes: timeToMinutes(window.close),
      }))
      .filter((window) => window.openMinutes !== null && window.closeMinutes !== null)
      .sort((a, b) => a.openMinutes - b.openMinutes)
  ), [kitchenHours]);

  const [status, setStatus] = useState({ isOpen: false, label: 'Almuerzo', next: windows[0] });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const openWindow = windows.find((window) => (
        currentMinutes >= window.openMinutes && currentMinutes < window.closeMinutes
      ));

      if (openWindow) {
        setStatus({ isOpen: true, label: openWindow.label, next: openWindow });
        return;
      }

      setStatus({
        isOpen: false,
        label: 'Proximo turno',
        next: windows.find((window) => currentMinutes < window.openMinutes) || windows[0],
      });
    };

    update();
    const interval = window.setInterval(update, 60000);
    return () => window.clearInterval(interval);
  }, [windows]);

  return status;
}

export default function HeroBanner({ branchName, campaign, kitchenHours }) {
  const navigate = useNavigate();
  const { activeBranchId } = useBranch();
  const kitchen = useKitchenStatus(kitchenHours);

  useTrackCampaignView(campaign?.id);

  const headline = campaign?.creatives?.heroSubtitle || 'Almuerzos caseros, listos sin perder tiempo';
  const eyebrow = campaign?.creatives?.heroTitle || 'HOUSE ALMUERZOS';
  const ctaText = campaign?.creatives?.ctaText || 'Ver carta';

  const handleOrder = () => {
    if (campaign?.id && activeBranchId) {
      marketingService.incrementCampaignConversions(activeBranchId, campaign.id).catch(() => {});
    }
    navigate(ROUTES.CARTA);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-cm-xl border border-cm-border bg-cm-surface shadow-cm-md"
    >
      <div className="grid gap-0 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="flex min-h-[430px] flex-col justify-between p-6 sm:p-8 lg:p-10">
          <div className="space-y-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-cm-full border border-cm-border bg-cm-bg-alt px-3 py-1 text-[0.7rem] font-bold uppercase tracking-normal text-cm-text-secondary">
                <span className={`h-2 w-2 rounded-full ${kitchen.isOpen ? 'bg-cm-success' : 'bg-cm-warning'}`} />
                {kitchen.isOpen ? `Cocina ${kitchen.label} abierta` : `${kitchen.label} ${kitchen.next?.open || '11:00'}`}
              </span>
              <span className="inline-flex items-center gap-2 rounded-cm-full border border-cm-border bg-cm-bg-alt px-3 py-1 text-[0.7rem] font-bold uppercase tracking-normal text-cm-text-secondary">
                <Clock className="h-3.5 w-3.5 text-cm-accent" />
                {kitchen.next?.open || '11:00'} - {kitchen.next?.close || '14:30'}
              </span>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-black uppercase tracking-normal text-cm-accent">{eyebrow}</p>
              <h1 className="max-w-2xl text-4xl font-black leading-[1.05] tracking-normal text-cm-text sm:text-5xl lg:text-6xl">
                {headline}
              </h1>
              <p className="max-w-xl text-base leading-7 text-cm-text-secondary sm:text-lg">
                Menu del dia, carta completa y seguimiento de pedidos en una experiencia rapida para oficina, casa o recojo.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleOrder}
                className="inline-flex items-center justify-center gap-2 rounded-cm-md bg-cm-accent px-5 py-3 text-sm font-black text-white shadow-cm-md transition hover:bg-cm-accent-hover focus:outline-none focus:ring-2 focus:ring-cm-accent/40"
              >
                <UtensilsCrossed className="h-4 w-4" />
                {ctaText}
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate(ROUTES.RASTREO)}
                className="inline-flex items-center justify-center gap-2 rounded-cm-md border border-cm-border bg-cm-bg-alt px-5 py-3 text-sm font-black text-cm-text transition hover:border-cm-border-hover hover:bg-cm-surface-hover focus:outline-none focus:ring-2 focus:ring-cm-accent/30"
              >
                Seguir pedido
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              { icon: CheckCircle2, label: 'Pago simple', detail: 'Pedido guiado' },
              { icon: ShieldCheck, label: 'Garantia', detail: 'Soporte de sede' },
              { icon: Clock, label: 'Despacho', detail: 'Turnos visibles' },
            ].map(({ icon: Icon, label, detail }) => (
              <div key={label} className="rounded-cm-md border border-cm-border bg-cm-bg-alt p-3">
                <Icon className="mb-2 h-4 w-4 text-cm-accent" />
                <p className="text-xs font-black text-cm-text">{label}</p>
                <p className="mt-1 text-[0.72rem] font-semibold text-cm-text-tertiary">{detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-h-[300px] border-t border-cm-border bg-cm-bg-alt lg:min-h-full lg:border-l lg:border-t-0">
          <img
            src={logo}
            alt="House Almuerzos"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 rounded-cm-md border border-white/20 bg-black/55 p-4 text-white backdrop-blur-md">
            <p className="text-xs font-bold uppercase tracking-normal text-white/80">{branchName || 'Sede principal'}</p>
            <p className="mt-1 text-lg font-black">Comida servida con ritmo de operacion real.</p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
