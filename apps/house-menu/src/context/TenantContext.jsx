import React, { createContext, useContext } from 'react';

const TenantContext = createContext(null);

export function TenantProvider({ tenantId, branchId, slug, children }) {
  const value = {
    tenantId,
    branchId,
    slug,
    isPublicView: true,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    return {
      tenantId: null,
      branchId: null,
      slug: null,
      isPublicView: false,
    };
  }
  return ctx;
}
