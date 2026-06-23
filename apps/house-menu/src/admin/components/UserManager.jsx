import { useState, useEffect } from 'react';
import { UserPlus, Pencil, Trash2, X, Check, AlertCircle, Users, Mail, Key, Shield, Loader2, Store } from 'lucide-react';
import { subscribeUsers, createUser, updateUser, deleteUser, subscribeRoles } from '../../lib/authService';
import { PERMISSIONS } from '../../lib/permissions';
import { useAuth } from '../../context/AuthContext';
import { ref, onValue } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { branchesConfigPath } from '../../lib/paths';

function UserFormModal({ user, roles, onSave, onClose }) {
  const [email, setEmail] = useState(user?.email || '');
  const [name, setName] = useState(user?.name || '');
  const [role, setRole] = useState(user?.role || 'kitchen');
  const [pin, setPin] = useState('');
  const [branchIds, setBranchIds] = useState(user?.branchIds || { monteverde: true });
  const [branches, setBranches] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Fetch available branches
  useEffect(() => {
    const unsub = onValue(ref(db, branchesConfigPath()), (snap) => {
      const data = snap.val();
      if (data) {
        setBranches(Object.entries(data).map(([id, b]) => ({ id, name: b.name || id })));
      }
    });
    return unsub;
  }, []);

  const toggleBranch = (branchId) => {
    setBranchIds(prev => {
      const next = { ...prev };
      if (next[branchId]) delete next[branchId];
      else next[branchId] = true;
      return Object.keys(next).length === 0 ? { [branchId]: true } : next; // keep at least one
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !name || (!user && !pin)) {
      setError('Completa todos los campos requeridos');
      return;
    }
    setSaving(true);
    setError(null);
    const data = user
      ? { email, name, role, branchIds, ...(pin ? { pin } : {}) }
      : { email, name, role, pin, branchIds };
    const result = user
      ? await updateUser(user.id, data)
      : await createUser(data);
    setSaving(false);
    if (result.success) {
      onSave();
    } else {
      setError('Error al guardar. Intenta de nuevo.');
    }
  };

  const rolesEntries = Object.entries(roles || {});
  const rolesLoading = rolesEntries.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-cm-surface rounded-xl w-full max-w-md overflow-hidden shadow-cm-lg border border-cm-border" onClick={e => e.stopPropagation()}>
        <div className="bg-cm-accent/5 p-6 border-b border-cm-border">
          <h2 className="text-lg font-bold text-cm-text">{user ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider block mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-text-tertiary" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full bg-cm-bg-alt border border-cm-border rounded-lg pl-10 pr-3 py-2.5 text-sm text-cm-text focus:outline-none focus:border-cm-accent"
                placeholder="correo@ejemplo.com" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider block mb-1">Nombre</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required
              className="w-full bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2.5 text-sm text-cm-text focus:outline-none focus:border-cm-accent"
              placeholder="Nombre del usuario" />
          </div>
          <div>
            <label className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider block mb-1">PIN</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-text-tertiary" />
              <input type="password" value={pin} onChange={e => setPin(e.target.value)} maxLength={6}
                className="w-full bg-cm-bg-alt border border-cm-border rounded-lg pl-10 pr-3 py-2.5 text-sm text-cm-text focus:outline-none focus:border-cm-accent"
                placeholder={user ? 'Dejar vacío para mantener actual' : '••••'} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider block mb-1">Rol</label>
            {rolesLoading ? (
              <div className="flex items-center gap-2 bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2.5 text-sm text-cm-text-tertiary">
                <Loader2 className="w-4 h-4 animate-spin" />
                Cargando roles...
              </div>
            ) : (
              <select value={role} onChange={e => setRole(e.target.value)}
                className="w-full bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2.5 text-sm text-cm-text focus:outline-none focus:border-cm-accent">
                {rolesEntries.map(([key, r]) => (
                  <option key={key} value={key}>{r.name}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider block mb-2">Acceso a Sucursales</label>
            {branches.length === 0 ? (
              <div className="flex items-center gap-2 bg-cm-bg-alt border border-cm-border rounded-lg px-3 py-2.5 text-sm text-cm-text-tertiary">
                <Loader2 className="w-4 h-4 animate-spin" />
                Cargando sucursales...
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {branches.map(b => {
                  const selected = !!branchIds[b.id];
                  return (
                    <button key={b.id} type="button" onClick={() => toggleBranch(b.id)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                        selected
                          ? 'bg-cm-accent/10 border-cm-accent text-cm-accent'
                          : 'bg-cm-bg-alt border-cm-border text-cm-text-secondary hover:border-cm-accent/50'
                      }`}>
                      <Store className="w-4 h-4 shrink-0" />
                      <span className="truncate">{b.name}</span>
                      {selected && <Check className="w-3.5 h-3.5 ml-auto shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-cm-error text-sm font-semibold bg-cm-error/10 border border-cm-error/30 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-lg font-semibold text-sm border border-cm-border text-cm-text-secondary hover:bg-cm-surface-hover transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-lg font-semibold text-sm bg-cm-accent text-white hover:bg-cm-accent-hover disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
              {saving ? 'Guardando...' : (user ? 'Actualizar' : 'Crear')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UserManager() {
  const { can } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState({});
  const [editingUser, setEditingUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    const unsubUsers = subscribeUsers((data) => setUsers(data));
    const unsubRoles = subscribeRoles((data) => setRoles(data));
    return () => { unsubUsers(); unsubRoles(); };
  }, []);

  const handleDelete = async (userId) => {
    await deleteUser(userId);
    setConfirmDelete(null);
  };

  const roleNames = Object.fromEntries(
    Object.entries(roles).map(([k, r]) => [k, r.name])
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-cm-text">Usuarios</h2>
          <p className="text-cm-text-secondary text-sm mt-0.5">Gestiona el acceso al sistema</p>
        </div>
        {can('users:manage') && (
          <button onClick={() => { setEditingUser(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-cm-accent text-white rounded-lg font-semibold text-sm hover:bg-cm-accent-hover transition-colors">
            <UserPlus className="w-4 h-4" /> Nuevo Usuario
          </button>
        )}
      </div>

      <div className="bg-cm-surface rounded-xl shadow-cm-sm border border-cm-border overflow-hidden">
        {users.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-cm-text-tertiary mx-auto mb-3" />
            <p className="font-semibold text-cm-text-secondary">No hay usuarios registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cm-border bg-cm-bg-alt">
                  {['Nombre', 'Email', 'Rol', 'Activo', 'Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-cm-text-secondary uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-cm-border">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-cm-accent/5 transition-colors">
                    <td className="px-4 py-3 font-semibold text-cm-text">{u.name}</td>
                    <td className="px-4 py-3 text-cm-text-secondary">{u.email || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="bdg bdg-accent">{roleNames[u.role] || u.role || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        u.active !== false ? 'bg-cm-success/10 text-cm-success' : 'bg-cm-error/10 text-cm-error'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.active !== false ? 'bg-cm-success' : 'bg-cm-error'}`} />
                        {u.active !== false ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {can('users:manage') && (
                          <>
                            <button onClick={() => { setEditingUser(u); setShowForm(true); }}
                              className="p-2 rounded-lg bg-cm-info/10 text-cm-info hover:bg-cm-info/20 transition-colors" title="Editar">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => setConfirmDelete(u)}
                              className="p-2 rounded-lg bg-cm-error/10 text-cm-error hover:bg-cm-error/20 transition-colors" title="Eliminar">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <UserFormModal
          user={editingUser}
          roles={roles}
          onSave={() => setShowForm(false)}
          onClose={() => setShowForm(false)}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-cm-surface rounded-xl w-full max-w-sm overflow-hidden shadow-cm-lg border border-cm-border">
            <div className="bg-cm-error/10 p-6 border-b border-cm-border text-center">
              <div className="w-16 h-16 bg-cm-error/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-cm-error/30">
                <AlertCircle className="w-8 h-8 text-cm-error" />
              </div>
              <h2 className="text-lg font-bold text-cm-text">¿Eliminar usuario?</h2>
              <p className="text-cm-text-secondary text-sm mt-1">{confirmDelete.name}</p>
            </div>
            <div className="p-6 flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-lg font-semibold text-sm border border-cm-border text-cm-text-secondary hover:bg-cm-surface-hover transition-colors">
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDelete.id)}
                className="flex-1 py-2.5 rounded-lg font-semibold text-sm bg-cm-error text-white hover:bg-cm-error/80 transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {Object.keys(roles).length > 0 && (
        <div className="bg-cm-surface rounded-xl shadow-cm-sm border border-cm-border p-6">
          <h3 className="text-sm font-semibold text-cm-text-secondary uppercase tracking-wider mb-4">Permisos por Rol</h3>
          <div className="space-y-4">
            {Object.entries(roles).map(([key, role]) => (
              <div key={key} className="border border-cm-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-cm-accent" />
                  <span className="font-semibold text-cm-text">{role.name}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(role.permissions || {}).map(([perm, enabled]) => (
                    enabled && (
                      <span key={perm} className="bdg bdg-neutral">{PERMISSIONS[perm] || perm}</span>
                    )
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
