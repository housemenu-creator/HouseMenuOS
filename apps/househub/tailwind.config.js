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
