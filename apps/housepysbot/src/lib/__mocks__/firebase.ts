// Shared mocks for firebase.ts — used by vi.mock("../../lib/firebase.js") in tests
export const mockGet = vi.fn(() => Promise.resolve({ exists: () => false, val: () => ({}) }));
export const mockSet = vi.fn();
export const mockUpdate = vi.fn();
export const mockPush = vi.fn(() => ({ key: "test-id-001" }));
export const mockChild = vi.fn(() => ({}));
export const mockRef = vi.fn(() => ({}));
export const mockInitFirebase = vi.fn(() => ({}));

export function initFirebase() { return mockInitFirebase(); }
export function ref(...args: any[]) { return mockRef(...args); }
export function child(...args: any[]) { return mockChild(...args); }
export function get(...args: any[]) { return mockGet(...args); }
export function set(...args: any[]) { return mockSet(...args); }
export function push(...args: any[]) { return mockPush(...args); }
export function update(...args: any[]) { return mockUpdate(...args); }
