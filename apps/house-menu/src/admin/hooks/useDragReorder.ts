import { useRef } from 'react';

export function useDragReorder(onReorder: (productId: string, targetId: string) => void) {
  const dragRef = useRef<string | null>(null);

  const handlers = {
    onDragStart: (productId: string) => (e: React.DragEvent) => {
      dragRef.current = productId;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', productId);
    },
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    },
    onDrop: (targetId: string) => (e: React.DragEvent) => {
      e.preventDefault();
      const draggedId = dragRef.current || e.dataTransfer.getData('text/plain');
      if (draggedId && draggedId !== targetId) {
        onReorder(draggedId, targetId);
      }
      dragRef.current = null;
    },
    onDragEnd: () => {
      dragRef.current = null;
    },
  };

  return handlers;
}
