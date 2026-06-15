import { useState } from "react";
import { motion } from "framer-motion";
import { Search, MessageSquare, ChevronRight } from "lucide-react";
import { useActivityLog } from "../../hooks/useActivityLog";

export default function ChatHistory() {
  const { logs, loading } = useActivityLog(200);
  const [search, setSearch] = useState("");
  const [selectedChat, setSelectedChat] = useState<string | null>(null);

  // Group by chatId
  const chatMap = new Map<string, { chatId: string; messages: typeof logs; lastMessage: string; lastTime: number }>();
  for (const log of logs) {
    if (!log.chatId) continue;
    const existing = chatMap.get(log.chatId);
    if (existing) {
      existing.messages.push(log);
      if (log.timestamp > existing.lastTime) {
        existing.lastTime = log.timestamp;
        existing.lastMessage = log.message;
      }
    } else {
      chatMap.set(log.chatId, { chatId: log.chatId, messages: [log], lastMessage: log.message, lastTime: log.timestamp });
    }
  }

  const chats = Array.from(chatMap.values())
    .filter((c) => c.chatId.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.lastTime - a.lastTime);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-1 bg-cm-surface border border-cm-border rounded-xl overflow-hidden">
        <div className="p-3 border-b border-cm-border">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cm-text-secondary" />
            <input
              className="w-full bg-cm-bg border border-cm-border rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-cm-accent"
              placeholder="Buscar chat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="divide-y divide-cm-border max-h-[500px] overflow-y-auto">
          {chats.slice(0, 50).map((chat) => (
            <button
              key={chat.chatId}
              onClick={() => setSelectedChat(chat.chatId)}
              className={`w-full text-left px-4 py-3 hover:bg-cm-border/20 transition-colors ${
                selectedChat === chat.chatId ? "bg-cm-accent/10" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate">{chat.chatId}</span>
                <ChevronRight size={14} className="text-cm-text-secondary shrink-0" />
              </div>
              <p className="text-xs text-cm-text-secondary truncate mt-1">{chat.lastMessage}</p>
              <span className="text-[10px] text-cm-text-secondary mt-1">{chat.messages.length} interacciones</span>
            </button>
          ))}
        </div>
      </div>

      <div className="md:col-span-2 bg-cm-surface border border-cm-border rounded-xl p-4">
        {selectedChat ? (
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-cm-border">
              <MessageSquare size={16} />
              <span className="font-medium text-sm">{selectedChat}</span>
            </div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {chatMap.get(selectedChat)?.messages.slice(-30).map((log, i) => (
                <motion.div
                  key={log.id || i}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-lg text-sm ${
                    log.agentId === "admin"
                      ? "bg-purple-500/5 border border-purple-500/20 ml-8"
                      : "bg-blue-500/5 border border-blue-500/20 mr-8"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-cm-text-secondary mb-1">
                    <span className="font-medium">{log.tool}</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString("es-PE")}</span>
                  </div>
                  <p>{log.message}</p>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-cm-text-secondary">
            <MessageSquare size={32} className="mb-2 opacity-50" />
            <p className="text-sm">Selecciona un chat para ver la conversación</p>
          </div>
        )}
      </div>
    </div>
  );
}
