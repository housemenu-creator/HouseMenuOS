import { useState, useCallback, useMemo } from 'react';
import type { ModalName } from '../types';

interface ModalStackItem {
  name: Exclude<ModalName, null>;
  props: Record<string, unknown>;
}

export function useModalStack() {
  const [stack, setStack] = useState<ModalStackItem[]>([]);

  const activeModal = useMemo<ModalName>(() => {
    return stack.length > 0 ? stack[stack.length - 1].name : null;
  }, [stack]);

  const modalProps = useMemo<Record<string, unknown>>(() => {
    return stack.length > 0 ? stack[stack.length - 1].props : {};
  }, [stack]);

  const open = useCallback((name: Exclude<ModalName, null>, props: Record<string, unknown> = {}) => {
    setStack(prev => [...prev, { name, props }]);
  }, []);

  const close = useCallback(() => {
    setStack(prev => prev.length > 1 ? prev.slice(0, -1) : []);
  }, []);

  const closeAll = useCallback(() => {
    setStack([]);
  }, []);

  const isOpen = useCallback((name: ModalName): boolean => {
    return stack.some(item => item.name === name);
  }, [stack]);

  return { activeModal, modalProps, open, close, closeAll, isOpen, stack };
}
