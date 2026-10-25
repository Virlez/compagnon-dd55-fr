import { defineConfig } from "@playwright/test";

const chromiumExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: {
    headless: true,
    launchOptions: chromiumExecutable ? { executablePath: chromiumExecutable } : {},
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  }
});
