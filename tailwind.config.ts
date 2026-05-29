import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./frontend/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        // Backgrounds
        bg1: "var(--bg1)",
        bg2: "var(--bg2)",
        bg3: "var(--bg3)",
        // Text
        t1: "var(--t1)",
        t2: "var(--t2)",
        t3: "var(--t3)",
        // Brand blue
        blue: {
          DEFAULT: "#185FA5",
          bg: "#E6F1FB",
          dark: "#0C447C",
        },
        // Status colors
        green: {
          DEFAULT: "#3B6D11",
          bg: "#EAF3DE",
        },
        amber: {
          DEFAULT: "#854F0B",
          bg: "#FAEEDA",
        },
        red: {
          DEFAULT: "#A32D2D",
          bg: "#FCEBEB",
        },
        gray: {
          DEFAULT: "#5F5E5A",
          bg: "#F1EFE8",
        },
        purple: {
          DEFAULT: "#534AB7",
          bg: "#EEEDFE",
        },
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
      },
      fontSize: {
        "2xs": "10px",
        xs: "11px",
        sm: "12px",
        base: "13px",
        md: "14px",
        lg: "15px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
