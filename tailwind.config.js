/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#0F172A",
        surface: "#1E293B",
        text: {
          DEFAULT: "#F8FAFC",
          secondary: "#94A3B8"
        },
        border: "#334155",
        primary: "#8B5CF6",
        accent: "#8B5CF6",
        muted: "#94A3B8"
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"]
      },
      boxShadow: {
        sm: "0 1px 2px rgba(15, 23, 42, 0.08)",
        lg: "0 15px 35px rgba(15, 23, 42, 0.12)"
      },
      borderRadius: {
        xl: "0.75rem"
      },
      boxShadowColor: {
        DEFAULT: "rgba(15, 23, 42, 0.12)"
      }
    }
  },
  plugins: []
}
