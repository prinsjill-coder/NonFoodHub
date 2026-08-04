import { defineConfig } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:4173";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.mjs",
  timeout: 30000,
  expect: {
    timeout: 7000
  },
  reporter: [
    ["list"],
    ["html", { open: "never" }]
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    viewport: { width: 1366, height: 900 }
  },
  webServer: {
    command: "node tests/serve-static.mjs",
    url: `${baseURL}/index.html`,
    reuseExistingServer: true,
    timeout: 15000
  }
});
