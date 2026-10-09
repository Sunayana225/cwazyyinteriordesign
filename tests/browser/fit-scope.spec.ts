import {test,expect} from '@playwright/test';
import {DEFAULT_CONFIG,EMPTY_WARDROBE} from '../../src/lib/design';

test('accessory-only inventory is disclosed in review, fit details, summary and print',async({page})=>{
  const config={...structuredClone(DEFAULT_CONFIG),wardrobe:{...EMPTY_WARDROBE,ties:20,jewelry:true},shoes:{boots:0,heels:0,flats:0,sneakers:0}};
  await page.addInitScript(c=>{localStorage.setItem('alveo-draft',JSON.stringify({version:1,config:c}));window.print=()=>{};},config);
  await page.goto('/configure');
  const notice='Not assessed in the fit score: Ties, Jewelry.';
  await expect(page.getByRole('region',{name:'Your storage review'})).toContainText(notice);
  await page.locator('#studio-fit-tools > summary').click();await expect(page.getByRole('region',{name:'Storage fit summary',exact:true})).toContainText(notice);
  await page.getByRole('tab',{name:'Summary',exact:true}).click();
  await expect(page.getByRole('tabpanel')).toContainText(notice);
  await expect(page.getByRole('progressbar',{name:'Storage needs covered'})).toHaveAttribute('aria-valuenow','0');
  await expect(page.getByText('No modeled storage demand. Add supported categories to assess fit.')).toBeVisible();
  await page.getByRole('button',{name:'Export',exact:true}).click();await page.getByRole('menuitem',{name:'Print options and preview'}).click();
  const dialog=page.getByRole('dialog',{name:'Print options and preview'});await dialog.getByRole('button',{name:'Preview page breaks'}).click();
  await expect(dialog.frameLocator('iframe').getByText(notice,{exact:false})).toBeVisible();
});
