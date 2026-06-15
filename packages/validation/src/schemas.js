/**
 * @house/validation — Zod schemas for domain models
 *
 * Provides runtime validation + inferred TypeScript types
 * for the 5 critical domain models in House Portal OS.
 *
 * @see schemas.d.ts for TypeScript type exports
 */

import { z } from 'zod';

// ── Helpers ──────────────────────────────────────────────

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const phoneRegex = /^[+]?\d{7,15}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Branch (sucursal) ────────────────────────────────────

export const BranchSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1, 'Nombre de sucursal requerido'),
  address: z.string().optional().default(''),
  phone: z.string().regex(phoneRegex, 'Teléfono inválido').optional().or(z.literal('')),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  openTime: z.string().regex(timeRegex, 'Formato HH:MM').optional(),
  closeTime: z.string().regex(timeRegex, 'Formato HH:MM').optional(),
  isActive: z.boolean().optional().default(true),
  createdAt: z.string().optional(),
});

// ── Employee (empleado) ──────────────────────────────────

export const EmployeeSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1, 'Nombre requerido'),
  pin: z.string().length(6, 'PIN debe tener 6 dígitos').regex(/^\d{6}$/, 'PIN solo dígitos'),
  role: z.enum(['admin', 'mesero', 'cocinero', 'repartidor', 'cajero', 'empleado']).default('empleado'),
  active: z.boolean().optional().default(true),
  phone: z.string().regex(phoneRegex).optional().or(z.literal('')),
  email: z.string().regex(emailRegex, 'Email inválido').optional().or(z.literal('')),
  schedule: z.record(
    z.enum(['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']),
    z.object({
      start: z.string().regex(timeRegex),
      end: z.string().regex(timeRegex),
      active: z.boolean().default(true),
    })
  ).optional(),
  createdAt: z.string().optional(),
});

// ── Customer (cliente) ──────────────────────────────────

export const CustomerSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1, 'Nombre requerido'),
  phone: z.string().regex(phoneRegex, 'Teléfono inválido'),
  email: z.string().regex(emailRegex, 'Email inválido').optional().or(z.literal('')),
  address: z.string().optional().default(''),
  notes: z.string().optional().default(''),
  totalOrders: z.number().int().nonnegative().optional().default(0),
  favoriteProducts: z.array(z.string()).optional().default([]),
  lastOrderDate: z.string().optional(),
  createdAt: z.string().optional(),
});

// ── MenuProduct (producto del menú) ──────────────────────

export const MenuProductSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1, 'Nombre requerido'),
  category: z.enum([
    'entradas', 'platos-fondo', 'parrilla', 'mariscos',
    'bebidas', 'postres', 'extras', 'promociones',
  ]).default('extras'),
  description: z.string().optional().default(''),
  price: z.coerce.number().positive('Precio debe ser > 0'),
  cost: z.coerce.number().nonnegative().optional().default(0),
  image: z.string().optional().default(''),
  available: z.boolean().optional().default(true),
  isPromotion: z.boolean().optional().default(false),
  promotionPrice: z.coerce.number().nonnegative().optional(),
  stock: z.coerce.number().int().nonnegative().optional().default(0),
  modifiers: z.array(z.object({
    name: z.string(),
    options: z.array(z.object({
      name: z.string(),
      price: z.coerce.number().nonnegative().default(0),
    })),
    max: z.number().int().positive().default(1),
  })).optional().default([]),
  createdAt: z.string().optional(),
});

// ── Order (pedido) ──────────────────────────────────────

const OrderItemSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().nonnegative(),
  subtotal: z.coerce.number().nonnegative(),
  modifiers: z.array(z.string()).optional().default([]),
  notes: z.string().optional().default(''),
});

const PaymentSchema = z.object({
  method: z.enum(['efectivo', 'tarjeta', 'yape', 'plin', 'transferencia', 'otros']),
  amount: z.coerce.number().nonnegative(),
  reference: z.string().optional().default(''),
  change: z.coerce.number().nonnegative().optional().default(0),
});

export const OrderSchema = z.object({
  id: z.string().min(1).optional(),
  branchId: z.string().min(1, 'Sucursal requerida'),
  customerId: z.string().optional().default(''),
  customerName: z.string().optional().default(''),
  type: z.enum(['mesa', 'llevar', 'delivery']).default('mesa'),
  tableNumber: z.coerce.number().int().nonnegative().optional(),
  items: z.array(OrderItemSchema).min(1, 'Pedido debe tener al menos 1 producto'),
  total: z.coerce.number().nonnegative(),
  status: z.enum([
    'pendiente', 'confirmado', 'preparacion', 'listo',
    'entregado', 'completado', 'cancelado',
  ]).default('pendiente'),
  payment: PaymentSchema.optional(),
  paid: z.boolean().optional().default(false),
  notes: z.string().optional().default(''),
  createdBy: z.string().optional().default(''),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

// ── Utility schemas ──────────────────────────────────────

/** Attendance record for an employee on a given day */
export const AttendanceSchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  clockIn: z.string(),
  clockOut: z.string().optional(),
  status: z.enum(['presente', 'tardanza', 'falta', 'vacaciones', 'licencia']).default('presente'),
});

/** Agent task definition */
export const AgentTaskSchema = z.object({
  id: z.string().optional(),
  type: z.string(),
  condition: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']).default('pending'),
  payload: z.record(z.any()).optional().default({}),
  createdAt: z.string().optional(),
  completedAt: z.string().optional(),
});

// ── Parse helpers ────────────────────────────────────────

/**
 * Parse and validate data against a schema.
 * Returns { success, data, error } where error is a user-friendly string.
 */
export function parse(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data, error: null };
  const error = result.error.issues
    .map((i) => `${i.path.join('.')}: ${i.message}`)
    .join('; ');
  return { success: false, data: null, error };
}
