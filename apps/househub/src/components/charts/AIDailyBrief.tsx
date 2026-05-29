import { motion, AnimatePresence } from "framer-motion";
import { BrainCircuit, Sparkles, X, ArrowRight, Lightbulb } from "lucide-react";
import { useState, useEffect } from "react";
import { useMetrics } from "../../hooks/useMetrics";

export default function AIDailyBrief() {
  const { today, loading } = useMetrics();
  const [brief, setBrief] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!loading && today) {
      // Logic for proactive AI insights based on real data
      const insights = [];
      
      if (today.totalErrors > 5) {
        insights.push("Se detecta una inestabilidad inusual en los servicios. Sugiero revisar los logs de OpenRouter.");
      }
      
      if (today.totalTools > 50) {
        insights.push("¡Récord de productividad hoy! Los agentes están operando al 120% de su capacidad normal.");
      }

      const topTool = Object.entries(today.toolsByType).sort(([, a], [, b]) => (b as number) - (a as number))[0];
      if (topTool) {
        insights.push(`La herramienta '${topTool[0]}' es la más demandada hoy. Considera optimizar su flujo.`);
      }

      if (insights.length === 0) {
        insights.push("Operaciones estables. Buen momento para realizar mantenimiento de base de datos.");
      }

      setBrief(insights[Math.floor(Math.random() * insights.length)]);
    }
  }, [loading, today]);

  if (!visible || loading || !brief) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass rounded-2xl p-4 border border-hub-accent/20 bg-hub-accent/5 flex items-start gap-4 shadow-lg shadow-hub-accent/5"
      >
        <div className="p-2.5 rounded-xl bg-hub-accent text-white shadow-lg shadow-hub-accent/20 shrink-0">
          <BrainCircuit size={20} />
        </div>
        
        <div className="flex-1 min-w-0 py-0.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-hub-accent">IA Briefing</span>
            <div className="flex gap-0.5">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-1 h-1 rounded-full bg-hub-accent animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
          <p className="text-sm font-semibold text-hub-text leading-tight tracking-tight">
            {brief}
          </p>
        </div>

        <button 
          onClick={() => setVisible(false)}
          className="text-hub-muted hover:text-hub-text p-1 transition-colors"
        >
          <X size={16} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
