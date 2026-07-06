import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { mockOnValue, mockPush, mockSet, mockUpdate, mockGet } = vi.hoisted(() => ({
  mockOnValue: vi.fn((_ref: unknown, cb: (s: { val: () => unknown }) => void) => {
    cb({ val: () => null });
    return vi.fn();
  }),
  mockPush: vi.fn(() => ({ key: 'mock-key' })),
  mockSet: vi.fn(() => Promise.resolve()),
  mockUpdate: vi.fn(() => Promise.resolve()),
  mockGet: vi.fn(),
}));

vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})),
  ref: vi.fn(() => ({})),
  onValue: mockOnValue,
  push: mockPush,
  set: mockSet,
  update: mockUpdate,
  get: mockGet,
}));

import { useSessionState } from '../../hooks/useSessionState';

describe('useSessionState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockReturnValue({ key: 'mock-key' });
    mockSet.mockResolvedValue(undefined);
    mockUpdate.mockResolvedValue(undefined);
    mockGet.mockResolvedValue({ val: () => null, exists: () => false });
  });

  it('starts with no session and not loading', () => {
    const { result } = renderHook(() => useSessionState('branch-1', 'test@test.com'));
    expect(result.current.session).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('opens a session when none active', async () => {
    mockPush.mockReturnValue({ key: 'sess-123' });
    const { result } = renderHook(() => useSessionState('branch-1', 'test@test.com'));
    await act(async () => {
      const res = await result.current.openSession({
        openingBalance: 100,
        openedBy: 'test@test.com',
        notes: '',
      });
      expect(res.success).toBe(true);
      expect(res.sessionId).toBe('sess-123');
    });
  });

  it('rejects open when already active', async () => {
    mockGet.mockImplementation(() => Promise.resolve({
      val: () => ({
        existing: { status: 'open', openedAt: Date.now(), openedBy: 'test@test.com' },
      }),
      exists: () => true,
    }));
    const { result } = renderHook(() => useSessionState('branch-1', 'test@test.com'));
    await act(async () => {
      const res = await result.current.openSession({
        openingBalance: 100,
        openedBy: 'test@test.com',
        notes: '',
      });
      expect(res.success).toBe(false);
      expect(typeof res.error).toBe('string');
    });
  });

  it('closes a session', async () => {
    mockGet.mockImplementation(() => Promise.resolve({
      val: () => ({
        status: 'open',
        openedAt: Date.now(),
        openedBy: 'test@test.com',
      }),
      exists: () => true,
    }));
    const { result } = renderHook(() => useSessionState('branch-1', 'test@test.com'));
    await act(async () => {
      const res = await result.current.closeSession('sess-1', {
        closingBalance: 500,
        expectedCash: 480,
        closedBy: 'test@test.com',
        notes: '',
      });
      expect(res.success).toBe(true);
    });
  });

  it('returns error for null branch', async () => {
    const { result } = renderHook(() => useSessionState(null, 'test@test.com'));
    await act(async () => {
      const res = await result.current.openSession({
        openingBalance: 100,
        openedBy: 'test@test.com',
        notes: '',
      });
      expect(res.success).toBe(false);
      expect(res.error).toBe('No branch selected');
    });
  });
});
