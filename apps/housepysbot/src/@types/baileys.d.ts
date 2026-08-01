/**
 * Minimal type declarations for @whiskeysockets/baileys.
 *
 * The package ships without .d.ts files (v7.0.0-rc13 + typescript rollup issue).
 * These declarations cover what housepysbot actually uses.
 *
 * Remove this file when baileys publishes proper types.
 */

declare module "@whiskeysockets/baileys" {
  import { EventEmitter } from "events";

  // ── Auth ─────────────────────────────────────────

  export interface AuthenticationState {
    creds: any;
    keys: any;
  }

  export interface AuthenticationCreds {
    signedPreKey: any;
    registrationId: number;
    advSecretKey: string;
    nextPreKeyId: number;
    firstUnuploadedPreKeyId: number;
    serverKey?: string;
    serverToken?: string;
    clientToken?: string;
    advData?: string;
  }

  export function useMultiFileAuthState(
    folder: string
  ): Promise<{
    state: AuthenticationState;
    saveCreds: () => Promise<void>;
  }>;

  // ── Socket ───────────────────────────────────────

  export interface SocketConfig {
    auth?: AuthenticationState;
    printQRInTerminal?: boolean;
    logger?: any;
    browser?: string[];
    version?: [number, number, number];
    fireInitQueries?: boolean;
    syncFullHistory?: boolean;
    generateHighQualityLinkPreview?: boolean;
    markOnlineOnConnect?: boolean;
    emitOwnEvents?: boolean;
    patchMessageBeforeSending?: boolean;
    shouldIgnoreJid?: (jid: string) => boolean;
    getMessage: (key: any) => Promise<any>;
  }

  export function fetchLatestBaileysVersion(options?: any): Promise<{
    version: [number, number, number];
    isLatest: boolean;
  }>;

  export interface WASocket {
    user?: { id: string };
    ev: BaileysEventEmitter;
    sendMessage(
      jid: string,
      content: any,
      options?: any
    ): Promise<any>;
    sendPresenceUpdate(
      type: string,
      jid: string
    ): Promise<void>;
    groupMetadata(jid: string): Promise<any>;
    ws: any;
  }

  export function makeWASocket(config: Partial<SocketConfig>): WASocket;

  // ── Events ───────────────────────────────────────

  export interface BaileysEventEmitter extends EventEmitter {
    on(event: "creds.update", listener: (creds: any) => void): this;
    on(event: "connection.update", listener: (update: ConnectionUpdate) => void): this;
    on(event: "messages.upsert", listener: (update: MessagesUpsert) => void): this;
    on(event: "messaging-history.set", listener: (update: any) => void): this;
    on(event: "presence.update", listener: (update: any) => void): this;
    on(event: string, listener: (...args: any[]) => void): this;
  }

  export interface ConnectionUpdate {
    connection?: "open" | "close" | "connecting";
    lastDisconnect?: { error?: Error };
    qr?: string;
    isNewLogin?: boolean;
  }

  export interface MessagesUpsert {
    messages: BaileysMessage[];
    type: "notify" | "append" | "prepend" | "replace";
  }

  export interface BaileysMessageKey {
    remoteJid?: string;
    fromMe?: boolean;
    id?: string;
    participant?: string;
  }

  export interface BaileysMessage {
    key: BaileysMessageKey;
    message: {
      conversation?: string;
      extendedTextMessage?: { text: string };
      imageMessage?: { url: string; mimetype: string; caption?: string };
      videoMessage?: { url: string; mimetype: string; caption?: string };
      voiceMessage?: { url: string; mimetype: string; seconds?: number };
      audioMessage?: { url: string; mimetype: string; seconds?: number };
      documentMessage?: { url: string; mimetype: string; fileName?: string };
      stickerMessage?: Record<string, unknown>;
      [key: string]: unknown;
    } | null;
    pushName?: string;
  }

  // ── Disconnect Reason ────────────────────────────

  export const DisconnectReason: {
    loggedOut: number;
    connectionClosed: number;
    connectionLost: number;
    connectionReplaced: number;
    timedOut: number;
    badSession: number;
    restartRequired: number;
    multideviceMismatch: number;
    generic: number;
  };

  // ── Media download ──────────────────────────────

  export function downloadContentFromMessage(
    message: any,
    type: string
  ): AsyncGenerator<Buffer>;
}
