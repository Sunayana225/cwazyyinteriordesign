import { defineConfig } from '@playwright/test';
const previewURL=process.env.PLAYWRIGHT_BASE_URL;
export default defineConfig({
  testDir: './tests/browser', timeout: 60000, expect: { timeout: 15000 }, workers: 1,
  testIgnore:'**/production-smoke.spec.ts',
  use: { baseURL: previewURL??'http://127.0.0.1:3100', headless: true, viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', trace: 'retain-on-failure' },
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}-{platform}{ext}',
  projects: [
    {name:'chromium',use:{browserName:'chromium',channel:'chromium'}},
    {name:'firefox',testMatch:'**/cross-browser.spec.ts',use:{browserName:'firefox'}},
    {name:'webkit',testMatch:'**/cross-browser.spec.ts',use:{browserName:'webkit'}},
  ],
  webServer: previewURL?undefined:{ command: 'npm run dev -- -p 3100', url: 'http://127.0.0.1:3100', reuseExistingServer: false, timeout: 120000 },
});
