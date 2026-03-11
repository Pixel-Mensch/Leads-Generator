import { defineConfig } from "@playwright/test";

const devCommand =
  process.platform === "win32" ? "npm.cmd run dev" : "npm run dev";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 180_000,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  webServer: {
    command: devCommand,
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
