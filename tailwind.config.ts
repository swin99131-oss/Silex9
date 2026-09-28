import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111111",
        paper: "#FAF8F5",
        muted: { DEFAULT: "#8B8B8B", foreground: "#111111" },
        line: "#ECECE8",
        chip: "#F2F1ED",
        accent: { DEFAULT: "#111111", foreground: "#FFFFFF" },
        card: { DEFAULT: "#FFFFFF", foreground: "#111111" },
        background: "#FAF8F5",
        foreground: "#111111",
        popover: { DEFAULT: "#FFFFFF", foreground: "#111111" },
        primary: { DEFAULT: "#111111", foreground: "#FFFFFF" },
        secondary: { DEFAULT: "#F2F1ED", foreground: "#111111" },
        destructive: { DEFAULT: "#DC2626", foreground: "#FFFFFF" },
        success: { DEFAULT: "#16A34A", foreground: "#FFFFFF" },
        border: "#ECECE8",
        input: "#ECECE8",
        ring: "#111111",
        sidebar: { DEFAULT: "#FFFFFF", foreground: "#111111" },
        "sidebar-primary": "#111111",
        "sidebar-primary-foreground": "#FFFFFF",
        "sidebar-accent": "#F2F1ED",
        "sidebar-accent-foreground": "#111111",
        "sidebar-border": "#ECECE8",
        "sidebar-ring": "#111111",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        card: "28px",
        pill: "999px",
      },
      boxShadow: {
        soft: "0 8px 24px rgba(17,17,17,0.06)",
        float: "0 12px 32px rgba(17,17,17,0.18)",
      },
      maxWidth: {
        app: "420px",
      },
    },
  },
  plugins: [],
};
export default config;
