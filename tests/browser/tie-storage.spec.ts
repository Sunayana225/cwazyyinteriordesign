import {test,expect} from '@playwright/test';
import {DEFAULT_CONFIG} from '../../src/lib/design';

test('measured tie trays update fit and persist while oversized ties remain a shortage',async({page})=>{
  const c=structuredClone(DEFAULT_CONFIG);c.wardrobe.ties=30;
  await page.addInitScript(config=>{if(!localStorage.getItem('alveo-draft'))localStorage.setItem('alveo-draft',JSON.stringify({version:1,config}));},c);
  await page.goto('/configure');await page.locator('#studio-room-tools > summary').click();
  await page.getByLabel('Plan measured tie trays').check();
  await page.locator('#studio-fit-tools > summary').click();
  const capacity=page.getByRole('region',{name:'Capacity details'});const row=capacity.getByRole('row').filter({has:page.getByRole('rowheader',{name:'Ties folded ties',exact:true})});
  await expect(row).toContainText('30.00');await expect(row).toContainText('32.00');await expect(row).toContainText('Covered');
  await page.getByLabel('Folded tie width',{exact:true}).fill('200');await page.getByLabel('Folded tie width',{exact:true}).blur();
  await expect(row).toContainText('Needs 30.00 more');
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-draft')!).config.planning.tieDimensions.width)).toBe(200);
  await page.reload();await page.locator('#studio-room-tools > summary').click();await expect(page.getByLabel('Folded tie width',{exact:true})).toHaveValue('200');
  await page.getByLabel('Plan measured tie trays').uncheck();await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-draft')!).config.planning.tieDimensions)).toBeUndefined();
});
