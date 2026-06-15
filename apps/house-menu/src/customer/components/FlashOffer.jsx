import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Zap, Sparkles, Check } from 'lucide-react';
import { useAppStore } from '@house/store';
import { useToast } from '../../components/ToastContext';
import { useBranch } from '../../context/BranchContext';
import { flashOfferService } from '../../lib/flashOfferService';

export default function FlashOffer() {
  const [offers, setOffers] = useState(null); // null = cargando, [] = vacío, [...] = con datos
  const [timeLeft, setTimeLeft] = useState(0);
  const [added, setAdded] = useState(false);

  const { addToCart } = useAppStore();
  const { showToast } = useToast();
  const { activeBranchId } = useBranch();

  // ── Suscribir a ofertas flash activas desde Firebase ─────────────────────
  useEffect(() => {
    if (!activeBranchId) return;

    const unsub = flashOfferService.subscribeToActiveFlashOffers(
      activeBranchId,
      (activeOffers) => {
        setOffers(activeOffers); // null si no hay ninguna
      },
      (err) => {
        console.warn('[FlashOffer] Error al cargar ofertas flash:', err);
        setOffers([]); // error → sin datos, no inventamos nada
      }
    );

    return unsub;
  }, [activeBranchId]);

  // ── Temporizador basado en endTime de Firebase ────────────────────────────
  const offer = offers?.[0] ?? null; // mostrar solo la primera oferta activa

  useEffect(() => {
    if (!offer?.endTime) { setTimeLeft(0); return; }

    const calc = () => Math.max(0, Math.floor((offer.endTime - Date.now()) / 1000));
    setTimeLeft(calc());

    const id = setInterval(() => {
      const remaining = calc();
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(id);
    }, 1000);

    return () => clearInterval(id);
  }, [offer?.endTime]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleClaimOffer = () => {
    if (!offer) return;
    const details = (offer.items || []).map((item) => item.name || item);
    const newItem = {
      id: `flash-${Date.now()}`,
      productId: offer.id,
      name: offer.title,
      details,
      price: offer.flashPrice ?? offer.price ?? 0,
      packaging: 0,
      deliveryDate: new Date().toISOString().split('T')[0],
    };
    addToCart(newItem);
    setAdded(true);
    showToast(`🎉 ¡${offer.title} añadido al carrito!`, 'success');
    setTimeout(() => setAdded(false), 2000);
  };

  // Cargando (activeBranchId disponible pero aún sin respuesta de Firebase)
  if (offers === null && activeBranchId) {
    return (
      <div className="min-h-[120px] flex items-center justify-center bg-cm-surface/20 rounded-3xl border-2 border-dashed border-cm-border p-6">
        <div className="flex flex-col items-center gap-2 animate-pulse">
          <Clock className="w-6 h-6 text-cm-accent animate-spin" style={{ animationDuration: '3s' }} />
          <p className="text-xs font-black tracking-widest text-cm-muted uppercase">Verificando ofertas relámpago...</p>
        </div>
      </div>
    );
  }

  // Sin oferta activa en Firebase → no mostrar nada (no inventar)
  if (!offer) return null;

  // Oferta expirada según temporizador local
  if (timeLeft <= 0 && offer.endTime && Date.now() > offer.endTime) return null;

  const totalSeconds = offer.endTime
    ? Math.floor((offer.endTime - (offer.startTime ?? Date.now())) / 1000)
    : 0;
  const progressPercent = totalSeconds > 0 ? (timeLeft / totalSeconds) * 100 : 100;

  const originalPrice = offer.originalPrice ?? offer.regularPrice ?? null;
  const flashPrice = offer.flashPrice ?? offer.price ?? 0;
  const discountPercent = offer.discountPercent
    ?? (originalPrice ? Math.round((1 - flashPrice / originalPrice) * 100) : null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="relative overflow-hidden rounded-3xl border-2 border-red-500/30 bg-gradient-to-br from-red-950/40 via-slate-950 to-slate-900 p-6 shadow-cm-lg hover:border-red-500/40 transition-all duration-300"
    >
      {/* Decorative glows */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-600/10 rounded-full blur-[60px] pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-amber-500/5 rounded-full blur-[60px] pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 10% 90%, white 1px, transparent 1px)', backgroundSize: '16px 16px' }} />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[0.65rem] font-black uppercase tracking-widest text-white bg-gradient-to-r from-red-600 to-amber-500 rounded-full shadow-lg shadow-red-900/30 animate-pulse">
            <Zap className="w-3.5 h-3.5" />
            Oferta Flash Relámpago
          </span>

          {offer.endTime && (
            <div className="flex items-center gap-2 text-red-400 font-bold text-xs bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              Termina en: <span className="font-mono font-black tracking-wider text-sm ml-0.5">{formatTime(timeLeft)}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
          <div className="space-y-1.5 flex-1">
            {offer.badge && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">{offer.badge}</span>
              </div>
            )}
            <h3 className="text-2xl font-black text-white leading-tight tracking-tight">{offer.title}</h3>
            {offer.subtitle && (
              <p className="text-xs text-white/70 leading-relaxed max-w-lg">{offer.subtitle}</p>
            )}

            {/* Items incluidos */}
            {offer.items?.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {offer.items.map((item, idx) => {
                  const name = typeof item === 'string' ? item : item.name;
                  return (
                    <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-medium text-white/80">
                      <Sparkles className="w-3 h-3 text-amber-400" /> {name}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Precio + CTA */}
          <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-4 p-4 md:p-0 rounded-2xl bg-white/[0.02] md:bg-transparent border border-white/5 md:border-0">
            <div className="text-left md:text-right">
              {originalPrice && (
                <div className="flex items-center gap-2 md:justify-end">
                  <span className="text-[10px] text-white/40 line-through">Reg. S/ {Number(originalPrice).toFixed(2)}</span>
                  {discountPercent != null && (
                    <span className="text-[9px] font-black text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                      -{discountPercent}%
                    </span>
                  )}
                </div>
              )}
              <p className="text-3xl font-black text-white tracking-tighter mt-0.5">S/ {Number(flashPrice).toFixed(2)}</p>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleClaimOffer}
              className={`px-5 py-3 rounded-xl font-black text-xs tracking-wider uppercase transition-all shadow-md flex items-center gap-2 ${
                added
                  ? 'bg-emerald-600 text-white shadow-emerald-900/20 border border-emerald-500'
                  : 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/30 border border-red-500'
              }`}
            >
              {added ? (
                <><Check className="w-4 h-4 animate-bounce" /> Agregado</>
              ) : (
                <>Aprovechar Oferta <Zap className="w-4 h-4" /></>
              )}
            </motion.button>
          </div>
        </div>

        {/* Progress bar */}
        {offer.endTime && (
          <div className="mt-5 h-1 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-600 to-amber-500 transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}