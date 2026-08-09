import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CalendarDays, Image, Instagram, Facebook, MessageCircle, Loader2, Sparkles } from 'lucide-react';

export default function SchedulePostModal({ isOpen, onClose, onSave, categories, saving }) {
  const [caption, setCaption] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [productName, setProductName] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    if (!caption || !scheduledDate || !scheduledTime) return;
    onSave({
      caption,
      platform,
      scheduledAt: `${scheduledDate}T${scheduledTime}`,
      mediaUrl,
      productName,
      type: 'manual',
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-md bg-cm-surface border border-cm-border rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-cm-border">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-cm-accent" />
                <h2 className="text-sm font-black text-cm-text">Programar publicación</h2>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-cm-bg transition-colors">
                <X className="w-4 h-4 text-cm-text-secondary" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Platform selector */}
              <div>
                <label className="block text-[0.55rem] font-bold uppercase tracking-wider text-cm-text-secondary mb-1.5">Plataforma</label>
                <div className="flex gap-2">
                  {[
                    { key: 'instagram', label: 'Instagram', Icon: Instagram, color: 'from-pink-500 to-orange-400' },
                    { key: 'facebook', label: 'Facebook', Icon: Facebook, color: 'from-blue-600 to-blue-700' },
                    { key: 'both', label: 'Ambas', Icon: MessageCircle, color: 'from-purple-500 to-purple-600' },
                  ].map((p) => (
                    <button
                      key={p.key}
                      onClick={() => setPlatform(p.key)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[0.6rem] font-bold transition-all ${
                        platform === p.key
                          ? `bg-gradient-to-br ${p.color} text-white shadow-lg`
                          : 'bg-cm-bg text-cm-text-secondary border border-cm-border'
                      }`}
                    >
                      <p.Icon className="w-3.5 h-3.5" />
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Caption */}
              <div>
                <label className="block text-[0.55rem] font-bold uppercase tracking-wider text-cm-text-secondary mb-1">Texto / Caption</label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={3}
                  placeholder="Escribí el texto de la publicación..."
                  className="w-full px-3 py-2 bg-cm-bg border border-cm-border rounded-lg text-xs font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors resize-none"
                />
              </div>

              {/* Product (optional) */}
              <div>
                <label className="block text-[0.55rem] font-bold uppercase tracking-wider text-cm-text-secondary mb-1">
                  Producto relacionado <span className="text-cm-text-tertiary">(opcional)</span>
                </label>
                <select
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-3 py-2 bg-cm-bg border border-cm-border rounded-lg text-xs font-semibold text-cm-text focus:outline-none focus:border-cm-accent"
                >
                  <option value="">Ninguno</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[0.55rem] font-bold uppercase tracking-wider text-cm-text-secondary mb-1">Fecha</label>
                  <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-3 py-2 bg-cm-bg border border-cm-border rounded-lg text-xs font-semibold text-cm-text focus:outline-none focus:border-cm-accent" />
                </div>
                <div>
                  <label className="block text-[0.55rem] font-bold uppercase tracking-wider text-cm-text-secondary mb-1">Hora</label>
                  <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-3 py-2 bg-cm-bg border border-cm-border rounded-lg text-xs font-semibold text-cm-text focus:outline-none focus:border-cm-accent" />
                </div>
              </div>

              {/* Media URL */}
              <div>
                <label className="block text-[0.55rem] font-bold uppercase tracking-wider text-cm-text-secondary mb-1">
                  <Image className="w-3 h-3 inline mr-1" /> URL de imagen <span className="text-cm-text-tertiary">(opcional)</span>
                </label>
                <input
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-cm-bg border border-cm-border rounded-lg text-xs font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-cm-border bg-cm-bg/50">
              <button onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-cm-text-secondary hover:text-cm-text transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!caption || !scheduledDate || !scheduledTime || saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cm-accent text-white font-black text-xs uppercase tracking-wider shadow-lg disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
                {saving ? 'Guardando...' : 'Programar'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
