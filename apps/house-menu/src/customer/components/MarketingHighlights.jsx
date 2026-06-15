import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Flame, Heart, Zap, Star, MessageSquareQuote, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMarketing } from '../../context/MarketingContext';

const FALLBACK_TESTIMONIALS = [
  {
    id: 't1', rating: 5, author: 'Ana M.', role: 'Cliente frecuente',
    text: 'El lomo saltado es impresionante. Llegó caliente, bien presentado y exactamente como lo pedí. ¡Ya es mi almuerzo semanal!',
  },
  {
    id: 't2', rating: 5, author: 'Carlos R.', role: 'Empresario',
    text: 'Uso House todos los días para el almuerzo de la oficina. La puntualidad y calidad son consistentes. Jamás nos han fallado.',
  },
  {
    id: 't3', rating: 5, author: 'Sofía L.', role: 'Diseñadora',
    text: 'El Ají de Gallina es lo mejor que he comido en delivery. Sabor de abuelita, rapidez de app moderna. Increíble combinación.',
  },
  {
    id: 't4', rating: 5, author: 'Marco V.', role: 'Médico',
    text: 'La calidad de los ingredientes se nota. Todo fresco, bien condimentado. La garantía de hierro me dio confianza para probarlos y no me arrepiento.',
  },
  {
    id: 't5', rating: 5, author: 'Valeria T.', role: 'Madre de familia',
    text: 'Pedí para toda la familia y todos quedamos felices. El menú del día es una ganga para la calidad que ofrecen. ¡Los recomiendo con los ojos cerrados!',
  },
];

function useIntersection(ref) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.2 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref]);
  return visible;
}

function Counter({ from, to, duration = 2, prefix = '', suffix = '', trigger }) {
  const [count, setCount] = useState(from);
  useEffect(() => {
    if (!trigger) return;
    let startTime;
    const animate = (time) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / (duration * 1000), 1);
      setCount(Math.floor(from + (to - from) * progress));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [trigger, from, to, duration]);
  return <span className="tabular-nums">{prefix}{count}{suffix}</span>;
}

export default function MarketingHighlights() {
  const { activeTestimonials, stats } = useMarketing();
  const ref = useRef(null);
  const visible = useIntersection(ref);
  const [current, setCurrent] = useState(0);

  const t = stats || { recordTime: 26, freshnessPercent: 100, deliveriesCount: 1240, averageRating: 4.9, totalReviews: 523 };

  const displayTestimonials = (activeTestimonials?.length > 0 ? activeTestimonials : FALLBACK_TESTIMONIALS);
  const total = displayTestimonials.length;

  // Auto-advance carousel
  useEffect(() => {
    const id = setInterval(() => setCurrent(c => (c + 1) % total), 5000);
    return () => clearInterval(id);
  }, [total]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
  };

  return (
    <motion.div ref={ref} variants={containerVariants} initial="hidden" animate="show" className="space-y-6 my-8">

      {/* 1. Testimonial Carousel */}
      <motion.div variants={itemVariants} className="bg-cm-surface border-2 border-cm-border rounded-3xl p-6 relative overflow-hidden shadow-cm-md">
        <div className="absolute top-0 right-0 w-48 h-48 bg-cm-accent/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <MessageSquareQuote className="w-5 h-5 text-cm-accent" />
            <h3 className="text-base font-black text-cm-text tracking-tight">Lo que dicen nuestros clientes</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrent(c => (c - 1 + total) % total)}
              className="w-7 h-7 rounded-full bg-cm-bg border border-cm-border flex items-center justify-center hover:border-cm-accent/50 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-cm-text-secondary" />
            </button>
            <button
              onClick={() => setCurrent(c => (c + 1) % total)}
              className="w-7 h-7 rounded-full bg-cm-bg border border-cm-border flex items-center justify-center hover:border-cm-accent/50 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5 text-cm-text-secondary" />
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.35 }}
            className="bg-cm-bg/50 border border-cm-border p-5 rounded-2xl"
          >
            <div className="flex gap-1 mb-3">
              {[...Array(displayTestimonials[current]?.rating || 5)].map((_, j) => (
                <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-sm text-cm-text font-medium italic leading-relaxed mb-4">
              "{displayTestimonials[current]?.text}"
            </p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cm-accent/40 to-orange-500/20 border border-cm-accent/30 flex items-center justify-center font-black text-cm-accent text-sm">
                {displayTestimonials[current]?.author?.charAt(0)}
              </div>
              <div>
                <p className="text-xs font-black text-cm-text">{displayTestimonials[current]?.author}</p>
                {displayTestimonials[current]?.role && (
                  <p className="text-[0.65rem] text-cm-text-tertiary">{displayTestimonials[current]?.role}</p>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {displayTestimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all duration-300 ${i === current ? 'w-5 h-1.5 bg-cm-accent' : 'w-1.5 h-1.5 bg-cm-border hover:bg-cm-accent/40'}`}
            />
          ))}
        </div>
      </motion.div>

      {/* 2. Animated Stats Bento Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
        <div className="bg-cm-surface border-2 border-cm-border hover:border-cm-accent/30 p-4 rounded-2xl flex flex-col justify-between transition-all group">
          <div className="p-2 rounded-xl bg-cm-accent/10 text-cm-accent w-fit mb-2.5 group-hover:scale-105 transition-transform">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xl font-black text-cm-accent tracking-tight">
              <Counter from={45} to={t.recordTime} suffix=" min" trigger={visible} />
            </h4>
            <p className="text-[0.6rem] font-bold uppercase tracking-wider text-cm-text-secondary mt-0.5">Tiempo Récord</p>
          </div>
        </div>

        <div className="bg-cm-surface border-2 border-cm-border hover:border-emerald-500/30 p-4 rounded-2xl flex flex-col justify-between transition-all group">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit mb-2.5 group-hover:scale-105 transition-transform">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xl font-black text-emerald-400 tracking-tight">
              <Counter from={0} to={t.freshnessPercent} suffix="%" trigger={visible} />
            </h4>
            <p className="text-[0.6rem] font-bold uppercase tracking-wider text-cm-text-secondary mt-0.5">Siempre Fresco</p>
          </div>
        </div>

        <div className="bg-cm-surface border-2 border-cm-border hover:border-pink-500/30 p-4 rounded-2xl flex flex-col justify-between transition-all group">
          <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400 w-fit mb-2.5 group-hover:scale-105 transition-transform">
            <Heart className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xl font-black text-pink-400 tracking-tight">
              <Counter from={Math.max(0, t.deliveriesCount - 400)} to={t.deliveriesCount} prefix="+" trigger={visible} />
            </h4>
            <p className="text-[0.6rem] font-bold uppercase tracking-wider text-cm-text-secondary mt-0.5">Pedidos Felices</p>
          </div>
        </div>
      </motion.div>

      {/* 3. Iron Guarantee */}
      <motion.div variants={itemVariants} className="bg-gradient-to-r from-amber-950/20 via-orange-950/10 to-amber-950/20 border-2 border-cm-accent/40 rounded-3xl p-5 relative overflow-hidden shadow-cm-lg">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cm-accent/10 rounded-full blur-[60px] pointer-events-none" />
        <div className="flex gap-4 items-start relative z-10">
          <div className="p-3 rounded-2xl bg-cm-accent text-white shadow-lg shadow-cm-accent/20 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white tracking-tight">🛡️ Garantía de Hierro House</h4>
            <p className="text-xs font-semibold text-cm-accent mt-0.5">Cero riesgo para ti, 100% de confianza</p>
            <p className="text-[0.7rem] text-white/70 mt-2 leading-relaxed">
              Si tu pedido llega retrasado, frío, o diferente a lo que pediste —
              <strong className="text-white"> te enviamos otro plato gratis y te reembolsamos</strong>. Sin preguntas.
            </p>
          </div>
        </div>
      </motion.div>

    </motion.div>
  );
}
