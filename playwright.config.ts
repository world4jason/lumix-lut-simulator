import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  timeout: 90000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4189/lumix-lut-simulator/",
    headless: true,
    launchOptions: process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : {},
  },
  reporter: "list",
});
