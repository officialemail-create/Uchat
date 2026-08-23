import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  webServer: [
    {
      command: 'node scripts/start-e2e.cjs',
      cwd: '../backend',
      url: 'http://localhost:3101/api/healthz',
      env: { API_PORT: '3101', E2E_TEST_MODE: 'true' },
      reuseExistingServer: false,
      timeout: 90_000,
    },
    {
      command: 'npm run dev -- --host localhost --port 5174',
      url: 'http://localhost:5174',
      env: { API_PORT: '3101' },
      reuseExistingServer: false,
      timeout: 90_000,
    },
  ],
  use: {
    baseURL: 'http://localhost:5174',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    headless: false,
    viewport: { width: 1400, height: 900 },
    ignoreHTTPSErrors: true,
    video: 'retry-with-video',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
      },
    },
  ],
});
