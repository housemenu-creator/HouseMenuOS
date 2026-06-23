import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAppStore } from '@house/store';
import { branchService } from '../lib/branchService';

const BranchContext = createContext(null);

export function BranchProvider({ children }) {
  const branches = useAppStore((s) => s.branches);
  const setBranches = useAppStore((s) => s.setBranches);
  const activeBranchId = useAppStore((s) => s.activeBranchId);
  const setActiveBranchId = useAppStore((s) => s.setActiveBranchId);
  const branchLoading = useAppStore((s) => s.branchLoading);
  const branchError = useAppStore((s) => s.branchError);
  const setBranchError = useAppStore((s) => s.setBranchError);
  const [subError, setSubError] = useState(null);

  useEffect(() => {
    try {
      const unsubscribe = branchService.subscribeToBranches(
        (data) => setBranches(data),
        (error) => {
          setBranchError(error);
          setSubError(error);
        }
      );
      return () => unsubscribe();
    } catch (err) {
      console.error('BranchProvider: subscription failed', err);
      setSubError(err);
      setBranchError(err);
      return () => {};
    }
  }, [setBranches, setBranchError]);

  const foundBranch = branches.find(b => b.id === activeBranchId);
  const activeBranch = foundBranch || branches[0] || null;

  useEffect(() => {
    if (branches.length > 0 && !foundBranch) {
      const fallback = branches[0].id;
      console.warn(
        `BranchContext: activeBranchId "${activeBranchId}" no encontrado en sucursales disponibles, ` +
        `re-asignando a "${fallback}"`
      );
      setActiveBranchId(fallback);
    }
  }, [branches, activeBranchId, foundBranch, setActiveBranchId]);

  const value = {
    branches,
    activeBranchId,
    setActiveBranchId,
    activeBranch,
    isLoading: branchLoading && branches.length === 0,
    error: branchError || subError,
  };

  return (
    <BranchContext.Provider value={value}>
      {children}
    </BranchContext.Provider>
  );
}

/**
 * useBranch — acceso a la sucursal activa.
 *
 * SEGURO: si se llama fuera de un BranchProvider, no crashea.
 * Devuelve defaults vacíos que permiten que la UI se renderice
 * sin sucursal en lugar de romperse.
 */
export function useBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx) {
    // Sin provider — no romper, devolver defaults seguros
    return {
      branches: [],
      activeBranchId: null,
      setActiveBranchId: () => {},
      activeBranch: null,
      isLoading: true,
      error: null,
    };
  }
  return ctx;
}

/**
 * useOptionalBranch — exactamente igual que useBranch pero pensado
 * para componentes que funcionan con o sin sucursal.
 * Idéntico comportamiento, nombre explícito.
 */
export function useOptionalBranch() {
  return useBranch();
}
