import { config } from "@repo/eslint-config/react-internal";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...config,
  {
    ignores: [".next/**", "next-env.d.ts"],
  },
  {
    files: ["src/components/3d/**/*.tsx"],
    rules: {
      "react/no-unknown-property": "off",
    },
  },
];
