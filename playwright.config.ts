import { defineConfig, devices } from "@playwright/test";
import { localdomain } from "./src/localdomain";

export default defineConfig({
  // Look for test files in the "tests" directory, relative to this configuration file.
  testDir: "tests",

  // Run all tests in parallel.
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code.
  forbidOnly: !!process.env.CI,

  // Retry on CI only.
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI.
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: "html",

  use: {
    // Base URL to use in actions like `await page.goto('/')`.
    baseURL: `https://${localdomain}.liftosaur.com:8080?skipintro=1`,

    // Collect trace when retrying the failed test.
    trace: "on-first-retry",
    testIdAttribute: "data-cy",
  },
  // Configure projects for major browsers.
  projects: [
    {
      name: "Mobile Safari",
      use: {
        ...devices["iPhone 13"],
        userAgent: `${devices["iPhone 13"].userAgent} Playwright/1.0`,
      },
    },
  ],
});
