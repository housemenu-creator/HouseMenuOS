/**
 * Notification sound utility using Web Audio API.
 * No external audio files needed — generates tones programmatically.
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

/**
 * Play a short attention beep.
 * Used for: new order ready for dispatch, new assignment for driver.
 */
export function playBeep(frequency = 660, duration = 180) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration / 1000);
  } catch {
    // Audio not available — silently ignore
  }
}

/**
 * Play a two-tone chime (ascending).
 * Used for: new orders, deliveries.
 */
export function playChime() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    [523, 659].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.15);
      gain.gain.setValueAtTime(0.25, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.25);
    });
  } catch {
    // silently ignore
  }
}

/**
 * Play a short alert beep (descending).
 * Used for: cancellations, driver offline.
 */
export function playAlert() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    [440, 349].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * 0.2);
      gain.gain.setValueAtTime(0.15, now + i * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.2 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.2);
      osc.stop(now + i * 0.2 + 0.35);
    });
  } catch {
    // silently ignore
  }
}

/**
 * Play a soft notification ping.
 * Used for: chat messages, system info.
 */
export function playPing() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  } catch {
    // silently ignore
  }
}

/**
 * Notification type → appropriate sound.
 */
export function playSoundForType(type) {
  if (!type) return playChime();
  if (type.startsWith('order_new') || type.startsWith('order_delivered') || type.startsWith('delivery')) return playChime();
  if (type.startsWith('order_cancelled') || type.startsWith('driver_offline') || type.startsWith('error')) return playAlert();
  return playPing();
}

// ── Desktop Notifications ────────────────────────────────────

let _permRequested = false;

/**
 * Request permission for browser notifications.
 * Call once from a user interaction handler.
 */
export function requestNotifPermission() {
  if (_permRequested || !('Notification' in window)) return;
  if (Notification.permission === 'default') {
    _permRequested = true;
    Notification.requestPermission();
  }
}

/**
 * Show a desktop/browser notification.
 * Returns true if shown, false if not (permission denied, DND, etc).
 */
export function showDesktopNotification({ title, body, icon, tag, onClick }) {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'denied') return false;
  if (Notification.permission === 'default') {
    // Permission not yet asked — request but don't show this one
    Notification.requestPermission();
    return false;
  }

  try {
    const n = new Notification(title, {
      body: body || '',
      icon: icon || '/logo.svg',
      tag: tag || 'house-notif',
      requireInteraction: true,
      silent: true, // we play our own sounds
    });

    if (onClick) {
      n.onclick = (e) => {
        e.preventDefault();
        window.focus();
        onClick();
        n.close();
      };
    }

    // Auto-close after 10s
    setTimeout(() => n.close(), 10000);
    return true;
  } catch {
    return false;
  }
}

/**
 * Show desktop notification for a notification object from RTDB.
 */
export function showNotifFromData(notifData, onClick) {
  if (!notifData) return;
  const iconMap = {
    order_new: '/favicon.svg',
    order_assigned: '/favicon.svg',
    order_cancelled: '/favicon.svg',
    order_delivered: '/favicon.svg',
    comm_message: '/favicon.svg',
  };
  showDesktopNotification({
    title: notifData.title || 'Notificación',
    body: notifData.body || '',
    icon: iconMap[notifData.type] || '/favicon.svg',
    tag: `house-${notifData.type}-${notifData.orderId || ''}`,
    onClick,
  });
}
