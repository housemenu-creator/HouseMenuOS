import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Clock, Instagram, Facebook, MessageCircle, CheckCircle2, XCircle, Loader2, X, Sparkles, Image } from 'lucide-react';

export default function PublishModal({ isOpen, onClose, content, onPublish, onSchedule, publishing }) {
  const [step, setStep] = useState('review');
  const [platforms, setPlatforms] = useState({ instagram: true, facebook: false, whatsapp: false });
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [result, setResult] = useState(null);

  if (!isOpen) return null;

  const handlePublish = async () => {
    const selected = Object.entries(platforms).filter(([, v]) => v).map(([k]) => k);
    if (selected.length === 0) return;
    try {
      const res = await onPublish({ platforms: selected, ...content });
      setResult({ success: true, data: res });
      setStep('done');
    } catch (err) {
      setResult({ success: false, error: err.message });
      setStep('done');
    }
  };

  const handleSchedule = async () => {
    if (!scheduleDate || !scheduleTime) return;
    const selected = Object.entries(platforms).filter(([, v]) => v).map(([k]) => k);
    try {
      await onSchedule({ platforms: selected, scheduledAt: `${scheduleDate}T${scheduleTime}`, ...content });
      setResult({ success: true, scheduled: true });
      setStep('done');
    } catch (err) {
      setResult({ success: false, error: err.message });
      setStep('done');
    }
  };

  const reset = () => { setStep('review'); setScheduleMode(false); setResult(null); };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { onClose(); reset(); } }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-lg bg-cm-surface border border-cm-border rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-cm-border">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-cm-accent" />
                <h2 className="text-sm font-black text-cm-text tracking-tight">
                  {scheduleMode ? 'Programar publicación' : 'Publicar en redes'}
                </h2>
              </div>
              <button onClick={() => { onClose(); reset(); }} className="p-1 rounded-lg hover:bg-cm-bg transition-colors">
                <X className="w-4 h-4 text-cm-text-secondary" />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {step === 'review' && (
                <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-5 space-y-4">
                  {/* Content preview */}
                  <div className="bg-cm-bg rounded-xl p-4 border border-cm-border space-y-2">
                    <div className="flex items-center gap-2 text-[0.6rem] font-bold uppercase tracking-wider text-cm-text-secondary">
                      <Sparkles className="w-3 h-3" /> Vista previa
                    </div>
                    {content?.imageUrl ? (
                      <img src={content.imageUrl} alt="" className="w-full h-40 object-cover rounded-lg" />
                    ) : (
                      <div className="w-full h-32 rounded-lg bg-cm-accent/5 flex items-center justify-center border border-dashed border-cm-border">
                        <Image className="w-8 h-8 text-cm-text-tertiary/30" />
                      </div>
                    )}
                    <p className="text-sm font-semibold text-cm-text">{content?.title || 'Sin título'}</p>
                    <p className="text-xs text-cm-text-secondary">{content?.description || content?.subtitle || ''}</p>
                    {content?.ctaText && (
                      <span className="inline-block px-3 py-1 rounded-full bg-cm-accent/10 text-cm-accent text-[0.55rem] font-bold">
                        {content.ctaText}
                      </span>
                    )}
                  </div>

                  {/* Platform selector */}
                  <div>
                    <p className="text-[0.6rem] font-bold uppercase tracking-wider text-cm-text-secondary mb-2">Publicar en</p>
                    <div className="flex gap-2">
                      {[
                        { key: 'instagram', label: 'Instagram', Icon: Instagram, color: 'from-pink-500 to-orange-400' },
                        { key: 'facebook', label: 'Facebook', Icon: Facebook, color: 'from-blue-600 to-blue-700' },
                        { key: 'whatsapp', label: 'WhatsApp', Icon: MessageCircle, color: 'from-green-500 to-green-600' },
                      ].map((p) => (
                        <button
                          key={p.key}
                          onClick={() => setPlatforms((prev) => ({ ...prev, [p.key]: !prev[p.key] }))}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                            platforms[p.key]
                              ? `bg-gradient-to-br ${p.color} text-white shadow-lg`
                              : 'bg-cm-bg text-cm-text-secondary border border-cm-border'
                          }`}
                        >
                          <p.Icon className="w-4 h-4" />
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Schedule toggle */}
                  <button
                    onClick={() => setScheduleMode(!scheduleMode)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      scheduleMode ? 'bg-cm-accent/10 text-cm-accent' : 'bg-cm-bg text-cm-text-secondary border border-cm-border'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    {scheduleMode ? 'Programar para después' : 'Publicar ahora'}
                  </button>

                  {/* Schedule fields */}
                  {scheduleMode && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[0.55rem] font-bold uppercase tracking-wider text-cm-text-secondary mb-1">Fecha</label>
                        <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)}
                          className="w-full px-3 py-2 bg-cm-bg border border-cm-border rounded-lg text-xs font-semibold text-cm-text focus:outline-none focus:border-cm-accent" />
                      </div>
                      <div>
                        <label className="block text-[0.55rem] font-bold uppercase tracking-wider text-cm-text-secondary mb-1">Hora</label>
                        <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)}
                          className="w-full px-3 py-2 bg-cm-bg border border-cm-border rounded-lg text-xs font-semibold text-cm-text focus:outline-none focus:border-cm-accent" />
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {step === 'publishing' && (
                <motion.div key="publishing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-10 text-center space-y-4">
                  <Loader2 className="w-10 h-10 animate-spin text-cm-accent mx-auto" />
                  <p className="text-sm font-bold text-cm-text">Publicando...</p>
                  <p className="text-xs text-cm-text-secondary">Esto puede tomar unos segundos</p>
                </motion.div>
              )}

              {step === 'done' && (
                <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="p-10 text-center space-y-4">
                  {result?.success ? (
                    <>
                      <div className="w-16 h-16 rounded-full bg-cm-success/10 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-8 h-8 text-cm-success" />
                      </div>
                      <p className="text-sm font-black text-cm-text">
                        {result.scheduled ? '✅ Programado' : '✅ Publicado'}
                      </p>
                      <p className="text-xs text-cm-text-secondary">
                        {result.scheduled ? 'Se publicará automáticamente en la fecha seleccionada.' : 'Tu contenido ya está en las redes seleccionadas.'}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-full bg-cm-error/10 flex items-center justify-center mx-auto">
                        <XCircle className="w-8 h-8 text-cm-error" />
                      </div>
                      <p className="text-sm font-black text-cm-text">Error al publicar</p>
                      <p className="text-xs text-cm-text-secondary">{result?.error || 'Ocurrió un error inesperado'}</p>
                      <button onClick={() => setStep('review')}
                        className="px-4 py-2 rounded-xl bg-cm-accent text-white text-xs font-bold">
                        Intentar de nuevo
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer */}
            {step === 'review' && (
              <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-cm-border bg-cm-bg/50">
                <button onClick={() => { onClose(); reset(); }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-cm-text-secondary hover:text-cm-text transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={scheduleMode ? handleSchedule : handlePublish}
                  disabled={publishing || !Object.values(platforms).some(Boolean)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cm-accent text-white font-black text-xs uppercase tracking-wider shadow-lg disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all"
                >
                  {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : scheduleMode ? <Clock className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                  {publishing ? 'Publicando...' : scheduleMode ? 'Programar' : 'Publicar ahora'}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
