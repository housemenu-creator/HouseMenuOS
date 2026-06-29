/**
 * MessageList — Scrollable list of message bubbles
 *
 * Features:
 * - Auto-scrolls to bottom on new message
 * - Auto-ack messages when scrolled into view
 * - Loading skeleton when empty
 * - Uses MessageBubble component
 * - Scroll to overdue messages on banner click
 */
import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MessageBubble } from './MessageBubble';

/**
 * Loading skeleton for empty state
 */
function MessageListSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-20 h-4 rounded bg-cm-surface animate-pulse" />
            <div className="w-12 h-4 rounded bg-cm-surface animate-pulse" />
            <div className="w-16 h-4 rounded bg-cm-surface animate-pulse ml-auto" />
          </div>
          <div className="w-3/4 h-4 rounded bg-cm-surface animate-pulse" />
          <div className="w-1/2 h-4 rounded bg-cm-surface animate-pulse" />
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6">
      <div className="w-16 h-16 rounded-full bg-cm-surface flex items-center justify-center mb-4">
        <span className="text-2xl">💬</span>
      </div>
      <h3 className="text-lg font-semibold text-cm-text mb-2">Sin mensajes</h3>
      <p className="text-sm text-cm-text-secondary max-w-xs">
        No hay mensajes en este canal todavía. ¡Sé el primero en enviar uno!
      </p>
    </div>
  );
}

export function MessageList({
  messages = [],
  isLoading = false,
  currentUserId = null,
  onMessageVisible,
  scrollToMessageId = null,
  overdueMessageIds = new Set(),
  onReactionClick,
}) {
  const listEndRef = useRef(null);
  const containerRef = useRef(null);
  const observerRef = useRef(null);
  const prevScrollToRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (listEndRef.current) {
      listEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages.length]);

  // Scroll to specific message when requested (from overdue banner)
  useEffect(() => {
    if (scrollToMessageId && scrollToMessageId !== prevScrollToRef.current) {
      const element = document.getElementById(`message-${scrollToMessageId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        prevScrollToRef.current = scrollToMessageId;
      }
    }
  }, [scrollToMessageId]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!isLoading && messages.length > 0 && listEndRef.current) {
      listEndRef.current.scrollIntoView({ block: 'end' });
    }
  }, [isLoading]);

  // Intersection observer for auto-ack
  useEffect(() => {
    if (!currentUserId || !onMessageVisible) return;

    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const messageId = entry.target.getAttribute('data-message-id');
            if (messageId) {
              onMessageVisible(messageId);
            }
          }
        }
      },
      {
        root: containerRef.current,
        threshold: 0.5,
      }
    );

    // Observe all message elements
    const messageElements = containerRef.current?.querySelectorAll('[data-message-id]');
    messageElements?.forEach((el) => observerRef.current.observe(el));

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [messages, currentUserId, onMessageVisible]);

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <MessageListSkeleton />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto">
        <EmptyState />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-3 py-2"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {messages.map((message) => (
          <div key={message.id} data-message-id={message.id}>
            <MessageBubble
              message={message}
              isOwn={message.senderId === currentUserId}
              currentUserId={currentUserId}
              isOverdue={overdueMessageIds.has(message.id)}
              onReactionClick={onReactionClick}
            />
          </div>
        ))}
        <div ref={listEndRef} className="h-px" />
      </motion.div>
    </div>
  );
}

export default MessageList;