import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, Image, Clock, Users, CheckCircle2, XCircle, Loader2, Phone, Smartphone } from 'lucide-react';

const PRESET_TEMPLATES = [
  { id: 'promo', label: 'Promoción', message: '¡Hola! 🎉 Tenemos una oferta especial para vos: ' },
  { id: 'order', label: 'Pedido listo', message: '¡Tu pedido ya está listo! Pasá a buscarlo por el local. 🙌' },
  { id: 'event', label: 'Evento', message: '¡No te pierdas este evento especial en nuestro local! 🎊 ' },
  { id: 'thanks', label: 'Agradecimiento', message: '¡Gracias por preferirnos! Fue un placer atenderte. 😊' },
];

const GROUPS = [
  { id: 'all', label: 'Todos los clientes', count: 154 },
  { id: 'recent', label: 'Clientes recientes (7d)', count: 23 },
  { id: 'vip', label: 'VIP', count: 12 },
  { id: 'inactive', label: 'Inactivos (>30d)', count: 67 },
];

export default function WhatsAppSender({ onSend, sending, messages = [], onDeleteMessage }) {
  const [template, setTemplate] = useState('');
  const [message, setMessage] = useState('');
  const [targetGroup, setTargetGroup] = useState('all');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  const handleSelectTemplate = (id) => {
    setTemplate(id);
    const t = PRESET_TEMPLATES.find((p) => p.id === id);
    if (t) setMessage(t.message);
  };

  const handleSend = () => {
    if (!message) return;
    onSend({
      message,
      targetGroup,
      phoneNumber: phoneNumber || undefined,
      scheduledAt: (scheduleDate && scheduleTime) ? `${scheduleDate}T${scheduleTime}` : undefined,
      type: targetGroup === 'all' && !phoneNumber ? 'broadcast' : 'targeted',
    });
  };

  return (
    <div className="space-y-5">
      {/* Templates */}
      <div>
        <label className="block text-[0.55rem] font-bold uppercase tracking-wider text-cm-text-secondary mb-1.5">
          Plantillas rápidas
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESET_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => handleSelectTemplate(t.id)}
              className={`px-3 py-1.5 rounded-lg text-[0.55rem] font-bold transition-all ${
                template === t.id
                  ? 'bg-cm-accent text-white shadow-lg'
                  : 'bg-cm-bg text-cm-text-secondary border border-cm-border hover:border-cm-accent/50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Message */}
      <div>
        <label className="block text-[0.55rem] font-bold uppercase tracking-wider text-cm-text-secondary mb-1">Mensaje</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="Escribí el mensaje para tus clientes..."
          className="w-full px-3 py-2 bg-cm-bg border border-cm-border rounded-lg text-xs font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors resize-none"
        />
        <p className="text-[0.5rem] text-cm-text-tertiary mt-1 text-right">{message.length} caracteres</p>
      </div>

      {/* Target */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-[0.55rem] font-bold uppercase tracking-wider text-cm-text-secondary mb-1">
            <Users className="w-3 h-3 inline mr-1" /> Segmento
          </label>
          <select value={targetGroup} onChange={(e) => setTargetGroup(e.target.value)}
            className="w-full px-3 py-2 bg-cm-bg border border-cm-border rounded-lg text-xs font-semibold text-cm-text focus:outline-none focus:border-cm-accent">
            {GROUPS.map((g) => (
              <option key={g.id} value={g.id}>{g.label} ({g.count})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[0.55rem] font-bold uppercase tracking-wider text-cm-text-secondary mb-1">
            <Phone className="w-3 h-3 inline mr-1" /> Teléfono específico <span className="text-cm-text-tertiary">(opcional)</span>
          </label>
          <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+51999123456"
            className="w-full px-3 py-2 bg-cm-bg border border-cm-border rounded-lg text-xs font-semibold text-cm-text focus:outline-none focus:border-cm-accent transition-colors" />
        </div>
      </div>

      {/* Schedule */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[0.55rem] font-bold uppercase tracking-wider text-cm-text-secondary mb-1">
            <Clock className="w-3 h-3 inline mr-1" /> Programar fecha
          </label>
          <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)}
            className="w-full px-3 py-2 bg-cm-bg border border-cm-border rounded-lg text-xs font-semibold text-cm-text focus:outline-none focus:border-cm-accent" />
        </div>
        <div>
          <label className="block text-[0.55rem] font-bold uppercase tracking-wider text-cm-text-secondary mb-1">Hora</label>
          <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)}
            className="w-full px-3 py-2 bg-cm-bg border border-cm-border rounded-lg text-xs font-semibold text-cm-text focus:outline-none focus:border-cm-accent" />
        </div>
      </div>

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={!message || sending}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white font-black text-xs uppercase tracking-wider shadow-lg disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all"
      >
        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {sending ? 'Enviando...' : scheduleDate ? 'Programar envío WhatsApp' : 'Enviar WhatsApp'}
      </button>

      {/* Sent messages */}
      {messages && messages.length > 0 && (
        <div className="mt-5">
          <h4 className="text-[0.55rem] font-bold uppercase tracking-wider text-cm-text-secondary mb-2">Mensajes enviados</h4>
          <div className="space-y-2">
            {messages.map((msg, i) => (
              <div key={msg.id || i} className="flex items-start gap-2 bg-cm-surface border border-cm-border rounded-lg px-3 py-2">
                {msg.status === 'sent' ? <CheckCircle2 className="w-3.5 h-3.5 text-cm-success mt-0.5" /> : <XCircle className="w-3.5 h-3.5 text-cm-error mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-cm-text truncate">{msg.message}</p>
                  <p className="text-[0.5rem] text-cm-text-tertiary">{msg.targetGroup} · {msg.sentAt ? new Date(msg.sentAt).toLocaleString('es-PE') : ''}</p>
                </div>
                <button onClick={() => onDeleteMessage?.(msg.id)}
                  className="text-cm-text-tertiary hover:text-cm-error transition-colors shrink-0">
                  <XCircle className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
