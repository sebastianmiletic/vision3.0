import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './src/test/e2e',
  timeout: 45_000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
    port: 4173,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
