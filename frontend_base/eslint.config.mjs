import nextCoreWebVitals from "eslint-config-next/core-web-vitals"
import nextTypescript from "eslint-config-next/typescript"

const eslintConfig = [
  { ignores: ["playwright-report/**", "test-results/**", ".cache/**"] },
  ...nextCoreWebVitals,
  ...nextTypescript,
]

export default eslintConfig
