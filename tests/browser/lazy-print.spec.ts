import {test,expect} from '@playwright/test';

test('cold print opens immediately and retains captured inventory while export code loads',async({page,context})=>{
  await context.addInitScript(()=>{window.print=()=>{document.body.dataset.printed='yes';};});
  await page.goto('/configure');await page.getByRole('button',{name:'Export',exact:true}).waitFor();
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/_next/static/chunks/*.js',async route=>{await gate;await route.continue();});
  try {
    await page.getByRole('button',{name:'Export',exact:true}).click();
    const opened=page.waitForEvent('popup');await page.getByRole('menuitem',{name:/Current/}).click();const print=await opened;
    await expect(print.getByText('Preparing your drawing…')).toBeVisible();
    await page.getByRole('button',{name:'Wardrobe',exact:true}).click();
    await page.getByLabel('Shirts & Blouses',{exact:true}).fill('123');await page.getByLabel('Shirts & Blouses',{exact:true}).press('Tab');
    release();await expect(print.locator('body')).toHaveAttribute('data-printed','yes');
    await expect(print.getByRole('row').filter({has:print.getByRole('cell',{name:'shirts',exact:true})})).toHaveText('shirts10');
    await print.close();
  } finally {release();await page.unrouteAll({behavior:'wait'});}
});

test('failed export downloads close the reserved window and allow retry',async({page,context})=>{
  await context.addInitScript(()=>{window.print=()=>{document.body.dataset.printed='yes';};});
  await page.goto('/configure');await page.getByRole('button',{name:'Export',exact:true}).waitFor();
  await page.route('**/_next/static/chunks/*.js',route=>route.abort('failed'));
  await page.getByRole('button',{name:'Export',exact:true}).click();
  const opened=page.waitForEvent('popup');await page.getByRole('menuitem',{name:/Current/}).click();const failed=await opened;
  await expect.poll(()=>failed.isClosed()).toBe(true);
  await expect(page.locator('#closet-preview [role="alert"]')).toBeVisible();
  await page.unrouteAll({behavior:'wait'});
  await page.getByRole('button',{name:'Export',exact:true}).click();const retry=page.waitForEvent('popup');await page.getByRole('menuitem',{name:/Current/}).click();
  const print=await retry;await expect(print.locator('body')).toHaveAttribute('data-printed','yes');await print.close();
});
