import nodeConfig from "@repo/eslint-config/node";

export default [
  ...nodeConfig,
  {
    ignores: ["dist/**", "src/generated/**"],
  },
];
