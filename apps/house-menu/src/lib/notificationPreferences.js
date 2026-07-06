/**
 * Notification preferences service — per-user, per-type notification settings.
 *
 * RTDB Structure:
 *   /branches/{branchId}/notification_preferences/{safeKey(userId)}/
 *     {type}/
 *       enabled: boolean    — master toggle (if false, no notification created)
 *       push:    boolean    — send FCM push
 *       sound:   boolean    — play notification sound
 *
 * Default: all types enabled, push=true, sound=true.
 * Absent entries = defaults (enabled, push, sound all true).
 */
import { ref, set, update, onValue, get } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { branchPath } from './paths';

function safePathKey(str) {
  return str.replace(/\./g, ',').replace(/#/g, '_').replace(/[$\[\]]/g, '_');
}

/**
 * All known notification types — mirrors NOTIF_TYPES from notificationService.
 * Keep in sync manually.
 */
export const NOTIF_PREF_TYPES = [
  'order_new',
  'order_assigned',
  'order_delivered',
  'order_cancelled',
  'delivery_confirmed',
  'driver_offline',
  'system',
  'comm_message',
];

/** Default preferences for any type */
export const DEFAULT_PREFS = Object.freeze({
  enabled: true,
  push: true,
  sound: true,
});

/** Build full default preferences object (all types, all true) */
export function getDefaultPreferences() {
  const prefs = {};
  for (const type of NOTIF_PREF_TYPES) {
    prefs[type] = { ...DEFAULT_PREFS };
  }
  return prefs;
}

function prefsRef(branchId, userId) {
  const key = safePathKey(userId);
  return ref(db, `${branchPath(branchId)}/notification_preferences/${key}`);
}

function typePrefRef(branchId, userId, type) {
  const key = safePathKey(userId);
  return ref(db, `${branchPath(branchId)}/notification_preferences/${key}/${type}`);
}

/**
 * Get full preferences object for a user (with defaults filled in).
 * @returns {Promise<Object>} { type: { enabled, push, sound }, ... }
 */
export async function getPreferences(branchId, userId) {
  if (!branchId || !userId) return getDefaultPreferences();

  const snap = await get(prefsRef(branchId, userId));
  const stored = snap.val() || {};
  const defaults = getDefaultPreferences();

  // Merge: stored values override defaults
  for (const type of NOTIF_PREF_TYPES) {
    if (stored[type]) {
      defaults[type] = { ...defaults[type], ...stored[type] };
    }
  }
  return defaults;
}

/**
 * Subscribe to real-time preference changes.
 * Returns unsubscribe function.
 */
export function subscribeToPreferences(branchId, userId, callback) {
  if (!branchId || !userId) {
    callback(getDefaultPreferences());
    return () => {};
  }

  const unsub = onValue(
    prefsRef(branchId, userId),
    (snap) => {
      const stored = snap.val() || {};
      const merged = getDefaultPreferences();
      for (const type of NOTIF_PREF_TYPES) {
        if (stored[type]) {
          merged[type] = { ...merged[type], ...stored[type] };
        }
      }
      callback(merged);
    },
    () => {
      // On error, assume defaults
      callback(getDefaultPreferences());
    }
  );
  return unsub;
}

/**
 * Update preferences for a single notification type.
 * Merges with existing — only provided fields are changed.
 *
 * @param {string} branchId
 * @param {string} userId
 * @param {string} type — one of NOTIF_PREF_TYPES
 * @param {Object} partial — { enabled?, push?, sound? }
 */
export async function updatePreference(branchId, userId, type, partial) {
  if (!branchId || !userId || !type) return;
  if (!NOTIF_PREF_TYPES.includes(type)) {
    console.warn(`Unknown notification type: ${type}`);
    return;
  }

  // Sanitize — only allow known keys, coerce to boolean
  const clean = {};
  if (partial.enabled !== undefined) clean.enabled = Boolean(partial.enabled);
  if (partial.push !== undefined) clean.push = Boolean(partial.push);
  if (partial.sound !== undefined) clean.sound = Boolean(partial.sound);

  await update(typePrefRef(branchId, userId, type), clean);
}

/**
 * Reset preferences for a single type to defaults.
 */
export async function resetPreference(branchId, userId, type) {
  if (!branchId || !userId || !type) return;
  await set(typePrefRef(branchId, userId, type), { ...DEFAULT_PREFS });
}

/**
 * Reset ALL preferences to defaults.
 */
export async function resetAllPreferences(branchId, userId) {
  if (!branchId || !userId) return;
  await set(prefsRef(branchId, userId), getDefaultPreferences());
}

/**
 * Check if a notification type should be created for a user.
 * Returns { allowed, push, sound }.
 * - allowed: true if the notification should be written to RTDB
 * - push: true if FCM push should be sent
 * - sound: true if sound should play
 *
 * If no stored preferences, defaults to all true.
 */
export async function checkPreference(branchId, userId, type) {
  if (!branchId || !userId) {
    return { allowed: false, push: false, sound: false };
  }
  if (!NOTIF_PREF_TYPES.includes(type)) {
    // Unknown type — allow by default
    return { allowed: true, push: true, sound: true };
  }

  const snap = await get(typePrefRef(branchId, userId, type));
  const prefs = snap.val();

  if (!prefs) {
    // No stored pref = defaults
    return { allowed: true, push: true, sound: true };
  }

  return {
    allowed: prefs.enabled !== false,
    push:    prefs.enabled !== false && prefs.push !== false,
    sound:   prefs.enabled !== false && prefs.sound !== false,
  };
}

// ── Do Not Disturb ────────────────────────────────────────────

const DND_REF_KEY = '_dnd';

/** Days of week used in DND schedule (1=Monday .. 7=Sunday) */
export const DND_DAY_LABELS = {
  1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb', 7: 'Dom',
};

export const DND_DAY_LABELS_FULL = {
  1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves',
  5: 'Viernes', 6: 'Sábado', 7: 'Domingo',
};

/** Default DND config */
export const DEFAULT_DND = Object.freeze({
  enabled: false,
  manual: false,
  schedule: {
    start: '22:00',
    end: '08:00',
    days: [1, 2, 3, 4, 5], // Weekdays by default
  },
});

function dndRef(branchId, userId) {
  const key = safePathKey(userId);
  return ref(db, `${branchPath(branchId)}/notification_preferences/${key}/${DND_REF_KEY}`);
}

/**
 * Get DND config for a user.
 * Returns DEFAULT_DND if none stored.
 */
export async function getDNDConfig(branchId, userId) {
  if (!branchId || !userId) return { ...DEFAULT_DND };

  const snap = await get(dndRef(branchId, userId));
  const stored = snap.val();
  if (!stored) return { ...DEFAULT_DND };

  return {
    enabled: stored.enabled !== false,
    manual: stored.manual === true,
    schedule: {
      start: stored.schedule?.start || DEFAULT_DND.schedule.start,
      end: stored.schedule?.end || DEFAULT_DND.schedule.end,
      days: Array.isArray(stored.schedule?.days) ? stored.schedule.days : [...DEFAULT_DND.schedule.days],
    },
  };
}

/**
 * Subscribe to DND config changes in real time.
 */
export function subscribeToDNDConfig(branchId, userId, callback) {
  if (!branchId || !userId) {
    callback({ ...DEFAULT_DND });
    return () => {};
  }

  return onValue(
    dndRef(branchId, userId),
    (snap) => {
      const stored = snap.val();
      if (!stored) {
        callback({ ...DEFAULT_DND });
        return;
      }
      callback({
        enabled: stored.enabled !== false,
        manual: stored.manual === true,
        schedule: {
          start: stored.schedule?.start || DEFAULT_DND.schedule.start,
          end: stored.schedule?.end || DEFAULT_DND.schedule.end,
          days: Array.isArray(stored.schedule?.days) ? stored.schedule.days : [...DEFAULT_DND.schedule.days],
        },
      });
    },
    () => callback({ ...DEFAULT_DND })
  );
}

/**
 * Update DND config. Merges with existing.
 */
export async function updateDNDConfig(branchId, userId, partial) {
  if (!branchId || !userId) return;

  const clean = {};
  if (partial.enabled !== undefined) clean.enabled = Boolean(partial.enabled);
  if (partial.manual !== undefined) clean.manual = Boolean(partial.manual);

  if (partial.schedule) {
    clean.schedule = {};
    if (partial.schedule.start) clean.schedule.start = partial.schedule.start;
    if (partial.schedule.end) clean.schedule.end = partial.schedule.end;
    if (Array.isArray(partial.schedule.days)) clean.schedule.days = partial.schedule.days;
  }

  await update(dndRef(branchId, userId), clean);
}

/**
 * Quick-toggle DND on/off (manual mode).
 * When manual=true, overrides schedule check.
 */
export async function toggleDND(branchId, userId, active) {
  if (!branchId || !userId) return;
  await update(dndRef(branchId, userId), {
    manual: Boolean(active),
    enabled: Boolean(active),
  });
}

/**
 * Check if DND is currently active for a user.
 * Returns:
 *   - { dnd: true, quiet: true }  → DND is active (quiet everything)
 *   - { dnd: false, quiet: false } → DND not active
 *
 * Logic:
 *   - If manual is true → DND active (user manually toggled it)
 *   - If schedule is enabled AND current time falls within schedule
 *     AND current day is in days[] → DND active
 */
export function isDNDActive(config) {
  if (!config || !config.enabled) return { dnd: false, quiet: false };

  // Manual override
  if (config.manual) return { dnd: true, quiet: true };

  // Schedule check
  const { start, end, days } = config.schedule;
  if (!start || !end || !days?.length) return { dnd: false, quiet: false };

  const now = new Date();
  const currentDay = now.getDay() || 7; // JS getDay: 0=Sun → convert to 7
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Check day
  if (!days.includes(currentDay)) return { dnd: false, quiet: false };

  // Check time
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  let inSchedule;
  if (startMinutes <= endMinutes) {
    // Same-day range (e.g. 09:00–17:00)
    inSchedule = currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Overnight range (e.g. 22:00–08:00)
    inSchedule = currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return { dnd: inSchedule, quiet: inSchedule };
}

/**
 * Get effective notification preference after applying DND.
 * Returns { allowed, push, sound }.
 *
 * During DND:
 * - allowed stays true (in-app notifs still arrive)
 * - push forced to false
 * - sound forced to false
 */
export async function getEffectivePreference(branchId, userId, type) {
  const pref = await checkPreference(branchId, userId, type);
  if (!pref.allowed) return pref; // Already disabled, DND doesn't matter

  const dndConfig = await getDNDConfig(branchId, userId);
  const dnd = isDNDActive(dndConfig);

  if (dnd.quiet) {
    return { allowed: true, push: false, sound: false };
  }

  return pref;
}
