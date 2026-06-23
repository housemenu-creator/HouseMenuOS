import { Outlet, useLocation } from 'react-router-dom';
import HouseMenuNav from '../components/HouseMenuNav';
import { ROUTES } from '../lib/routes';
import ThemeToggle from '../components/ThemeToggle';
import ChatWindow from '../components/ChatWindow';

interface ChatConfigEntry {
  sender: string;
  senderName: string;
  title: string;
}

const CHAT_CONFIG: Record<string, ChatConfigEntry> = {
  '/cocina': { sender: 'kitchen', senderName: 'Cocina', title: 'Chat Cocina ↔ Despacho' },
  '/despacho': { sender: 'dispatch', senderName: 'Despacho', title: 'Chat Despacho ↔ Cocina' },
  [ROUTES.ADMIN]: { sender: 'admin', senderName: 'Admin', title: 'Chat Admin' },
};

export default function AppLayout() {
  const location = useLocation();
  const isLanding = location.pathname === ROUTES.HOME;
  const isAdmin = location.pathname.startsWith(ROUTES.ADMIN);
  const chatConfig = CHAT_CONFIG[location.pathname];

  // Determine wrapper class based on current route
  let wrapperClass = 'flex-1 ';
  if (isLanding) {
    wrapperClass += '';
  } else if (isAdmin) {
    wrapperClass += 'md:pl-64 h-screen flex flex-col overflow-hidden';
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
      {chatConfig && (
        <ChatWindow
          sender={chatConfig.sender}
          senderName={chatConfig.senderName}
          title={chatConfig.title}
        />
      )}
    </div>
  );
}
