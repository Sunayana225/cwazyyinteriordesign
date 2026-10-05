import { test, expect } from '@playwright/test';
import { DEFAULT_CONFIG } from '../../src/lib/design';

test('comparison explains rejected options instead of silently showing nothing',async({page})=>{
  const config=structuredClone(DEFAULT_CONFIG);
  config.closetType='walkin-u';
  config.roomDimensions={roomWidth:48,roomDepth:48};
  await page.addInitScript(c=>localStorage.setItem('alveo-draft',JSON.stringify({version:1,config:c})),config);
  await page.goto('/configure');
  await page.locator('summary').filter({hasText:'Capacity assumptions, allocation, and alternatives'}).click();
  await page.getByRole('button',{name:'Compare feasible drawer layouts'}).click();
  await expect(page.getByRole('status').filter({hasText:'No drawer layout options meet'})).toBeVisible();
  await expect(page.getByRole('button',{name:/Use .* alternative/})).toHaveCount(0);
});

test('comparison announces available options and clears stale results after applying one',async({page})=>{
  await page.goto('/configure?preset=4');
  await page.locator('summary').filter({hasText:'Capacity assumptions, allocation, and alternatives'}).click();
  const status=page.getByRole('status').filter({hasText:'drawer layout options meet'});
  await expect(status).toHaveCount(0);
  await page.getByRole('button',{name:'Compare feasible drawer layouts'}).click();
  await expect(status).toContainText('3 drawer layout options meet');
  await page.getByRole('button',{name:'Use many-small alternative'}).click();
  await expect(status).toHaveCount(0);
  await expect(page.getByRole('button',{name:/Use .* alternative/})).toHaveCount(0);
});
