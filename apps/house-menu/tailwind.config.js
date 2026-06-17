/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "cm-bg": "var(--cm-bg)",
        "cm-bg-alt": "var(--cm-bg-alt)",
        "cm-surface": "var(--cm-surface)",
        "cm-surface-hover": "var(--cm-surface-hover)",
        "cm-text": "var(--cm-text)",
        "cm-text-secondary": "var(--cm-text-secondary)",
        "cm-text-tertiary": "var(--cm-text-tertiary)",
        "cm-accent": "var(--cm-accent)",
        "cm-accent-hover": "var(--cm-accent-hover)",
        "cm-accent-light": "var(--cm-accent-light)",
        "cm-border": "var(--cm-border)",
        "cm-border-hover": "var(--cm-border-hover)",
        "cm-success": "var(--cm-success)",
        "cm-warning": "var(--cm-warning)",
        "cm-error": "var(--cm-error)",
        "cm-info": "var(--cm-info)",
        "cm-primary": "var(--cm-primary)",
        "cm-primary-hover": "var(--cm-primary-hover)",
        "cm-muted": "var(--cm-text-tertiary)",
        "cm-success-soft": "var(--cm-success-soft)",
        "cm-warning-soft": "var(--cm-warning-soft)",
        "cm-error-soft": "var(--cm-error-soft)",
        "cm-info-soft": "var(--cm-info-soft)",

      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        'cm-sm': 'var(--cm-shadow-sm)',
        'cm-md': 'var(--cm-shadow-md)',
        'cm-lg': 'var(--cm-shadow-lg)',
      },
      borderRadius: {
        'cm-md': 'var(--cm-radius-md)',
        'cm-lg': 'var(--cm-radius-lg)',
        'cm-xl': 'var(--cm-radius-xl)',
        'cm-full': 'var(--cm-radius-full)',
      },
    },
  },
  plugins: [],
}
