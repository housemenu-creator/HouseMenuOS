import { useMemo } from 'react';
import { useBranch } from '../context/BranchContext';
import { useAuth } from '../context/AuthContext';

export function useAccessibleBranches() {
  const { branches } = useBranch();
  const { hasBranchAccess } = useAuth();

  return useMemo(() => {
    if (!hasBranchAccess) return branches;
    return branches.filter((b) => hasBranchAccess(b.id));
  }, [branches, hasBranchAccess]);
}
