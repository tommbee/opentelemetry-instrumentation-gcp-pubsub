module.exports = {
  env: {
    "mocha": true,
    "node": true
  },
  plugins: [
    "@typescript-eslint"
  ],
  extends: [
    "./node_modules/gts",
  ],
  "ignorePatterns": ["build/*.ts", "build/**/*.ts"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    "project": "./tsconfig.json"
  },
  rules: {
    "quotes": [2, "single", { "avoidEscape": true }],
    "@typescript-eslint/no-this-alias": "off",
    "eqeqeq": "off",
    "prefer-rest-params": "off",
    "@typescript-eslint/naming-convention": [
      "error",
      {
        "selector": "memberLike",
        "modifiers": ["private", "protected"],
        "format": ["camelCase"],
        "leadingUnderscore": "require"
      }
    ],
    "@typescript-eslint/no-inferrable-types": ["error", { ignoreProperties: true }],
    "arrow-parens": ["error", "as-needed"],
    "prettier/prettier": ["error", { "singleQuote": true, "arrowParens": "avoid" }],
    "node/no-deprecated-api": ["warn"]
  },
  overrides: [
    {
      "files": ["test/**/*.ts"],
      "rules": {
        "no-empty": "off",
        "@typescript-eslint/ban-ts-ignore": "off",
        "@typescript-eslint/no-empty-function": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unused-vars": "off",
        "@typescript-eslint/no-var-requires": "off",
        "node/no-unpublished-import": "off"
      }
    }
  ]
};
