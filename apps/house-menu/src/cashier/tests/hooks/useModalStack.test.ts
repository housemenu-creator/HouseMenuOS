import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModalStack } from '../../hooks/useModalStack';

describe('useModalStack', () => {
  it('starts with no active modal', () => {
    const { result } = renderHook(() => useModalStack());
    expect(result.current.activeModal).toBeNull();
  });

  it('opens a modal with props', () => {
    const { result } = renderHook(() => useModalStack());
    act(() => result.current.open('quickPay', { orderId: '123' }));
    expect(result.current.activeModal).toBe('quickPay');
    expect(result.current.modalProps).toEqual({ orderId: '123' });
  });

  it('closes the active modal', () => {
    const { result } = renderHook(() => useModalStack());
    act(() => result.current.open('session', {}));
    act(() => result.current.close());
    expect(result.current.activeModal).toBeNull();
  });

  it('stacks modals and returns to previous on close', () => {
    const { result } = renderHook(() => useModalStack());
    act(() => result.current.open('session', { a: 1 }));
    act(() => result.current.open('quickPay', { b: 2 }));
    expect(result.current.activeModal).toBe('quickPay');
    act(() => result.current.close());
    expect(result.current.activeModal).toBe('session');
    expect(result.current.modalProps).toEqual({ a: 1 });
  });

  it('clears stack on closeAll', () => {
    const { result } = renderHook(() => useModalStack());
    act(() => result.current.open('session', {}));
    act(() => result.current.open('quickPay', {}));
    act(() => result.current.closeAll());
    expect(result.current.activeModal).toBeNull();
  });

  it('isOpen returns true only for matching modal names', () => {
    const { result } = renderHook(() => useModalStack());
    act(() => result.current.open('quickPay', {}));
    expect(result.current.isOpen('quickPay')).toBe(true);
    expect(result.current.isOpen('session')).toBe(false);
  });
});
