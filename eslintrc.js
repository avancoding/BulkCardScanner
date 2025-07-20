module.exports = {
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "@typescript-eslint/recommended"
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module"
  },
  env: {
    node: true,
    jest: true
  },
  rules: {
    // Add custom rules here if needed
  }
};