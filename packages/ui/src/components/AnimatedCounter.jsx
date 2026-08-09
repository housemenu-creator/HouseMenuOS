import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

/**
 * AnimatedCounter — patrón PRO único para todo el ecosistema.
 *
 * Anima un número desde 0 hasta `value` con easeOut.
 * Usa MotionValue para evitar re-renders y animaciones nativas de framer-motion.
 *
 * @param {number} value       Valor final a mostrar
 * @param {number} [decimals=0] Cantidad de decimales
 * @param {number} [duration=600] Duración en ms
 * @param {string} [suffix=''] Texto a mostrar después del número
 * @param {string} [className=''] Clases adicionales
 */
export default function AnimatedCounter({ value, decimals = 0, duration = 600, suffix = '', className = '' }) {
  const count = useMotionValue(0);
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    const unsubscribe = count.on('change', (v) => {
      setDisplay(v.toFixed(decimals) + suffix);
    });
    const controls = animate(count, value, {
      duration: duration / 1000,
      ease: [0.25, 0.1, 0.25, 1],
    });
    return () => {
      unsubscribe();
      controls.stop();
    };
  }, [value, decimals, duration, suffix]);

  return <span className={className}>{display}</span>;
}
