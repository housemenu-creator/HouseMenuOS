import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export default function ConnectionStatus({ className = '' }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
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
