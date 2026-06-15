import { motion } from "framer-motion";
import ChatHistory from "../components/agents/ChatHistory";

export default function ConversationsPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6">
      <h2 className="text-sm font-semibold mb-4">Historial de Conversaciones</h2>
      <ChatHistory />
    </motion.div>
  );
}
