import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        // Primary: Royal Blue Palette
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af", // Official GFMS Royal Blue
          900: "#1e3a8a", // Deep Royal Navy
          950: "#172554", // Midnight Royal Blue
          DEFAULT: "var(--color-primary, #1e40af)",
          foreground: "var(--color-primary-foreground, #ffffff)",
        },
        // Secondary: Golden Yellow Palette
        secondary: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b", // Official GFMS Golden Yellow
          600: "#d97706", // Deep Academic Gold
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
          DEFAULT: "var(--color-secondary, #f59e0b)",
          foreground: "var(--color-secondary-foreground, #1e293b)",
        },
        // Accents
        accent: {
          // Kelly Green (Success, Growth, Prosperity)
          green: {
            50: "#f0fdf4",
            100: "#dcfce7",
            200: "#bbf7d0",
            300: "#86efac",
            400: "#4ade80",
            500: "#22c55e",
            600: "#16a34a",
            700: "#15803d", // Official Kelly Green
            800: "#166534",
            900: "#14532d",
            DEFAULT: "var(--color-accent-green, #15803d)",
          },
          // Crimson Red (Error, Urgency, Vitality)
          red: {
            50: "#fef2f2",
            100: "#fee2e2",
            200: "#fecaca",
            300: "#fca5a5",
            400: "#f87171",
            500: "#ef4444",
            600: "#dc2626", // Official Crimson Red
            700: "#b91c1c",
            800: "#991b1b",
            900: "#7f1d1d",
            DEFAULT: "var(--color-accent-red, #dc2626)",
          },
        },
        // Neutral & Readability Scales
        neutral: {
          white: "#ffffff", // Crisp White Backgrounds
          canvas: "#f8fafc", // Light Canvas
          surface: "#f1f5f9", // Card surface
          charcoal: {
            subtle: "#64748b", // Slate 500
            light: "#475569",  // Slate 600
            DEFAULT: "#1e293b", // Slate 800 - Deep Charcoal for high readability
            deep: "#0f172a",    // Slate 900 - Darkest Charcoal
          },
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
        display: ["var(--font-outfit)", "var(--font-inter)", "sans-serif"],
        serif: ["var(--font-cinzel)", "Georgia", "serif"],
      },
      boxShadow: {
        gold: "0 4px 20px -2px rgba(245, 158, 11, 0.25)",
        royal: "0 4px 20px -2px rgba(30, 64, 175, 0.25)",
        card: "0 2px 10px -1px rgba(15, 23, 42, 0.06), 0 1px 3px -1px rgba(15, 23, 42, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
