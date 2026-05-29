import React, { useState, useEffect } from 'react';
import { SERVICES, PORTAL_CONFIG } from '../config.js';
import { useAppStore } from '@house/store';
// import { NexusSidebar } from '@house/ui'; // Since it's meant to be Neo-Brutalist, we can either use NexusSidebar or recreate the exact HTML from before.
// The analysis says we should be able to consume it, but for a 1:1 exact visual match with what was in index.html, we will implement the Neo-Brutalist components here first.

function StatusBadge({ serviceId, url, isComingSoon }) {
  const [status, setStatus] = useState('Verificando...');
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (isComingSoon) return;

    let isMounted = true;
    const checkStatus = async () => {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), PORTAL_CONFIG.pingTimeout);
        await fetch(url, { method: 'HEAD', signal: ctrl.signal, mode: 'no-cors' });
        clearTimeout(timer);
        if (isMounted) {
          setStatus('CONECTADO');
          setIsOnline(true);
        }
      } catch {
        if (isMounted) {
          setStatus('DESCONECTADO');
          setIsOnline(false);
        }
      }
    };

    checkStatus();
    const intervalId = setInterval(checkStatus, PORTAL_CONFIG.pingInterval);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [url, isComingSoon]);

  if (isComingSoon) {
    return <span className="bg-surface-variant text-on-surface-variant px-3 py-1 text-xs font-bold uppercase brutal-border border-dashed">PRÓXIMAMENTE</span>;
  }

  if (status === 'Verificando...') {
    return <span className="bg-surface-variant text-on-background px-3 py-1 text-xs font-bold uppercase brutal-border">Verificando...</span>;
  }

  return (
    <span className={`${isOnline ? 'bg-primary text-on-primary' : 'bg-error text-on-error'} px-3 py-1 text-xs font-bold uppercase brutal-border`}>
      {status}
    </span>
  );
}

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <div className="text-2xl font-bold text-primary brutal-border p-2 bg-surface-variant text-center">{time.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>;
}

export default function App() {
  const cart = useAppStore((state) => state.cart || []);

  const buildNavLinks = () => {
    const labels = {
      servicios: <div className="text-xs font-bold tracking-widest uppercase text-on-surface-variant mt-4 mb-2">SERVICIOS</div>,
      equipo: <div className="text-xs font-bold tracking-widest uppercase text-on-surface-variant mt-4 mb-2">EQUIPO</div>,
      entretenimiento: <div className="text-xs font-bold tracking-widest uppercase text-on-surface-variant mt-4 mb-2">ENTRETENIMIENTO</div>,
    };

    let lastCategory = null;
    let elements = [];

    elements.push(
      <a key="nexus" href="#" className="flex items-center gap-4 bg-primary text-on-primary px-4 py-3 brutal-border brutal-shadow active:translate-y-1 transition-transform">
        <span className="material-symbols-outlined">dashboard</span>
        <span className="font-bold text-sm uppercase tracking-widest">Dashboard Ayni</span>
      </a>
    );

    Object.values(SERVICES).forEach((svc) => {
      if (svc.category !== lastCategory) {
        if (labels[svc.category]) {
          elements.push(React.cloneElement(labels[svc.category], { key: `label-${svc.category}` }));
        }
        lastCategory = svc.category;
      }

      const isComingSoon = svc.status === 'coming-soon';
      
      elements.push(
        <a 
          key={svc.id} 
          href={isComingSoon ? '#' : svc.url} 
          target={isComingSoon ? '' : '_blank'} 
          rel={isComingSoon ? '' : 'noopener noreferrer'}
          className={`flex items-center gap-4 text-on-surface-variant px-4 py-3 brutal-border hover:bg-surface-variant hover:text-on-background transition-all brutal-shadow active:translate-y-1 ${isComingSoon ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span className="w-6 h-6 flex items-center justify-center" dangerouslySetInnerHTML={{ __html: svc.icon }} />
          <span className="font-bold text-sm uppercase tracking-widest">{svc.name}</span>
          {isComingSoon && <span className="ml-auto text-[10px] font-bold bg-surface-variant px-2 py-1 brutal-border uppercase">Pronto</span>}
        </a>
      );
    });

    return elements;
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* SideNavBar (Desktop) */}
      <aside className="fixed left-0 top-0 h-full flex flex-col p-6 border-r-4 border-outline bg-surface hidden md:flex w-72 z-50">
        <div className="mb-12 border-b-4 border-outline pb-4">
          <h1 className="text-4xl font-bold text-primary tracking-tighter uppercase">AYNI HUB</h1>
          <p className="text-sm font-bold text-on-background uppercase tracking-widest mt-2">Ecosistema Central</p>
        </div>
        
        <nav className="flex flex-col gap-4 flex-grow">
          {buildNavLinks()}
        </nav>
        
        <div className="mt-auto flex flex-col gap-4 border-t-4 border-outline pt-6">
          <div className="text-xs font-bold tracking-widest uppercase mb-1">Hora Local</div>
          <Clock />
          
          <div className="status-indicator mt-4 p-2 bg-secondary-container brutal-border font-bold text-xs uppercase flex items-center justify-between">
              <span>Sistema:</span> <span className="bg-on-background text-surface px-2 py-1">ACTIVO</span>
          </div>

          <div className="mt-2 p-2 bg-primary-container text-on-primary-container brutal-border font-bold text-xs uppercase flex items-center justify-between">
              <span>PEDIDOS ACTIVOS:</span> <span className="bg-on-background text-surface px-2 py-1">{cart.length} ITEMS</span>
          </div>
        </div>
      </aside>

      {/* TopAppBar (Mobile) */}
      <header className="fixed top-0 z-40 w-full h-16 flex justify-between items-center px-4 border-b-4 border-outline bg-surface md:hidden">
        <span className="text-xl font-bold text-primary uppercase">Ayni Hub</span>
        <span className="material-symbols-outlined">menu</span>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-grow pt-20 pb-24 md:pt-12 md:pb-12 md:pl-80 px-margin-mobile md:px-margin-desktop bg-background">
        
        <section className="mb-12 border-b-4 border-outline pb-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h3 className="text-5xl font-bold uppercase tracking-tighter mb-2">Panel de Control</h3>
              <p className="text-lg font-bold text-on-background uppercase">Accede a tus herramientas Neo-Brutalistas</p>
            </div>
            <button className="flex items-center gap-2 bg-primary text-on-primary font-bold py-3 px-6 uppercase tracking-wider brutal-border brutal-shadow">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              Sincronizar IA
            </button>
          </div>
        </section>

        {/* Dashboard Grid */}
        <h4 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-6">MÓDULOS DE SISTEMA</h4>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter mb-12">
          {Object.values(SERVICES).map(svc => {
            const isComingSoon = svc.status === 'coming-soon';
            
            return (
              <div
                key={svc.id}
                className={`md:col-span-4 bg-surface p-6 brutal-border brutal-shadow flex flex-col justify-between ${isComingSoon ? 'opacity-60 border-dashed cursor-default' : 'cursor-pointer'}`}
                onClick={() => {
                  if (!isComingSoon) window.open(svc.url, '_blank');
                }}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-16 h-16 brutal-border bg-surface-variant flex items-center justify-center text-primary">
                    <span className="w-8 h-8 flex items-center justify-center" dangerouslySetInnerHTML={{ __html: svc.icon }} />
                  </div>
                  <StatusBadge serviceId={svc.id} url={svc.url} isComingSoon={isComingSoon} />
                </div>
                <h3 className="text-2xl font-bold uppercase mb-2 tracking-tight">{svc.name}</h3>
                <p className="text-sm font-bold text-on-surface-variant mb-6 uppercase">{svc.description}</p>
                <div className="mt-auto border-t-2 border-outline pt-4 flex justify-between items-center">
                   <span className={`text-xs font-bold uppercase ${isComingSoon ? 'text-on-surface-variant' : 'text-primary'}`}>{isComingSoon ? 'En Desarrollo' : 'Abrir Módulo'}</span>
                   <span className={`material-symbols-outlined ${isComingSoon ? 'text-on-surface-variant' : 'text-primary'}`}>{isComingSoon ? 'construction' : 'arrow_forward'}</span>
                </div>
              </div>
            );
          })}
        </div>

      </main>
    </div>
  );
}
