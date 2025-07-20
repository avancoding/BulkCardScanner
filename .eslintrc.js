module.exports = {
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "@typescript-eslint/recommended"
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
    project: "./tsconfig.json"
  },
  env: {
    node: true,
    jest: true
  },
  rules: {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/prefer-const": "error"
  }
};