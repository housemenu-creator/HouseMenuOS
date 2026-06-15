import React, { createContext, useContext, useEffect } from 'react';
import { useAppStore } from '@house/store';
import { branchService } from '../lib/branchService';

const BranchContext = createContext();

export function BranchProvider({ children }) {
  const branches = useAppStore((s) => s.branches);
  const setBranches = useAppStore((s) => s.setBranches);
  const activeBranchId = useAppStore((s) => s.activeBranchId);
  const setActiveBranchId = useAppStore((s) => s.setActiveBranchId);
  const branchLoading = useAppStore((s) => s.branchLoading);
  const branchError = useAppStore((s) => s.branchError);
  const setBranchError = useAppStore((s) => s.setBranchError);

  useEffect(() => {
    const unsubscribe = branchService.subscribeToBranches(
      (data) => setBranches(data),
      (error) => setBranchError(error)
    );
    return () => unsubscribe();
  }, [setBranches, setBranchError]);

  const foundBranch = branches.find(b => b.id === activeBranchId);
  const activeBranch = foundBranch || branches[0] || null;

  if (branches.length > 0 && !foundBranch && !branchLoading) {
    console.warn(`BranchContext: activeBranchId "${activeBranchId}" no encontrado, usando "${activeBranch?.id}"`);
  }

  return (
    <BranchContext.Provider value={{ branches, activeBranchId, setActiveBranchId, activeBranch, isLoading: branchLoading, error: branchError }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  return useContext(BranchContext);
}
