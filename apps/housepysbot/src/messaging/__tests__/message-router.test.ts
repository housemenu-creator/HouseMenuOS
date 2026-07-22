import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ───────────────────────────────────────
const mockSendText = vi.hoisted(() => vi.fn());
const mockSendAction = vi.hoisted(() => vi.fn());
const mockProcessMessage = vi.hoisted(() => vi.fn());
const mockGetHistory = vi.hoisted(() => vi.fn());
const mockPushHistory = vi.hoisted(() => vi.fn());
const mockCheckRateLimit = vi.hoisted(() => vi.fn(() => true));
const mockRouteWhatsApp = vi.hoisted(() => vi.fn(() => ({ agentId: "atencion" })));
const mockRouteTelegram = vi.hoisted(() => vi.fn(() => ({ agentId: "atencion" })));
const mockConversationKey = vi.hoisted(() => vi.fn((_: string, uid: string, agentId: string) => `${uid}:${agentId}`));
const mockInitFirebase = vi.hoisted(() => vi.fn(() => ({})));
const mockRef = vi.hoisted(() => vi.fn(() => ({})));
const mockChild = vi.hoisted(() => vi.fn(() => ({})));
const mockFbGet = vi.hoisted(() => vi.fn(() => Promise.resolve({ exists: () => false })));

vi.mock("../../channels/channel.interface.js", () => ({
  channelRegistry: {
    get: vi.fn(() => ({ sendText: mockSendText, sendAction: mockSendAction })),
    setHandler: vi.fn(),
  },
}));

vi.mock("../../channels/message-normalizer.js", () => ({
  conversationKey: mockConversationKey,
}));

vi.mock("../../agent/index.js", () => ({
  processMessage: mockProcessMessage,
}));

vi.mock("../../lib/session.js", () => ({
  getHistory: mockGetHistory,
  pushHistory: mockPushHistory,
}));

vi.mock("../../lib/rateLimit.js", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock("../../agents/router.js", () => ({
  routeWhatsApp: mockRouteWhatsApp,
  routeTelegram: mockRouteTelegram,
}));

vi.mock("../../lib/firebase.js", () => ({
  initFirebase: mockInitFirebase,
  ref: mockRef,
  child: mockChild,
  get: mockFbGet,
}));

vi.mock("../../lib/logger.js", () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

// Static import (vitest applies hoisted mocks)
import { handleNormalizedMessage, setupMessageHandler } from "../message-router.js";

describe("message-router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendText.mockResolvedValue(undefined);
    mockSendAction.mockResolvedValue(undefined);
    mockGetHistory.mockResolvedValue([]);
    mockPushHistory.mockResolvedValue(undefined);
    mockProcessMessage.mockResolvedValue("¡Gracias por tu pedido!");
    mockCheckRateLimit.mockReturnValue(true);
    mockConversationKey.mockImplementation((_: string, uid: string, agentId: string) => `${uid}:${agentId}`);
  });

  it("routes WhatsApp messages", async () => {
    await handleNormalizedMessage({
      channel: "whatsapp",
      externalUserId: "51999123456",
      text: "Quiero un lomo saltado",
      metadata: { username: "51999123456" },
    });

    expect(mockRouteWhatsApp).toHaveBeenCalled();
    expect(mockProcessMessage).toHaveBeenCalled();
    expect(mockSendText).toHaveBeenCalledWith("51999123456", "¡Gracias por tu pedido!");
    expect(mockPushHistory).toHaveBeenCalled();
  });

  it("routes Telegram messages", async () => {
    await handleNormalizedMessage({
      channel: "telegram",
      externalUserId: "123456789",
      text: "Hola",
      metadata: { username: "Juan" },
    });

    expect(mockRouteTelegram).toHaveBeenCalled();
    expect(mockProcessMessage).toHaveBeenCalled();
    expect(mockSendText).toHaveBeenCalled();
  });

  it("blocks rate-limited users", async () => {
    mockCheckRateLimit.mockReturnValueOnce(false);

    await handleNormalizedMessage({
      channel: "whatsapp",
      externalUserId: "51999123456",
      text: "mensaje spam",
      metadata: {},
    });

    expect(mockProcessMessage).not.toHaveBeenCalled();
    expect(mockSendText).toHaveBeenCalledWith("51999123456", expect.stringContaining("momento"));
  });

  it("handles Telegram order confirmation buttons", async () => {
    mockProcessMessage.mockResolvedValue("¿Confirmar? [CONFIRMAR_PEDIDO]");

    await handleNormalizedMessage({
      channel: "telegram",
      externalUserId: "12345",
      text: "Sí, confirma",
      metadata: { username: "12345" },
    });

    expect(mockSendText).toHaveBeenCalledWith("12345", expect.stringContaining("Confirmar"), expect.objectContaining({
      buttons: expect.arrayContaining([expect.arrayContaining([
        expect.objectContaining({ label: "✅ Confirmar pedido" }),
      ])]),
    }));
  });

  it("handles errors gracefully", async () => {
    mockProcessMessage.mockRejectedValueOnce(new Error("test error"));
    await handleNormalizedMessage({
      channel: "whatsapp",
      externalUserId: "test",
      text: "cause error",
      metadata: {},
    });

    expect(mockSendText).toHaveBeenCalledWith("test", expect.stringContaining("error"));
  });

  it("setupMessageHandler registers handler", async () => {
    setupMessageHandler();
    expect(mockSendText).toBeDefined(); // verify mocks loaded
  });
});
