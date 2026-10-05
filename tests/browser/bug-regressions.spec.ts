import { test,expect } from '@playwright/test';
test('inventory inputs interpret browser-supported exponent notation correctly',async({page})=>{
  await page.goto('/configure');await page.getByRole('button',{name:'Wardrobe',exact:true}).click();
  const input=page.getByLabel('Shirts & Blouses',{exact:true});await input.fill('1e2');await input.press('Tab');await expect(input).toHaveValue('100');
});
test('invalid dimension drafts cannot advance and rounding is displayed consistently',async({page})=>{
  await page.goto('/configure');await page.getByRole('button',{name:'Next',exact:true}).click();
  await page.getByRole('button',{name:'Switch to inches-only'}).click();
  const width=page.getByLabel('Wall Width',{exact:true});
  await width.fill('');await width.press('Tab');
  await expect(page.getByRole('button',{name:'Next',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Wardrobe',exact:true}).click();await expect(width).toBeVisible();
  await width.fill('96.1');await width.press('Tab');await expect(width).toHaveValue('96.125');
  await width.fill('96.13');await width.press('Tab');await expect(width).toHaveValue('96.125');
  await expect(page.getByRole('button',{name:'Next',exact:true})).toBeEnabled();
});
test('concurrent named saves from two tabs are serialized without losing designs',async({page,context})=>{
  await page.goto('/configure');const other=await context.newPage();await other.goto('/configure');
  await Promise.all([page.getByRole('button',{name:'Save',exact:true}).click(),other.getByRole('button',{name:'Save',exact:true}).click()]);
  await expect(page.getByRole('button',{name:/Manage saved designs \(2\)/})).toBeVisible();
  const designs=await page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-saved-designs')!).designs);
  expect(new Set(designs.map((d:any)=>d.id)).size).toBe(2);expect(new Set(designs.map((d:any)=>d.name)).size).toBe(2);
});
test('failed in-memory saves survive external writes and persist after storage recovers',async({page,context})=>{
  await page.goto('/configure');const other=await context.newPage();await other.goto('/configure');
  await page.evaluate(()=>{(window as any).originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='alveo-saved-designs')throw new DOMException('full','QuotaExceededError');return (window as any).originalSetItem.call(this,key,value);};});
  await page.getByRole('button',{name:'Save',exact:true}).click();await expect(page.getByText(/only in memory/)).toBeVisible();
  await other.getByRole('button',{name:'Save',exact:true}).click();await expect(page.getByRole('button',{name:/Manage saved designs \(2\)/})).toBeVisible();
  await page.evaluate(()=>{Storage.prototype.setItem=(window as any).originalSetItem;});
  await page.getByRole('button',{name:'Save',exact:true}).click();await expect(page.getByRole('button',{name:/Manage saved designs \(3\)/})).toBeVisible();
  await page.reload();await expect(page.getByRole('button',{name:/Manage saved designs \(3\)/})).toBeVisible();
});
test('clearing storage from another tab does not silently recreate its draft',async({page,context})=>{
  await page.goto('/configure');const other=await context.newPage();await other.goto('/configure');await other.evaluate(()=>localStorage.clear());
  await expect(page.getByText(/changed or cleared the draft/)).toBeVisible();await page.getByLabel('User mode').selectOption('renter');
  expect(await page.evaluate(()=>localStorage.getItem('alveo-draft'))).toBeNull();
});
