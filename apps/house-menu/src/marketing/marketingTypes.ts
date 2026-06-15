export interface Campaign {
  id: string;
  name: string;
  description: string;
  type: 'flash_offer' | 'promo' | 'seasonal' | 'event';
  startDate: number;
  endDate: number;
  isActive: boolean;
  branchIds: string[];
  creatives: {
    heroTitle: string;
    heroSubtitle: string;
    heroBgColor?: string;
    heroTextColor?: string;
    ctaText: string;
    ctaLink: string;
    imageUrl?: string;
  };
  rules?: {
    minOrder?: number;
    maxUses?: number;
    applicableProducts?: string[];
    discountType?: 'percentage' | 'fixed' | 'bogo';
    discountValue?: number;
  };
  analytics: {
    views: number;
    conversions: number;
    revenue: number;
  };
  createdAt: number;
  updatedAt: number;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  ctaText?: string;
  ctaLink?: string;
  imageUrl?: string;
  bgColor: string;
  textColor: string;
  position: 'hero' | 'top' | 'bottom' | 'sidebar';
  isActive: boolean;
  startDate?: number;
  endDate?: number;
  branchIds: string[];
  analytics: {
    views: number;
    clicks: number;
  };
  createdAt: number;
  updatedAt: number;
}

export interface PromoCode {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrder?: number;
  maxUses?: number;
  currentUses: number;
  isActive: boolean;
  expiresAt: number;
  branchIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Testimonial {
  id: string;
  author: string;
  rating: number;
  text: string;
  avatar?: string;
  isActive: boolean;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface MarketingStats {
  recordTime: number;
  freshnessPercent: number;
  deliveriesCount: number;
  averageRating: number;
  totalReviews: number;
}

export type EntityType = 'campaign' | 'banner' | 'promo' | 'testimonial';
