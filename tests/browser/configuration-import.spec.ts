import { test, expect } from '@playwright/test';
import { DEFAULT_CONFIG } from '../../src/lib/design';

test('malformed optional configuration is rejected without changing saved designs',async({page})=>{
  await page.goto('/configure');await page.getByRole('button',{name:'Save',exact:true}).click();
  await expect(page.getByRole('button',{name:/Manage saved designs \(1\)/})).toBeVisible();
  const before=await page.evaluate(()=>localStorage.getItem('alveo-saved-designs'));
  await page.getByRole('button',{name:/Manage saved designs/}).click();const d=page.getByRole('dialog',{name:'Saved designs'});
  await d.locator('summary').filter({hasText:'Restore, compare, tags, and updates'}).click();
  for(const field of ['roomDimensions','zoneOverrides','amenities']){
    const raw=JSON.stringify({version:1,designs:[{id:'invalid',name:'Invalid',savedAt:'2026-09-29',config:{...DEFAULT_CONFIG,[field]:null}}]});
    await d.getByLabel(/Restore JSON backup/).setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from(raw)});
    await expect(d.getByText('0 recoverable designs; 1 rejected records.')).toBeVisible();
    await expect(d.getByRole('status').filter({hasText:`config.${field}`})).toBeVisible();
    expect(await page.evaluate(()=>localStorage.getItem('alveo-saved-designs'))).toBe(before);
  }
});

test('invalid stored draft is retained and named saving remains available',async({page})=>{
  const raw=JSON.stringify({version:1,config:{...DEFAULT_CONFIG,amenities:[]}});
  await page.addInitScript(value=>localStorage.setItem('alveo-draft',value),raw);
  await page.goto('/configure');await expect(page.getByText(/The draft could not be restored/)).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem('alveo-draft'))).toBe(raw);
  await page.getByRole('button',{name:'Save',exact:true}).click();await expect(page.getByRole('button',{name:/Manage saved designs \(1\)/})).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem('alveo-draft'))).toBe(raw);
});
