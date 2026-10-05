import { defineConfig } from '@playwright/test';
import base from './playwright.config';
// Renderer fixtures use page.setContent; run independently without a dev server.
export default defineConfig({
  ...base,
  webServer: undefined,
  testMatch: '**/visual.spec.ts',
  outputDir: 'test-results-visual',
  projects: [{ name: 'chromium', use: { browserName: 'chromium', channel: 'chromium' } }],
});
