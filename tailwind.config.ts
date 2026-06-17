import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    container: { center: true, padding: "2rem", screens: { "2xl": "1400px" } },
    extend: {
      colors: {
        /* shadcn tokens */
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary:     { DEFAULT: "hsl(var(--primary))",     foreground: "hsl(var(--primary-foreground))" },
        secondary:   { DEFAULT: "hsl(var(--secondary))",   foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted:       { DEFAULT: "hsl(var(--muted))",       foreground: "hsl(var(--muted-foreground))" },
        accent:      { DEFAULT: "hsl(var(--accent))",      foreground: "hsl(var(--accent-foreground))" },
        popover:     { DEFAULT: "hsl(var(--popover))",     foreground: "hsl(var(--popover-foreground))" },
        card:        { DEFAULT: "hsl(var(--card))",        foreground: "hsl(var(--card-foreground))" },
        /* TalentOS palette */
        brand:   { DEFAULT: "#0E5C4A", soft: "#DCEFE4" },
        coral:   { DEFAULT: "#F1543F", ink: "#C7402E" },
        lime:    { DEFAULT: "#C6F24E", soft: "#EAF7C4" },
        paper:   "#F4F0E8",
        surface: { DEFAULT: "#FCFAF6", 2: "#F8F4EB" },
        ink:     "#1A1A17",
        soft:    "#79746B",
        line:    "#E7E1D4",
        success: { DEFAULT: "#1B6B4F", bg: "#DCEFE3" },
        warning: { DEFAULT: "#946312", bg: "#F8E7C4" },
        danger:  { DEFAULT: "#BD4332", bg: "#F6D9D2" },
        info:    { DEFAULT: "#2B5E8A", bg: "#D6E4F2" },
      },
      fontFamily: {
        display: ["Archivo", "sans-serif"],
        sans:    ["Hanken Grotesk", "system-ui", "sans-serif"],
        mono:    ["Space Mono", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        /* explicit px radii from DS */
        "r-sm": "8px",
        "r-md": "11px",
        "r-lg": "14px",
        "r-xl": "18px",
      },
      boxShadow: {
        card: "0 2px 8px -2px rgba(26,26,23,.12)",
        hard: "3px 3px 0 #1A1A17",
        pop:  "0 24px 50px -28px rgba(26,26,23,.4)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up":   { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        grain: {
          "0%":   { transform: "translate(0,0)" },
          "100%": { transform: "translate(-6%,-6%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        grain: "grain 8s linear infinite alternate",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
