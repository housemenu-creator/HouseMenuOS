import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BranchProvider } from './context/BranchContext';
import { AuthProvider } from './context/AuthContext';
import AuthGuard from './components/AuthGuard';
import ErrorBoundary from './components/ErrorBoundary';
import UIProvider from './components/UIProvider';
import AppLayout from './layouts/AppLayout';
import WorkerShell from './layouts/WorkerShell';
import { MarketingProvider } from './context/MarketingContext';

const LandingView = lazy(() => import('./pages/LandingView'));
const CustomerView = lazy(() => import('./pages/CustomerView'));
const KitchenView = lazy(() => import('./pages/KitchenView'));
const OrderTracker = lazy(() => import('./pages/OrderTracker'));
const AdminView = lazy(() => import('./pages/AdminView'));
const DispatchView = lazy(() => import('./pages/DispatchView'));
const MozoView = lazy(() => import('./pages/MozoView'));
const RepartidorView = lazy(() => import('./pages/RepartidorView'));
const VendedorView = lazy(() => import('./pages/VendedorView'));
const WorkerDashboard = lazy(() => import('./worker/components/WorkerDashboard'));

function SuspenseBoundary({ children, message }) {
  return (
    <ErrorBoundary message={message}>
      <Suspense fallback={
        <div className="min-h-screen bg-cm-bg flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-cm-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold text-cm-muted tracking-widest uppercase">Cargando...</p>
          </div>
        </div>
      }>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

function StaffGuard({ children }) {
  return (
    <AuthGuard allowedRoles={['admin', 'kitchen', 'mozo', 'dispatch', 'delivery', 'vendedor', 'cajero']}>
      {children}
    </AuthGuard>
  );
}

export default function App() {
  return (
    <ErrorBoundary message="Error crítico en la aplicación">
      <BranchProvider>
        <BrowserRouter basename="/menu-app">
          <AuthProvider>
            <UIProvider>
              <MarketingProvider>
              <Routes>
                {/* ── Zona Pública + Admin (con sidebar) ── */}
                <Route element={<AppLayout />}>
                  <Route path="/" element={<SuspenseBoundary message="Error en la landing"><LandingView /></SuspenseBoundary>} />
                  <Route path="/carta" element={<SuspenseBoundary message="Error en la vista de cliente"><CustomerView /></SuspenseBoundary>} />
                  <Route path="/rastreo" element={<SuspenseBoundary message="Error en el rastreador de pedidos"><OrderTracker /></SuspenseBoundary>} />
                  <Route path="/admin" element={<AuthGuard allowedRoles={['admin', 'cajero']}><SuspenseBoundary message="Error en el panel de administración"><AdminView /></SuspenseBoundary></AuthGuard>} />
                </Route>

                {/* ── Zona Staff (sin sidebar, con WorkerShell) ── */}
                <Route path="/staff" element={<StaffGuard><WorkerShell /></StaffGuard>}>
                  <Route index element={<SuspenseBoundary message="Error en el dashboard"><WorkerDashboard /></SuspenseBoundary>} />
                  <Route path="mozo" element={<SuspenseBoundary message="Error en el módulo mozo"><MozoView /></SuspenseBoundary>} />
                  <Route path="cocina" element={<SuspenseBoundary message="Error en el KDS"><KitchenView /></SuspenseBoundary>} />
                  <Route path="despacho" element={<SuspenseBoundary message="Error en el despacho"><DispatchView /></SuspenseBoundary>} />
                  <Route path="delivery" element={<SuspenseBoundary message="Error en el portal de reparto"><RepartidorView /></SuspenseBoundary>} />
                  <Route path="vendedor" element={<SuspenseBoundary message="Error en el módulo de ventas"><VendedorView /></SuspenseBoundary>} />
                </Route>

                {/* ── Redirects viejas → nuevas ──────── */}
                <Route path="/cocina" element={<Navigate to="/staff/cocina" replace />} />
                <Route path="/despacho" element={<Navigate to="/staff/despacho" replace />} />
                <Route path="/mozo" element={<Navigate to="/staff/mozo" replace />} />
                <Route path="/delivery" element={<Navigate to="/staff/delivery" replace />} />
                <Route path="/vendedor" element={<Navigate to="/staff/vendedor" replace />} />
                <Route path="/trabajador" element={<Navigate to="/staff" replace />} />
              </Routes>
              </MarketingProvider>
            </UIProvider>
          </AuthProvider>
        </BrowserRouter>
      </BranchProvider>
    </ErrorBoundary>
  );
}
