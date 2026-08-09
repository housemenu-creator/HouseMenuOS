const STATION_TONES = {
  grill: [523.25, 659.25],
  fryer: [440, 554.37],
  cold: [587.33, 739.99],
  bakery: [392, 523.25],
  expo: [659.25, 783.99],
};

const SUCCESS_TONES = [523.25, 659.25, 783.99]; // C5, E5, G5 — major triad

let sharedCtx = null;

export function getAudioContext() {
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (sharedCtx.state === 'suspended') {
    sharedCtx.resume();
  }
  return sharedCtx;
}

export function playKitchenAlert(station) {
  try {
    const ctx = getAudioContext();
    const playTone = (freq, startTime, duration, gain = 0.8) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gainNode.gain.setValueAtTime(gain, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    const now = ctx.currentTime;
    const tones = STATION_TONES[station] || STATION_TONES.grill;
    playTone(tones[0], now, 0.45, 0.85);
    playTone(tones[1], now + 0.18, 0.55, 0.75);
  } catch (e) {
    console.warn('Audio context not available:', e);
  }
}

export function playSuccessSound() {
  try {
    const ctx = getAudioContext();
    const playTone = (freq, startTime, duration, gain = 0.6) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gainNode.gain.setValueAtTime(gain, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    const now = ctx.currentTime;
    SUCCESS_TONES.forEach((freq, i) => {
      playTone(freq, now + i * 0.15, 0.4, 0.5);
    });
  } catch (e) {
    // silent fail — audio is nice-to-have
  }
}
