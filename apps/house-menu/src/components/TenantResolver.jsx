import React, { useEffect, useState } from 'react';
import { useParams, Outlet, useNavigate } from 'react-router-dom';
import { resolveSlug } from '../lib/slugService';
import { setTenantId } from '../lib/tenantService';
import { appStore } from '@house/store';
import { TenantProvider } from '../context/TenantContext';
import { Store, ArrowRight } from 'lucide-react';

export default function TenantResolver() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [resolved, setResolved] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    async function doResolve() {
      if (!slug) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const result = await resolveSlug(slug);
        if (active) {
          if (result) {
            setTenantId(result.tenantId);
            // ponytail: redirect legacy 'default' branchId to monteverde
            const branchId = result.branchId === 'default' ? 'monteverde' : result.branchId;
            appStore.getState().setActiveBranchId(branchId);
            setResolved({ ...result, branchId });
          } else {
            setResolved(null);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('TenantResolver error:', err);
        if (active) {
          setResolved(null);
          setLoading(false);
        }
      }
    }
    doResolve();
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cm-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cm-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-cm-muted tracking-widest uppercase">
            Buscando restaurante...
          </p>
        </div>
      </div>
    );
  }

  if (!resolved) {
    return (
      <div className="min-h-screen bg-cm-bg flex flex-col justify-between p-6">
        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto text-center space-y-6">
          <div className="w-20 h-20 bg-cm-accent/10 rounded-2xl flex items-center justify-center text-cm-accent border border-cm-accent/20">
            <Store className="w-10 h-10" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-cm-text tracking-tight">
              Restaurante No Encontrado
            </h1>
            <p className="text-sm text-cm-muted leading-relaxed">
              No pudimos encontrar ningún restaurante registrado con la dirección <code className="px-1.5 py-0.5 bg-cm-surface border border-cm-border rounded text-cm-accent font-mono text-xs">/r/{slug}</code>.
            </p>
          </div>

          <div className="w-full pt-4 space-y-3">
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 bg-cm-surface hover:bg-cm-surface/80 border border-cm-border text-cm-text font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2"
            >
              Ir al Inicio
            </button>
            
            <a
              href="/onboarding"
              className="w-full py-3 bg-gradient-to-r from-cm-accent to-orange-500 text-white font-black text-sm rounded-xl hover:opacity-95 transition-all flex items-center justify-center gap-2"
            >
              Crear mi Restaurante <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
        
        <p className="text-xs text-cm-muted text-center font-semibold">
          HOUSE Portal OS · SaaS Menus
        </p>
      </div>
    );
  }

  return (
    <TenantProvider tenantId={resolved.tenantId} branchId={resolved.branchId} slug={slug}>
      <Outlet />
    </TenantProvider>
  );
}
