/**
 * Rutas centralizadas del frontend.
 * Toda navegación (`navigate()`, `path`, comparaciones) DEBE usar estas constantes,
 * no strings hardcodeados.
 *
 * Las definiciones de `<Route path="...">` en App.jsx son la fuente de verdad
 * y NO se reemplazan — solo los usos (navigate, config, comparaciones).
 */

// ── Públicas ──
export const ROUTES = {
  HOME: '/',
  CARTA: '/carta',
  RASTREO: '/rastreo',
  ADMIN: '/admin',
  LOGIN: '/login',
  ONBOARDING: '/onboarding',
  RESERVA: '/reserva',
  MIS_PEDIDOS: '/mis-pedidos',
  KIOSKO: '/kiosko',
  MONITOR: '/monitor',
  NOTIFICACIONES: '/staff/notificaciones',
  EMPLEADOS: '/staff/empleados',
  MI_CUENTA: '/mi-cuenta',
} as const;

// ── Staff ──
export const STAFF_ROUTES = {
  ROOT: '/staff',
  MOZO: '/staff/mozo',
  COCINA: '/staff/cocina',
  DESPACHO: '/staff/despacho',
  DELIVERY: '/staff/delivery',
  VENDEDOR: '/staff/vendedor',
  CAJA: '/staff/caja',
  EMPLEADOS: '/staff/empleados',
  PREPEDIDOS: '/staff/prepedidos',
} as const;

// ── Helpers ──

/** Construye `/staff/:role/dashboard` */
export const staffDashboardRoute = (role: string) =>
  `/staff/${role}/dashboard` as const;

/** Construye `/rastreo?id=${id}&branch=${branchId}` */
export const rastreoRoute = (id: string, branchId: string) =>
  `/rastreo?id=${id}&branch=${branchId}` as const;

/** Retorna el staff route para un role dado */
export const staffRouteForRole = (role: string): string => {
  const map: Record<string, string> = {
    mozo: STAFF_ROUTES.MOZO,
    cocina: STAFF_ROUTES.COCINA,
    despacho: STAFF_ROUTES.DESPACHO,
    delivery: STAFF_ROUTES.DELIVERY,
    vendedor: STAFF_ROUTES.VENDEDOR,
    cajero: STAFF_ROUTES.CAJA,
    repartidor: STAFF_ROUTES.DELIVERY,
    admin: ROUTES.ADMIN,
    superadmin: ROUTES.ADMIN,
  };
  return map[role] || STAFF_ROUTES.MOZO;
};

/**
 * Mapea una ruta pública al formato con slug `/r/:slug/path`.
 * Si no hay slug, retorna la ruta original sin cambios.
 */
export const slugRoute = (slug: string | null, path: string): string => {
  if (!slug) return path;
  if (path.startsWith('/r/')) return path;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return cleanPath ? `/r/${slug}/${cleanPath}` : `/r/${slug}`;
};
