/**
 * MessageBubble — Individual message display with priority, reactions, and ACK info
 *
 * Features:
 * - Sender name + role badge
 * - Timestamp
 * - Priority indicator (border-left color)
 * - Interactive reaction buttons (click to react)
 * - ACK info: "✓ Read by [role] at [time]" or "⚠️ NO RESPONSE"
 * - Voice note rendering with inline player
 * - Dark mode with cm-* tokens
 */
import { motion } from 'framer-motion';
import { Check, AlertTriangle } from 'lucide-react';
import { VoiceNotePlayer } from './VoiceNotePlayer';

/**
 * Available reaction emojis
 */
const REACTION_EMOJIS = ['👍', '👀', '✅', '❌'];

/**
 * Priority configuration
 */
const PRIORITY_CONFIG = {
  URGENT: {
    borderColor: 'border-l-cm-error',
    bgColor: 'bg-cm-error-soft',
    label: '🔴 URGENTE',
    badgeClass: 'bg-cm-error text-white',
  },
  NORMAL: {
    borderColor: 'border-l-cm-warning',
    bgColor: 'bg-cm-warning-soft',
    label: '🟡 NORMAL',
    badgeClass: 'bg-cm-warning text-black',
  },
  INFO: {
    borderColor: 'border-l-cm-info',
    bgColor: 'bg-cm-info-soft',
    label: '🔵 INFO',
    badgeClass: 'bg-cm-info text-white',
  },
};

/**
 * Format timestamp to readable time
 */
function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get display name for a role
 */
function getRoleDisplayName(role) {
  const roleNames = {
    kitchen: 'Cocina',
    mozo: 'Mozo',
    delivery: 'Delivery',
    cajero: 'Cajero',
    vendedor: 'Vendedor',
    dispatch: 'Despacho',
    admin: 'Admin',
    superadmin: 'Superadmin',
    guest: 'Invitado',
  };
  return roleNames[role] || role;
}

/**
 * Get reactions display - Interactive version
 */
function ReactionsDisplay({ reactions = {}, onReactionClick, currentUserId, messageId }) {
  // Count all reactions
  const reactionCounts = {};
  for (const [emoji, users] of Object.entries(reactions)) {
    const count = Object.keys(users || {}).length;
    if (count > 0) {
      reactionCounts[emoji] = count;
    }
  }

  // Check which reactions the current user has already selected
  const userReactions = new Set();
  for (const [emoji, users] of Object.entries(reactions)) {
    if (users && users[currentUserId]) {
      userReactions.add(emoji);
    }
  }

  const hasAnyReactions = Object.keys(reactionCounts).length > 0;

  return (
    <div className="flex items-center gap-1 mt-1 flex-wrap">
      {/* Reaction buttons */}
      {REACTION_EMOJIS.map((emoji) => {
        const count = reactionCounts[emoji] || 0;
        const isSelected = userReactions.has(emoji);

        return (
          <button
            key={emoji}
            onClick={() => onReactionClick && onReactionClick(messageId, emoji)}
            className={`
              inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs
              transition-all duration-150
              ${isSelected
                ? 'bg-cm-accent text-white ring-1 ring-cm-accent'
                : 'bg-cm-surface text-cm-text-secondary hover:bg-cm-surface-hover'
              }
            `}
            title={isSelected ? 'Quitar reacción' : 'Añadir reacción'}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="font-medium">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Get ACK display
 */
function AckDisplay({ acknowledgedBy = {}, messageId, priority }) {
  const ackEntries = Object.entries(acknowledgedBy);

  if (ackEntries.length === 0) {
    // Show NO RESPONSE warning for URGENT/NORMAL messages older than 5 minutes
    // For now, just return null (ACK tracking will be enhanced in PR2)
    return null;
  }

  return (
    <div className="flex items-center gap-1 mt-1 text-xs text-cm-text-secondary">
      <Check className="w-3 h-3 text-cm-success" />
      <span>
        Leído por{' '}
        {ackEntries.map(([role, ack], idx) => (
          <span key={role}>
            {getRoleDisplayName(role)}
            {idx < ackEntries.length - 1 ? ', ' : ''}
          </span>
        ))}
      </span>
    </div>
  );
}

export function MessageBubble({ message, isOwn = false, onReactionClick, currentUserId, isOverdue = false, onOrderClick }) {
  const {
    id,
    text,
    priority = 'NORMAL',
    senderId,
    senderRole,
    senderName,
    timestamp,
    acknowledgedBy = {},
    reactions = {},
    isVoiceNote,
    voiceNoteUrl,
    duration,
    orderId,
  } = message;

  const priorityConfig = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.NORMAL;
  const isOwnMessage = isOwn;

  // Determine what to render as message content
  const renderContent = () => {
    // Voice note with player
    if (isVoiceNote && voiceNoteUrl) {
      return (
        <VoiceNotePlayer
          url={voiceNoteUrl}
          duration={duration}
          orderId={orderId}
          onOrderClick={onOrderClick}
        />
      );
    }

    // Regular text message
    return (
      <p className="text-sm text-cm-text whitespace-pre-wrap break-words">
        {text}
      </p>
    );
  };

  return (
    <motion.div
      id={`message-${id}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`
        relative pl-3 pr-4 py-2 mb-2 rounded-lg
        border-l-4 ${priorityConfig.borderColor}
        ${isOwnMessage ? 'bg-cm-surface ml-8' : 'bg-cm-bg-alt mr-8'}
        ${isOverdue ? 'ring-2 ring-cm-error animate-pulse-overdue' : ''}
      `}
    >
      {/* Overdue indicator */}
      {isOverdue && (
        <div className="absolute -top-2 -right-2 bg-cm-error text-white text-xs px-2 py-0.5 rounded-full font-medium">
          ⚠️ SIN RESPUESTA
        </div>
      )}

      {/* Header: sender name, role badge, time, priority pill */}
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <span className={`text-sm font-semibold ${isOwnMessage ? 'text-cm-accent' : 'text-cm-text'}`}>
          {senderName || 'Unknown'}
        </span>

        <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-cm-surface text-cm-text-secondary">
          {getRoleDisplayName(senderRole)}
        </span>

        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${priorityConfig.badgeClass}`}>
          {priorityConfig.label}
        </span>

        <span className="ml-auto text-xs text-cm-text-tertiary">
          {formatTime(timestamp)}
        </span>
      </div>

      {/* Message content (text or voice note player) */}
      {renderContent()}

      {/* Reactions display - interactive */}
      <ReactionsDisplay
        reactions={reactions}
        onReactionClick={onReactionClick}
        currentUserId={currentUserId}
        messageId={id}
      />

      {/* ACK display */}
      <AckDisplay acknowledgedBy={acknowledgedBy} messageId={id} priority={priority} />
    </motion.div>
  );
}

export default MessageBubble;