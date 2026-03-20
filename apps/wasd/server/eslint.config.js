import { nodeConfig } from "@repo/eslint-config/node";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nodeConfig,
  {
    ignores: ["dist/**"],
  },
  {
    rules: {
      "turbo/no-undeclared-env-vars": "off",
    },
  },
];
