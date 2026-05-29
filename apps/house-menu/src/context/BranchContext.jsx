import React, { createContext, useContext, useState, useEffect } from 'react';
import { branchService } from '../lib/branchService';

const BranchContext = createContext();

export function BranchProvider({ children }) {
  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Intentamos leer la ultima sucursal usada del localStorage, por defecto 'hq'
  const [activeBranchId, setActiveBranchId] = useState(() => {
    return localStorage.getItem('house_active_branch') || 'hq';
  });

  // Suscripcion en tiempo real a las sucursales desde Firebase
  useEffect(() => {
    const unsubscribe = branchService.subscribeToBranches((data) => {
      setBranches(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem('house_active_branch', activeBranchId);
  }, [activeBranchId]);

  const foundBranch = branches.find(b => b.id === activeBranchId);
  const activeBranch = foundBranch || branches[0] || null;

  if (branches.length > 0 && !foundBranch) {
    console.warn(`BranchContext: activeBranchId "${activeBranchId}" no encontrado, usando "${activeBranch?.id}"`);
  }

  return (
    <BranchContext.Provider value={{ branches, activeBranchId, setActiveBranchId, activeBranch, isLoading }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  return useContext(BranchContext);
}
