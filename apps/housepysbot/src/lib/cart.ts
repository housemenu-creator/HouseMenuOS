// ── In-memory cart store (per Telegram chat) ──────────
// ponytail: in-memory, lost on restart. Persist when needed.

export interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

const carts = new Map<string, CartItem[]>();

export function getCart(chatId: string): CartItem[] {
  return carts.get(chatId) || [];
}

export function addToCart(chatId: string, item: CartItem) {
  const cart = carts.get(chatId) || [];
  const existing = cart.find(i => i.productId === item.productId);
  if (existing) {
    existing.quantity += item.quantity;
  } else {
    cart.push({ ...item });
  }
  carts.set(chatId, cart);
}

export function removeFromCart(chatId: string, productId: string) {
  const cart = carts.get(chatId) || [];
  carts.set(chatId, cart.filter(i => i.productId !== productId));
}

export function updateQuantity(chatId: string, productId: string, qty: number) {
  const cart = carts.get(chatId) || [];
  const item = cart.find(i => i.productId === productId);
  if (item) {
    if (qty <= 0) {
      removeFromCart(chatId, productId);
    } else {
      item.quantity = qty;
    }
  }
}

export function clearCart(chatId: string) {
  carts.delete(chatId);
}

export function cartSummary(chatId: string): { items: CartItem[]; total: number; count: number } {
  const items = getCart(chatId);
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);
  return { items, total, count };
}
