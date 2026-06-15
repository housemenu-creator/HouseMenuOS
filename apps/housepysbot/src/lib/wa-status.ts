/**
 * WhatsApp Status — standalone module to avoid circular dependency:
 *   server.ts → system.ts → whatsapp.ts → agent/index.ts → server.ts
 *
 * Both whatsapp.ts and system.ts import from here instead of depending on each other.
 */

let waConnected = false;
let waNumber = "";

export function setWhatsAppStatus(connected: boolean, number: string = ""): void {
  waConnected = connected;
  waNumber = number;
}

export function getWhatsAppStatus(): string {
  return JSON.stringify({ status: waConnected ? "connected" : "disconnected", number: waNumber });
}
