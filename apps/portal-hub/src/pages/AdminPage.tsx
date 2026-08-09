import { useState } from 'react';
import { Building2, Package, ShoppingCart, Activity } from 'lucide-react';
import type { Employee } from '../types';
import SuppliersTab from './admin/SuppliersTab';
import ProductsTab from './admin/ProductsTab';
import OrdersTab from './admin/OrdersTab';
import AutomationTab from './admin/AutomationTab';

interface AdminPageProps { employee: Employee; branchId: string }

const TABS = [
  { id: 'suppliers',  label: 'Proveedores', icon: Building2 },
  { id: 'products',   label: 'Productos',   icon: Package },
  { id: 'orders',     label: 'Órdenes',     icon: ShoppingCart },
  { id: 'automation', label: 'Pipeline',    icon: Activity },
]

const isAdmin = (role?: string) => role === 'admin' || role === 'superadmin'

export default function AdminPage({ employee, branchId }: AdminPageProps) {
  const [activeTab, setActiveTab] = useState('suppliers')
  const canEdit = isAdmin(employee.role)
  const canView = canEdit || employee.role === 'manager'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-cm-text">Administración</h1>
        <p className="text-sm text-cm-text-secondary mt-0.5">
          {canEdit ? 'Configuración del sistema' : 'Panel de consulta'}
        </p>
      </div>

      <div className="flex gap-1 bg-cm-surface border border-cm-border rounded-[var(--cm-radius-lg)] p-1 w-fit flex-wrap">
        {TABS.filter(t => canView || t.id === 'suppliers').map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-[var(--cm-radius-sm)] transition-all ${
                activeTab === tab.id
                  ? 'bg-cm-accent text-white shadow-sm'
                  : 'text-cm-text-secondary hover:text-cm-text'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'suppliers' && <SuppliersTab canEdit={canEdit} employee={employee} />}
      {activeTab === 'products' && <ProductsTab branchId={branchId} canEdit={canEdit} employee={employee} />}
      {activeTab === 'orders' && <OrdersTab branchId={branchId} canEdit={canEdit} employee={employee} />}
      {activeTab === 'automation' && <AutomationTab branchId={branchId} employee={employee} />}
    </div>
  )
}
