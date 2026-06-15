import { motion } from "framer-motion";
import Terminal from "../components/terminal/Terminal";

export default function TerminalPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6">
      <h2 className="text-sm font-semibold mb-4">Terminal — Agent Admin</h2>
      <Terminal />
    </motion.div>
  );
}
