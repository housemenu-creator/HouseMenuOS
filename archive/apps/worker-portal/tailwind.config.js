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
        "cm-accent-light": "var(--cm-accent-light)",
        "cm-accent-surface": "var(--cm-accent-surface)",
        "cm-border": "var(--cm-border)",
        "cm-success": "var(--cm-success)",
        "cm-error": "var(--cm-error)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        "cm-sm": "var(--cm-shadow-sm)",
        "cm-md": "var(--cm-shadow-md)",
        "cm-lg": "var(--cm-shadow-lg)",
      },
    },
  },
  plugins: [],
}
