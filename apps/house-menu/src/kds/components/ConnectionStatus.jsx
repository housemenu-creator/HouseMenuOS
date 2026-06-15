import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { Wifi, WifiOff } from 'lucide-react';
import { realtimeDB } from '@house/db';

export default function ConnectionStatus({ className = '' }) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const connectedRef = ref(realtimeDB, '.info/connected');
    const unsub = onValue(connectedRef, (snap) => {
      setIsOnline(snap.val() === true);
    });
    return () => unsub();
  }, []);

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[0.6rem] font-bold tracking-wider uppercase transition-colors ${
      isOnline ? 'bg-cm-success/10 text-cm-success border border-cm-success/20' : 'bg-cm-error/10 text-cm-error border border-cm-error/20'
    } ${className}`}>
      {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
      {isOnline ? 'En línea' : 'Sin conexión'}
    </div>
  );
}
