import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import * as path from 'node:path';
import { fileURLToPath } from 'url';

const filename: string = fileURLToPath(import.meta.url);
const dirname: string = path.dirname(filename);

const FRONTEND_URL: string = process.env.FRONTEND_URL || '';
export const ignoreHTTPSErrors: boolean =
  FRONTEND_URL !== '' && ['localhost', '127.0.0.1'].includes(new URL(FRONTEND_URL).hostname);

dotenv.config({
  path: './.env.dev',
});

dotenv.config({ path: path.resolve(dirname, '.env'), override: true });

export const workers: number = 4;

export default defineConfig({
  testDir: './tests',
  timeout: 90 * 1000,
  expect: { timeout: 10 * 1000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  maxFailures: 2,
  workers,
  reporter: [['html']],
  globalSetup: './tests/global-setup.ts',
  // This file will be required and run after all the tests. It must export a single function
  globalTeardown: './tests/global-teardown.ts',

  use: {
    trace: 'retain-on-failure',
    locale: 'de-DE',
    timezoneId: 'Europe/Brussels',
    screenshot: 'only-on-failure',
    baseURL: FRONTEND_URL,
    headless: true,
    ignoreHTTPSErrors,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'webkit',
      timeout: 150 * 1000,
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
        contextOptions: {
          reducedMotion: 'reduce',
        },
      },
    },
    /* Test against branded browsers. */
    {
      name: 'msedge',
      use: {
        channel: 'msedge',
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'chrome',
      use: {
        channel: 'chrome',
        viewport: { width: 1920, height: 1080 },
      },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'mobileChromeIphone12Pro',
    //   use: {
    //      ...devices['iPhone 12 Pro'],
    //      viewport: { width: 390, height: 844 },
    //     ignoreHTTPSErrors: true
    //   },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],
  outputDir: 'test-results/',
});
