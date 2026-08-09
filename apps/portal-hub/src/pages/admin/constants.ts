import type { ReactNode } from 'react'
import { Building2, Package, ShoppingCart, Activity } from 'lucide-react'

export const TABS = [
  { id: 'suppliers',  label: 'Proveedores', icon: Building2 },
  { id: 'products',   label: 'Productos',   icon: Package },
  { id: 'orders',     label: 'Órdenes',     icon: ShoppingCart },
  { id: 'automation', label: 'Pipeline',    icon: Activity },
] as const

/** Semantic status colors using --cm-* tokens */
export const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-cm-warning-soft text-cm-warning',
  approved:  'bg-cm-info-soft text-cm-info',
  rejected:  'bg-cm-error-soft text-cm-error',
  completed: 'bg-cm-success-soft text-cm-success',
  delivered: 'bg-cm-success-soft text-cm-success',
  cancelled: 'bg-cm-border text-cm-text-tertiary',
}

export const isAdmin = (role?: string) => role === 'admin' || role === 'superadmin'
