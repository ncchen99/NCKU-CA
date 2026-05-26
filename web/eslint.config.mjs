import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Any identifier matching this RegExp must never be prefixed with NEXT_PUBLIC_,
// because that would bake the secret into the client bundle.
const FORBIDDEN_PUBLIC_ENV = /^NEXT_PUBLIC_.*(SECRET|PRIVATE|SERVICE_ACCOUNT|ACCESS_KEY|API_TOKEN|PASSWORD|CREDENTIAL).*/;

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    name: "ncku-ca/no-sensitive-public-env",
    files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    rules: {
      // Catch any process.env.NEXT_PUBLIC_*SECRET*/etc access in source.
      "no-restricted-syntax": [
        "error",
        {
          selector: `MemberExpression[object.type='MemberExpression'][object.object.name='process'][object.property.name='env'][property.name=/${FORBIDDEN_PUBLIC_ENV.source}/]`,
          message:
            "禁止以 NEXT_PUBLIC_ 為前綴存放敏感變數（會被打包進前端 bundle）。請改用 server-only 變數名稱。",
        },
        {
          selector: `Literal[value=/${FORBIDDEN_PUBLIC_ENV.source}/]`,
          message:
            "禁止以 NEXT_PUBLIC_ 為前綴存放敏感變數（會被打包進前端 bundle）。請改用 server-only 變數名稱。",
        },
      ],
    },
  },
]);

export default eslintConfig;
