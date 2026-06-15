import { useEffect } from 'react';
import { KITCHEN_STATIONS } from '../kdsTypes';

export default function useKDSKeyboard({
  columnOrders,
  onUpdateStatus,
  onUndo,
  activeStation,
  onStationChange,
  activeTab,
  setActiveTab,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Evitar que los atajos se disparen si el usuario está escribiendo en un input (ej: buscador de pedidos)
      if (
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA' ||
        document.activeElement.isContentEditable
      ) {
        return;
      }

      // 1. Tecla Espacio o Enter -> BUMP (Avanzar el pedido más antiguo de Nuevos, luego de Preparando)
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        
        // Intentar bump en Nuevos (recibido)
        if (columnOrders?.recibido?.length > 0) {
          const oldestRecibido = columnOrders.recibido[0];
          onUpdateStatus(oldestRecibido.id, oldestRecibido.status);
          return;
        }
        
        // Si no hay nuevos, intentar bump en Preparando (preparando)
        if (columnOrders?.preparando?.length > 0) {
          const oldestPreparando = columnOrders.preparando[0];
          onUpdateStatus(oldestPreparando.id, oldestPreparando.status);
          return;
        }
      }

      // 2. Tecla Backspace -> Deshacer la última acción
      if (e.code === 'Backspace') {
        e.preventDefault();
        if (onUndo) {
          onUndo();
        }
        return;
      }

      // 3. Teclas 1 al 6 -> Cambiar de estación activa
      const keyInt = parseInt(e.key, 10);
      if (keyInt >= 1 && keyInt <= 6) {
        e.preventDefault();
        const targetStation = KITCHEN_STATIONS[keyInt - 1];
        if (targetStation && onStationChange) {
          onStationChange(targetStation);
        }
        return;
      }

      // 4. Teclas Q, W, E, R -> Cambiar de pestaña (Tablero, Historial, Expo, Delivery)
      if (e.code === 'KeyQ') {
        e.preventDefault();
        setActiveTab('board');
      } else if (e.code === 'KeyW') {
        e.preventDefault();
        setActiveTab('historial');
      } else if (e.code === 'KeyE') {
        e.preventDefault();
        setActiveTab('expo');
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        setActiveTab('delivery');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [columnOrders, onUpdateStatus, onUndo, activeStation, onStationChange, activeTab, setActiveTab]);
}
