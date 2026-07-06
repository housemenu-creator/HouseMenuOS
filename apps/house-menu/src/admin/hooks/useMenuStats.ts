import { useMemo } from 'react';
import type { MenuCatalog, MenuStats } from '../types';

export function useMenuStats(catalog: MenuCatalog): MenuStats {
  return useMemo(() => {
    const products = Object.values(catalog.products || {});
    return {
      totalProducts: products.length,
      activeProducts: products.filter(p => p.available !== false).length,
      draftProducts: products.filter(p => p.status === 'draft').length,
      totalCategories: Object.keys(catalog.categories ?? {}).length,
      wizardProducts: products.filter(p => p.isWizard === true).length,
      stockManaged: products.filter(p => p.trackStock === true).length,
    };
  }, [catalog]);
}
