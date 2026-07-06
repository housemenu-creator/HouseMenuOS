import { useState } from 'react';
import { motion } from 'framer-motion';
import type { ComponentType } from 'react';
import { Clock, CalendarDays, ListChecks, User, History } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import EmpleadosDashboard from './EmpleadosDashboard';
import ScheduleView from './ScheduleView';
import TasksView from './TasksView';
import AttendanceView from './AttendanceView';
import ProfileView from './ProfileView';

interface TabItem {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const TABS: TabItem[] = [
  { id: 'dashboard',  label: 'Fichado',   icon: Clock },
  { id: 'attendance', label: 'Historial', icon: History },
  { id: 'schedule',   label: 'Horarios',  icon: CalendarDays },
  { id: 'tasks',      label: 'Tareas',    icon: ListChecks },
  { id: 'profile',    label: 'Perfil',    icon: User },
];

export default function EmpleadosView() {
  const { session } = useAuth();
  const { activeBranchId } = useBranch();
  const [activeTab, setActiveTab] = useState('dashboard');

  const uid = (session as Record<string, unknown> | null)?.firebaseUid || (session as Record<string, unknown> | null)?.id as string | undefined;

  if (!uid) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-sm text-cm-text-secondary">No se pudo identificar al usuario.</p>
      </div>
    );
  }

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <EmpleadosDashboard uid={uid} branchId={activeBranchId} />;
      case 'schedule':
        return <ScheduleView uid={uid} />;
      case 'tasks':
        return <TasksView uid={uid} />;
      case 'attendance':
        return <AttendanceView uid={uid} />;
      case 'profile':
        return <ProfileView uid={uid} branchId={activeBranchId} />;
      default:
        return <EmpleadosDashboard uid={uid} branchId={activeBranchId} />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-5xl mx-auto w-full">
      {/* Tab navigation */}
      <div className="mb-6">
        <div className="flex gap-1 border-b border-cm-border pb-0.5 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-all rounded-t-[--cm-radius-md] relative ${
                  isActive
                    ? 'text-cm-primary bg-cm-accent-surface'
                    : 'text-cm-text-secondary hover:text-cm-text hover:bg-cm-surface-hover'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="empleados-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-cm-accent rounded-full"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* View content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {renderView()}
      </motion.div>
    </div>
  );
}
