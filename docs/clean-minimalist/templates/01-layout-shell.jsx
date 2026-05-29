import { Outlet } from 'react-router-dom'
import { NexusSidebar } from '@house/ui'
import { motion } from 'framer-motion'

const NAV_ITEMS = [
  { id: 'home', label: 'Inicio', icon: 'LayoutDashboard' },
  { id: 'orders', label: 'Pedidos', icon: 'ShoppingBag' },
  { id: 'menu', label: 'Menú', icon: 'UtensilsCrossed' },
  { id: 'settings', label: 'Ajustes', icon: 'Settings' },
]

export default function LayoutShell({ title = 'App', activeApp = 'home', children }) {
  return (
    <div className="flex h-screen bg-cm-bg">
      <NexusSidebar items={NAV_ITEMS} activeItem={activeApp} />

      <div className="flex flex-col flex-1 min-w-0">
        <header className="h-14 flex items-center justify-between px-[--cm-space-md] bg-cm-surface border-b border-cm-border shrink-0">
          <h1 className="text-base font-semibold text-cm-text">{title}</h1>
          <div className="flex items-center gap-3">
            {/* status indicators, user menu, etc. */}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-[--cm-space-md] max-w-7xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {children || <Outlet />}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
