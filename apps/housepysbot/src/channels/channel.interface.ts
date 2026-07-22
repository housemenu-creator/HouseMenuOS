import logger from "../lib/logger.js";
/**
 * Channel Adapter Interface
 *
 * Every channel (WhatsApp, Telegram, etc.) implements this interface.
 * The rest of the system talks to channels ONLY through this interface.
 */

// ── Message Types ───────────────────────────────────────

export type MessageType = "text" | "image" | "location" | "contact";

/** Normalized incoming message — same format for ALL channels */
export interface NormalizedMessage {
  channel: string;
  externalUserId: string;
  messageId: string;
  text: string;
  type: MessageType;
  metadata?: Record<string, unknown>;
}

// ── Button Types ────────────────────────────────────────

export type ButtonAction =
  | { type: "url"; label: string; url: string }
  | { type: "callback"; label: string; data: string }
  | { type: "reply"; label: string; payload: string };

// ── Adapter Interface ───────────────────────────────────

export interface SendTextOptions {
  parseMode?: "markdown" | "html";
  buttons?: ButtonAction[][];
}

export type ChannelAction = "typing" | "mark_seen";

export interface ChannelAdapter {
  readonly channel: string;

  /** Start listening for incoming messages */
  start(branchId: string): Promise<void>;

  /** Stop the adapter gracefully */
  stop(): Promise<void>;

  /** Send a text message (with optional buttons) */
  sendText(recipientId: string, text: string, options?: SendTextOptions): Promise<void>;

  /** Send an image */
  sendImage(recipientId: string, imageUrl: string, caption?: string): Promise<void>;

  /** Send a channel action (typing indicator, mark as seen, etc.) */
  sendAction?(recipientId: string, action: ChannelAction): Promise<void>;

  /** Optional: mark a message as read */
  markAsRead?(messageId: string): Promise<void>;
}

// ── Incoming Message Handler ────────────────────────────

export type MessageHandler = (msg: NormalizedMessage) => Promise<void>;

// ── Channel Registry ────────────────────────────────────

/**
 * Central registry of all active channel adapters.
 * Routes incoming messages to the conversation engine
 * and outgoing messages back through the right adapter.
 */
export class ChannelRegistry {
  private adapters = new Map<string, ChannelAdapter>();
  private handler: MessageHandler | null = null;

  register(adapter: ChannelAdapter): void {
    this.adapters.set(adapter.channel, adapter);
  }

  get(channel: string): ChannelAdapter | undefined {
    return this.adapters.get(channel);
  }

  getAll(): ChannelAdapter[] {
    return Array.from(this.adapters.values());
  }

  setHandler(handler: MessageHandler): void {
    this.handler = handler;
  }

  /** Called by adapters when a message arrives */
  async onMessage(msg: NormalizedMessage): Promise<void> {
    if (this.handler) {
      await this.handler(msg);
    }
  }

  async startAll(branchId: string): Promise<void> {
    const results = await Promise.allSettled(
      Array.from(this.adapters.values()).map((a) => a.start(branchId)),
    );
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === "rejected") {
        logger.error(`❌ Channel ${Array.from(this.adapters.keys())[i]}:`, r.reason);
      }
    }
  }

  async stopAll(): Promise<void> {
    await Promise.allSettled(
      Array.from(this.adapters.values()).map((a) => a.stop()),
    );
  }
}

/** Singleton */
export const channelRegistry = new ChannelRegistry();
