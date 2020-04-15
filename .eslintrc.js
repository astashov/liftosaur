module.exports = {
  extends: ["plugin:prettier/recommended"],
  env: {
    browser: true,
    es6: true
  },
  parser: "babel-eslint",
  parserOptions: {
    ecmaVersion: 2017
  },
  overrides: [
    {
      files: ["*.ts", "*.tsx"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        project: "tsconfig.json",
        sourceType: "module"
      },
      plugins: ["@typescript-eslint"],
      rules: {
        "@typescript-eslint/adjacent-overload-signatures": "error",
        "@typescript-eslint/await-thenable": "error",
        "@typescript-eslint/ban-types": "error",
        "@typescript-eslint/class-name-casing": "error",
        "@typescript-eslint/consistent-type-assertions": "error",
        "@typescript-eslint/consistent-type-definitions": "off",
        "@typescript-eslint/explicit-member-accessibility": [
          "error",
          {
            accessibility: "explicit",
            overrides: {
              constructors: "off"
            }
          }
        ],
        "@typescript-eslint/indent": "off",
        "@typescript-eslint/interface-name-prefix": "off",
        "@typescript-eslint/member-delimiter-style": [
          "off",
          "error",
          {
            multiline: {
              delimiter: "none",
              requireLast: true
            },
            singleline: {
              delimiter: "semi",
              requireLast: false
            }
          }
        ],
        "@typescript-eslint/no-empty-function": "off",
        "@typescript-eslint/no-empty-interface": "error",
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/no-misused-new": "error",
        "@typescript-eslint/no-parameter-properties": "off",
        "@typescript-eslint/no-use-before-declare": "off",
        "@typescript-eslint/no-var-requires": "error",
        "@typescript-eslint/prefer-function-type": "error",
        "@typescript-eslint/prefer-namespace-keyword": "error",
        "@typescript-eslint/quotes": "off",
        "@typescript-eslint/restrict-plus-operands": "error",
        "@typescript-eslint/semi": ["off", null],
        "@typescript-eslint/space-within-parens": ["off", "never"],
        "@typescript-eslint/triple-slash-reference": "error",
        "@typescript-eslint/type-annotation-spacing": "off",
        "@typescript-eslint/unbound-method": "error",
        "@typescript-eslint/unified-signatures": "error",
        "@typescript-eslint/prefer-readonly": "error",
        "@typescript-eslint/explicit-function-return-type": ["error", { allowExpressions: true }],
        "@typescript-eslint/typedef": ["error", { arrowParameter: false, memberVariableDeclaration: false }],
        "@typescript-eslint/naming-convention": [
          "error",
          {
            selector: "interface",
            format: ["PascalCase"],
            prefix: ["I"]
          },
          {
            selector: "typeAlias",
            format: ["PascalCase"],
            prefix: ["I"]
          }
        ]
      }
    }
  ],
  rules: {
    "arrow-parens": ["off", "as-needed"],
    "comma-dangle": "off",
    complexity: "off",
    "constructor-super": "error",
    curly: "error",
    "dot-notation": "error",
    "eol-last": "off",
    eqeqeq: ["error", "smart"],
    "guard-for-in": "error",
    "id-match": "error",
    "import/order": "off",
    "linebreak-style": "off",
    "max-classes-per-file": "off",
    "max-len": "off",
    "new-parens": "off",
    "newline-per-chained-call": "off",
    "no-bitwise": "error",
    "no-caller": "error",
    "no-cond-assign": "error",
    "no-console": "off",
    "no-debugger": "error",
    "no-empty": "off",
    "no-eval": "error",
    "no-extra-semi": "off",
    "no-fallthrough": "off",
    "no-invalid-this": "off",
    "no-irregular-whitespace": "off",
    "no-multiple-empty-lines": "off",
    "no-new-wrappers": "error",
    "no-plusplus": [
      "error",
      {
        allowForLoopAfterthoughts: true
      }
    ],
    "no-return-await": "error",
    "no-shadow": "error",
    "no-template-curly-in-string": "error",
    "no-throw-literal": "error",
    "no-trailing-spaces": "off",
    "no-unsafe-finally": "error",
    "no-unused-expressions": "error",
    "no-unused-labels": "error",
    "no-var": "error",
    "no-void": "error",
    "one-var": ["error", "never"],
    "prefer-const": "error",
    "prefer-object-spread": "error",
    "quote-props": "off",
    radix: "error",
    "space-before-function-paren": "off",
    "spaced-comment": "error",
    "use-isnan": "error",
    "valid-typeof": "off",
    "prettier/prettier": "error"
  }
};
