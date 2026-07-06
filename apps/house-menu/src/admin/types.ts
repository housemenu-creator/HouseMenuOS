// Admin Menu Builder — Domain Types

export interface MenuProduct {
  id: string;
  name: string;
  category: string;
  base_price: number;
  price?: number;
  available: boolean;
  description?: string;
  image?: string;
  isWizard?: boolean;
  steps?: WizardStep[];
  channels?: Record<string, boolean>;
  tags?: string[];
  sortOrder?: number;
  status?: 'published' | 'draft';
  schedule?: { enabled: boolean; start: string; end: string };
  trackStock?: boolean;
  stock?: number;
  vegan?: boolean;
  spicy?: boolean;
  glutenFree?: boolean;
  [key: string]: unknown;
}

export interface WizardStep {
  id: string;
  title: string;
  type: 'single' | 'multiple' | 'auto';
  options: WizardOption[];
}

export interface WizardOption {
  id: string;
  name: string;
  price?: number;
  icon?: string;
  image?: string;
  imagePath?: string;
  trackStock?: boolean;
  stock?: number;
}

export interface MenuCategory {
  name: string;
  image?: string;
  slug: string;
  itemCount: number;
}

export interface MenuCatalog {
  products: Record<string, MenuProduct>;
  modifiers: Record<string, { name: string; price: number }>;
  variations: Record<string, { name: string; adjustPrice: number }>;
  categories?: Record<string, { name: string; image?: string }>;
}

export interface MenuStats {
  totalProducts: number;
  activeProducts: number;
  draftProducts: number;
  totalCategories: number;
  wizardProducts: number;
  stockManaged: number;
}

export interface DailyMenu {
  name: string;
  description?: string;
  basePrice: number;
  productIds: string[];
  [key: string]: unknown;
}
