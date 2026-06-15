import { z } from 'zod';

// ── Schema declarations ──────────────────────────────────

export const BranchSchema: z.ZodObject<{
  id: z.ZodOptional<z.ZodString>;
  name: z.ZodString;
  address: z.ZodDefault<z.ZodString>;
  phone: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<''>]>>;
  latitude: z.ZodOptional<z.ZodNumber>;
  longitude: z.ZodOptional<z.ZodNumber>;
  openTime: z.ZodOptional<z.ZodString>;
  closeTime: z.ZodOptional<z.ZodString>;
  isActive: z.ZodDefault<z.ZodBoolean>;
  createdAt: z.ZodOptional<z.ZodString>;
}>;

export const EmployeeSchema: z.ZodObject<{
  id: z.ZodOptional<z.ZodString>;
  name: z.ZodString;
  pin: z.ZodString;
  role: z.ZodDefault<z.ZodEnum<['admin', 'mesero', 'cocinero', 'repartidor', 'cajero', 'empleado']>>;
  active: z.ZodDefault<z.ZodBoolean>;
  phone: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<''>]>>;
  email: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<''>]>>;
  schedule: z.ZodOptional<z.ZodRecord<z.ZodEnum<['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']>, z.ZodObject<{ start: z.ZodString; end: z.ZodString; active: z.ZodDefault<z.ZodBoolean> }>>>;
  createdAt: z.ZodOptional<z.ZodString>;
}>;

export const CustomerSchema: z.ZodObject<{
  id: z.ZodOptional<z.ZodString>;
  name: z.ZodString;
  phone: z.ZodString;
  email: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<''>]>>;
  address: z.ZodDefault<z.ZodString>;
  notes: z.ZodDefault<z.ZodString>;
  totalOrders: z.ZodDefault<z.ZodNumber>;
  favoriteProducts: z.ZodDefault<z.ZodArray<z.ZodString>>;
  lastOrderDate: z.ZodOptional<z.ZodString>;
  createdAt: z.ZodOptional<z.ZodString>;
}>;

export const MenuProductSchema: z.ZodObject<{
  id: z.ZodOptional<z.ZodString>;
  name: z.ZodString;
  category: z.ZodDefault<z.ZodEnum<['entradas', 'platos-fondo', 'parrilla', 'mariscos', 'bebidas', 'postres', 'extras', 'promociones']>>;
  description: z.ZodDefault<z.ZodString>;
  price: z.ZodNumber;
  cost: z.ZodDefault<z.ZodNumber>;
  image: z.ZodDefault<z.ZodString>;
  available: z.ZodDefault<z.ZodBoolean>;
  isPromotion: z.ZodDefault<z.ZodBoolean>;
  promotionPrice: z.ZodOptional<z.ZodNumber>;
  stock: z.ZodDefault<z.ZodNumber>;
  modifiers: z.ZodDefault<z.ZodArray<z.ZodObject<{ name: z.ZodString; options: z.ZodArray<z.ZodObject<{ name: z.ZodString; price: z.ZodDefault<z.ZodNumber> }>>; max: z.ZodDefault<z.ZodNumber> }>>>;
  createdAt: z.ZodOptional<z.ZodString>;
}>;

export const OrderSchema: z.ZodObject<{ /* full shape omitted for brevity — use z.infer<typeof OrderSchema> */ }>;

// ── Inferred types ───────────────────────────────────────

/** Sucursal / restaurant branch */
export type Branch = z.infer<typeof BranchSchema>;

/** Employee with PIN auth, schedule, role */
export type Employee = z.infer<typeof EmployeeSchema>;

/** Customer with order history */
export type Customer = z.infer<typeof CustomerSchema>;

/** Menu item with pricing, modifiers, stock */
export type MenuProduct = z.infer<typeof MenuProductSchema>;

/** Customer order with items, payments, status */
export type Order = z.infer<typeof OrderSchema>;

/** Day-by-day attendance record */
export type Attendance = z.infer<typeof import('./schemas.js').AttendanceSchema>;

/** Agent task item */
export type AgentTask = z.infer<typeof import('./schemas.js').AgentTaskSchema>;

// ── Parse helper ─────────────────────────────────────────

export function parse<T>(schema: z.ZodType<T>, data: unknown): { success: true; data: T; error: null } | { success: false; data: null; error: string };
