import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser',testMatch:['**/production-smoke.spec.ts','**/cycle-two-extra.spec.ts','**/alternative-preview.spec.ts','**/width-alternatives.spec.ts','**/household-demand.spec.ts','**/drawing-record.spec.ts','**/tie-storage.spec.ts','**/fit-scope.spec.ts','**/export-preflight.spec.ts','**/download-cleanup.spec.ts'],workers:1,timeout:60000,
  forbidOnly:!!process.env.CI,globalTimeout:600000,
  use:{baseURL:'http://127.0.0.1:3101',browserName:'chromium',channel:'chromium',headless:true,trace:'retain-on-failure',screenshot:'only-on-failure'},
  webServer:{command:'npm run start -- -p 3101',url:'http://127.0.0.1:3101',reuseExistingServer:false,timeout:60000},
  outputDir:'test-results-production',
});
