import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import HouseMenuNav from '../components/HouseMenuNav';
import ThemeToggle from '../components/ThemeToggle';
import ChatWindow from '../components/ChatWindow';

const CHAT_CONFIG = {
  '/cocina': { sender: 'kitchen', senderName: 'Cocina', title: 'Chat Cocina ↔ Despacho' },
  '/despacho': { sender: 'dispatch', senderName: 'Despacho', title: 'Chat Despacho ↔ Cocina' },
  '/admin': { sender: 'admin', senderName: 'Admin', title: 'Chat Admin' },
};

export default function AppLayout() {
  const location = useLocation();
  const chatConfig = CHAT_CONFIG[location.pathname];

  return (
    <div className="min-h-screen bg-cm-bg flex">
      <HouseMenuNav />
      <div className="flex-1 md:pl-64 pt-16 md:pt-0 p-4 md:p-8 overflow-y-auto">
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
