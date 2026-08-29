/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#0a0a0a",
          surface: "#111111",
          card: "#141414",
          border: "#262626",
          muted: "#a3a3a3",
          text: "#fafafa",
          orange: "#ff6600",
          "orange-hover": "#ff7a1a",
          "orange-dim": "#cc5200",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 80px rgba(255, 102, 0, 0.15)",
        "glow-sm": "0 0 40px rgba(255, 102, 0, 0.1)",
      },
    },
  },
  plugins: [],
};
