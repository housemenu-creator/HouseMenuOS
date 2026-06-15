import { useState, useCallback, lazy, Suspense, useEffect } from 'react';
import Layout from './components/Layout';
import AuthScreen from './pages/AuthScreen';
import { Loader2 } from 'lucide-react';
import { appStore } from '@house/store';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SchedulePage = lazy(() => import('./pages/SchedulePage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AttendancePage = lazy(() => import('./pages/AttendancePage'));

const SESSION_KEY = 'portal_employee';

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveSession(employee) {
  try {
    if (employee) sessionStorage.setItem(SESSION_KEY, JSON.stringify(employee));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch { /* noop */ }
}

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="w-6 h-6 text-cm-accent animate-spin" />
    </div>
  );
}

export default function App() {
  const [employee, setEmployee] = useState(() => loadSession());
  const [activeView, setActiveView] = useState('dashboard');
  const [branchId, setBranchId] = useState(() => appStore.getState().activeBranchId);

  // Subscribe to branch changes from shared store
  useEffect(() => {
    const unsub = appStore.subscribe((state) => {
      setBranchId(state.activeBranchId);
    });
    return unsub;
  }, []);

  const handleAuthenticated = useCallback((emp) => {
    setEmployee(emp);
    saveSession(emp);
  }, []);

  const handleLogout = useCallback(() => {
    setEmployee(null);
    setActiveView('dashboard');
    saveSession(null);
  }, []);

  // If no employee logged in → show PIN screen (eager loaded)
  if (!employee) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  const renderView = () => {
    const page = (() => {
      switch (activeView) {
        case 'dashboard':  return <DashboardPage employee={employee} branchId={branchId} />;
        case 'schedule':   return <SchedulePage employee={employee} branchId={branchId} />;
        case 'tasks':      return <TasksPage employee={employee} branchId={branchId} />;
        case 'attendance': return <AttendancePage employee={employee} branchId={branchId} />;
        case 'profile':    return <ProfilePage employee={employee} branchId={branchId} />;
        default:           return <DashboardPage employee={employee} branchId={branchId} />;
      }
    })();
    return <Suspense fallback={<PageFallback />}>{page}</Suspense>;
  };

  return (
    <Layout
      activeView={activeView}
      onNavigate={setActiveView}
      employee={employee}
      branchId={branchId}
      onLogout={handleLogout}
    >
      {renderView()}
    </Layout>
  );
}
