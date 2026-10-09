import {test,expect} from '@playwright/test';
import {DEFAULT_CONFIG} from '../../src/lib/design';

test('drawing references update the elevation and project records survive reload',async({page})=>{
  const c=structuredClone(DEFAULT_CONFIG);c.userInfo.userType='architect';
  await page.addInitScript(config=>{if(!localStorage.getItem('alveo-draft'))localStorage.setItem('alveo-draft',JSON.stringify({version:1,config}));},c);
  await page.goto('/configure');await page.getByText('Drawing references, revision, and status',{exact:true}).click();
  await page.getByLabel('Drawing revision',{exact:true}).fill('P02');await page.getByRole('combobox',{name:'Drawing status',exact:true}).selectOption('coordination');
  await page.getByLabel('BACK WALL drawing reference',{exact:true}).fill('A-601');
  await expect(page.locator('svg text').filter({hasText:'A-601 — BACK WALL'}).first()).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-draft')!).config.drawingRecord)).toEqual({revision:'P02',status:'coordination',wallReferences:{back:'A-601'}});
  await page.reload();await page.getByText('Drawing references, revision, and status',{exact:true}).click();
  await expect(page.getByLabel('Drawing revision',{exact:true})).toHaveValue('P02');await expect(page.getByRole('combobox',{name:'Drawing status',exact:true})).toHaveValue('coordination');await expect(page.getByLabel('BACK WALL drawing reference',{exact:true})).toHaveValue('A-601');
  await page.getByLabel('BACK WALL drawing reference',{exact:true}).fill('');await expect(page.locator('svg text').filter({hasText:'EL-A — BACK WALL'}).first()).toBeVisible();
});
