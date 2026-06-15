import { Outlet } from 'react-router-dom';
import StaffTopBar from '../components/StaffTopBar';

export default function WorkerShell() {
  return (
    <div className="min-h-screen bg-cm-bg flex flex-col">
      <StaffTopBar />
      <main className="flex-1 flex flex-col overflow-hidden pt-14">
        <Outlet />
      </main>
    </div>
  );
}
