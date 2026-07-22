import { describe, it, expect, beforeEach } from "vitest";
import { getCart, addToCart, removeFromCart, updateQuantity, clearCart, cartSummary } from "./cart.js";

describe("cart", () => {
  beforeEach(() => clearCart("test-chat"));

  it("starts empty", () => {
    expect(getCart("empty")).toEqual([]);
  });

  it("adds items", () => {
    addToCart("test-chat", { productId: "p1", name: "Lomo", quantity: 2, price: 28 });
    expect(getCart("test-chat")).toHaveLength(1);
    expect(cartSummary("test-chat").total).toBe(56);
  });

  it("merges duplicate items", () => {
    addToCart("test-chat", { productId: "p1", name: "Lomo", quantity: 1, price: 28 });
    addToCart("test-chat", { productId: "p1", name: "Lomo", quantity: 2, price: 28 });
    expect(getCart("test-chat")).toHaveLength(1);
    expect(getCart("test-chat")[0].quantity).toBe(3);
  });

  it("removes items", () => {
    addToCart("test-chat", { productId: "p1", name: "Lomo", quantity: 1, price: 28 });
    addToCart("test-chat", { productId: "p2", name: "Ceviche", quantity: 1, price: 32 });
    removeFromCart("test-chat", "p1");
    expect(getCart("test-chat")).toHaveLength(1);
    expect(getCart("test-chat")[0].productId).toBe("p2");
  });

  it("updates quantity", () => {
    addToCart("test-chat", { productId: "p1", name: "Lomo", quantity: 1, price: 28 });
    updateQuantity("test-chat", "p1", 5);
    expect(getCart("test-chat")[0].quantity).toBe(5);
    expect(cartSummary("test-chat").count).toBe(5);
  });

  it("removes item when quantity set to 0", () => {
    addToCart("test-chat", { productId: "p1", name: "Lomo", quantity: 1, price: 28 });
    updateQuantity("test-chat", "p1", 0);
    expect(getCart("test-chat")).toHaveLength(0);
  });

  it("clears cart", () => {
    addToCart("test-chat", { productId: "p1", name: "Lomo", quantity: 1, price: 28 });
    clearCart("test-chat");
    expect(getCart("test-chat")).toEqual([]);
  });

  it("computes summary correctly", () => {
    addToCart("test-chat", { productId: "p1", name: "Lomo", quantity: 2, price: 28 });
    addToCart("test-chat", { productId: "p2", name: "Ceviche", quantity: 1, price: 32 });
    const s = cartSummary("test-chat");
    expect(s.count).toBe(3);
    expect(s.total).toBe(88);
    expect(s.items).toHaveLength(2);
  });

  it("isolates different chats", () => {
    addToCart("chat-a", { productId: "p1", name: "Lomo", quantity: 1, price: 28 });
    addToCart("chat-b", { productId: "p2", name: "Ceviche", quantity: 2, price: 32 });
    expect(getCart("chat-a")).toHaveLength(1);
    expect(getCart("chat-b")).toHaveLength(1);
    expect(getCart("chat-b")[0].name).toBe("Ceviche");
  });
});
