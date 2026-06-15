import { ref, push, set, get, query, limitToLast, orderByKey } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { nowISO } from './format';

const AUDIT_PATH = 'audit/logs';

/**
 * Log a human action to the audit trail.
 * @param {string} action - e.g. 'user.created', 'role.updated', 'branch.created'
 * @param {object} detail - What changed (before/after or relevant data)
 * @param {string} actor - Who did it (email or userId)
 */
export async function auditLog(action, detail = {}, actor = 'system') {
  try {
    const today = nowISO().slice(0, 10); // YYYY-MM-DD
    const logsRef = ref(db, `${AUDIT_PATH}/${today}`);
    const newRef = push(logsRef);
    await set(newRef, {
      action,
      detail,
      actor,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.warn('auditLog error:', err);
  }
}

/**
 * Get audit logs for a date range.
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @param {number} max - max entries per day
 */
export async function getAuditLogs(startDate, endDate, max = 200) {
  try {
    const start = startDate || nowISO().slice(0, 10);
    const end = endDate || start;
    const results = [];

    // Iterate through each day in range
    const d = new Date(start);
    const endD = new Date(end);
    while (d <= endD) {
      const dateStr = d.toISOString().slice(0, 10);
      const dayRef = ref(db, `${AUDIT_PATH}/${dateStr}`);
      const snap = await get(query(dayRef, orderByKey(), limitToLast(max)));
      if (snap.exists()) {
        Object.entries(snap.val()).forEach(([id, entry]) => {
          results.push({ id, date: dateStr, ...entry });
        });
      }
      d.setDate(d.getDate() + 1);
    }

    return results.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  } catch (err) {
    console.warn('getAuditLogs error:', err);
    return [];
  }
}
