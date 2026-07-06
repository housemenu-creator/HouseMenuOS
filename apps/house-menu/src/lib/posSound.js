/**
 * posSound — Efectos de sonido para POS vía Web Audio API.
 * Sin archivos, todo sintetizado en tiempo real.
 */

let ctx = null;

function getContext() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  return ctx;
}

/**
 * "Cha-ching" — sonido de caja registradora al cobrar.
 * Dos tonos de campana con armónicos metálicos.
 */
export function playCashRegister() {
  try {
    const c = getContext();
    const now = c.currentTime;

    // Primer tono (do#)
    const osc1 = c.createOscillator();
    const gain1 = c.createGain();
    osc1.type = 'sine';
    osc1.frequency.value = 554.37; // C#5
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc1.connect(gain1);
    gain1.connect(c.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // Segundo tono (fa#) — más agudo, con delay
    const osc2 = c.createOscillator();
    const gain2 = c.createGain();
    osc2.type = 'sine';
    osc2.frequency.value = 739.99; // F#5
    gain2.gain.setValueAtTime(0.25, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(c.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.35);

    // Armónico metálico (octava arriba)
    const osc3 = c.createOscillator();
    const gain3 = c.createGain();
    osc3.type = 'triangle';
    osc3.frequency.value = 1108.74;
    gain3.gain.setValueAtTime(0.08, now + 0.12);
    gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc3.connect(gain3);
    gain3.connect(c.destination);
    osc3.start(now + 0.12);
    osc3.stop(now + 0.3);
  } catch (e) {
    // Silently fail — sound is non-critical
  }
}

/**
 * "Ding" — notificación suave de nueva orden.
 */
export function playNotification() {
  try {
    const c = getContext();
    const now = c.currentTime;

    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880; // A5
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  } catch (e) {}
}

/**
 * "Click" — feedback táctil para teclas / botones.
 */
export function playKeyClick() {
  try {
    const c = getContext();
    const now = c.currentTime;

    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'square';
    osc.frequency.value = 1200;
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.03);
  } catch (e) {}
}

/**
 * "Error bump" — sonido de error sutil.
 */
export function playError() {
  try {
    const c = getContext();
    const now = c.currentTime;

    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  } catch (e) {}
}
