/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: "#0a0a0f",
          border: "#1a1a2e",
          text: "#00ff9f",
          dim: "#6b7280",
          red: "#ff4444",
          cyan: "#00d9ff",
          green: "#00ff9f",
        },
      },
      animation: {
        glow: "glow 2s ease-in-out infinite alternate",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        glow: {
          "0%": { textShadow: "0 0 5px currentColor" },
          "100%": { textShadow: "0 0 20px currentColor, 0 0 30px currentColor" },
        },
      },
    },
  },
  plugins: [],
};
