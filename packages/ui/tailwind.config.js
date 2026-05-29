/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,stories.jsx}",
    "./.storybook/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        "cm-bg": "var(--cm-bg)",
        "cm-accent": "var(--cm-accent)",
        "cm-accent-hover": "var(--cm-accent-hover)",
        "cm-text": "var(--cm-text)",
        "cm-text-secondary": "var(--cm-text-secondary)",
        "cm-muted": "var(--cm-text-secondary)",
      },
      fontFamily: {
        heading: ["'Playfair Display SC'", "serif"],
        body: ["'Karla'", "sans-serif"],
      },
      boxShadow: {
        'md': '6px 6px 0 var(--cm-accent)',
      }
    },
  },
  plugins: [],
}
