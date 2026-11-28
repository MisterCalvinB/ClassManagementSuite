// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e/electron',
  timeout: 30_000,
  expect: {
    timeout: 10_000
  },
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { open: 'never' }]
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  }
});
