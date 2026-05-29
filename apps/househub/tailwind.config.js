/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
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
        "cm-warning": "var(--cm-warning)",
        "cm-error": "var(--cm-error)",
        "hub-bg": "var(--cm-bg)",
        "hub-card": "var(--cm-surface)",
        "hub-border": "var(--cm-border)",
        "hub-text": "var(--cm-text)",
        "hub-muted": "var(--cm-text-secondary)",
        "hub-accent": "var(--cm-accent)",
        "hub-success": "var(--cm-success)",
        "hub-warning": "var(--cm-warning)",
        "hub-error": "var(--cm-error)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [
    ({ addUtilities }) => {
      addUtilities({
        ".glass": {
          "@apply cm-glass": {},
        },
        ".glass-strong": {
          "@apply cm-glass-strong": {},
        },
      });
    },
  ],
}
