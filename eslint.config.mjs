import { defineConfig, globalIgnores } from "eslint/config";
import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";
import globals from "globals";

// Presets compatibles con ESLint 10. Evita arrastrar plugins que todavía
// declaran compatibilidad solo hasta ESLint 9 a través de eslint-config-next.
const config = defineConfig(
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,mjs}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "@next/next": nextPlugin },
    rules: nextPlugin.configs["core-web-vitals"].rules,
  },
  {
    ...reactHooks.configs.flat.recommended,
    files: ["src/**/*.{ts,tsx}"],
  },
);
export default config;
