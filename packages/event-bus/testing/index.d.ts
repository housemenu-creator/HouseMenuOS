// ── Mock Dispatcher ──────────────────────────────────────

export function startMockDispatcher(tenantId?: string): Promise<{ tenantId: string }>;
export function stopMockDispatcher(tenantId?: string): void;

// ── Fixtures ─────────────────────────────────────────────

export function injectFixture(
  name: string,
  overrides?: Record<string, string>
): Promise<{ eventId: string; type: string }>;

export function injectFullFlow(
  overrides?: Record<string, string>
): Promise<string[]>;

export function listFixtures(): string[];
