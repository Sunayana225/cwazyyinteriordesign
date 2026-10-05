import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('target inventory comparison and notes preserve entered counts until applied',async({page})=>{
  await page.goto('/configure');
  await page.locator('summary').filter({hasText:'Household, seasonal inventory, and reserve capacity'}).click();
  await page.locator('summary').filter({hasText:'Current and target inventory'}).click();
  await page.getByRole('button',{name:'Capture current as target'}).click();
  await page.getByLabel('Target Shirts & blouses',{exact:true}).fill('57');
  await expect(page.getByRole('table',{name:'Current versus target counts'}).getByRole('row').filter({hasText:'Shirts & blouses'})).toContainText('57');
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-saved-designs')!).designs[0].config.inventoryPlanning.target.wardrobe.shirts)).toBe(57);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-saved-designs')!).designs[0].config.wardrobe.shirts)).not.toBe(57);
  await page.getByRole('button',{name:'Apply target counts'}).click();await page.getByRole('button',{name:'Confirm target inventory'}).click();
  await page.locator('summary').filter({hasText:'Exceptional measurement notes'}).click();
  await page.getByLabel('long measurement notes',{exact:true}).fill('Coat measured on its hanger');
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download inventory CSV / template'}).click();
  expect(await readFile((await (await download).path())!,'utf8')).toContain('wardrobe.shirts,57');
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-draft')!).config.inventoryPlanning.notes.long)).toBe('Coat measured on its hanger');
});

test('template export, conflicting import, replacement preview and external-read errors work',async({page})=>{
  await page.goto('/configure');await page.locator('[data-drawer-id]').first().click();const d=page.getByRole('dialog',{name:'Design drawer compartments'});
  await d.locator('summary').filter({hasText:'Measurements, item fit, divider tools, and custom templates'}).click();
  await d.getByLabel('Template name',{exact:true}).fill('Portable');await d.getByRole('button',{name:'Save custom template'}).click();
  await d.getByLabel('Export template Portable',{exact:true}).check();const download=page.waitForEvent('download');await d.getByRole('button',{name:'Download selected templates'}).click();
  const raw=await readFile((await (await download).path())!,'utf8');
  await d.getByLabel('Import organizer templates').setInputFiles({name:'templates.json',mimeType:'application/json',buffer:Buffer.from(raw)});
  await expect(d.getByText(/conflict: imported copy gets a new ID/)).toBeVisible();await d.getByRole('button',{name:'Confirm template import'}).click();
  await expect(d.getByLabel('Export template Portable',{exact:true})).toHaveCount(2);
  await d.getByLabel('Manage saved template').selectOption({index:1});await d.getByLabel('Organizer name',{exact:true}).fill('Edited plan');
  await d.getByRole('button',{name:'Preview template replacement'}).click();await expect(d.getByRole('heading',{name:'Template replacement differences'})).toBeVisible();await d.getByRole('button',{name:'Confirm template replacement'}).click();await expect(d.getByText('Template replaced.',{exact:true})).toBeVisible();
  await page.evaluate(()=>{localStorage.setItem('alveo-organizer-templates','invalid');window.dispatchEvent(new StorageEvent('storage',{key:'alveo-organizer-templates'}));});
  await expect(d.getByRole('group',{name:'My organizer templates',exact:true}).getByRole('status')).toContainText(/JSON|Unexpected/);expect(await page.evaluate(()=>localStorage.getItem('alveo-organizer-templates'))).toBe('invalid');
});

test('forced-color warnings and item-fit descriptions remain linked and visible',async({page})=>{
  await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});await page.goto('/configure');await page.locator('[data-drawer-id]').first().click();const d=page.getByRole('dialog',{name:'Design drawer compartments'});
  await d.getByRole('button',{name:'Jewelry template',exact:true}).click();await d.locator('summary').filter({hasText:'Measurements, item fit, divider tools, and custom templates'}).click();
  await d.getByLabel('Use measured internal dimensions').check();await d.getByLabel('Measured width (in)',{exact:true}).fill('3');
  await expect(d.locator('#drawer-validation')).toBeVisible();await expect(d.locator('#drawer-validation')).toHaveCSS('border-top-style','solid');
  await expect(d.getByRole('button',{name:/^Compartment 1:/})).toHaveAttribute('aria-describedby','drawer-validation');
  await d.getByLabel('Check an item’s fit').check();await d.getByLabel('Item height (in)',{exact:true}).fill('100');
  await expect(d.getByLabel('Item height (in)',{exact:true})).toHaveAttribute('aria-describedby','item-fit-details');await expect(d.locator('#item-fit-details')).toContainText('height');
});
