/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        /** Primary lavender — premium “baby app” accent */
        brand: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#7c78ee",
          600: "#6366f1",
          700: "#4f46e5",
          800: "#4338ca",
        },
        /** Warm app canvas */
        page: "#faf7ff",
        card: "#ffffff",
        border: "#e9e4f5",
        ink: {
          900: "#1e1b4b",
          700: "#433862",
          500: "#6b6280",
          300: "#c4bdd4",
        },
        /** Soft pastel tiles (reference grids) */
        pastel: {
          peach: "#ffe8e4",
          butter: "#fff4d6",
          mint: "#d8f5e8",
          lilac: "#e8e0ff",
          sky: "#dbeafe",
          rose: "#fce7f3",
        },
        emergency: {
          bg: "#fef2f2",
          border: "#fecaca",
          text: "#b91c1c",
          badge: "#dc2626",
        },
        urgent: {
          bg: "#fffbeb",
          border: "#fde68a",
          text: "#92400e",
          badge: "#d97706",
        },
        monitor: {
          bg: "#f0fdf4",
          border: "#bbf7d0",
          text: "#14532d",
          badge: "#16a34a",
        },
      },
      fontFamily: {
        sans: ["Inter_400Regular"],
        medium: ["Inter_500Medium"],
        semibold: ["Inter_600SemiBold"],
        bold: ["Inter_700Bold"],
        extrabold: ["Inter_800ExtraBold"],
      },
    },
  },
  plugins: [],
};
