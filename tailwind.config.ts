import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        slateNordic: "#334155",
        stoneNordic: "#78716c",
        sageNordic: "#6b7f66"
      }
    }
  },
  plugins: [require("@tailwindcss/typography")]
} satisfies Config;
