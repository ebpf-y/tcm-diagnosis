import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 中医风格配色：墨色 + 朱砂 + 米白
        ink: {
          DEFAULT: "#2b2b2b",
          light: "#4a4a4a",
        },
        cinnabar: {
          DEFAULT: "#9e2b25",
          light: "#b8453f",
        },
        rice: {
          DEFAULT: "#f7f3ea",
          dark: "#efe8d8",
        },
      },
    },
  },
  plugins: [],
};

export default config;
