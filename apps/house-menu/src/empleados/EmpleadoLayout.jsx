import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, History, CalendarDays, ListChecks, User, LogOut, Building2 } from 'lucide-react';

const TABS = [
  { id: 'fichado',   label: 'Fichado',   icon: Clock },
  { id: 'historial', label: 'Historial', icon: History },
  { id: 'horarios',  label: 'Horarios',  icon: CalendarDays },
  { id: 'tareas',    label: 'Tareas',    icon: ListChecks },
  { id: 'perfil',    label: 'Perfil',    icon: User },
];

export default function EmpleadoLayout({ employee, branchId, activeTab, onTabChange, onLogout, children }) {
  return (
    <div className="flex h-screen bg-cm-bg">
      {/* Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-cm-surface border-r border-cm-border z-50 flex-col p-4">
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="w-9 h-9 rounded-[--cm-radius-sm] bg-cm-primary flex items-center justify-center text-cm-accent font-bold text-sm">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-cm-text-secondary tracking-wide uppercase">House Portal</div>
            <div className="text-sm font-bold text-cm-text">Empleados</div>
          </div>
        </div>

        <div className="bg-cm-bg-alt rounded-[--cm-radius-md] p-3 mb-6">
          <div className="w-9 h-9 rounded-full bg-cm-accent-light flex items-center justify-center text-cm-primary font-bold text-sm mb-2">
            {(employee.name || '?')[0].toUpperCase()}
          </div>
          <div className="text-sm font-semibold text-cm-text truncate">{employee.name}</div>
          <div className="text-xs text-cm-text-secondary capitalize">{employee.role || 'Empleado'}</div>
        </div>

        <nav className="flex-1 space-y-1">
          {TABS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[--cm-radius-md] text-sm font-medium transition-all ${isActive ? 'bg-cm-accent-surface text-cm-primary' : 'text-cm-text-secondary hover:text-cm-text hover:bg-cm-surface-hover'}`}>
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
                {isActive && <motion.div layoutId="empleado-nav" className="w-1 h-4 bg-cm-accent rounded-full ml-auto" />}
              </button>
            );
          })}
        </nav>

        {branchId && <div className="px-3 py-2 mb-2 text-xs text-cm-text-tertiary">Sucursal: <span className="font-semibold text-cm-text-secondary">{branchId}</span></div>}
        <button onClick={onLogout} className="flex items-center gap-3 px-3 py-2.5 w-full text-cm-text-secondary hover:text-cm-error transition-colors rounded-[--cm-radius-md] text-sm font-medium">
          <LogOut className="w-4 h-4" /> Cerrar Sesión
        </button>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 md:pl-64">
        <header className="hidden md:flex h-14 items-center justify-between px-6 bg-cm-surface border-b border-cm-border shrink-0">
          <h1 className="text-base font-semibold text-cm-text">{TABS.find(t => t.id === activeTab)?.label || 'Empleados'}</h1>
          <div className="flex items-center gap-2 text-xs text-cm-text-secondary">
            <User className="w-3.5 h-3.5" /> {employee.name}
          </div>
        </header>

        <header className="flex md:hidden h-12 items-center justify-between px-4 bg-cm-surface border-b border-cm-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-cm-accent-light flex items-center justify-center text-cm-primary font-bold text-xs">{(employee.name || '?')[0].toUpperCase()}</div>
            <div className="text-sm font-semibold text-cm-text">{employee.name}</div>
          </div>
          <button onClick={onLogout} className="p-2 text-cm-text-secondary hover:text-cm-error transition-colors"><LogOut className="w-4 h-4" /></button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 max-w-5xl mx-auto w-full pb-20 md:pb-6">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-cm-surface border-t border-cm-border z-50">
          <div className="flex items-center justify-around h-16 px-2">
            {TABS.map((item) => {
              const Icon = item.icon; const isActive = activeTab === item.id;
              return (
                <button key={item.id} onClick={() => onTabChange(item.id)}
                  className={`flex flex-col items-center justify-center gap-0.5 w-full h-full transition-all ${isActive ? 'text-cm-primary' : 'text-cm-text-tertiary'}`}>
                  <Icon className="w-5 h-5" />
                  <span className="text-[0.6rem] font-semibold">{item.label}</span>
                  {isActive && <div className="absolute top-0 w-8 h-0.5 bg-cm-accent rounded-full" />}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
