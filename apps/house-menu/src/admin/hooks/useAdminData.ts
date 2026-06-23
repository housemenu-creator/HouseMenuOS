import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { menuService } from '../../lib/menuService';
import { cashService } from '../../lib/cashService';
import { dailyMenuService } from '../../lib/dailyMenuService';

interface UseAdminDataReturn {
  catalog: { products: Record<string, any>; modifiers: Record<string, any>; variations: Record<string, any> };
  dailyMenus: Record<string, any>;
  cashSessions: any[];
  kioskEnabled: boolean;
  toggleKiosk: () => Promise<void>;
  updateField: (productId: string, field: string, value: any) => Promise<void>;
}

export function useAdminData(activeBranchId: string | null): UseAdminDataReturn {
  const [kioskEnabled, setKioskEnabled] = useState(false);
  const [catalog, setCatalog] = useState<UseAdminDataReturn['catalog']>({ products: {}, modifiers: {}, variations: {} });
  const [dailyMenus, setDailyMenus] = useState<Record<string, any>>({});
  const [cashSessions, setCashSessions] = useState<any[]>([]);

  // ── Kiosk toggle ──
  useEffect(() => {
    if (!activeBranchId) return;
    const kioskRef = ref(db, `branches/${activeBranchId}/config/kioskEnabled`);
    const unsub = onValue(kioskRef, (snap) => setKioskEnabled(!!snap.val()));
    return unsub;
  }, [activeBranchId]);

  const toggleKiosk = useCallback(async () => {
    if (!activeBranchId) return;
    await set(ref(db, `branches/${activeBranchId}/config/kioskEnabled`), !kioskEnabled);
  }, [activeBranchId, kioskEnabled]);

  // ── Catálogo ──
  useEffect(() => {
    if (!activeBranchId) return;
    setCatalog({ products: {}, modifiers: {}, variations: {} });
    const unsub = menuService.subscribeToCatalog(activeBranchId, (data: UseAdminDataReturn['catalog']) => {
      setCatalog(data);
    });
    return unsub;
  }, [activeBranchId]);

  // ── Sesiones de caja ──
  useEffect(() => {
    if (!activeBranchId) return;
    const unsub = cashService.subscribeToSessions(activeBranchId, (data: any[]) => {
      setCashSessions(data);
    });
    return unsub;
  }, [activeBranchId]);

  // ── Menús diarios ──
  useEffect(() => {
    if (!activeBranchId) return;
    const unsub = dailyMenuService.subscribeToDailyMenus(activeBranchId, (data: Record<string, any>) => {
      setDailyMenus(data);
    });
    return unsub;
  }, [activeBranchId]);

  // ── Update field ──
  const updateField = useCallback(async (productId: string, field: string, value: any) => {
    await menuService.updateProductField(activeBranchId!, productId, field, value);
  }, [activeBranchId]);

  return { catalog, dailyMenus, cashSessions, kioskEnabled, toggleKiosk, updateField };
}
