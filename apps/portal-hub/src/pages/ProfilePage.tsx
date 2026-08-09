import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, BadgeCheck, Building2, Hash, Shield, AlertTriangle, RefreshCw, ChevronRight } from 'lucide-react';
import { subscribeEmployee } from '../lib/employeeService';
import type { Employee } from '../types';

interface ProfilePageProps {
  employee: Employee;
  branchId: string;
}

const cv = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};
const iv = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 24 } },
};

export default function ProfilePage({ employee, branchId }: ProfilePageProps) {
  const [state, setState] = useState<'loading' | 'populated' | 'empty' | 'error'>('loading');
  const [profile, setProfile] = useState<Employee | null>(null);

  useEffect(() => {
    if (!employee?.id) { setState('error'); return; }
    const unsub = subscribeEmployee(employee.id, branchId, (emp) => {
      if (!emp) { setState('empty'); return; }
      setProfile(emp);
      setState('populated');
    });
    return unsub;
  }, [employee.id, branchId]);

  return (
    <motion.div variants={cv} initial="hidden" animate="show" className="space-y-4">
      {/* Header */}
      <motion.div variants={iv}>
        <h2 className="text-xl font-bold text-cm-text">Mi Perfil</h2>
        <p className="text-xs text-cm-text-secondary mt-0.5">Información personal y laboral</p>
      </motion.div>

      {/* State: error */}
      {state === 'error' && (
        <motion.div variants={iv} className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="w-10 h-10 text-cm-warning mb-3" />
          <p className="text-sm font-semibold text-cm-text">Error al cargar</p>
          <p className="text-xs text-cm-text-secondary mt-1">No se pudo cargar el perfil</p>
        </motion.div>
      )}

      {/* State: empty */}
      {state === 'empty' && (
        <motion.div variants={iv} className="flex flex-col items-center justify-center py-16 text-center">
          <User className="w-10 h-10 text-cm-muted mb-3" />
          <p className="text-sm font-semibold text-cm-text">Sin datos</p>
          <p className="text-xs text-cm-text-secondary mt-1">No hay información disponible</p>
        </motion.div>
      )}

      {/* State: loading */}
      {state === 'loading' && (
        <div className="animate-pulse space-y-3">
          <div className="h-32 bg-cm-surface border border-cm-border rounded-xl" />
          <div className="h-20 bg-cm-surface border border-cm-border rounded-xl" />
          <div className="h-20 bg-cm-surface border border-cm-border rounded-xl" />
        </div>
      )}

      {/* Profile content */}
      {state === 'populated' && profile && (
        <>
          {/* Avatar section */}
          <motion.div variants={iv} className="bg-cm-surface border border-cm-border rounded-2xl p-6 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-cm-accent-light flex items-center justify-center text-2xl font-black text-cm-primary shrink-0">
              {(profile.name || '?')[0].toUpperCase()}
            </div>
            <div>
              <div className="text-lg font-bold text-cm-text">{profile.name}</div>
              <div className="flex items-center gap-2 text-sm text-cm-text-secondary mt-1">
                <BadgeCheck className="w-4 h-4 text-cm-success" />
                {profile.role || 'Empleado'}
              </div>
            </div>
          </motion.div>

          {/* Details cards */}
          <motion.div variants={iv} className="bg-cm-surface border border-cm-border rounded-2xl divide-y divide-cm-border">
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Hash className="w-4 h-4 text-cm-text-tertiary" />
                <span className="text-sm text-cm-text">PIN</span>
              </div>
              <span className="text-sm font-semibold text-cm-text-secondary">••••</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-cm-text-tertiary" />
                <span className="text-sm text-cm-text">Sucursal</span>
              </div>
              <span className="text-sm font-semibold text-cm-text-secondary">{branchId}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-cm-text-tertiary" />
                <span className="text-sm text-cm-text">Rol</span>
              </div>
              <span className="text-sm font-semibold text-cm-text-secondary capitalize">{profile.role || 'Empleado'}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-cm-text-tertiary" />
                <span className="text-sm text-cm-text">ID</span>
              </div>
              <span className="text-sm font-semibold text-cm-text-secondary text-xs">{profile.id}</span>
            </div>
          </motion.div>

          {/* Contact info (if available) */}
          {(profile.phone || profile.email) && (
            <motion.div variants={iv} className="bg-cm-surface border border-cm-border rounded-2xl divide-y divide-cm-border">
              {profile.phone && (
                <div className="flex items-center justify-between px-4 py-3.5">
                  <span className="text-sm text-cm-text">Teléfono</span>
                  <span className="text-sm font-semibold text-cm-text-secondary">{profile.phone}</span>
                </div>
              )}
              {profile.email && (
                <div className="flex items-center justify-between px-4 py-3.5">
                  <span className="text-sm text-cm-text">Email</span>
                  <span className="text-sm font-semibold text-cm-text-secondary">{profile.email}</span>
                </div>
              )}
            </motion.div>
          )}

          {/* Refresh hint */}
          <motion.div variants={iv} className="flex items-center justify-center gap-2 text-xs text-cm-text-tertiary py-2">
            <RefreshCw className="w-3 h-3" />
            Datos en tiempo real
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
