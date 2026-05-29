import React from 'react';
import { TriangleAlert, Wheat, Milk, Nut, Egg, Fish, Leaf, Sprout } from 'lucide-react';
import { ALLERGEN_MAP } from '../kdsTypes';

const fallbackIcon = TriangleAlert;

const iconComponents = {
  Wheat, Milk, Nut, Egg, Fish, Leaf, Sprout,
  Bean: TriangleAlert,
  TriangleAlert,
};

export default function AllergenAlert({ allergens = [], className = '' }) {
  if (!allergens || allergens.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {allergens.map((key) => {
        const config = ALLERGEN_MAP[key];
        if (!config) return null;
        const IconComp = iconComponents[config.icon] || fallbackIcon;
        return (
          <span
            key={key}
            title={config.label}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.55rem] font-bold uppercase tracking-wider bg-cm-muted/5 border border-cm-border/10 ${config.color || 'text-cm-muted/60'}`}
          >
            <IconComp className="w-2.5 h-2.5" />
            {config.label}
          </span>
        );
      })}
    </div>
  );
}
