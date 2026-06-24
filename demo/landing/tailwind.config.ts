import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f3ff",
          500: "#7c3aed",
          600: "#6d28d9",
          900: "#3b0764",
        },
      },
    },
  },
  plugins: [],
};

export default config;
