import {test,expect} from '@playwright/test';
import {DEFAULT_CONFIG} from '../../src/lib/design';
import {EMPTY_INVENTORY,combinedInventory} from '../../src/lib/inventoryPlanning';

test('household fit keeps seasons separate and warns when profiles differ from active counts',async({page})=>{
  const config=structuredClone(DEFAULT_CONFIG),daily=structuredClone(EMPTY_INVENTORY),seasonal=structuredClone(EMPTY_INVENTORY);
  daily.wardrobe.shirts=1;seasonal.wardrobe.sweaters=5;
  config.planning={hangerSpacing:{shirts:3}};
  config.inventoryPlanning={members:[{id:'daily',name:'Asha',season:'everyday',inventory:daily},{id:'winter',name:'Winter',season:'seasonal',inventory:seasonal}]};
  Object.assign(config,combinedInventory(config.inventoryPlanning.members!));
  await page.addInitScript(c=>{if(!localStorage.getItem('alveo-draft'))localStorage.setItem('alveo-draft',JSON.stringify({version:1,config:c}));},config);
  await page.goto('/configure');await page.locator('#studio-fit-tools > summary').click();await page.getByRole('button',{name:'Show household demand breakdown'}).click();
  const report=page.getByRole('region',{name:'Household demand breakdown'});await expect(report.getByRole('status')).toHaveText('Profile totals match active inventory.');
  await expect(report.getByRole('columnheader',{name:'Everyday profiles'})).toBeVisible();await expect(report.getByRole('columnheader',{name:'Seasonal profiles'})).toBeVisible();
  await report.getByText('Asha · everyday',{exact:true}).click();await expect(report).toContainText('3.00 inches of rod');
  await report.getByText('Winter · seasonal',{exact:true}).click();await expect(report).toContainText('1.00 standard drawer equivalents');
  await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('alveo-draft')!);d.config.wardrobe.shirts=4;localStorage.setItem('alveo-draft',JSON.stringify(d));});
  await page.reload();await page.locator('#studio-fit-tools > summary').click();await page.getByRole('button',{name:'Show household demand breakdown'}).click();
  await expect(report.getByRole('status')).toContainText('Draft profile totals differ');await report.getByText('Review profile differences',{exact:true}).click();await expect(report).toContainText('4 active, 1 in profiles');
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
});
