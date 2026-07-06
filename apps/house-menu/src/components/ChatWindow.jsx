import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, X, ChefHat, Truck, User } from 'lucide-react';
import { sendMessage, subscribeMessages, markMessageRead } from '../lib/chatService';
import { useBranch } from '../context/BranchContext';
import { useAuth } from '../context/AuthContext';
import { CHAT_CHANNELS, getChatChannelsForRole } from '../lib/paths';

const ROLE_META = {
  kitchen: { icon: <ChefHat className="w-4 h-4" />, label: 'Cocina', color: 'border-l-cm-accent bg-cm-accent/5' },
  dispatch: { icon: <Truck className="w-4 h-4" />, label: 'Despacho', color: 'border-l-blue-500 bg-blue-500/5' },
  admin: { icon: <User className="w-4 h-4" />, label: 'Admin', color: 'border-l-purple-500 bg-purple-500/5' },
  mozo: { icon: <User className="w-4 h-4" />, label: 'Mozo', color: 'border-l-teal-500 bg-teal-500/5' },
  delivery: { icon: <Truck className="w-4 h-4" />, label: 'Delivery', color: 'border-l-cyan-500 bg-cyan-500/5' },
  vendedor: { icon: <User className="w-4 h-4" />, label: 'Ventas', color: 'border-l-amber-500 bg-amber-500/5' },
  cajero: { icon: <User className="w-4 h-4" />, label: 'Caja', color: 'border-l-green-500 bg-green-500/5' },
  superadmin: { icon: <User className="w-4 h-4" />, label: 'Super Admin', color: 'border-l-cm-accent bg-cm-accent/5' },
};

const CHANNEL_LABELS = {
  [CHAT_CHANNELS.GENERAL]: { label: 'General', short: 'Gral' },
  [CHAT_CHANNELS.KITCHEN_DISPATCH]: { label: 'Cocina ↔ Despacho', short: 'Coc/Des' },
};

export default function ChatWindow({ sender: propSender, senderName: propSenderName, title: propTitle }) {
  const { activeBranchId } = useBranch();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Resolve sender from auth session, fallback to props
  const sessionRole = user?.role || propSender;
  const sessionName = user?.name || propSenderName || sessionRole;
  const availableChannels = getChatChannelsForRole(sessionRole);
  const [activeChannel, setActiveChannel] = useState(availableChannels[0] || CHAT_CHANNELS.GENERAL);

  // Subscribe to messages — always active, updates messages in real-time
  useEffect(() => {
    if (!activeBranchId || !activeChannel) return;
    const unsub = subscribeMessages(activeBranchId, activeChannel, (msgs) => {
      setMessages(msgs);
    });
    return unsub;
  }, [activeBranchId, activeChannel]);

  // Track unread messages when chat is closed
  const prevCountRef = useRef(0);
  useEffect(() => {
    if (open) { setUnread(0); return; }
    const unreadCount = messages.filter((m) => !m.readBy?.[sessionRole] && m.sender !== sessionRole).length;
    if (unreadCount > prevCountRef.current) {
      setUnread((u) => u + (unreadCount - prevCountRef.current));
    }
    prevCountRef.current = unreadCount;
  }, [messages, open, sessionRole]);

  // Reset unread tracking when switching channels or branches
  useEffect(() => {
    prevCountRef.current = 0;
  }, [activeBranchId, activeChannel]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (open && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
      setUnread(0);
    }
  }, [messages, open]);

  // Mark messages as read
  useEffect(() => {
    if (open && activeBranchId && activeChannel) {
      messages.forEach((m) => {
        if (!m.readBy?.[sessionRole] && m.sender !== sessionRole) {
          markMessageRead(activeBranchId, activeChannel, m.id, sessionRole);
        }
      });
    }
  }, [messages, open, activeBranchId, activeChannel, sessionRole]);

  const handleSend = useCallback(async (e) => {
    e.preventDefault();
    if (!input.trim() || !activeBranchId) return;
    await sendMessage(activeBranchId, activeChannel, {
      text: input.trim(),
      sender: sessionRole,
      senderName: sessionName,
    });
    setInput('');
    inputRef.current?.focus();
  }, [input, activeBranchId, activeChannel, sessionRole, sessionName]);

  const activeRoleMeta = ROLE_META[sessionRole] || ROLE_META.admin;
  const channelLabel = CHANNEL_LABELS[activeChannel] || { label: activeChannel, short: activeChannel };

  return (
    <>
      {/* FAB */}
      <motion.button
        onClick={() => setOpen(!open)}
        className="fixed bottom-20 right-6 z-50 p-3 rounded-full bg-cm-accent text-white shadow-lg"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label={open ? 'Cerrar chat' : 'Abrir chat'}
      >
        <MessageSquare size={20} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-cm-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </motion.button>

      {/* Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-36 right-6 z-50 w-80 sm:w-96 h-[32rem] bg-cm-surface rounded-2xl shadow-2xl border border-cm-border flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-cm-accent text-white shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} />
                <span className="text-sm font-bold truncate">{propTitle || channelLabel.label}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/20">
                  {sessionName}
                </span>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Cerrar" className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Channel tabs */}
            {availableChannels.length > 1 && (
              <div className="flex gap-1 px-3 pt-2 pb-1.5 bg-cm-surface border-b border-cm-border shrink-0">
                {availableChannels.map((ch) => {
                  const chMeta = CHANNEL_LABELS[ch] || { label: ch, short: ch };
                  return (
                    <button
                      key={ch}
                      onClick={() => setActiveChannel(ch)}
                      className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all ${
                        activeChannel === ch
                          ? 'bg-cm-accent text-white shadow-sm'
                          : 'bg-cm-bg-alt text-cm-text-secondary hover:bg-cm-bg'
                      }`}
                    >
                      {chMeta.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <MessageSquare className="w-10 h-10 text-cm-muted/30 mb-3" />
                  <p className="text-xs text-cm-muted">Sin mensajes aún</p>
                  <p className="text-[10px] text-cm-muted/60 mt-0.5">Escribí el primer mensaje</p>
                </div>
              )}
              {messages.map((m) => {
                const meta = ROLE_META[m.sender] || ROLE_META.admin;
                const isMine = m.sender === sessionRole;
                return (
                  <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] px-3 py-2 rounded-xl text-sm border-l-4 ${
                        isMine
                          ? 'bg-cm-accent/10 border-l-cm-accent'
                          : meta.color
                      }`}
                    >
                      {!isMine && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-cm-muted mb-0.5 uppercase tracking-wider">
                          {meta.icon}
                          {m.senderName || meta.label}
                        </div>
                      )}
                      <p className="text-sm text-cm-text leading-relaxed">{m.text}</p>
                      <p className="text-[10px] text-cm-muted mt-0.5 text-right">
                        {m.timestamp
                          ? new Date(m.timestamp).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
                          : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="flex items-center gap-2 p-3 border-t border-cm-border shrink-0">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Mensaje en ${channelLabel.label}...`}
                className="flex-1 bg-cm-bg-alt rounded-xl px-3 py-2.5 text-sm outline-none text-cm-text placeholder:text-cm-muted/50"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2.5 rounded-xl bg-cm-accent text-white disabled:opacity-30 hover:bg-cm-accent-hover transition-colors"
              >
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
