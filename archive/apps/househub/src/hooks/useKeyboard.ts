import { useEffect } from "react";

type Handler = () => void;

const bindings: Record<string, Record<string, Handler>> = {
  dashboard: { T: () => document.getElementById("terminal-input")?.focus(), L: () => window.location.hash = "#/logs", D: () => window.location.hash = "#/", K: () => document.getElementById("cmd-palette")?.classList.remove("hidden") },
};

export function useKeyboard() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.ctrlKey && e.key === "k") {
        e.preventDefault();
        document.getElementById("cmd-palette")?.classList.toggle("hidden");
        return;
      }
      const route = window.location.hash.replace("#", "") || "/";
      const page = route === "/" ? "dashboard" : route.slice(1);
      const b = bindings[page];
      if (b?.[e.key.toUpperCase()]) {
        e.preventDefault();
        b[e.key.toUpperCase()]();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
