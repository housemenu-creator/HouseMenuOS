import { useState, useEffect, useCallback } from 'react';
import { cashService } from '../../lib/cashService';
import type { CashSession } from '../types';

interface AllSessionsState {
  allSessions: CashSession[];
  loading: boolean;
  error: string | null;
}

export function useSessionState(branchId: string | null, _userEmail: string) {
  const [state, setState] = useState<AllSessionsState>({
    allSessions: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!branchId) {
      setState({ allSessions: [], loading: false, error: null });
      return;
    }

    setState(prev => ({ ...prev, loading: true }));

    const unsub = cashService.subscribeToSessions(branchId, (sessions: CashSession[]) => {
      setState({ allSessions: sessions, loading: false, error: null });
    });

    return unsub;
  }, [branchId]);

  // Active session is the first open one
  const session = state.allSessions.find(s => s.status === 'open') || null;

  const openSession = useCallback(
    async (data: {
      openingBalance: number;
      openedBy: string;
      notes: string;
    }) => {
      if (!branchId) return { success: false as const, error: 'No branch selected' };
      setState(prev => ({ ...prev, error: null }));
      const result = await cashService.openSession(branchId, data);
      if (!result.success) {
        setState(prev => ({ ...prev, error: result.error || 'Error opening session' }));
      }
      return result as { success: boolean; sessionId?: string; error?: string };
    },
    [branchId]
  );

  const closeSession = useCallback(
    async (
      sessionId: string,
      data: {
        closingBalance: number;
        expectedCash: number;
        closedBy: string;
        notes: string;
      }
    ) => {
      if (!branchId) return { success: false as const, error: 'No branch selected' };
      setState(prev => ({ ...prev, error: null }));
      const result = await cashService.closeSession(branchId, sessionId, data);
      if (!result.success) {
        setState(prev => ({ ...prev, error: result.error || 'Error closing session' }));
      }
      return result as { success: boolean; sessionId?: string; error?: string };
    },
    [branchId]
  );

  return {
    session,
    allSessions: state.allSessions,
    loading: state.loading,
    error: state.error,
    openSession,
    closeSession,
  };
}
