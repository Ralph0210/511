import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "#FFFFFF",
        accent: {
          DEFAULT: "#2563EB",
          warm: "#F59E0B",
        },
        muted: "#6B7280",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Georgia", "serif"],
      },
      maxWidth: {
        page: "1280px",
      },
      spacing: {
        section: "64px",
      },
    },
  },
  plugins: [],
};
export default config;
