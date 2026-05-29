import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, X, User, ChefHat, Truck } from 'lucide-react';
import { sendMessage, subscribeMessages, markMessageRead } from '../lib/chatService';
import { useBranch } from '../context/BranchContext';

const AVATARS = {
  kitchen: <ChefHat className="w-4 h-4" />,
  dispatch: <Truck className="w-4 h-4" />,
  admin: <User className="w-4 h-4" />,
};

const COLORS = {
  kitchen: 'border-l-cm-accent bg-cm-accent/5',
  dispatch: 'border-l-blue-500 bg-blue-500/5',
  admin: 'border-l-cm-accent bg-cm-accent/5',
};

export default function ChatWindow({ sender, senderName, title = 'Chat' }) {
  const { activeBranchId } = useBranch();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!activeBranchId) return;
    const unsub = subscribeMessages(activeBranchId, (msgs) => {
      setMessages((prev) => {
        if (msgs.length > prev.length && open) {
          const newUnread = msgs.filter((m) => !m.readBy?.[sender] && m.sender !== sender).length;
          setUnread((u) => u + newUnread);
        }
        return msgs;
      });
    });
    return unsub;
  }, [activeBranchId, sender, open]);

  useEffect(() => {
    if (open && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
      setUnread(0);
    }
  }, [messages, open]);

  useEffect(() => {
    if (open) {
      messages.forEach((m) => {
        if (!m.readBy?.[sender] && m.sender !== sender) {
          markMessageRead(activeBranchId, m.id, sender);
        }
      });
    }
  }, [messages, open, activeBranchId, sender]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !activeBranchId) return;
    await sendMessage(activeBranchId, { text: input.trim(), sender, senderName });
    setInput('');
    inputRef.current?.focus();
  };

  return (
    <>
      {/* FAB */}
      <motion.button
        onClick={() => setOpen(!open)}
        className="fixed bottom-20 right-6 z-50 p-3 rounded-full bg-cm-accent text-white shadow-lg"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label={open ? 'Cerrar chat' : 'Abrir chat'}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!open); } }}
      >
        <MessageSquare size={20} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-cm-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread}
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
            className="fixed bottom-36 right-6 z-50 w-80 sm:w-96 h-96 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-cm-accent text-white">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} />
                <span className="text-sm font-bold">{title}</span>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Cerrar" tabIndex={0}>
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.length === 0 && (
                <p className="text-xs text-center text-gray-400 mt-10">Sin mensajes aún. ¡Sé el primero!</p>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.sender === sender ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-xl text-sm border-l-4 ${
                      m.sender === sender
                        ? 'bg-cm-accent/10 border-l-cm-accent text-right'
                        : COLORS[m.sender] || 'bg-white/5 border-l-gray-400'
                    }`}
                  >
                    {m.sender !== sender && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-cm-muted mb-0.5 uppercase tracking-wider">
                        {AVATARS[m.sender] || <User className="w-3 h-3" />}
                        {m.senderName}
                      </div>
                    )}
                    <p className="text-sm text-cm-text">{m.text}</p>
                    <p className="text-[10px] text-cm-muted mt-0.5">
                      {new Date(m.timestamp).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="flex items-center gap-2 p-3 border-t border-gray-200 dark:border-gray-700">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2 text-sm outline-none text-cm-text"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2 rounded-xl bg-cm-accent text-white disabled:opacity-30"
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
