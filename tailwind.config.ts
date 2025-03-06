import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        "3xl": "1440px",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      height: {
        screen: "100vh",
        "screen-dynamic": "100vh",
      },
      minHeight: {
        "screen-dynamic": "-webkit-fill-available",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        bounce: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        slideUp: {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideLeft: {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "0.3" },
        },
        loader: {
          "0%, 100%": {
            transform: "translateY(0)",
            opacity: "0.3",
          },
          "50%": {
            transform: "translateY(-10px)",
            opacity: "1",
          },
        },
        statusOk: {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1", transform: "scale(1.1)" },
        },
        statusInfo: {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1", transform: "scale(1.1)" },
        },
        endpoint: {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        progress: {
          "0%": { transform: "translateX(-100%)" },
          "50%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(100%)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "zoom-in": {
          "0%": {
            opacity: "0",
            transform: "scale(0.95)",
          },
          "100%": {
            opacity: "1",
            transform: "scale(1)",
          },
        },
        ping: {
          "75%, 100%": { transform: "scale(2)", opacity: "0" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5", transform: "scale(1.1)" },
        },
        "jelly-scroll": {
          "0%": { transform: "translateX(0)" },
          "15%": {
            transform: "translateX(var(--scroll-offset)) scale(1.02, 0.98)",
          },
          "30%": {
            transform: "translateX(var(--scroll-offset)) scale(0.98, 1.02)",
          },
          "45%": {
            transform: "translateX(var(--scroll-offset)) scale(1.01, 0.99)",
          },
          "60%": {
            transform: "translateX(var(--scroll-offset)) scale(0.99, 1.01)",
          },
          "75%": {
            transform: "translateX(var(--scroll-offset)) scale(1.005, 0.995)",
          },
          "100%": { transform: "translateX(var(--scroll-offset)) scale(1, 1)" },
        },
        neonPulse: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        unblur: "unblur 0.5s ease-out forwards",
        slideUp: "slideUp 0.8s ease-out forwards",
        slideDown: "slideDown 0.8s ease-out forwards",
        slideLeft: "slideLeft 0.8s ease-out forwards 0.5s",
        fadeIn: "fadeIn 0.8s ease-out forwards 0.8s",
        loader: "loader 1s ease-in-out infinite",
        statusOk: "statusOk 2s ease-in-out infinite",
        statusInfo: "statusInfo 2s ease-in-out infinite 0.3s",
        endpoint: "endpoint 2s ease-in-out infinite 0.6s",
        progress: "progress 2s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        "fade-in": "fade-in 0.5s ease-out",
        "zoom-in": "zoom-in 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
        ping: "ping 1s cubic-bezier(0, 0, 0.2, 1) infinite",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "jelly-scroll": "jelly-scroll 0.5s ease-out forwards",
        neonPulse: "neonPulse 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    plugin(({ addBase, addComponents, addUtilities }) => {
      addBase({
        ":root": {
          "--app-height": "100%",
        },
        "html, body": {
          height: "100%",
          "min-height": "-webkit-fill-available",
          "overflow-x": "hidden",
          "-webkit-tap-highlight-color": "transparent",
        },
        "*": {
          "scrollbar-width": "none",
          "-ms-overflow-style": "none",
          "&::-webkit-scrollbar": {
            display: "none",
          },
        },
        "pre, code": {
          "white-space": "pre-wrap !important",
          "word-wrap": "break-word !important",
          "overflow-wrap": "anywhere !important",
        },
      });

      addComponents({
        ".method-get": {
          "@apply bg-emerald-50 text-emerald-700 border-emerald-200": {},
        },
        ".method-post": {
          "@apply bg-blue-50 text-blue-700 border-blue-200": {},
        },
        ".syntax-highlight": {
          position: "relative !important",
          "font-family": "var(--font-mono) !important",
          "& code": {
            "tab-size": "2 !important",
          },
        },
        ".touch-scroll-y": {
          "touch-action": "pan-y",
          "overflow-y": "auto",
          "-webkit-overflow-scrolling": "touch",
          "overscroll-behavior": "contain",
        },
      });

      addUtilities({
        ".prevent-elastic": {
          "overscroll-behavior": "none",
          "-webkit-overflow-scrolling": "touch",
        },
        ".safe-area-padding": {
          "@supports (padding: env(safe-area-inset-top))": {
            "padding-top": "env(safe-area-inset-top)",
            "padding-bottom": "env(safe-area-inset-bottom)",
            "padding-left": "env(safe-area-inset-left)",
            "padding-right": "env(safe-area-inset-right)",
          },
        },
        ".mobile-optimized": {
          "@media screen and (max-width: 640px)": {
            "font-size": "0.75rem",
            "line-height": "1rem",
          },
        },
      });
    }),
  ],
};

export default config;
