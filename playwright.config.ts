import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

const chromeChannel = existsSync('/usr/bin/google-chrome') ? 'chrome' : undefined;

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'desktop Chrome',
      use: { ...devices['Desktop Chrome'], ...(chromeChannel ? { channel: chromeChannel } : {}) },
    },
    {
      name: 'mobile iPhone 15',
      use: {
        ...devices['iPhone 15'],
        ...(chromeChannel ? { browserName: 'chromium' as const, channel: chromeChannel } : {}),
      },
    },
  ],
});
