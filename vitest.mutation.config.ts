import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "tests/backup.test.ts",
      "tests/reference-collections.test.ts",
      "tests/onboarding-state.test.ts",
      "tests/external-url.test.ts"
    ]
  }
});
