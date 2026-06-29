/**
 * Communication System Store — Zustand store for messages and UI state
 *
 * Messages are stored under a composite key `${branchId}:${channelId}`
 * so switching branches never shows stale data from another branch.
 */
import { create } from 'zustand';

/**
 * Build a stable composite key for the messages map.
 * @param {string} branchId
 * @param {string} channelId
 * @returns {string}
 */
function msgKey(branchId, channelId) {
  return `${branchId}:${channelId}`;
}

const useCommStore = create((set, get) => ({
  // ── State ──
  /** Map of "branchId:channelId" → Message[] */
  messagesByBranchChannel: {},
  currentChannel: null,
  isPanelOpen: false,
  isLoading: false,
  /** Set of messageIds that are URGENT and unacknowledged past 30s */
  overdueQueue: new Set(),
  unreadByChannel: {},

  // ── UI actions ──
  setCurrentChannel: (channelId) => set({ currentChannel: channelId }),
  setPanelOpen: (isOpen) => set({ isPanelOpen: isOpen }),
  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
  setLoading: (loading) => set({ isLoading: loading }),

  /**
   * Replace ALL messages for a branch+channel (from RTDB subscription).
   */
  setMessages: (branchId, channelId, messages) => {
    set((state) => ({
      messagesByBranchChannel: {
        ...state.messagesByBranchChannel,
        [msgKey(branchId, channelId)]: messages,
      },
      isLoading: false,
    }));
  },

  /**
   * Optimistic insert — skip if duplicate.
   */
  addMessage: (branchId, channelId, message) => {
    set((state) => {
      const key = msgKey(branchId, channelId);
      const existing = state.messagesByBranchChannel[key] || [];
      if (existing.some((m) => m.id === message.id)) return state;
      return {
        messagesByBranchChannel: {
          ...state.messagesByBranchChannel,
          [key]: [...existing, message],
        },
      };
    });
  },

  /**
   * Get messages for a branch+channel (lazy selector).
   */
  getMessages: (branchId, channelId) => {
    return get().messagesByBranchChannel[msgKey(branchId, channelId)] || [];
  },

  // ── Acknowledgment ──
  acknowledgeMessage: (branchId, channelId, messageId, userId, role, timestamp) => {
    set((state) => {
      const key = msgKey(branchId, channelId);
      const channelMessages = state.messagesByBranchChannel[key];
      if (!channelMessages) return state;

      return {
        messagesByBranchChannel: {
          ...state.messagesByBranchChannel,
          [key]: channelMessages.map((msg) =>
            msg.id === messageId
              ? { ...msg, acknowledgedBy: { ...msg.acknowledgedBy, [role]: { userId, role, timestamp } } }
              : msg
          ),
        },
      };
    });
  },

  // ── Reactions ──
  addReaction: (branchId, channelId, messageId, emoji, userId) => {
    set((state) => {
      const key = msgKey(branchId, channelId);
      const channelMessages = state.messagesByBranchChannel[key];
      if (!channelMessages) return state;

      return {
        messagesByBranchChannel: {
          ...state.messagesByBranchChannel,
          [key]: channelMessages.map((msg) =>
            msg.id === messageId
              ? { ...msg, reactions: { ...msg.reactions, [emoji]: { ...(msg.reactions?.[emoji] || {}), [userId]: true } } }
              : msg
          ),
        },
      };
    });
  },

  removeReaction: (branchId, channelId, messageId, emoji, userId) => {
    set((state) => {
      const key = msgKey(branchId, channelId);
      const channelMessages = state.messagesByBranchChannel[key];
      if (!channelMessages) return state;

      return {
        messagesByBranchChannel: {
          ...state.messagesByBranchChannel,
          [key]: channelMessages.map((msg) => {
            if (msg.id !== messageId) return msg;
            const { [userId]: _, ...rest } = msg.reactions?.[emoji] || {};
            return { ...msg, reactions: { ...msg.reactions, [emoji]: rest } };
          }),
        },
      };
    });
  },

  // ── Overdue tracking ──
  setMessageOverdue: (messageId) => {
    set((state) => ({ overdueQueue: new Set([...state.overdueQueue, messageId]) }));
  },

  clearOverdue: (messageId) => {
    set((state) => {
      const next = new Set(state.overdueQueue);
      next.delete(messageId);
      return { overdueQueue: next };
    });
  },

  getOverdueMessages: () => {
    const state = get();
    const overdue = [];
    for (const [key, messages] of Object.entries(state.messagesByBranchChannel)) {
      for (const msg of messages) {
        if (state.overdueQueue.has(msg.id) && msg.priority === 'URGENT') {
          overdue.push({ ...msg, channelId: key.split(':')[1], branchId: key.split(':')[0] });
        }
      }
    }
    return overdue;
  },

  // ── Unread tracking ──
  incrementUnread: (channelId) => {
    set((state) => ({
      unreadByChannel: { ...state.unreadByChannel, [channelId]: (state.unreadByChannel[channelId] || 0) + 1 },
    }));
  },

  clearUnread: (channelId) => {
    set((state) => ({ unreadByChannel: { ...state.unreadByChannel, [channelId]: 0 } }));
  },
}));

// ── Selectors (convenience) ──
export const useCommStoreMessages = (branchId, channelId) =>
  useCommStore((state) => state.messagesByBranchChannel[msgKey(branchId, channelId)] || []);

export const useCurrentChannel = () => useCommStore((state) => state.currentChannel);
export const useIsPanelOpen = () => useCommStore((state) => state.isPanelOpen);
export const useIsLoading = () => useCommStore((state) => state.isLoading);
export const useOverdueQueue = () => useCommStore((state) => state.overdueQueue);
export const useUnreadCount = (channelId) => useCommStore((state) => state.unreadByChannel[channelId] || 0);
export const useOverdueMessages = () => useCommStore((state) => state.getOverdueMessages());

export default useCommStore;
export { useCommStore };
