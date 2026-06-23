import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MapPin, Phone, Clock3, Edit3, Trash2, Copy, Loader2, AlertTriangle, X, Hash, QrCode, Upload, CheckCircle, Smartphone, Image } from 'lucide-react';
import { ref, update } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { branchService } from '../../lib/branchService';
import { storageService } from '../../lib/storageService';
import { useBranch } from '../../context/BranchContext';
import TableQRModal from '../components/TableQRModal';

export default function SucursalesTab({ branches }) {
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchForm, setBranchForm] = useState({
    name: '',
    address: '',
    province: '',
    district: '',
    phone: '',
    whatsappNumber: '',
    schedule: '',
    openingTime: '',
    closingTime: '',
    lat: '',
    lng: '',
    tableCount: '0',
    deliveryEnabled: false,
    deliveryFee: '5',
    freeThreshold: '0',
    deliveryRadius: '',
    packagingItems: [],
    yapePhone: '',
    yapeName: '',
    yapeQrUrl: '',
    plinNumber: '',
    plinName: '',
    // Nuevos campos
    email: '',
    website: '',
    contactPerson: '',
    instagram: '',
    facebook: '',
    tiktok: '',
    photoUrl: '',
    isHeadquarters: false,
    scheduleByDay: {
      monday: { enabled: true, open: '09:00', close: '18:00' },
      tuesday: { enabled: true, open: '09:00', close: '18:00' },
      wednesday: { enabled: true, open: '09:00', close: '18:00' },
      thursday: { enabled: true, open: '09:00', close: '18:00' },
      friday: { enabled: true, open: '09:00', close: '18:00' },
      saturday: { enabled: false, open: '10:00', close: '16:00' },
      sunday: { enabled: false, open: '10:00', close: '16:00' },
    },
  });

  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneSource, setCloneSource] = useState('');
  const [cloneTarget, setCloneTarget] = useState('');
  const [cloneLoading, setCloneLoading] = useState(false);
  const [cloneResult, setCloneResult] = useState(null);
  const { activeBranchId } = useBranch();

  const [qrModalBranch, setQrModalBranch] = useState(null);
  const [tablesConfig, setTablesConfig] = useState([]);
  const [branchSearch, setBranchSearch] = useState('');

  const [uploadingYapeQr, setUploadingYapeQr] = useState(false);
  const [yapeQrPreview, setYapeQrPreview] = useState(null);
  const yapeQrInputRef = useRef(null);

  const addTable = () => {
    const nextNum = tablesConfig.length > 0 ? Math.max(...tablesConfig) + 1 : 1;
    setTablesConfig([...tablesConfig, nextNum]);
  };

  const removeTable = (num) => {
    setTablesConfig(tablesConfig.filter(n => n !== num));
  };

  const openBranchForm = (branch = null) => {
    if (branch) {
      setEditingBranch(branch);
      setBranchForm({
        name: branch.name || '',
        address: branch.address || '',
        province: branch.province || '',
        district: branch.district || '',
        phone: branch.phone || '',
        whatsappNumber: branch.whatsappNumber || '',
        schedule: branch.schedule || '',
        openingTime: '',
        closingTime: '',
        lat: branch.coordinates?.lat != null ? String(branch.coordinates.lat) : '',
        lng: branch.coordinates?.lng != null ? String(branch.coordinates.lng) : '',
        tableCount: branch.tableCount != null ? String(branch.tableCount) : '0',
        deliveryEnabled: branch.deliveryEnabled ?? false,
        deliveryFee: branch.deliveryFee != null ? String(branch.deliveryFee) : '5',
        freeThreshold: branch.freeThreshold != null ? String(branch.freeThreshold) : '0',
        deliveryRadius: branch.deliveryRadius != null ? String(branch.deliveryRadius) : '',
        packagingItems: branch.packagingItems || [],
        yapePhone: branch.yapePhone || '',
        yapeName: branch.yapeName || '',
        yapeQrUrl: branch.yapeQrUrl || '',
        plinNumber: branch.plinNumber || '',
        plinName: branch.plinName || '',
        email: branch.email || '',
        website: branch.website || '',
        contactPerson: branch.contactPerson || '',
        instagram: branch.instagram || '',
        facebook: branch.facebook || '',
        tiktok: branch.tiktok || '',
        photoUrl: branch.photoUrl || '',
        isHeadquarters: branch.isHeadquarters ?? false,
        scheduleByDay: branch.scheduleByDay || {
          monday: { enabled: true, open: '09:00', close: '18:00' },
          tuesday: { enabled: true, open: '09:00', close: '18:00' },
          wednesday: { enabled: true, open: '09:00', close: '18:00' },
          thursday: { enabled: true, open: '09:00', close: '18:00' },
          friday: { enabled: true, open: '09:00', close: '18:00' },
          saturday: { enabled: false, open: '10:00', close: '16:00' },
          sunday: { enabled: false, open: '10:00', close: '16:00' },
        },
      });
      setYapeQrPreview(branch.yapeQrUrl || null);
      setTablesConfig(branch.tables || Array.from({ length: parseInt(branch.tableCount) || 0 }, (_, i) => i + 1));
    } else {
      setEditingBranch(null);
      setBranchForm({ name: '', address: '', province: '', district: '', phone: '', whatsappNumber: '', schedule: '', openingTime: '', closingTime: '', lat: '', lng: '', tableCount: '0', deliveryEnabled: false, deliveryFee: '5', freeThreshold: '0', deliveryRadius: '', packagingItems: [], yapePhone: '', yapeName: '', yapeQrUrl: '', plinNumber: '', plinName: '', email: '', website: '', contactPerson: '', instagram: '', facebook: '', tiktok: '', photoUrl: '', isHeadquarters: false, scheduleByDay: { monday: { enabled: true, open: '09:00', close: '18:00' }, tuesday: { enabled: true, open: '09:00', close: '18:00' }, wednesday: { enabled: true, open: '09:00', close: '18:00' }, thursday: { enabled: true, open: '09:00', close: '18:00' }, friday: { enabled: true, open: '09:00', close: '18:00' }, saturday: { enabled: false, open: '10:00', close: '16:00' }, sunday: { enabled: false, open: '10:00', close: '16:00' } } });
      setYapeQrPreview(null);
      setTablesConfig([]);
    }
    setShowBranchModal(true);
  };

  const handleYapeQrUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!editingBranch) { alert('Guarda la sucursal primero antes de subir el QR'); return; }
    setUploadingYapeQr(true);
    try {
      const result = await storageService.uploadYapeQr(editingBranch.id, file, (progress) => {
        // progress not shown for simplicity
      });
      setBranchForm(prev => ({ ...prev, yapeQrUrl: result.url }));
      setYapeQrPreview(result.url);
    } catch (err) {
      alert('Error al subir el QR: ' + (err.message || 'Error inesperado'));
    }
    setUploadingYapeQr(false);
    if (yapeQrInputRef.current) yapeQrInputRef.current.value = '';
  };

  const handleBranchSubmit = async (e) => {
    e.preventDefault();
    
    // Validación de duplicados (nombre o dirección exacta)
    const existsName = branches.some(b => b.name?.toLowerCase() === branchForm.name.toLowerCase() && (!editingBranch || b.id !== editingBranch.id));
    if (existsName) {
      alert('Ya existe una sucursal con este nombre. Elige otro.');
      return;
    }
    
    // Generate schedule from scheduleByDay
    let schedule = '';
    if (branchForm.scheduleByDay) {
      const dayLabels = { monday: 'Lun', tuesday: 'Mar', wednesday: 'Mié', thursday: 'Jue', friday: 'Vie', saturday: 'Sáb', sunday: 'Dom' };
      const enabled = Object.entries(branchForm.scheduleByDay).filter(([_,v]) => v.enabled).map(([k,v]) => ({key:k, label:dayLabels[k], ...v}));
      const groups = [];
      for (const d of enabled) {
        const last = groups[groups.length-1];
        if (last && last.open===d.open && last.close===d.close) { last.days.push(d.label); }
        else { groups.push({ open:d.open, close:d.close, days:[d.label] }); }
      }
      schedule = groups.map(g => `${g.days.length===1 ? g.days[0] : `${g.days[0]}-${g.days[g.days.length-1]}`} ${g.open}-${g.close}`).join(', ');
    }
    const data = {
      name: branchForm.name,
      address: branchForm.address,
      province: branchForm.province || '',
      district: branchForm.district || '',
      phone: branchForm.phone,
      whatsappNumber: branchForm.whatsappNumber,
      schedule,
      coordinates: { lat: branchForm.lat ? parseFloat(branchForm.lat) : null, lng: branchForm.lng ? parseFloat(branchForm.lng) : null },
      tableCount: parseInt(branchForm.tableCount) || 0,
      deliveryEnabled: branchForm.deliveryEnabled,
      deliveryFee: parseFloat(branchForm.deliveryFee) || 0,
      freeThreshold: parseFloat(branchForm.freeThreshold) || 0,
      deliveryRadius: branchForm.deliveryRadius ? parseFloat(branchForm.deliveryRadius) : null,
      packagingItems: branchForm.packagingItems || [],
      yapePhone: branchForm.yapePhone || '',
      yapeName: branchForm.yapeName || '',
      yapeQrUrl: branchForm.yapeQrUrl || '',
      plinNumber: branchForm.plinNumber || '',
      plinName: branchForm.plinName || '',
      // Nuevos campos
      email: branchForm.email || '',
      website: branchForm.website || '',
      contactPerson: branchForm.contactPerson || '',
      instagram: branchForm.instagram || '',
      facebook: branchForm.facebook || '',
      tiktok: branchForm.tiktok || '',
      photoUrl: branchForm.photoUrl || '',
      isHeadquarters: branchForm.isHeadquarters,
      scheduleByDay: branchForm.scheduleByDay || {},
      // Si es headquarters, asegurar que sea la única
      ...(branchForm.isHeadquarters && { isHeadquarters: true }),
    };
    try {
      const result = editingBranch
        ? await branchService.updateBranch(editingBranch.id, data)
        : await branchService.createBranch(data);
      if (result.success && editingBranch) {
        await update(ref(db, `branches/${editingBranch.id}`), { tables: tablesConfig });
      } else if (result.success) {
        const branchId = result.id;
        await update(ref(db, `branches/${branchId}`), { tables: tablesConfig });
      }
      if (result.success) {
        setShowBranchModal(false);
      } else {
        alert('Error al guardar la sucursal');
      }
    } catch (err) {
      alert('Error al guardar la sucursal: ' + (err.message || 'Error inesperado'));
    }
  };

  const deleteBranch = async (id, name) => {
    if (!window.confirm(`Estas seguro de que deseas eliminar la sucursal "${name}"? Esta accion no se puede deshacer.`)) return;
    try {
      const result = await branchService.deleteBranch(id);
      if (!result.success) alert('Error al eliminar la sucursal');
    } catch (err) {
      alert('Error al eliminar la sucursal: ' + (err.message || 'Error inesperado'));
    }
  };

  const handleCloneCatalog = async () => {
    if (!cloneSource || !cloneTarget) return;
    setCloneLoading(true);
    setCloneResult(null);
    try {
      const result = await branchService.cloneMenu(cloneSource, cloneTarget);
      setCloneResult(result);
    } catch (err) {
      setCloneResult({ success: false, error: err.message });
    }
    setCloneLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-cm-text">Sucursales</h2>
        <button onClick={() => openBranchForm()} className="flex items-center gap-2 px-4 py-2 bg-cm-accent text-white text-sm font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors">
          <Plus className="w-4 h-4" /> Nueva sucursal
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <input type="text" placeholder="Buscar por nombre, dirección, provincia o distrito..." value={branchSearch} onChange={e => setBranchSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-cm-border rounded-xl text-sm font-semibold text-cm-text bg-cm-surface focus:outline-none focus:border-cm-accent transition-colors" />
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cm-muted" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-cm-surface rounded-xl border border-cm-border p-3 text-center">
          <p className="text-2xl font-black text-cm-accent">{branches.length}</p>
          <p className="text-[10px] uppercase tracking-wider text-cm-muted font-semibold">Total</p>
        </div>
        <div className="bg-cm-success/5 rounded-xl border border-cm-success/20 p-3 text-center">
          <p className="text-2xl font-black text-cm-success">{branches.filter(b => b.deliveryEnabled).length}</p>
          <p className="text-[10px] uppercase tracking-wider text-cm-muted font-semibold">Con Delivery</p>
        </div>
        <div className="bg-cm-warning/5 rounded-xl border border-cm-warning/20 p-3 text-center">
          <p className="text-2xl font-black text-cm-warning">{branches.filter(b => b.isHeadquarters).length}</p>
          <p className="text-[10px] uppercase tracking-wider text-cm-muted font-semibold">Casa Matriz</p>
        </div>
      </div>

      {/* Map preview - showing all branches with coordinates */}
      {branches.filter(b => b.coordinates?.lat && b.coordinates?.lng).length > 0 && (
        <div className="bg-cm-surface rounded-xl border border-cm-border p-3">
          <p className="text-xs font-bold text-cm-text-secondary uppercase tracking-wider mb-2">Mapa de sucursales</p>
          <div className="rounded-lg overflow-hidden border border-cm-border">
            <iframe
              title="Sucursales map"
              width="100%"
              height="200"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps?q=${branches.filter(b => b.coordinates?.lat).map(b => `${b.coordinates.lat},${b.coordinates.lng}`).join('|')}&output=embed`}
            />
          </div>
        </div>
      )}

      {/* Branch cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {branches.filter(b => !branchSearch || b.name?.toLowerCase().includes(branchSearch.toLowerCase()) || b.address?.toLowerCase().includes(branchSearch.toLowerCase()) || b.district?.toLowerCase().includes(branchSearch.toLowerCase()) || b.province?.toLowerCase().includes(branchSearch.toLowerCase())).map(b => (
          <div key={b.id} className="bg-cm-surface rounded-xl border border-cm-border shadow-cm-sm overflow-hidden hover:shadow-cm-md transition-all hover:border-cm-accent/30 group">
            {/* Card header */}
            <div className="p-4 border-b border-cm-border/50">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-cm-text truncate">{b.name}</h3>
                    {b.isHeadquarters && <span className="text-[9px] font-black bg-cm-warning/10 text-cm-warning px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">Matriz</span>}
                    {b.id === activeBranchId && <span className="text-[9px] font-black bg-cm-accent/10 text-cm-accent px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">Activa</span>}
                  </div>
                  <p className="text-xs text-cm-muted mt-0.5 truncate">{b.address}{b.district ? `, ${b.district}` : ''}{b.province ? `, ${b.province}` : ''}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setQrModalBranch(b)} className="p-1.5 text-cm-muted hover:text-cm-accent hover:bg-cm-accent/10 rounded-lg transition-colors" title="QR mesas"><QrCode className="w-3.5 h-3.5" /></button>
                  <button onClick={() => openBranchForm(b)} className="p-1.5 text-cm-muted hover:text-cm-accent hover:bg-cm-accent/10 rounded-lg transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => deleteBranch(b.id, b.name)} className="p-1.5 text-cm-muted hover:text-cm-error hover:bg-cm-error/10 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
            {/* Card body */}
            <div className="p-4 space-y-1.5">
              {b.phone && <div className="flex items-center gap-2 text-xs text-cm-text-secondary"><Phone className="w-3.5 h-3.5 shrink-0 text-cm-muted" />{b.phone}</div>}
              {b.whatsappNumber && <div className="flex items-center gap-2 text-xs text-cm-text-secondary"><Smartphone className="w-3.5 h-3.5 shrink-0 text-cm-muted" />{b.whatsappNumber}</div>}
              {b.schedule && <div className="flex items-center gap-2 text-xs text-cm-text-secondary"><Clock3 className="w-3.5 h-3.5 shrink-0 text-cm-muted" />{b.schedule}</div>}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${b.deliveryEnabled ? 'bg-cm-success' : 'bg-cm-muted'}`} />
                <span className="text-xs text-cm-text-secondary">{b.deliveryEnabled ? `Delivery S/ ${b.deliveryFee}${b.freeThreshold > 0 ? ` (gratis desde S/ ${b.freeThreshold})` : ''}` : 'Sin delivery'}</span>
              </div>
              {b.coordinates?.lat && (
                <a href={`https://www.google.com/maps?q=${b.coordinates.lat},${b.coordinates.lng}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-cm-accent hover:underline">
                  <MapPin className="w-3.5 h-3.5" />Ver en Google Maps
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {branches.length === 0 && (
        <div className="text-center py-12 text-cm-muted border border-dashed border-cm-border rounded-xl">
          <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No hay sucursales</p>
          <p className="text-xs mt-1">Crea tu primera sucursal</p>
        </div>
      )}

      {/* Clone Catalog Modal */}
      <AnimatePresence>
        {showCloneModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowCloneModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-cm-surface rounded-xl shadow-cm-lg p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-cm-text mb-2">Clonar catalogo</h3>
              <p className="text-xs text-cm-text-secondary mb-4">Copia los productos de una sucursal a otra. Los productos del destino seran <strong>reemplazados</strong>.</p>

              {cloneResult && (
                <div className={`p-3 rounded-lg text-sm font-semibold mb-4 ${cloneResult.success ? 'bg-cm-success/10 text-cm-success' : 'bg-cm-error/10 text-cm-error'}`}>
                  {cloneResult.success ? `Catalogo clonado (${cloneResult.itemCount} productos)` : `Error: ${cloneResult.error}`}
                  <button onClick={() => setCloneResult(null)} className="ml-2 text-xs underline">Cerrar</button>
                </div>
              )}

              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Origen</label>
                  <select value={cloneSource} onChange={e => setCloneSource(e.target.value)} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent">
                    <option value="">Seleccionar</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Destino</label>
                  <select value={cloneTarget} onChange={e => setCloneTarget(e.target.value)} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent">
                    <option value="">Seleccionar</option>
                    {branches.filter(b => b.id !== cloneSource).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowCloneModal(false)} className="flex-1 py-2 border border-cm-border text-sm font-semibold text-cm-text rounded-lg hover:bg-cm-surface-hover transition-colors">Cancelar</button>
                <button onClick={handleCloneCatalog} disabled={!cloneSource || !cloneTarget || cloneLoading}
                  className="flex-1 py-2 bg-cm-accent text-white text-sm font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {cloneLoading ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Clonando...</> : <><Copy className="w-4 h-4 inline mr-1" /> Clonar</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBranchModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowBranchModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-cm-surface rounded-xl shadow-cm-lg p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-cm-text mb-4">{editingBranch ? 'Editar sucursal' : 'Nueva sucursal'}</h3>
              <form onSubmit={handleBranchSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Nombre</label>
                  <input type="text" required value={branchForm.name} onChange={e => setBranchForm({ ...branchForm, name: e.target.value })} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Direccion</label>
                  <input type="text" value={branchForm.address} onChange={e => setBranchForm({ ...branchForm, address: e.target.value })} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Provincia</label>
                    <input type="text" value={branchForm.province || ''} onChange={e => setBranchForm({ ...branchForm, province: e.target.value })} placeholder="Lima" className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Distrito</label>
                    <input type="text" value={branchForm.district || ''} onChange={e => setBranchForm({ ...branchForm, district: e.target.value })} placeholder="Miraflores" className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Telefono</label>
                    <input type="text" value={branchForm.phone} onChange={e => setBranchForm({ ...branchForm, phone: e.target.value })} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">WhatsApp</label>
                    <input type="text" value={branchForm.whatsappNumber} onChange={e => setBranchForm({ ...branchForm, whatsappNumber: e.target.value })} placeholder="+51999000000" className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Email</label>
                    <input type="email" value={branchForm.email || ''} onChange={e => setBranchForm({ ...branchForm, email: e.target.value })} placeholder="contacto@restaurant.com" className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Persona contacto</label>
                    <input type="text" value={branchForm.contactPerson || ''} onChange={e => setBranchForm({ ...branchForm, contactPerson: e.target.value })} placeholder="Juan Pérez" className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                  </div>
                </div>
                <div className="border-t border-cm-border pt-4">
                  <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-3">Horario por días</p>
                  {['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(day => {
                    const labels = { monday: 'Lun', tuesday: 'Mar', wednesday: 'Mié', thursday: 'Jue', friday: 'Vie', saturday: 'Sáb', sunday: 'Dom' };
                    const s = (branchForm.scheduleByDay && branchForm.scheduleByDay[day]) || { enabled: false, open: '09:00', close: '18:00' };
                    return (
                      <div key={day} className="flex items-center gap-2 mb-2">
                        <button type="button" onClick={() => setBranchForm(prev => ({...prev, scheduleByDay: {...prev.scheduleByDay, [day]: {...s, enabled: !s.enabled}}}))} className={`w-8 h-8 rounded-lg border text-xs font-bold transition-colors ${s.enabled ? 'bg-cm-accent text-white border-cm-accent' : 'bg-cm-bg text-cm-muted border-cm-border'}`}>{labels[day]}</button>
                        <input type="time" value={s.open || '09:00'} disabled={!s.enabled} onChange={e => setBranchForm(prev => ({...prev, scheduleByDay: {...prev.scheduleByDay, [day]: {...s, open: e.target.value}}}))} className="w-16 px-1 py-1 border border-cm-border rounded text-xs font-semibold text-cm-text focus:outline-none focus:border-cm-accent disabled:opacity-30" />
                        <span className="text-xs text-cm-muted">a</span>
                        <input type="time" value={s.close || '18:00'} disabled={!s.enabled} onChange={e => setBranchForm(prev => ({...prev, scheduleByDay: {...prev.scheduleByDay, [day]: {...s, close: e.target.value}}}))} className="w-16 px-1 py-1 border border-cm-border rounded text-xs font-semibold text-cm-text focus:outline-none focus:border-cm-accent disabled:opacity-30" />
                      </div>
                    );
                  })}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Website</label>
                  <input type="url" value={branchForm.website || ''} onChange={e => setBranchForm({ ...branchForm, website: e.target.value })} placeholder="https://tudominio.com" className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Latitud</label>
                    <input type="text" value={branchForm.lat} onChange={e => setBranchForm({ ...branchForm, lat: e.target.value })} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Longitud</label>
                    <input type="text" value={branchForm.lng} onChange={e => setBranchForm({ ...branchForm, lng: e.target.value })} className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                  </div>
                  <div className="col-span-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition(
                            (position) => {
                              setBranchForm(prev => ({
                                ...prev,
                                lat: String(position.coords.latitude),
                                lng: String(position.coords.longitude)
                              }));
                            },
                            (error) => {
                              alert('No se pudo obtener la ubicación: ' + error.message);
                            }
                          );
                        } else {
                          alert('Tu navegador no soporta geolocalización');
                        }
                      }}
                      className="w-full py-2 border-2 border-dashed border-cm-border rounded-lg text-xs font-semibold text-cm-text-secondary hover:text-cm-accent hover:border-cm-accent transition-colors flex items-center justify-center gap-1.5"
                    >
                      <MapPin className="w-3.5 h-3.5" /> Obtener ubicación GPS
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Cant. Mesas</label>
                    <input type="number" min="0" value={branchForm.tableCount} onChange={e => setBranchForm({ ...branchForm, tableCount: e.target.value })}
                      className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Delivery habilitado</label>
                    <button type="button" onClick={() => setBranchForm({ ...branchForm, deliveryEnabled: !branchForm.deliveryEnabled })}
                      className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors border ${branchForm.deliveryEnabled ? 'bg-cm-success/10 border-cm-success text-cm-success' : 'bg-cm-bg-alt border-cm-border text-cm-text-tertiary'}`}>
                      {branchForm.deliveryEnabled ? 'SÍ' : 'NO'}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Costo delivery (S/)</label>
                    <input type="number" step="0.5" min="0" value={branchForm.deliveryFee} onChange={e => setBranchForm({ ...branchForm, deliveryFee: e.target.value })}
                      className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Delivery gratis desde (S/)</label>
                    <input type="number" step="5" min="0" value={branchForm.freeThreshold} onChange={e => setBranchForm({ ...branchForm, freeThreshold: e.target.value })}
                      className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" placeholder="0 = sin mín" />
                  </div>
                </div>
                <div className="border-t border-cm-border pt-4">
                  <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5" /> Info Adicional
                  </p>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Instagram</label>
                      <input type="text" value={branchForm.instagram || ''} onChange={e => setBranchForm({ ...branchForm, instagram: e.target.value })} placeholder="@tuusuario" className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Facebook</label>
                      <input type="text" value={branchForm.facebook || ''} onChange={e => setBranchForm({ ...branchForm, facebook: e.target.value })} placeholder="tu-pagina" className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">TikTok</label>
                      <input type="text" value={branchForm.tiktok || ''} onChange={e => setBranchForm({ ...branchForm, tiktok: e.target.value })} placeholder="@tuusuario" className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Radio delivery (km)</label>
                      <input type="number" step="0.5" min="0" value={branchForm.deliveryRadius || ''} onChange={e => setBranchForm({ ...branchForm, deliveryRadius: e.target.value })} placeholder="Ej: 5" className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                    </div>
                  </div>
                  {/* Foto de fachada */}
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Foto fachada</label>
                    <div className="flex items-start gap-4">
                      <div className="w-24 h-24 bg-cm-bg-alt rounded-xl border border-cm-border overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                        {branchForm.photoUrl ? (
                          <img src={branchForm.photoUrl} alt="Fachada" className="w-full h-full object-cover" />
                        ) : (
                          <Image className="w-8 h-8 text-cm-text-tertiary/40" />
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <input ref={null} type="file" accept="image/*" className="hidden" />
                        <button type="button" onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (!editingBranch) { alert('Guarda la sucursal primero'); return; }
                            try {
                              const result = await storageService.uploadBranchPhoto(editingBranch.id, file);
                              setBranchForm(prev => ({ ...prev, photoUrl: result.url }));
                            } catch (err) {
                              alert('Error al subir foto: ' + err.message);
                            }
                          };
                          input.click();
                        }} className="flex items-center gap-2 px-4 py-2 bg-cm-accent text-white text-xs font-bold rounded-lg hover:bg-cm-accent-hover transition-colors">
                          <Upload className="w-3.5 h-3.5" /> Subir fachada
                        </button>
                        {branchForm.photoUrl && (
                          <button type="button" onClick={() => setBranchForm(prev => ({ ...prev, photoUrl: '' }))} className="flex items-center gap-1.5 text-cm-error text-[10px] font-bold hover:underline">
                            <Trash2 className="w-3 h-3" /> Eliminar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Casa Matriz toggle */}
                  <div className="flex items-center justify-between bg-cm-bg-alt rounded-xl p-3 border border-cm-border">
                    <div>
                      <p className="text-sm font-bold text-cm-text">Casa Matriz</p>
                      <p className="text-[10px] text-cm-text-secondary">Principal sucursal del restaurante</p>
                    </div>
                    <button type="button" onClick={() => setBranchForm({ ...branchForm, isHeadquarters: !branchForm.isHeadquarters })}
                      className={`w-12 h-7 rounded-full transition-colors relative ${branchForm.isHeadquarters ? 'bg-cm-success' : 'bg-cm-border'}`}>
                      <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${branchForm.isHeadquarters ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                </div>
                <div className="border-t border-cm-border pt-4">
                  <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-3">Descartables</p>
                  <div className="space-y-2">
                    {branchForm.packagingItems?.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-cm-bg-alt rounded-lg p-2 border border-cm-border">
                        <span className="text-lg shrink-0">{item.icon || '📦'}</span>
                        <input value={item.name || ''} onChange={e => {
                          const next = [...branchForm.packagingItems];
                          next[idx] = { ...next[idx], name: e.target.value };
                          setBranchForm({ ...branchForm, packagingItems: next });
                        }} placeholder="Nombre" className="flex-1 px-2 py-1 rounded-lg border border-cm-border bg-cm-surface text-xs font-semibold text-cm-text focus:outline-none focus:border-cm-accent" />
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] font-semibold text-cm-text-tertiary">S/</span>
                          <input type="number" step="0.5" min="0" value={item.price ?? 0} onChange={e => {
                            const next = [...branchForm.packagingItems];
                            next[idx] = { ...next[idx], price: parseFloat(e.target.value) || 0 };
                            setBranchForm({ ...branchForm, packagingItems: next });
                          }} className="w-16 px-2 py-1 rounded-lg border border-cm-border bg-cm-surface text-xs font-semibold text-cm-accent text-right focus:outline-none focus:border-cm-accent" />
                        </div>
                        <input value={item.icon || ''} onChange={e => {
                          const next = [...branchForm.packagingItems];
                          next[idx] = { ...next[idx], icon: e.target.value };
                          setBranchForm({ ...branchForm, packagingItems: next });
                        }} placeholder="🍾" className="w-10 text-center px-1 py-1 rounded-lg border border-cm-border bg-cm-surface text-xs font-semibold text-cm-text focus:outline-none focus:border-cm-accent" />
                        <button onClick={() => setBranchForm({ ...branchForm, packagingItems: branchForm.packagingItems.filter((_, i) => i !== idx) })}
                          className="p-1 text-cm-text-tertiary hover:text-cm-error hover:bg-cm-error/10 rounded-lg transition-colors shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => setBranchForm({ ...branchForm, packagingItems: [...(branchForm.packagingItems || []), { id: 'item_' + Date.now(), name: '', icon: '📦', price: 0 }] })}
                      className="w-full py-2 border-2 border-dashed border-cm-border rounded-lg text-xs font-semibold text-cm-text-tertiary hover:text-cm-accent hover:border-cm-accent transition-colors flex items-center justify-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" /> Agregar descartable
                    </button>
                  </div>
                </div>
                {/* ─── Yape / Plin Configuration ─── */}
                <div className="border-t border-cm-border pt-4">
                  <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5" /> Yape / Plin
                  </p>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Yape — Teléfono</label>
                      <input type="text" value={branchForm.yapePhone} onChange={e => setBranchForm({ ...branchForm, yapePhone: e.target.value })}
                        placeholder="999 888 777"
                        className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Yape — Titular</label>
                      <input type="text" value={branchForm.yapeName} onChange={e => setBranchForm({ ...branchForm, yapeName: e.target.value })}
                        placeholder="Nombre del titular"
                        className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Plin — Teléfono</label>
                      <input type="text" value={branchForm.plinNumber} onChange={e => setBranchForm({ ...branchForm, plinNumber: e.target.value })}
                        placeholder="999 888 777"
                        className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-cm-text-secondary mb-1 uppercase tracking-wider">Plin — Titular</label>
                      <input type="text" value={branchForm.plinName} onChange={e => setBranchForm({ ...branchForm, plinName: e.target.value })}
                        placeholder="Nombre del titular"
                        className="w-full px-3 py-2 border border-cm-border rounded-lg text-sm font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
                    </div>
                  </div>
                  {/* QR Image Upload */}
                  <div>
                    <label className="block text-xs font-semibold text-cm-text-secondary mb-2 uppercase tracking-wider">Código QR de Yape</label>
                    <div className="flex items-start gap-4">
                      <div className="w-32 h-32 bg-white rounded-xl border border-cm-border overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                        {yapeQrPreview ? (
                          <img src={yapeQrPreview} alt="QR Yape" className="w-full h-full object-contain" />
                        ) : (
                          <QrCode className="w-10 h-10 text-cm-text-tertiary/40" />
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <input ref={yapeQrInputRef} type="file" accept="image/*" onChange={handleYapeQrUpload} className="hidden" />
                        <button type="button" onClick={() => yapeQrInputRef.current?.click()} disabled={uploadingYapeQr || !editingBranch}
                          className="flex items-center gap-2 px-4 py-2 bg-cm-accent text-white text-xs font-bold rounded-lg hover:bg-cm-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                          {uploadingYapeQr ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                          {uploadingYapeQr ? 'Subiendo...' : (yapeQrPreview ? 'Cambiar QR' : 'Subir QR')}
                        </button>
                        {!editingBranch && <p className="text-[10px] text-cm-warning font-semibold">Guarda la sucursal primero</p>}
                        {yapeQrPreview && (
                          <button type="button" onClick={() => { setBranchForm(prev => ({ ...prev, yapeQrUrl: '' })); setYapeQrPreview(null); }}
                            className="flex items-center gap-1.5 text-cm-error text-[10px] font-bold hover:underline">
                            <Trash2 className="w-3 h-3" /> Eliminar QR
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-cm-border pt-4">
                  <p className="text-xs font-semibold text-cm-text-secondary uppercase tracking-wider mb-3">Mesas</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tablesConfig.sort((a, b) => a - b).map(num => (
                      <div key={num} className="flex items-center gap-1 bg-cm-accent/10 border border-cm-accent/30 rounded-lg px-2.5 py-1.5">
                        <Hash className="w-3 h-3 text-cm-accent" />
                        <span className="text-xs font-bold text-cm-text">{num}</span>
                        <button onClick={() => removeTable(num)} className="p-0.5 text-cm-text-tertiary hover:text-cm-error rounded">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={addTable}
                    className="text-xs font-bold text-cm-accent hover:text-cm-accent-hover flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Agregar mesa
                  </button>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowBranchModal(false)} className="flex-1 py-2 border border-cm-border text-sm font-semibold text-cm-text rounded-lg hover:bg-cm-surface-hover transition-colors">Cancelar</button>
                  <button type="submit" className="flex-1 py-2 bg-cm-accent text-white text-sm font-semibold rounded-lg hover:bg-cm-accent-hover transition-colors">{editingBranch ? 'Guardar cambios' : 'Crear sucursal'}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR de Mesas Modal */}
      <TableQRModal
        isOpen={!!qrModalBranch}
        onClose={() => setQrModalBranch(null)}
        branchId={qrModalBranch?.id}
        branchName={qrModalBranch?.name}
        tableCount={qrModalBranch?.tableCount || 0}
      />
    </div>
  );
}
