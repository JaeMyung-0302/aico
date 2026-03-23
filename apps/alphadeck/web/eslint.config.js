import reactConfig from "@repo/eslint-config/react-internal";

export default [
  ...reactConfig,
  {
    ignores: ["dist/**"],
  },
];
