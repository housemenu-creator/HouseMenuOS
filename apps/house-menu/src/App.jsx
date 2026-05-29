import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { BranchProvider } from './context/BranchContext';
import { AuthProvider } from './context/AuthContext';
import AuthGuard from './components/AuthGuard';
import ErrorBoundary from './components/ErrorBoundary';
import UIProvider from './components/UIProvider';
import AppLayout from './layouts/AppLayout';

const CustomerView = lazy(() => import('./pages/CustomerView'));
const KitchenView = lazy(() => import('./pages/KitchenView'));
const OrderTracker = lazy(() => import('./pages/OrderTracker'));
const AdminView = lazy(() => import('./pages/AdminView'));
const DispatchView = lazy(() => import('./pages/DispatchView'));
const MozoView = lazy(() => import('./pages/MozoView'));
const RepartidorView = lazy(() => import('./pages/RepartidorView'));

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

export default function App() {
  return (
    <ErrorBoundary message="Error crítico en la aplicación">
      <BranchProvider>
        <BrowserRouter>
          <AuthProvider>
            <UIProvider>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<SuspenseBoundary message="Error en la vista de cliente"><CustomerView /></SuspenseBoundary>} />
                <Route path="/rastreo" element={<SuspenseBoundary message="Error en el rastreador de pedidos"><OrderTracker /></SuspenseBoundary>} />
                <Route path="/cocina" element={<AuthGuard allowedRoles={['kitchen']}><SuspenseBoundary message="Error en el KDS"><KitchenView /></SuspenseBoundary></AuthGuard>} />
                <Route path="/admin" element={<AuthGuard allowedRoles={['admin', 'cajero']}><SuspenseBoundary message="Error en el panel de administración"><AdminView /></SuspenseBoundary></AuthGuard>} />
                <Route path="/despacho" element={<AuthGuard allowedRoles={['dispatch']}><SuspenseBoundary message="Error en el despacho"><DispatchView /></SuspenseBoundary></AuthGuard>} />
                <Route path="/mozo" element={<AuthGuard allowedRoles={['mozo']}><SuspenseBoundary message="Error en el módulo mozo"><MozoView /></SuspenseBoundary></AuthGuard>} />
              </Route>
              <Route path="/delivery" element={<AuthGuard allowedRoles={['delivery']}><SuspenseBoundary message="Error en el portal de reparto"><RepartidorView /></SuspenseBoundary></AuthGuard>} />
            </Routes>
            </UIProvider>
          </AuthProvider>
        </BrowserRouter>
      </BranchProvider>
    </ErrorBoundary>
  );
}
