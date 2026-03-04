import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
    },
    extend: {
      colors: {
        background: "hsl(0 0% 100%)",
        foreground: "hsl(240 10% 3.9%)",
        muted: "hsl(240 4.8% 95.9%)",
        "muted-foreground": "hsl(240 3.8% 46.1%)",
        border: "hsl(240 5.9% 90%)",
        card: "hsl(0 0% 100%)",
        primary: "hsl(221.2 83.2% 53.3%)",
        "primary-foreground": "hsl(210 40% 98%)",
        accent: "hsl(210 40% 96.1%)",
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      boxShadow: {
        soft: "0 8px 30px rgb(0 0 0 / 0.08)",
      },
    },
  },
};

export default config;
