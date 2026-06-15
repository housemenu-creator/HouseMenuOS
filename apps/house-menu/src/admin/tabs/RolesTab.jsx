import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldCheck, Edit3, Save, X, Loader2, Search } from 'lucide-react';
import { subscribeRoles } from '../../lib/authService';
import { PERMISSIONS } from '../../lib/roleRegistry';
import { saveRole } from '../../lib/authService';
import { auditLog } from '../../lib/auditService';
import { useToast } from '../../components/ToastContext';
import { useAuth } from '../../context/AuthContext';

export default function RolesTab() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [roles, setRoles] = useState(null);
  const [editingRole, setEditingRole] = useState(null);
  const [editPermissions, setEditPermissions] = useState({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsub = subscribeRoles((data) => {
      setRoles(data);
    });
    return unsub;
  }, []);

  const roleList = useMemo(() => {
    if (!roles) return [];
    return Object.entries(roles).map(([key, r]) => ({ key, ...r }));
  }, [roles]);

  const filtered = useMemo(() => {
    if (!search) return roleList;
    const q = search.toLowerCase();
    return roleList.filter(r => r.name?.toLowerCase().includes(q) || r.key?.toLowerCase().includes(q));
  }, [roleList, search]);

  const startEditing = (role) => {
    setEditingRole(role);
    setEditPermissions({ ...(role.permissions || {}) });
  };

  const togglePermission = (perm) => {
    setEditPermissions(prev => ({
      ...prev,
      [perm]: !prev[perm],
    }));
  };

  const handleSave = async () => {
    if (!editingRole) return;
    setSaving(true);
    try {
      await saveRole(editingRole.key, {
        ...editingRole,
        permissions: editPermissions,
      });
      await auditLog('role.updated', { role: editingRole.key, permissions: editPermissions }, user?.email);
      setEditingRole(null);
      showToast(`Rol "${editingRole.name}" actualizado`);
    } catch (err) {
      showToast('Error al guardar rol', 'error');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-cm-text">Roles y Permisos</h2>
        <span className="text-xs text-cm-text-secondary font-medium">{roleList.length} roles</span>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-text-tertiary" />
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar rol..."
          className="w-full pl-9 pr-3 py-2 bg-cm-surface border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors"
        />
      </div>

      {/* Role cards */}
      <div className="grid gap-3">
        {filtered.map(role => (
          <div key={role.key} className="bg-cm-surface rounded-xl border border-cm-border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cm-accent" />
                  <h3 className="font-bold text-cm-text">{role.name}</h3>
                  <code className="text-[10px] font-mono bg-cm-bg-alt px-1.5 py-0.5 rounded text-cm-text-secondary">{role.key}</code>
                </div>
                <p className="text-xs text-cm-text-secondary mt-1">
                  {Object.keys(role.permissions || {}).filter(p => role.permissions[p]).length} permisos activos
                </p>
              </div>
              <button
                onClick={() => startEditing(role)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-accent/10 text-cm-accent text-xs font-bold rounded-lg hover:bg-cm-accent/20 transition-colors shrink-0"
              >
                <Edit3 className="w-3.5 h-3.5" /> Editar permisos
              </button>
            </div>

            {/* Permission tags */}
            <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-cm-border">
              {Object.entries(role.permissions || {})
                .filter(([, v]) => v)
                .slice(0, 8)
                .map(([perm]) => (
                  <span key={perm} className="px-1.5 py-0.5 bg-cm-accent/5 text-cm-accent text-[10px] font-semibold rounded">
                    {perm}
                  </span>
                ))}
              {Object.keys(role.permissions || {}).filter(p => role.permissions[p]).length > 8 && (
                <span className="px-1.5 py-0.5 text-[10px] text-cm-text-tertiary font-semibold">
                  +{Object.keys(role.permissions).filter(p => role.permissions[p]).length - 8} más
                </span>
              )}
            </div>
          </div>
        ))}

        {!roles && (
          <div className="text-center py-8 text-sm text-cm-text-secondary animate-pulse">
            Cargando roles...
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingRole && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setEditingRole(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }}
              className="bg-cm-surface rounded-2xl shadow-cm-lg w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-cm-surface border-b border-cm-border px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-cm-accent" />
                  <h3 className="text-lg font-bold text-cm-text">{editingRole.name}</h3>
                </div>
                <button onClick={() => setEditingRole(null)} className="p-1 hover:bg-cm-accent/10 rounded transition-colors">
                  <X className="w-5 h-5 text-cm-text-secondary" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-cm-text-secondary font-semibold uppercase tracking-wider">
                  Marca o desmarca los permisos para este rol
                </p>

                {Object.entries(PERMISSIONS).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-cm-accent/5 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={!!editPermissions[key]}
                      onChange={() => togglePermission(key)}
                      className="w-4 h-4 rounded border-cm-border text-cm-accent focus:ring-cm-accent"
                    />
                    <div>
                      <p className="text-sm font-semibold text-cm-text">{label}</p>
                      <code className="text-[10px] font-mono text-cm-text-tertiary">{key}</code>
                    </div>
                  </label>
                ))}
              </div>

              <div className="sticky bottom-0 bg-cm-surface border-t border-cm-border px-6 py-4 flex gap-3 rounded-b-2xl">
                <button
                  onClick={() => setEditingRole(null)}
                  className="flex-1 py-2.5 border border-cm-border text-sm font-semibold text-cm-text rounded-xl hover:bg-cm-surface-hover transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-cm-accent text-white text-sm font-black rounded-xl hover:bg-cm-accent/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
