/**
 * CommPanel — Main slide-out communication panel
 *
 * Features:
 * - Fixed position, slides in from right (bottom on mobile)
 * - Header with channel name + close button
 * - Overdue alert banner for URGENT messages
 * - MessageList component with auto-ack
 * - Input area at bottom (text + send + PTT)
 * - Quick templates
 * - Admin broadcast
 * - Dark mode with cm-* tokens
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { X, Send, Loader2, AlertTriangle, Bell, BellOff, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCommStore } from '../store/commStore';
import { useComm } from '../hooks/useComm';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ToastContext';
import { ChannelSelector } from './ChannelSelector';
import { MessageList } from './MessageList';
import { PTTButton } from './PTTButton';
import { TemplatePicker } from './TemplatePicker';
import { COMM_CHANNEL_CONFIG } from '../../lib/paths';

/** Priority selector */
function PrioritySelector({ priority, onChange }) {
  const priorities = [
    { value: 'INFO', label: '🟢', color: 'bg-cm-info' },
    { value: 'NORMAL', label: '🟡', color: 'bg-cm-warning' },
    { value: 'URGENT', label: '🔴', color: 'bg-cm-error' },
  ];

  return (
    <div className="flex items-center gap-1">
      {priorities.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={`
            w-7 h-7 rounded-full flex items-center justify-center transition-all duration-150
            ${priority === p.value
              ? `${p.color} ring-2 ring-offset-2 ring-offset-cm-surface ring-cm-accent`
              : 'bg-cm-surface hover:bg-cm-surface-hover opacity-50 hover:opacity-100'
            }
          `}
          title={p.value}
        >
          <span className="text-xs">{p.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Message input with voice features */
function MessageInput({ onSend, disabled = false }) {
  const [text, setText] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!text.trim() || isSending) return;
    setIsSending(true);
    try {
      await onSend(text, priority);
      setText('');
    } finally {
      setIsSending(false);
    }
  }, [text, priority, onSend, isSending]);

  return (
    <form onSubmit={handleSubmit} className="p-3 border-t border-cm-border bg-cm-surface">
      <div className="flex items-end gap-2">
        <div className="flex-1 flex flex-col gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribe un mensaje..."
            disabled={disabled || isSending}
            maxLength={500}
            className="
              w-full px-3 py-2 rounded-lg
              bg-cm-bg border border-cm-border
              text-cm-text placeholder-cm-text-tertiary
              focus:outline-none focus:ring-2 focus:ring-cm-accent focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed text-sm
            "
          />
          <div className="flex items-center justify-between">
            <PrioritySelector priority={priority} onChange={setPriority} />
            <span className="text-xs text-cm-text-tertiary">{text.length}/500</span>
          </div>
        </div>

        <PTTButton />

        <button
          type="submit"
          disabled={!text.trim() || isSending}
          className="
            flex-shrink-0 w-10 h-10 rounded-full
            bg-cm-accent hover:bg-cm-accent-hover
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center justify-center
            transition-all duration-150 active:scale-95
          "
        >
          {isSending ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <Send className="w-5 h-5 text-white" />
          )}
        </button>
      </div>
    </form>
  );
}

/** Overdue alert banner */
function OverdueAlertBanner({ overdueCount, onClick }) {
  if (overdueCount === 0) return null;
  return (
    <button
      onClick={onClick}
      className="
        w-full px-4 py-2 bg-cm-error/20 border-b border-cm-error/30
        flex items-center justify-center gap-2
        text-cm-error font-medium text-sm
        hover:bg-cm-error/30 transition-colors
      "
    >
      <AlertTriangle className="w-4 h-4" />
      <span>{overdueCount} mensaje{overdueCount > 1 ? 's' : ''} urgente{overdueCount > 1 ? 's' : ''} sin respuesta</span>
    </button>
  );
}

/** Main CommPanel */
export function CommPanel() {
  const { isPanelOpen, setPanelOpen, currentChannel, setCurrentChannel } = useCommStore();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { messages, sendMessage, setChannel, isLoading, overdueMessages, acknowledgeMessage, addReaction } = useComm();

  const [scrollToMessageId, setScrollToMessageId] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [dndMode, setDndMode] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastText, setBroadcastText] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const overdueMessageIds = useMemo(() => new Set(overdueMessages.map((m) => m.id)), [overdueMessages]);

  const handleOverdueBannerClick = useCallback(() => {
    if (overdueMessages.length > 0) {
      setScrollToMessageId(overdueMessages[0].id);
    }
  }, [overdueMessages]);

  useEffect(() => {
    if (scrollToMessageId) {
      const timer = setTimeout(() => setScrollToMessageId(null), 500);
      return () => clearTimeout(timer);
    }
  }, [scrollToMessageId]);

  const handleMessageVisible = useCallback(
    (messageId) => {
      const msg = messages.find((m) => m.id === messageId);
      if (!msg) return;
      if (msg.senderId === user?.id) return;
      if (Object.keys(msg.acknowledgedBy || {}).includes(user?.role)) return;
      if (msg.priority === 'URGENT' || msg.priority === 'NORMAL') {
        acknowledgeMessage(messageId);
      }
    },
    [messages, user, acknowledgeMessage]
  );

  // Set default channel on first open
  useEffect(() => {
    if (isPanelOpen && !currentChannel && user?.role) {
      const available = COMM_CHANNEL_CONFIG.filter((ch) => ch.roles.includes(user.role));
      setChannel(available[0]?.id || 'general');
    }
  }, [isPanelOpen, currentChannel, user?.role, setChannel]);

  const handleClose = useCallback(() => setPanelOpen(false), [setPanelOpen]);
  const handleSend = useCallback(async (text, priority) => sendMessage(text, priority), [sendMessage]);

  const handleTemplateSend = useCallback(
    async (template) => sendMessage(template.text, template.priority),
    [sendMessage]
  );

  const handleTemplateChannelSwitch = useCallback(
    (channelId) => setChannel(channelId),
    [setChannel]
  );

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const handleBroadcast = useCallback(async () => {
    if (!broadcastText.trim() || isBroadcasting) return;
    setIsBroadcasting(true);
    try {
      await sendMessage(`📢 ${broadcastText.trim()}`, 'INFO');
      showToast('Broadcast enviado', 'success');
      setBroadcastText('');
      setBroadcastOpen(false);
    } finally {
      setIsBroadcasting(false);
    }
  }, [broadcastText, isBroadcasting, sendMessage, showToast]);

  // Channel label for header
  const channelLabel = useMemo(() => {
    const cfg = COMM_CHANNEL_CONFIG.find((ch) => ch.id === currentChannel);
    return cfg?.label || '#general';
  }, [currentChannel]);

  return (
    <AnimatePresence>
      {isPanelOpen && (
        <>
          {/* Desktop backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="hidden md:block fixed inset-0 bg-black/30 z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="
              fixed md:top-4 md:right-4 md:bottom-4 md:w-96
              bottom-0 left-0 right-0 md:rounded-xl
              bg-cm-bg border-t md:border border-cm-border
              shadow-cm-lg z-50
              flex flex-col max-h-[85vh] md:max-h-[calc(100vh-2rem)]
            "
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-cm-border bg-cm-surface shrink-0">
              <div className="flex items-center gap-3">
                <h2 className="font-semibold text-cm-text">{channelLabel}</h2>
                {isLoading && <span className="text-xs text-cm-text-tertiary">Cargando...</span>}
              </div>
              <div className="flex items-center gap-2">
                {/* Templates */}
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150
                    ${showTemplates
                      ? 'bg-cm-accent text-white'
                      : 'text-cm-text-secondary hover:text-cm-text hover:bg-cm-surface-hover'
                    }
                  `}
                  title="Plantillas"
                >
                  <span className="text-sm">📝</span>
                </button>

                {/* DnD */}
                <button
                  onClick={() => setDndMode((v) => !v)}
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150
                    ${dndMode
                      ? 'bg-cm-warning/20 text-cm-warning'
                      : 'text-cm-text-secondary hover:text-cm-text hover:bg-cm-surface-hover'
                    }
                  `}
                  title={dndMode ? 'Quitar No molestar' : 'No molestar'}
                >
                  {dndMode ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                </button>

                {/* Admin broadcast */}
                {isAdmin && (
                  <button
                    onClick={() => setBroadcastOpen((v) => !v)}
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150
                      ${broadcastOpen
                        ? 'bg-cm-info/20 text-cm-info'
                        : 'text-cm-text-secondary hover:text-cm-text hover:bg-cm-surface-hover'
                      }
                    `}
                    title="Broadcast"
                  >
                    <Radio className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={handleClose}
                  className="
                    w-8 h-8 rounded-full flex items-center justify-center
                    text-cm-text-secondary hover:text-cm-text hover:bg-cm-surface-hover transition-all
                  "
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Channel tabs */}
            <ChannelSelector
              currentUserRole={user?.role}
              currentChannel={currentChannel}
              onChannelChange={setChannel}
            />

            {/* DnD indicator */}
            {dndMode && (
              <div className="mx-3 mb-1 px-3 py-1.5 rounded-lg bg-cm-warning/10 border border-cm-warning/20 flex items-center gap-2">
                <BellOff className="w-3 h-3 text-cm-warning" />
                <span className="text-[10px] font-semibold text-cm-warning">No molestar activo</span>
              </div>
            )}

            {/* Broadcast input */}
            <AnimatePresence>
              {broadcastOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mx-3 mb-1 overflow-hidden"
                >
                  <div className="px-3 py-2 rounded-lg bg-cm-info/10 border border-cm-info/20">
                    <p className="text-[10px] font-bold text-cm-info mb-1.5 flex items-center gap-1">
                      <Radio className="w-3 h-3" /> BROADCAST — llega a todos
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={broadcastText}
                        onChange={(e) => setBroadcastText(e.target.value.slice(0, 300))}
                        placeholder="Mensaje para todo el equipo..."
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-cm-bg border border-cm-border text-cm-text placeholder:text-cm-text-tertiary text-xs focus:outline-none focus:border-cm-info"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleBroadcast();
                          if (e.key === 'Escape') setBroadcastOpen(false);
                        }}
                      />
                      <button
                        onClick={handleBroadcast}
                        disabled={!broadcastText.trim() || isBroadcasting}
                        className="px-3 py-1.5 rounded-lg bg-cm-info text-white text-xs font-bold disabled:opacity-40 hover:bg-cm-info/90 transition-all flex items-center gap-1"
                      >
                        {isBroadcasting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Radio className="w-3 h-3" />}
                        Enviar
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Overdue banner */}
            <OverdueAlertBanner overdueCount={overdueMessages.length} onClick={handleOverdueBannerClick} />

            {/* Messages */}
            <MessageList
              messages={messages}
              isLoading={isLoading}
              currentUserId={user?.id}
              scrollToMessageId={scrollToMessageId}
              overdueMessageIds={overdueMessageIds}
              onMessageVisible={handleMessageVisible}
              onReactionClick={addReaction}
            />

            {/* Templates */}
            <AnimatePresence>
              {showTemplates && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <TemplatePicker
                    onSendTemplate={handleTemplateSend}
                    onSwitchChannel={handleTemplateChannelSwitch}
                    currentChannel={currentChannel}
                    showToast={showToast}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input */}
            <MessageInput onSend={handleSend} disabled={!currentChannel} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default CommPanel;
