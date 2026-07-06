import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Copy, CheckCircle2, ChevronRight } from 'lucide-react';
import { useMarketing } from '../../context/MarketingContext';

export default function UrgencyBar() {
  const { validPromos } = useMarketing();
  const [copied, setCopied] = useState(false);
  
  const promo = validPromos?.[0];

  const handleCopy = () => {
    if (!promo) return;
    navigator.clipboard.writeText(promo.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!promo) return null;

  const discountText = promo.type === 'percentage'
    ? `${promo.value}% OFF`
    : `S/ ${promo.value} OFF`;

  return (
    <div className="bg-gradient-to-r from-cm-accent to-cm-warning text-white px-4 py-2.5 relative overflow-hidden shadow-cm-md z-50">
      <motion.div
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
      />

      <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm font-bold relative z-10">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 animate-bounce" />
          <span>¡{discountText} en tu pedido!</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="opacity-80 font-medium">Usa el código:</span>
          <button
            onClick={handleCopy}
            className="group flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-all border border-white/20 hover:border-white/40"
          >
            <span className="font-black tracking-widest">{promo.code}</span>
            {copied ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-cm-success" />
            ) : (
              <Copy className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
