import { Outlet, useLocation } from 'react-router-dom';
import HouseMenuNav from '../components/HouseMenuNav';
import { ROUTES } from '../lib/routes';
import ThemeToggle from '../components/ThemeToggle';

export default function AppLayout() {
  const location = useLocation();
  const isLanding = location.pathname === ROUTES.HOME;
  const isAdmin = location.pathname.startsWith(ROUTES.ADMIN);

  // Wrapper class based on route
  let wrapperClass = 'flex-1 ';
  if (isLanding) {
    wrapperClass += '';
  } else if (isAdmin) {
    wrapperClass += 'md:pl-64 pt-16 md:pt-0 h-screen flex flex-col overflow-hidden';
  } else {
    wrapperClass += 'overflow-y-auto md:pl-64 pt-16 md:pt-0 p-4 md:p-8';
  }

  return (
    <div className="min-h-screen bg-cm-bg flex">
      {!isLanding && <HouseMenuNav />}
      <div className={wrapperClass}>
        <Outlet />
      </div>
      <ThemeToggle />
    </div>
  );
}
