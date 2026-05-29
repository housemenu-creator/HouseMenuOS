export const PRIORITY = {
  RUSH: 'rush',
  NORMAL: 'normal',
  LOW: 'low',
};

export const PRIORITY_CONFIG = {
  [PRIORITY.RUSH]: { label: 'Rush', color: 'text-cm-error', bg: 'bg-cm-error/10', border: 'border-cm-error/20', pulse: true, order: 0 },
  [PRIORITY.NORMAL]: { label: 'Normal', color: 'text-cm-info', bg: 'bg-cm-info/10', border: 'border-cm-info/20', pulse: false, order: 1 },
  [PRIORITY.LOW]: { label: 'Baja', color: 'text-cm-muted', bg: 'bg-cm-muted/10', border: 'border-cm-border', pulse: false, order: 2 },
};

export const KITCHEN_STATIONS = ['all', 'grill', 'fryer', 'cold', 'bakery', 'expo'];

export const STATION_CONFIG = {
  all: { label: 'Todas', icon: 'LayoutGrid' },
  grill: { label: 'Grill', icon: 'Flame' },
  fryer: { label: 'Fritura', icon: 'Tally1' },
  cold: { label: 'Frío', icon: 'Snowflake' },
  bakery: { label: 'Panadería', icon: 'Wheat' },
  expo: { label: 'Expeditor', icon: 'ClipboardCheck' },
};

export const STATION_KEYWORDS = {
  grill: ['parrilla', 'grill', 'carne', 'res', 'pollo a la parrilla', 'lomo', 'steak', 'burger', 'hamburguesa'],
  fryer: ['fritura', 'frito', 'papas', 'papa', 'fried', 'crujiente', 'empanizado', 'milanesa', 'nugget'],
  cold: ['ensalada', 'ceviche', 'frío', 'cold', 'salad', 'helado', 'postre frío', 'sushi', 'tiradito'],
  bakery: ['pan', 'bread', 'torta', 'pastel', 'bakery', 'pastry', 'croissant', 'donut', 'pancake', 'waffle'],
};

export const STATION_PREP_TIMES = {
  grill: 10,
  fryer: 8,
  cold: 4,
  bakery: 6,
  expo: 2,
};

export const ALLERGEN_MAP = {
  gluten: { label: 'Gluten', icon: 'Wheat', color: 'text-cm-warning' },
  lacteos: { label: 'Lácteos', icon: 'Milk', color: 'text-cm-info' },
  nuez: { label: 'Nueces', icon: 'Nut', color: 'text-cm-accent' },
  huevo: { label: 'Huevo', icon: 'Egg', color: 'text-cm-warning' },
  soya: { label: 'Soya', icon: 'Bean', color: 'text-cm-success' },
  mariscos: { label: 'Mariscos', icon: 'Fish', color: 'text-cm-error' },
  mani: { label: 'Maní', icon: 'TriangleAlert', color: 'text-cm-error' },
  vegano: { label: 'Vegano', icon: 'Leaf', color: 'text-cm-success' },
  vegetariano: { label: 'Vegetariano', icon: 'Sprout', color: 'text-cm-success' },
};

export const STATUS_WORKFLOW = ['recibido', 'preparando', 'listo', 'entregado'];

export const STATUS_FLOW_INDEX = Object.fromEntries(
  STATUS_WORKFLOW.map((s, i) => [s, i])
);
