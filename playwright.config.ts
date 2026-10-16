import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests against the built site, served with the production security headers.
 * The forms post to a fake Google Apps Script address that the tests answer themselves.
 *   npm run build:test && npm test
 */
export default defineConfig({
  testDir: 'tests',
  testMatch: /.*\.spec\.ts/,
  use: {
    baseURL: 'http://localhost:4322',
    // Use a browser already installed on this machine instead of downloading one (optional)
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  webServer: { command: 'node tests/serve.mjs', url: 'http://localhost:4322', reuseExistingServer: true },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
  ],
});
