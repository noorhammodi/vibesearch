// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#f0e8d8",
        sand:  "#c8b89a",
        bark:  "#8a7a6a",
        soil:  "#5a4a38",
        earth: "#3a2e22",
        night: "#0d0a07",
        dusk:  "#120f0a",
      },
      fontFamily: {
        serif: ["'Playfair Display'", "serif"],
        mono:  ["'DM Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
