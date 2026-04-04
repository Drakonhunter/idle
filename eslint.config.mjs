import nextConfig from "eslint-config-next";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  { ignores: ["dist/**", ".next/**", "out/**"] },
  ...nextConfig,
];

export default config;
