import { motion } from "framer-motion";
import MCPExplorer from "../components/explorer/MCPExplorer";

export default function ExplorerPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6">
      <h2 className="text-sm font-semibold mb-4">MCP Tools Explorer</h2>
      <MCPExplorer />
    </motion.div>
  );
}
