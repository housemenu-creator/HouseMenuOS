import { describe, it, expect, beforeEach } from "vitest";

beforeEach(() => {
  delete process.env.ADMIN_CHAT_ID;
  delete process.env.ADMIN_PHONE;
  delete process.env.COCINA_CHAT_IDS;
  delete process.env.COCINA_PHONES;
});

async function getRouter() {
  // Import once — env vars are read lazily from process.env at call time
  return await import("./router.js");
}

describe("routeTelegram", () => {
  it("routes unknown chat to atencion", async () => {
    const { routeTelegram } = await getRouter();
    expect(routeTelegram("12345")).toEqual({
      agentId: "atencion",
      source: "telegram",
      chatId: "12345",
    });
  });

  it("routes admin chat to admin", async () => {
    process.env.ADMIN_CHAT_ID = "999";
    const { routeTelegram } = await getRouter();
    expect(routeTelegram("999")).toEqual({
      agentId: "admin",
      source: "telegram",
      chatId: "999",
    });
  });

  it("routes cocina chat to cocina", async () => {
    process.env.COCINA_CHAT_IDS = "888";
    const { routeTelegram } = await getRouter();
    expect(routeTelegram("888")).toEqual({
      agentId: "cocina",
      source: "telegram",
      chatId: "888",
    });
  });

  it("prefers admin over cocina when both match", async () => {
    process.env.ADMIN_CHAT_ID = "777";
    process.env.COCINA_CHAT_IDS = "777";
    const { routeTelegram } = await getRouter();
    expect(routeTelegram("777").agentId).toBe("admin");
  });

  it("handles multiple admin chat IDs", async () => {
    process.env.ADMIN_CHAT_ID = "111,222,333";
    const { routeTelegram } = await getRouter();
    expect(routeTelegram("222").agentId).toBe("admin");
    expect(routeTelegram("333").agentId).toBe("admin");
  });

  it("handles multiple cocina chat IDs", async () => {
    process.env.COCINA_CHAT_IDS = "444,555,666";
    const { routeTelegram } = await getRouter();
    expect(routeTelegram("444").agentId).toBe("cocina");
    expect(routeTelegram("555").agentId).toBe("cocina");
  });

  it("accepts numeric chatId", async () => {
    const { routeTelegram } = await getRouter();
    const result = routeTelegram(12345);
    expect(result.chatId).toBe("12345");
    expect(result.agentId).toBe("atencion");
  });
});

describe("routeWhatsApp", () => {
  it("routes unknown sender to atencion", async () => {
    const { routeWhatsApp } = await getRouter();
    expect(routeWhatsApp("51999000000@s.whatsapp.net")).toEqual({
      agentId: "atencion",
      source: "whatsapp",
      chatId: "51999000000@s.whatsapp.net",
    });
  });

  it("routes admin phone to admin (strips + and formatting)", async () => {
    process.env.ADMIN_PHONE = "+51999000111";
    const { routeWhatsApp } = await getRouter();
    expect(routeWhatsApp("51999000111@s.whatsapp.net").agentId).toBe("admin");
  });

  it("routes cocina phone to cocina", async () => {
    process.env.COCINA_PHONES = "+51999000222";
    const { routeWhatsApp } = await getRouter();
    expect(routeWhatsApp("51999000222@s.whatsapp.net").agentId).toBe("cocina");
  });

  it("prefers admin over cocina when both match", async () => {
    process.env.ADMIN_PHONE = "+51999000333";
    process.env.COCINA_PHONES = "+51999000333";
    const { routeWhatsApp } = await getRouter();
    expect(routeWhatsApp("51999000333@s.whatsapp.net").agentId).toBe("admin");
  });

  it("handles multiple admin phones", async () => {
    process.env.ADMIN_PHONE = "+519991, +519992, 519993";
    const { routeWhatsApp } = await getRouter();
    expect(routeWhatsApp("519992@s.whatsapp.net").agentId).toBe("admin");
    expect(routeWhatsApp("519993@s.whatsapp.net").agentId).toBe("admin");
  });

  it("handles multiple cocina phones", async () => {
    process.env.COCINA_PHONES = "519994,519995,519996";
    const { routeWhatsApp } = await getRouter();
    expect(routeWhatsApp("519994@s.whatsapp.net").agentId).toBe("cocina");
    expect(routeWhatsApp("519996@s.whatsapp.net").agentId).toBe("cocina");
  });
});
