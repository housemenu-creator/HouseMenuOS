import { Outlet, useLocation } from 'react-router-dom';
import HouseMenuNav from '../components/HouseMenuNav';
import PublicNav from '../components/PublicNav';
import { ROUTES } from '../lib/routes';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

export default function AppLayout() {
  const location = useLocation();
  const { user } = useAuth();

  const path = location.pathname;

  // Landing pages: exact / or /r/:slug (with or without trailing /)
  const isLanding = path === ROUTES.HOME || /^\/r\/[^\/]+\/?$/.test(path);

  // Admin / control-center routes (including tenant variants)
  const isAdminPage =
    path.startsWith(ROUTES.ADMIN) ||
    path.startsWith('/control-center') ||
    /^\/r\/[^\/]+\/(admin|control-center)/.test(path);

  // Public pages inside AppLayout (e.g., /rastreo, /r/:slug/rastreo)
  const isPublicPage = !isLanding && !isAdminPage;

  const isStaff = !!user;

  // Nav decision:
  //   landing     → no nav at all
  //   public page → PublicNav (top bar) for guests, HouseMenuNav for staff
  //   admin page  → HouseMenuNav (sidebar) for everyone (AuthGuard handles unauthorized)
  const showPublicNav = isPublicPage && !isStaff;
  const showSidebar = !isLanding && (isStaff || isAdminPage);

  // Wrapper class based on which nav is visible
  let wrapperClass = 'flex-1 ';
  if (isLanding) {
    wrapperClass += 'overflow-y-auto';
  } else if (showPublicNav) {
    wrapperClass += 'pt-14 overflow-y-auto';
  } else if (isAdminPage) {
    wrapperClass += 'md:pl-64 pt-16 md:pt-0 h-screen flex flex-col overflow-hidden';
  } else {
    // e.g. staff on /rastreo with sidebar
    wrapperClass += 'overflow-y-auto md:pl-64 pt-16 md:pt-0 p-4 md:p-8';
  }

  return (
    <div className="min-h-screen bg-cm-bg flex">
      {showSidebar && <HouseMenuNav />}
      {showPublicNav && <PublicNav />}
      <div className={wrapperClass}>
        <Outlet />
      </div>
      <ThemeToggle />
    </div>
  );
}
