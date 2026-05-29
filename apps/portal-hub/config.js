/**
 * portal-hub/config.js
 * Central configuration for all House-Portal-OS services.
 * URLs are read from environment variables in production.
 * Fallback to localhost for development.
 * 
 * STATUS values:
 *   'active'      → Service is implemented and running
 *   'coming-soon' → Planned but not yet implemented
 *   'disabled'    → Temporarily disabled
 */

export const SERVICES = {
  'house-menu': {
    id: 'house-menu',
    name: 'House Menu',
    description: 'Mini-ERP y Pedidos Rápidos para Restaurantes',
    url: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_HOUSE_MENU_URL) || 'http://localhost:5176',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><line x1="6" y1="17" x2="18" y2="17"/></svg>`,
    category: 'servicios',
    color: '#DC2626',
    status: 'active',
  },
  'worker-portal': {
    id: 'worker-portal',
    name: 'Área Trabajador',
    description: 'Ranking, Asistencia y Gamificación del Equipo',
    url: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WORKER_URL) || 'http://localhost:5179',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    category: 'equipo',
    color: '#7C3AED',
    status: 'active',
  },
  'sorteos': {
    id: 'sorteos',
    name: 'Sorteos',
    description: 'Premios Automáticos y Gestión de Ganadores',
    url: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SORTEOS_URL) || 'http://localhost:5180',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
    category: 'entretenimiento',
    color: '#CA8A04',
    status: 'active',
  },
  '26play': {
    id: '26play',
    name: '26play',
    description: 'Plataforma de Retos y Gaming Corporativo',
    url: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_26PLAY_URL) || 'http://localhost:5181',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4"/><path d="M8 10v4"/><circle cx="16" cy="10" r="1" fill="currentColor"/><circle cx="18" cy="13" r="1" fill="currentColor"/></svg>`,
    category: 'entretenimiento',
    color: '#EA580C',
    status: 'active',
  },
  'piramid-game': {
    id: 'piramid-game',
    name: 'Eternal Nexus',
    description: 'RPG de Economía Dual, Forja de NFTs y Sumideros de Oro',
    url: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PIRAMID_URL) || 'http://localhost:5182',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="6 2 18 12 6 22 6 2"/></svg>`,
    category: 'entretenimiento',
    color: '#735c00',
    status: 'active',
  },
  'house-laundry': {
    id: 'house-laundry',
    name: 'Lavandería',
    description: 'Gestión de Tickets y Control de Prendas',
    url: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_LAUNDRY_URL) || 'http://localhost:5177',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="18" rx="2"/><circle cx="12" cy="12" r="4"/><path d="M4 6h2"/><path d="M8 6h.01"/></svg>`,
    category: 'servicios',
    color: '#2563EB',
    status: 'active',
  },
  'house-cleaning': {
    id: 'house-cleaning',
    name: 'Limpieza',
    description: 'Control de Mantenimiento y Turnos',
    url: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLEANING_URL) || 'http://localhost:5178',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3l18 18M9.5 9.5C9.5 11.5 7 13 7 13h10s-2.5-1.5-2.5-3.5V6a2 2 0 0 0-4 0v3.5z"/><path d="M7 13v3a2 2 0 0 0 4 0v-3"/></svg>`,
    category: 'servicios',
    color: '#059669',
    status: 'active',
  },
};

export const PORTAL_CONFIG = {
  name: 'House Portal OS',
  version: '3.0',
  pingTimeout: 3000,
  pingInterval: 30000,
};
