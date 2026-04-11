import type { Config } from "tailwindcss";
import baseConfig from "@chainlink/blocks/src/theme/base";

const config: Config = {
  ...baseConfig,
  content: [
    "./app/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./node_modules/@chainlink/blocks/**/*.{ts,tsx}",
  ],
};

export default config;
