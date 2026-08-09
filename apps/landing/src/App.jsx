import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';

/* ── AnimCounter ──────────────────────────────────── */
function AnimCounter({ target, suffix = '' }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, v => Math.floor(v));
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    const u = rounded.on('change', v => setDisplay(v + suffix));
    const ctl = animate(count, target, { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] });
    return () => { u(); ctl.stop(); };
  }, [target]);

  return <span>{display}</span>;
}

/* ── Variants ──────────────────────────────────────── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
};
const heroVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] } },
};
const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] } },
};

/* ── Theme toggle ──────────────────────────────────── */
function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof document === 'undefined') return 'light';
    return document.documentElement.getAttribute('data-theme') || 'light';
  });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = e => {
      const t = e.matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', t);
      setTheme(t);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return theme;
}

const FEATURES = [
  { icon: '📱', title: 'Menú Digital', desc: 'QR en cada mesa' },
  { icon: '🛵', title: 'Delivery', desc: 'Zonas & reparto' },
  { icon: '🧾', title: 'SUNAT', desc: 'Facturación electrónica' },
  { icon: '👥', title: 'Equipo', desc: 'Asistencia & turnos' },
  { icon: '📊', title: 'Dashboard', desc: 'KPIs en tiempo real' },
  { icon: '💬', title: 'Multi-canal', desc: 'WhatsApp & Telegram' },
  { icon: '🔐', title: 'Roles', desc: 'Control por sucursal' },
  { icon: '🌙', title: 'Dark Mode', desc: 'Auto por sistema' },
];

const STACK = [
  'React 19', 'TypeScript', 'Tailwind CSS', 'Framer Motion',
  'Firebase Auth', 'Firestore', 'RTDB', 'Cloud Functions', 'Vite',
];

export default function App() {
  const theme = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-dvh flex flex-col">
      {/* ── Nav ── */}
      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className="sticky top-0 z-50 border-b backdrop-blur-xl"
        style={{ background: 'var(--cm-glass-bg)', borderColor: 'var(--cm-border)' }}
      >
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-bold text-lg tracking-tight" style={{ color: 'var(--cm-text)' }}>
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="var(--cm-accent)"/><path d="M8 22V12l8-6 8 6v10H8z" fill="#fff" opacity=".9"/><path d="M12 20h8v-4H12v4z" fill="var(--cm-accent)" opacity=".7"/></svg>
            House Portal OS
          </div>
          <div className="flex items-center gap-3">
            <a href="https://house-menuapp.web.app" className="btn-primary">House Menu</a>
            <a href="https://houseportalos.web.app" className="btn-ghost">Portal Hub</a>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence mode="wait">
        {mounted && (
          <motion.div
            key="content"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={containerVariants}
            className="flex-1"
          >
            {/* ── Hero ── */}
            <header className="flex items-center justify-center px-5 py-20 md:py-28">
              <div className="max-w-4xl mx-auto text-center space-y-8">
                <motion.div
                  variants={scaleIn}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase glass"
                  style={{ color: 'var(--cm-accent)' }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: 'var(--cm-accent)' }} />
                  House Portal OS v2
                </motion.div>

                <motion.h1
                  variants={heroVariants}
                  className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[.9]"
                >
                  El sistema<br />
                  <span style={{ color: 'var(--cm-accent)' }}>operativo</span> de tu<br className="hidden md:block" />
                  restaurante
                </motion.h1>

                <motion.p
                  variants={heroVariants}
                  className="text-lg md:text-xl max-w-2xl mx-auto"
                  style={{ color: 'var(--cm-text-secondary)' }}
                >
                  Dos apps. Un ecosistema. House Menu para tus clientes, Portal Hub para tu equipo.
                  Pedidos, facturación, asistencia, delivery — todo en uno.
                </motion.p>

                <motion.div variants={heroVariants} className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                  <a href="https://house-menuapp.web.app" className="btn-primary text-base !py-3 !px-8">
                    Abrir House Menu →
                  </a>
                  <a href="https://houseportalos.web.app" className="btn-ghost text-base !py-3 !px-8">
                    Portal Hub
                  </a>
                </motion.div>

                {/* Stats */}
                <motion.div variants={heroVariants} className="flex justify-center gap-8 md:gap-12 pt-6">
                  <div className="text-center">
                    <div className="text-3xl md:text-4xl font-black" style={{ color: 'var(--cm-accent)' }}>
                      <AnimCounter target={30} suffix="+" />
                    </div>
                    <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--cm-text-tertiary)' }}>Pantallas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl md:text-4xl font-black" style={{ color: 'var(--cm-accent)' }}>
                      <AnimCounter target={2} suffix="" />
                    </div>
                    <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--cm-text-tertiary)' }}>Apps</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl md:text-4xl font-black" style={{ color: 'var(--cm-accent)' }}>
                      <AnimCounter target={100} suffix="%" />
                    </div>
                    <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--cm-text-tertiary)' }}>Hecho en casa</div>
                  </div>
                </motion.div>
              </div>
            </header>

            {/* ── Apps ── */}
            <section className="px-5 pb-20 md:pb-32 max-w-5xl mx-auto">
              <div className="h-px max-w-[240px] mx-auto mb-12" style={{ background: 'var(--cm-border)' }} />
              <motion.div
                variants={containerVariants}
                className="grid md:grid-cols-2 gap-6"
              >
                {[
                  {
                    letter: 'H', name: 'House Menu', tag: 'Menú digital & pedidos',
                    desc: 'Menú digital con QR, pedidos online, delivery, facturación electrónica SUNAT, caja con asignación de mesas, cocina y más. La cara visible de tu restaurante.',
                    tags: ['React', 'Firebase', 'Framer Motion'],
                    href: 'https://house-menuapp.web.app', active: true,
                  },
                  {
                    letter: 'P', name: 'Portal Hub', tag: 'Gestión & administración',
                    desc: 'Dashboard administrativo con control de asistencia, schedule de turnos, tareas del equipo, pedidos, perfil de empleados y más. El centro de operaciones.',
                    tags: ['React', 'Firebase', 'Framer Motion'],
                    href: null, active: false,
                  },
                ].map((app, i) => (
                  <motion.div
                    key={app.name}
                    variants={itemVariants}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    className="card-accent glass rounded-2xl p-8 flex flex-col gap-5 cursor-default"
                    style={app.active ? { cursor: 'pointer' } : {}}
                    onClick={app.active ? () => window.open(app.href, '_blank') : undefined}
                  >
                    <div className="flex items-center gap-4">
                      <motion.div
                        whileHover={{ rotate: 5, scale: 1.05 }}
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black"
                        style={{ background: 'var(--cm-accent-light)', color: 'var(--cm-accent)' }}
                      >
                        {app.letter}
                      </motion.div>
                      <div>
                        <h3 className="text-xl font-bold">{app.name}</h3>
                        <p className="text-sm" style={{ color: 'var(--cm-text-secondary)' }}>{app.tag}</p>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--cm-text-secondary)' }}>{app.desc}</p>
                    <div className="flex flex-wrap gap-2">
                      {app.tags.map(t => (
                        <span key={t} className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'var(--cm-accent-light)', color: 'var(--cm-accent)' }}>{t}</span>
                      ))}
                    </div>
                    <div
                      className="flex items-center gap-1.5 text-sm font-semibold mt-auto"
                      style={{ color: app.active ? 'var(--cm-accent)' : 'var(--cm-text-tertiary)' }}
                    >
                      {app.active ? 'Abrir app →' : 'Próximamente →'}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </section>

            {/* ── Features ── */}
            <section className="px-5 pb-20 md:pb-32 max-w-5xl mx-auto">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={containerVariants} className="text-center mb-12">
                <motion.h2 variants={itemVariants} className="text-3xl md:text-5xl font-black tracking-tight mb-4">Todo lo que necesitás</motion.h2>
                <motion.p variants={itemVariants} className="text-base md:text-lg max-w-xl mx-auto" style={{ color: 'var(--cm-text-secondary)' }}>
                  Una plataforma que crece con tu negocio. Desde el menú digital hasta la facturación electrónica.
                </motion.p>
              </motion.div>
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-80px' }}
                variants={containerVariants}
                className="grid grid-cols-2 md:grid-cols-4 gap-3"
              >
                {FEATURES.map(f => (
                  <motion.div
                    key={f.title}
                    variants={itemVariants}
                    whileHover={{ y: -3, scale: 1.02 }}
                    className="glass rounded-xl p-5 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}
                      className="text-3xl mb-2"
                    >
                      {f.icon}
                    </motion.div>
                    <div className="text-sm font-semibold">{f.title}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--cm-text-secondary)' }}>{f.desc}</div>
                  </motion.div>
                ))}
              </motion.div>
            </section>

            {/* ── Stack ── */}
            <section className="px-5 pb-20 md:pb-32 max-w-3xl mx-auto">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-80px' }}
                variants={containerVariants}
                className="glass rounded-2xl p-8 md:p-12 text-center"
              >
                <motion.h2 variants={itemVariants} className="text-2xl md:text-4xl font-black tracking-tight mb-3">Stack tecnológico</motion.h2>
                <motion.p variants={itemVariants} className="text-sm mb-8" style={{ color: 'var(--cm-text-secondary)' }}>
                  Construido para escala, desplegado en Firebase.
                </motion.p>
                <motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-3 text-sm">
                  {STACK.map(s => (
                    <span key={s} className="px-4 py-2 rounded-lg font-semibold" style={{ background: 'var(--cm-accent-light)', color: 'var(--cm-accent)' }}>
                      {s}
                    </span>
                  ))}
                </motion.div>
              </motion.div>
            </section>

            {/* ── Footer ── */}
            <motion.footer
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="border-t px-5 py-8"
              style={{ borderColor: 'var(--cm-border)' }}
            >
              <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--cm-text-secondary)' }}>
                  <svg width="20" height="20" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="6" fill="var(--cm-accent)" opacity=".3"/><path d="M8 22V12l8-6 8 6v10H8z" fill="var(--cm-accent)" opacity=".9"/></svg>
                  House Portal OS
                </div>
                <p className="text-xs" style={{ color: 'var(--cm-text-tertiary)' }}>© 2026 — Hecho con dedicación y mucha tecnología</p>
              </div>
            </motion.footer>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Global styles for buttons ── */}
      <style>{`
        .btn-primary, .btn-ghost {
          display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
          padding: 0.75rem 1.5rem; border-radius: 0.75rem;
          font-weight: 600; font-size: 0.875rem; text-decoration: none;
          transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          cursor: pointer;
        }
        .btn-primary {
          background: var(--cm-accent); color: white;
        }
        .btn-primary:hover {
          background: var(--cm-accent-hover); transform: scale(1.04);
        }
        .btn-ghost {
          background: var(--cm-glass-bg); backdrop-filter: blur(12px);
          border: 1px solid var(--cm-border); color: var(--cm-text);
        }
        .btn-ghost:hover {
          background: var(--cm-surface); transform: scale(1.04);
        }
      `}</style>
    </div>
  );
}
