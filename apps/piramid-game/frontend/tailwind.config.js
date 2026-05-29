/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#DC2626",
        secondary: "#F87171",
        accent: "#CA8A04",
        "culinary-bg": "#FEF2F2",
        "base-text": "#450A0A",
      },
      fontFamily: {
        heading: ["'Playfair Display SC'", "serif"],
        body: ["'Karla'", "sans-serif"],
      },
      boxShadow: {
        'block': '6px 6px 0 #DC2626',
        'block-hover': '10px 10px 0 #CA8A04',
      }
    },
  },
  plugins: [],
}
