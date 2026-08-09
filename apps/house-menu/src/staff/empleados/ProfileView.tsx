import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { ComponentType } from 'react';
import { User, BadgeCheck, Building2, Hash, Shield, AlertTriangle, RefreshCw, IdCard } from 'lucide-react';
import { subscribeEmployee } from './employeeService';

interface ProfileViewProps {
  uid: string;
  branchId: string | null;
}

export default function ProfileView({ uid, branchId }: ProfileViewProps) {
  const [state, setState] = useState<'loading' | 'empty' | 'error' | 'populated'>('loading');
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!uid) { setState('error'); return; }

    const unsub = subscribeEmployee(branchId!, uid, (data) => {
      if (data) {
        setProfile(data);
        setState('populated');
      } else {
        setState('empty');
      }
    });

    return unsub;
  }, [uid, branchId]);

  // ── Loading ──
  if (state === 'loading') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-cm-border animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className="h-5 w-40 bg-cm-border rounded animate-pulse" />
            <div className="h-4 w-24 bg-cm-border rounded animate-pulse" />
          </div>
        </div>
        <div className="h-48 bg-cm-surface border border-cm-border rounded-[--cm-radius-lg] animate-pulse" />
      </div>
    );
  }

  // ── Empty ──
  if (state === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-cm-accent-light flex items-center justify-center mb-4">
          <User className="w-8 h-8 text-cm-accent" />
        </div>
        <h2 className="text-lg font-semibold text-cm-text">Perfil no encontrado</h2>
        <p className="text-sm text-cm-text-secondary mt-1">No se encontraron datos de empleado.</p>
      </div>
    );
  }

  // ── Error ──
  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-cm-error-soft flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-cm-error" />
        </div>
        <h2 className="text-lg font-semibold text-cm-text">Error al cargar</h2>
        <p className="text-sm text-cm-text-secondary mt-1">No se pudo obtener la información del perfil.</p>
        <button onClick={() => window.location.reload()} className="cm-btn cm-btn--primary mt-6">
          <RefreshCw className="w-4 h-4" /> Reintentar
        </button>
      </div>
    );
  }

  // ── Populated ──
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-2xl"
    >
      {/* Profile header */}
      <div className="bg-cm-surface border border-cm-border rounded-[--cm-radius-lg] p-6 md:p-8">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-cm-accent-light flex items-center justify-center text-xl font-bold text-cm-primary shrink-0">
            {((profile?.name as string) || '?')[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-cm-text">{(profile?.name as string) || 'Empleado'}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="cm-badge cm-badge--success">
                <BadgeCheck className="w-3 h-3" />
                {(profile?.role as string) || 'Empleado'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Employee details */}
      <div className="bg-cm-surface border border-cm-border rounded-[--cm-radius-lg] p-6">
        <h3 className="text-xs font-medium text-cm-text-secondary uppercase tracking-wider mb-4">
          Información General
        </h3>
        <div className="space-y-0 divide-y divide-cm-border">
          <DetailRow icon={Hash} label="UID" value={uid} />
          <DetailRow icon={Shield} label="Rol" value={(profile?.role as string) || '—'} />
          {profile?.docNum && <DetailRow icon={IdCard} label={`Doc. Identidad (${((profile?.docType as string) || 'dni').toUpperCase()})`} value={profile.docNum as string} />}
          <DetailRow icon={Building2} label="Sucursal" value={branchId || '—'} />
          <DetailRow icon={User} label="Nombre" value={(profile?.name as string) || '—'} />
          <DetailRow
            icon={BadgeCheck}
            label="Estado"
            value={profile?.active !== false ? 'Activo' : 'Inactivo'}
          />
        </div>
      </div>

      {/* Additional info if available */}
      {(profile?.phone || profile?.email) ? (
        <div className="bg-cm-surface border border-cm-border rounded-[--cm-radius-lg] p-6">
          <h3 className="text-xs font-medium text-cm-text-secondary uppercase tracking-wider mb-4">
            Contacto
          </h3>
          <div className="space-y-0 divide-y divide-cm-border">
            {profile?.phone && <DetailRow label="Teléfono" value={profile.phone as string} />}
            {profile?.email && <DetailRow label="Email" value={profile.email as string} />}
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon?: ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-3">
      {Icon && (
        <div className="w-8 h-8 rounded-[--cm-radius-sm] bg-cm-bg-alt flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-cm-text-secondary" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-cm-text-secondary">{label}</div>
        <div className="text-sm font-semibold text-cm-text truncate">{value}</div>
      </div>
    </div>
  );
}
