import { defineConfig } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:4173";
const useManagedServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER !== "1";

const config = {
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
    trace: "retain-on-failure"
  },
  projects: [
    {
      name: "desktop",
      use: { viewport: { width: 1366, height: 900 } }
    },
    {
      name: "tablet",
      use: { viewport: { width: 820, height: 1100 } }
    },
    {
      name: "mobile",
      use: { viewport: { width: 390, height: 844 } }
    }
  ],
  ...(useManagedServer
    ? {
        webServer: {
          command: "node tests/serve-static.mjs",
          url: `${baseURL}/index.html`,
          reuseExistingServer: true,
          timeout: 15000
        }
      }
    : {})
};

export default defineConfig(config);
