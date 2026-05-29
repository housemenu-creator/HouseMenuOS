/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
    "../../packages/ui/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        "cm-bg": "var(--cm-bg)",
        "cm-surface": "var(--cm-surface)",
        "cm-text": "var(--cm-text)",
        "cm-text-secondary": "var(--cm-text-secondary)",
        "cm-accent": "var(--cm-accent)",
        "cm-accent-hover": "var(--cm-accent-hover)",
        "cm-border": "var(--cm-border)",
        "cm-success": "var(--cm-success)",
        "cm-error": "var(--cm-error)",
        "worker-bg": "var(--cm-bg)",
        "worker-card": "var(--cm-surface)",
        "worker-primary": "var(--cm-accent)",
        "worker-accent": "var(--cm-accent)",
        "worker-text": "var(--cm-text)",
        "worker-muted": "var(--cm-text-secondary)",
        "worker-online": "var(--cm-success)",
        "worker-border": "var(--cm-border)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        pixel: ["ui-monospace", "monospace"],
      },
      boxShadow: {
        "cm-sm": "var(--cm-shadow-sm)",
        "cm-md": "var(--cm-shadow-md)",
        "cm-lg": "var(--cm-shadow-lg)",
        "glow": "0 0 20px rgba(194, 65, 12, 0.3)",
      },
    },
  },
  plugins: [],
}
