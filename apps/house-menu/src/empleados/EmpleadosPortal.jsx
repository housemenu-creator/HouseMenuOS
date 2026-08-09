import { useState, useCallback } from 'react';
import EmpleadoLogin from './EmpleadoLogin';
import EmpleadoLayout from './EmpleadoLayout';
import Fichado from './pages/Fichado';
import Historial from './pages/Historial';
import Horarios from './pages/Horarios';
import Tareas from './pages/Tareas';
import Perfil from './pages/Perfil';
import { useBranch } from '../context/BranchContext';

export default function EmpleadosPortal() {
  const [employee, setEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState('fichado');
  const { activeBranchId } = useBranch();

  const handleLogout = useCallback(() => setEmployee(null), []);

  if (!employee) return <EmpleadoLogin onAuthenticated={setEmployee} />;

  const pages = {
    fichado:   <Fichado   employee={employee} branchId={activeBranchId} />,
    historial: <Historial employee={employee} branchId={activeBranchId} />,
    horarios:  <Horarios  employee={employee} branchId={activeBranchId} />,
    tareas:    <Tareas    employee={employee} branchId={activeBranchId} />,
    perfil:    <Perfil    employee={employee} branchId={activeBranchId} />,
  };

  return (
    <EmpleadoLayout
      employee={employee}
      branchId={activeBranchId}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onLogout={handleLogout}
    >
      {pages[activeTab]}
    </EmpleadoLayout>
  );
}
