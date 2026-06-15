import { motion } from 'framer-motion';
import { Clock, CalendarDays, ListChecks, LogOut, User, Building2, History } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard',  label: 'Fichado',   icon: Clock },
  { id: 'attendance', label: 'Historial', icon: History },
  { id: 'schedule',   label: 'Horarios',  icon: CalendarDays },
  { id: 'tasks',      label: 'Tareas',    icon: ListChecks },
  { id: 'profile',    label: 'Perfil',    icon: User },
];

export default function Layout({ activeView, onNavigate, employee, branchId, onLogout, children }) {
  return (
    <div className="flex h-screen bg-cm-bg">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-cm-surface border-r border-cm-border z-50 flex-col p-4 lg:p-5">
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="w-9 h-9 rounded-[--cm-radius-sm] bg-cm-primary flex items-center justify-center text-cm-accent font-bold text-sm">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-cm-text-secondary tracking-wide uppercase">House Portal</div>
            <div className="text-sm font-bold text-cm-text">Empleados</div>
          </div>
        </div>

        {/* Employee info — clickable to profile */}
        {employee && (
          <button
            onClick={() => onNavigate('profile')}
            className={`w-full flex items-center gap-3 px-3 py-3 mb-6 rounded-[--cm-radius-md] transition-all text-left ${
              activeView === 'profile'
                ? 'bg-cm-accent-surface text-cm-primary'
                : 'bg-cm-bg-alt text-cm-text hover:bg-cm-surface-hover'
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-cm-accent-light flex items-center justify-center text-cm-primary font-bold text-sm shrink-0">
              {(employee.name || '?')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate">{employee.name}</div>
              <div className="text-xs text-cm-text-secondary">{employee.role || 'Empleado'}</div>
            </div>
          </button>
        )}

        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[--cm-radius-md] text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-cm-accent-surface text-cm-primary'
                    : 'text-cm-text-secondary hover:text-cm-text hover:bg-cm-surface-hover'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
                {isActive && (
                  <motion.div layoutId="active-nav" className="w-1 h-4 bg-cm-accent rounded-full ml-auto" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Branch indicator */}
        {branchId && (
          <div className="px-3 py-2 mb-2 text-xs text-cm-text-tertiary">
            Sucursal: <span className="font-semibold text-cm-text-secondary">{branchId}</span>
          </div>
        )}

        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full text-cm-text-secondary hover:text-cm-error transition-colors rounded-[--cm-radius-md] text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          Cerrar Sesión
        </button>
      </aside>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 md:pl-64">
        {/* Top bar — hidden on mobile (replaced by bottom nav) */}
        <header className="hidden md:flex h-14 items-center justify-between px-4 md:px-6 bg-cm-surface border-b border-cm-border shrink-0">
          <h1 className="text-base font-semibold text-cm-text">
            {NAV_ITEMS.find(i => i.id === activeView)?.label || 'Portal'}
          </h1>
          {employee && (
            <div className="flex items-center gap-2 text-xs text-cm-text-secondary">
              <User className="w-3.5 h-3.5" />
              {employee.name}
            </div>
          )}
        </header>

        {/* Mobile top bar — minimal */}
        <header className="flex md:hidden h-12 items-center justify-between px-4 bg-cm-surface border-b border-cm-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-cm-accent-light flex items-center justify-center text-cm-primary font-bold text-xs">
              {(employee?.name || '?')[0].toUpperCase()}
            </div>
            <span className="text-sm font-semibold text-cm-text">{employee?.name}</span>
          </div>
          <button
            onClick={onLogout}
            className="p-2 text-cm-text-secondary hover:text-cm-error transition-colors rounded-[--cm-radius-md]"
            aria-label="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 max-w-5xl mx-auto w-full pb-20 md:pb-6">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-cm-surface border-t border-cm-border z-50 safe-area-inset">
          <div className="flex items-center justify-around h-16 px-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex flex-col items-center justify-center gap-0.5 w-full h-full transition-all ${
                    isActive
                      ? 'text-cm-primary'
                      : 'text-cm-text-tertiary hover:text-cm-text-secondary'
                  }`}
                  aria-label={item.label}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[0.6rem] font-semibold">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="mobile-active"
                      className="absolute top-0 w-8 h-0.5 bg-cm-accent rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
