import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BranchProvider } from './context/BranchContext';
import { AuthProvider } from './context/AuthContext';
import { CustomerAuthProvider } from './context/CustomerAuthContext';
import AuthGuard from './components/AuthGuard';
import ErrorBoundary from './components/ErrorBoundary';
import UIProvider from './components/UIProvider';
import AppLayout from './layouts/AppLayout';
import WorkerShell from './layouts/WorkerShell';
import { MarketingProvider } from './context/MarketingContext';
import TenantResolver from './components/TenantResolver';
import { useBranding } from './hooks/useBranding';
import { useBranch } from './context/BranchContext';

const OnboardingWizard = lazy(() => import('./pages/OnboardingWizard'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const LandingView = lazy(() => import('./pages/LandingView'));
const CustomerView = lazy(() => import('./pages/CustomerView'));
const KitchenView = lazy(() => import('./pages/KitchenView'));
const OrderTracker = lazy(() => import('./pages/OrderTracker'));
const AdminView = lazy(() => import('./pages/AdminView'));
const DispatchView = lazy(() => import('./pages/DispatchView'));
const MozoView = lazy(() => import('./pages/MozoView'));
const RepartidorView = lazy(() => import('./pages/RepartidorView'));
const VendedorView = lazy(() => import('./pages/VendedorView'));
const CajeroView = lazy(() => import('./cashier'));
const NotificacionesView = lazy(() => import('./pages/NotificacionesView'));
const ControlCenterView = lazy(() => import('./pages/ControlCenterView'));
const EmpleadosView = lazy(() => import('./staff/empleados/EmpleadosView'));
const WorkerDashboard = lazy(() => import('./worker/components/WorkerDashboard'));
const DashboardRedirect = lazy(() => import('./worker/components/DashboardRedirect'));
const PrepedidosView = lazy(() => import('./worker/components/PrepedidosView'));
import KioskMode from './kds/components/KioskMode';
const MonitorView = lazy(() => import('./pages/MonitorView'));
const ReservaView = lazy(() => import('./pages/ReservaView'));
const MisPedidosView = lazy(() => import('./pages/MisPedidosView'));
const CustomerProfileView = lazy(() => import('./pages/CustomerProfileView'));
const EmpleadosPortal = lazy(() => import('./empleados/EmpleadosPortal'));

// ── Capturar referido desde URL al cargar la app ──
import { captureReferralFromURL } from './lib/customerService';
captureReferralFromURL();

/**
 * Aplica branding global basado en la sucursal activa.
 * Se monta dentro del árbol de rutas para tener acceso a activeBranchId.
 */
function BrandingLayer() {
  const { activeBranchId } = useBranch();
  useBranding(activeBranchId);
  return null;
}

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
    <AuthGuard allowedRoles={['admin', 'superadmin', 'kitchen', 'mozo', 'dispatch', 'delivery', 'vendedor', 'cajero']}>
      {children}
    </AuthGuard>
  );
}

const routerBasename = window.location.pathname.startsWith('/menu-app') ? '/menu-app' : '/';

export default function App() {
  return (
    <ErrorBoundary message="Error crítico en la aplicación">
      <BranchProvider>
        <BrowserRouter basename={routerBasename}>
          <AuthProvider>
            <CustomerAuthProvider>
            <UIProvider>
              <MarketingProvider>
              <BrandingLayer />
              <Routes>
                {/* ── Onboarding (sin layout, full page) ── */}
                <Route path="/onboarding" element={<SuspenseBoundary message="Error en el onboarding"><OnboardingWizard /></SuspenseBoundary>} />
                <Route path="/login" element={<SuspenseBoundary message="Error en el inicio de sesión"><LoginPage /></SuspenseBoundary>} />

                {/* ── Rutas de Cliente SaaS con Resolución de Tenant /r/:slug ── */}
                <Route path="/r/:slug" element={<TenantResolver />}>
                  <Route element={<AppLayout />}>
                    <Route index element={<SuspenseBoundary message="Error en la landing"><LandingView /></SuspenseBoundary>} />
                    <Route path="rastreo" element={<SuspenseBoundary message="Error en el rastreador de pedidos"><OrderTracker /></SuspenseBoundary>} />
                    <Route path="admin" element={<AuthGuard allowedRoles={['admin', 'superadmin', 'cajero']}><SuspenseBoundary message="Error en el panel de administración"><AdminView /></SuspenseBoundary></AuthGuard>} />
                    <Route path="control-center" element={<AuthGuard allowedRoles={['admin', 'superadmin']}><SuspenseBoundary message="Error en el control center"><ControlCenterView /></SuspenseBoundary></AuthGuard>} />
                  </Route>
                  {/* Vistas públicas sin sidebar */}
                  <Route path="carta" element={<SuspenseBoundary message="Error en la vista de cliente"><CustomerView /></SuspenseBoundary>} />
                  {/* Vistas sin layout con resolución de Tenant */}
                  <Route path="kiosko" element={<SuspenseBoundary message="Error en el kiosko"><KioskMode /></SuspenseBoundary>} />
                  <Route path="monitor" element={<SuspenseBoundary message="Error en el monitor"><MonitorView /></SuspenseBoundary>} />
                  <Route path="reserva" element={<SuspenseBoundary message="Error en reservas"><ReservaView /></SuspenseBoundary>} />
                  <Route path="mis-pedidos" element={<SuspenseBoundary message="Error en historial"><MisPedidosView /></SuspenseBoundary>} />
                  <Route path="mi-cuenta" element={<SuspenseBoundary message="Error en tu perfil"><CustomerProfileView /></SuspenseBoundary>} />
                </Route>

                {/* ── Zona Pública + Admin (con sidebar) ── */}
                <Route element={<AppLayout />}>
                  <Route path="/" element={<SuspenseBoundary message="Error en la landing"><LandingView /></SuspenseBoundary>} />
                  <Route path="/rastreo" element={<SuspenseBoundary message="Error en el rastreador de pedidos"><OrderTracker /></SuspenseBoundary>} />
                  <Route path="/admin" element={<AuthGuard allowedRoles={['admin', 'superadmin', 'cajero']}><SuspenseBoundary message="Error en el panel de administración"><AdminView /></SuspenseBoundary></AuthGuard>} />
                  <Route path="/control-center" element={<AuthGuard allowedRoles={['admin', 'superadmin']}><SuspenseBoundary message="Error en el control center"><ControlCenterView /></SuspenseBoundary></AuthGuard>} />
                </Route>
                {/* Carta pública sin sidebar */}
                <Route path="/carta" element={<SuspenseBoundary message="Error en la vista de cliente"><CustomerView /></SuspenseBoundary>} />

                {/* ── Portal Empleados (PIN auth propio, layout propio) ── */}
                <Route path="/empleados" element={<SuspenseBoundary message="Error en portal empleados"><EmpleadosPortal /></SuspenseBoundary>} />

                {/* ── Zona Staff (sin sidebar, con WorkerShell) ── */}
                <Route path="/staff" element={<StaffGuard><WorkerShell /></StaffGuard>}>
                  {/* Redirige al dashboard específico del rol */}
                  <Route index element={<DashboardRedirect />} />
                  {/* Dashboard por rol: /staff/{role}/dashboard */}
                  <Route path=":role/dashboard" element={
                    <SuspenseBoundary message="Error en el dashboard"><WorkerDashboard /></SuspenseBoundary>
                  } />
                  <Route path="mozo" element={
                    <AuthGuard requirePermission="orders:create">
                      <SuspenseBoundary message="Error en el módulo mozo"><MozoView /></SuspenseBoundary>
                    </AuthGuard>
                  } />
                  <Route path="cocina" element={
                    <AuthGuard requirePermission="orders:read">
                      <SuspenseBoundary message="Error en el KDS"><KitchenView /></SuspenseBoundary>
                    </AuthGuard>
                  } />
                  <Route path="prepedidos" element={
                    <AuthGuard requirePermission="orders:read">
                      <SuspenseBoundary message="Error en pre-pedidos"><PrepedidosView /></SuspenseBoundary>
                    </AuthGuard>
                  } />
                  <Route path="despacho" element={
                    <AuthGuard requirePermission="orders:update_status">
                      <SuspenseBoundary message="Error en el despacho"><DispatchView /></SuspenseBoundary>
                    </AuthGuard>
                  } />
                  <Route path="delivery" element={
                    <AuthGuard requirePermission="orders:read">
                      <SuspenseBoundary message="Error en el portal de reparto"><RepartidorView /></SuspenseBoundary>
                    </AuthGuard>
                  } />
                  <Route path="vendedor" element={
                    <AuthGuard requirePermission="cuentas:read">
                      <SuspenseBoundary message="Error en el módulo de ventas"><VendedorView /></SuspenseBoundary>
                    </AuthGuard>
                  } />
                  <Route path="caja" element={
                    <AuthGuard requirePermission="orders:mark_paid">
                      <SuspenseBoundary message="Error en el módulo de caja"><CajeroView /></SuspenseBoundary>
                    </AuthGuard>
                  } />
                  <Route path="notificaciones" element={
                    <AuthGuard requirePermission="chat:read">
                      <SuspenseBoundary message="Error en notificaciones"><NotificacionesView /></SuspenseBoundary>
                    </AuthGuard>
                  } />
                  <Route path="empleados" element={
                    <AuthGuard requirePermission="users:read">
                      <SuspenseBoundary message="Error en el portal de empleados"><EmpleadosView /></SuspenseBoundary>
                    </AuthGuard>
                  } />
                </Route>

                {/* ── Zona Pública sin layout ── */}
                  <Route path="/kiosko" element={<SuspenseBoundary message="Error en el kiosko"><KioskMode /></SuspenseBoundary>} />
                  <Route path="/monitor" element={<SuspenseBoundary message="Error en el monitor"><MonitorView /></SuspenseBoundary>} />
                  <Route path="/reserva" element={<SuspenseBoundary message="Error en reservas"><ReservaView /></SuspenseBoundary>} />
                  <Route path="/mis-pedidos" element={<SuspenseBoundary message="Error en historial"><MisPedidosView /></SuspenseBoundary>} />
                  <Route path="/mi-cuenta" element={<SuspenseBoundary message="Error en tu perfil"><CustomerProfileView /></SuspenseBoundary>} />

                {/* ── Redirects viejas → nuevas ──────── */}
                <Route path="/cocina" element={<Navigate to="/staff/cocina" replace />} />
                <Route path="/despacho" element={<Navigate to="/staff/despacho" replace />} />
                <Route path="/mozo" element={<Navigate to="/staff/mozo" replace />} />
                <Route path="/delivery" element={<Navigate to="/staff/delivery" replace />} />
                <Route path="/vendedor" element={<Navigate to="/staff/vendedor" replace />} />
                <Route path="/caja" element={<Navigate to="/staff/caja" replace />} />
                <Route path="/trabajador" element={<Navigate to="/staff" replace />} />
              </Routes>
              </MarketingProvider>
            </UIProvider>
            </CustomerAuthProvider>
          </AuthProvider>
        </BrowserRouter>
      </BranchProvider>
    </ErrorBoundary>
  );
}
