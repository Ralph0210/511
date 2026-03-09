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
        surface: {
          DEFAULT: "#181818",
          hover: "#282828",
          raised: "#282828",
        },
        accent: {
          DEFAULT: "#1DB954",
          warm: "#D97706",
        },
        muted: "#B3B3B3",
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
