import { motion } from "framer-motion";
import ActivityFeed from "../components/activity/ActivityFeed";

export default function LogsPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6">
      <h2 className="text-sm font-semibold mb-4">Todos los Logs</h2>
      <ActivityFeed />
    </motion.div>
  );
}
