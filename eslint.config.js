// eslint.config.js
export default [
  {
    rules: {
      "no-duplicate-imports": "error",
      "prefer-const": "warn",
      "no-useless-assignment": "warn",
      complexity: ["warn", 20],
      "consistent-return": "warn",
      eqeqeq: "warn",
      "no-console": ["error", { allow: ["warn", "error", "info"] }],
      "require-await": "warn",
      "no-else-return": "warn",
    },
  },
];
