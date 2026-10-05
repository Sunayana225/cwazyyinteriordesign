import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser',testMatch:['**/production-smoke.spec.ts','**/cycle-two-extra.spec.ts'],workers:1,timeout:60000,
  use:{baseURL:'http://127.0.0.1:3101',browserName:'chromium',channel:'chromium',headless:true},
  webServer:{command:'npm run start -- -p 3101',url:'http://127.0.0.1:3101',reuseExistingServer:false,timeout:60000},
  outputDir:'test-results-production',
});
