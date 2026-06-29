/**
 * useComm — Main hook for communication system
 *
 * Features:
 * - Branch-aware (uses activeBranchId from BranchContext)
 * - Subscribes to RTDB listener for current branch+channel
 * - Provides message list, send, acknowledge, react functions
 * - URGENT message overdue tracking (30s timer)
 */
import { useEffect, useCallback, useRef } from 'react';
import { useCommStore } from '../store/commStore';
import { sendMessage, subscribeToChannel, acknowledgeMessage as ackMessageRTDB, addReaction } from '../commService';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { useSound } from './useSound';

export function useComm() {
  const { user } = useAuth();
  const { activeBranchId } = useBranch();
  const currentUserId = user?.id || 'anonymous';
  const currentUserRole = user?.role || 'guest';
  const currentUserName = user?.name || 'Anonymous';

  const {
    currentChannel,
    isLoading,
    setCurrentChannel,
    setMessages,
    addMessage,
    acknowledgeMessage: storeAcknowledge,
    addReaction: storeAddReaction,
    setMessageOverdue,
    clearOverdue,
    setLoading,
    messagesByBranchChannel,
    getOverdueMessages,
    clearUnread,
  } = useCommStore();

  const { playSound } = useSound();

  const unsubscribeRef = useRef(null);
  const overdueTimersRef = useRef(new Map());
  const overdueCheckIntervalRef = useRef(null);
  const pendingAcksRef = useRef(new Set());

  /**
   * Start a 30-second timer for an URGENT message
   */
  const startOverdueTimer = useCallback((messageId) => {
    if (overdueTimersRef.current.has(messageId)) {
      clearTimeout(overdueTimersRef.current.get(messageId));
    }
    const timerId = setTimeout(() => {
      setMessageOverdue(messageId);
      playSound('URGENT', currentUserRole);
      pendingAcksRef.current.delete(messageId);
      overdueTimersRef.current.delete(messageId);
    }, 30000);
    overdueTimersRef.current.set(messageId, timerId);
    pendingAcksRef.current.add(messageId);
  }, [setMessageOverdue, playSound, currentUserRole]);

  const clearOverdueTimer = useCallback((messageId) => {
    if (overdueTimersRef.current.has(messageId)) {
      clearTimeout(overdueTimersRef.current.get(messageId));
      overdueTimersRef.current.delete(messageId);
    }
    pendingAcksRef.current.delete(messageId);
    clearOverdue(messageId);
  }, [clearOverdue]);

  /**
   * Subscribe to channel when branch or channel changes
   */
  useEffect(() => {
    if (!activeBranchId || !currentChannel) return;

    setLoading(true);
    clearUnread(currentChannel);

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    const unsub = subscribeToChannel(activeBranchId, currentChannel, (messages) => {
      setMessages(activeBranchId, currentChannel, messages);

      // Overdue tracking for URGENT messages
      for (const msg of messages) {
        if (msg.priority !== 'URGENT') continue;
        if (msg.senderId === currentUserId) continue;

        const ackRoles = Object.keys(msg.acknowledgedBy || {});
        const isAcknowledged = ackRoles.includes(currentUserRole);

        if (isAcknowledged) {
          if (pendingAcksRef.current.has(msg.id) || overdueTimersRef.current.has(msg.id)) {
            clearOverdueTimer(msg.id);
          }
        } else if (!pendingAcksRef.current.has(msg.id)) {
          startOverdueTimer(msg.id);
        }
      }
    });

    unsubscribeRef.current = unsub;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      for (const timerId of overdueTimersRef.current.values()) {
        clearTimeout(timerId);
      }
      overdueTimersRef.current.clear();
      pendingAcksRef.current.clear();
    };
  }, [activeBranchId, currentChannel, currentUserId, currentUserRole, setMessages, setLoading, startOverdueTimer, clearOverdueTimer, clearUnread]);

  /**
   * Send a message
   */
  const sendMsg = useCallback(
    async (text, priority = 'NORMAL', extraData = {}) => {
      if (!activeBranchId || !currentChannel || !text.trim()) return { success: false };
      return await sendMessage(activeBranchId, currentChannel, {
        text: text.trim(),
        priority,
        senderId: currentUserId,
        senderRole: currentUserRole,
        senderName: currentUserName,
        ...extraData,
      });
    },
    [activeBranchId, currentChannel, currentUserId, currentUserRole, currentUserName]
  );

  /**
   * Acknowledge a message
   */
  const ackMsg = useCallback(
    async (messageId) => {
      if (!activeBranchId || !currentChannel || !currentUserId) return { success: false };
      const timestamp = new Date().toISOString();
      storeAcknowledge(activeBranchId, currentChannel, messageId, currentUserId, currentUserRole, timestamp);
      clearOverdueTimer(messageId);
      return await ackMessageRTDB(activeBranchId, currentChannel, messageId, currentUserId, currentUserRole);
    },
    [activeBranchId, currentChannel, currentUserId, currentUserRole, storeAcknowledge, clearOverdueTimer]
  );

  /**
   * Add a reaction
   */
  const reactToMsg = useCallback(
    async (messageId, emoji) => {
      if (!activeBranchId || !currentChannel || !currentUserId) return { success: false };
      storeAddReaction(activeBranchId, currentChannel, messageId, emoji, currentUserId);
      return await addReaction(activeBranchId, currentChannel, messageId, emoji, currentUserId);
    },
    [activeBranchId, currentChannel, currentUserId, storeAddReaction]
  );

  const setChannel = useCallback(
    (channelId) => {
      if (channelId !== currentChannel) setCurrentChannel(channelId);
    },
    [currentChannel, setCurrentChannel]
  );

  // Messages for current branch+channel
  const channelKey = `${activeBranchId}:${currentChannel}`;
  const messages = activeBranchId && currentChannel ? messagesByBranchChannel[channelKey] || [] : [];

  const overdueMessages = getOverdueMessages();

  return {
    messages,
    sendMessage: sendMsg,
    acknowledgeMessage: ackMsg,
    addReaction: reactToMsg,
    currentChannel,
    setChannel,
    isLoading,
    overdueMessages,
  };
}

export default useComm;
