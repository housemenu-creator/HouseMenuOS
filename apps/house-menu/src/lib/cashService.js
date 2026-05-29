import { ref, onValue, push, set, update, get } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { cashSessionsPath } from './paths';

export const cashService = {
  subscribeToSessions(branchId, callback) {
    const sessionsRef = ref(db, cashSessionsPath(branchId));
    return onValue(sessionsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        callback([]);
        return;
      }
      const sessions = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      callback(sessions.sort((a, b) => (b.openedAt || 0) - (a.openedAt || 0)));
    });
  },

  async openSession(branchId, { openingBalance, openedBy, notes }) {
    try {
      const sessionsRef = ref(db, cashSessionsPath(branchId));
      const newSessionRef = push(sessionsRef);
      await set(newSessionRef, {
        openedAt: Date.now(),
        openingBalance: openingBalance || 0,
        closedAt: null,
        closingBalance: null,
        expectedCash: null,
        difference: null,
        status: 'open',
        openedBy: openedBy || 'unknown',
        closedBy: null,
        notes: notes || '',
      });
      return { success: true, sessionId: newSessionRef.key };
    } catch (error) {
      console.error('cashService.openSession error:', error);
      return { success: false, error: error.message };
    }
  },

  async closeSession(branchId, sessionId, { closingBalance, expectedCash, closedBy, notes }) {
    try {
      const sessionRef = ref(db, `${cashSessionsPath(branchId)}/${sessionId}`);
      const snapshot = await get(sessionRef);
      if (!snapshot.exists()) {
        return { success: false, error: 'Sesion no encontrada' };
      }
      const session = snapshot.val();
      if (session.status === 'closed') {
        return { success: false, error: 'Esta sesion ya fue cerrada' };
      }
      const closedAt = Date.now();
      const difference = (closingBalance || 0) - (expectedCash || 0);
      await update(sessionRef, {
        closedAt,
        closingBalance: closingBalance || 0,
        expectedCash: expectedCash || 0,
        difference,
        status: 'closed',
        closedBy: closedBy || 'unknown',
        notes: notes || session.notes || '',
      });
      return { success: true, sessionId };
    } catch (error) {
      console.error('cashService.closeSession error:', error);
      return { success: false, error: error.message };
    }
  },

  async getActiveSession(branchId) {
    try {
      const sessionsRef = ref(db, cashSessionsPath(branchId));
      const snapshot = await get(sessionsRef);
      if (!snapshot.exists()) return null;
      const data = snapshot.val();
      const entry = Object.entries(data).find(([, v]) => v.status === 'open');
      if (!entry) return null;
      return { id: entry[0], ...entry[1] };
    } catch (e) {
      console.warn("cashService.getActiveSession error:", e);
      return null;
    }
  },
};
