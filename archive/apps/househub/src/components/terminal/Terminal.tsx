import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Terminal as TerminalIcon } from "lucide-react";

interface CmdEntry {
  input: string;
  output: string;
  timestamp: number;
}

export default function Terminal() {
  const [history, setHistory] = useState<CmdEntry[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const execute = async () => {
    if (!input.trim() || busy) return;
    const cmd = input.trim();
    setInput("");
    setBusy(true);
    setHistory((prev) => [...prev, { input: cmd, output: "⏳ Ejecutando...", timestamp: Date.now() }]);

    try {
      const branchId = import.meta.env.VITE_HUB_BRANCH || "default";
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: cmd, branchId, agentId: "admin" }),
      });
      const data = await res.json();
      setHistory((prev) => {
        const updated = [...prev];
        updated[updated.length - 1].output = data.message || JSON.stringify(data);
        return updated;
      });
    } catch (e: any) {
      setHistory((prev) => {
        const updated = [...prev];
        updated[updated.length - 1].output = `Error: ${e.message}`;
        return updated;
      });
    }
    setBusy(false);
  };

  return (
    <div className="bg-cm-surface border border-cm-border rounded-xl flex flex-col h-[500px]">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-cm-border text-sm font-medium">
        <TerminalIcon size={14} />
        Terminal — Agent Admin
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
        {history.length === 0 && (
          <p className="text-cm-text-secondary">Escribe un comando para ejecutar. Ej: "resumen del día", "cierra caja", "qué stock tengo?"</p>
        )}
        {history.map((entry, i) => (
          <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="text-cm-accent">&gt; {entry.input}</div>
            <div className="text-cm-text mt-1 whitespace-pre-wrap">{entry.output}</div>
          </motion.div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="border-t border-cm-border p-3">
        <div className="flex gap-2">
          <input
            id="terminal-input"
            className="flex-1 bg-cm-bg border border-cm-border rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-cm-accent"
            placeholder="Escribe un comando..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && execute()}
            disabled={busy}
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={execute}
            disabled={busy || !input.trim()}
            className="px-3 py-2 bg-cm-accent text-white rounded-lg disabled:opacity-50"
          >
            <Send size={16} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
