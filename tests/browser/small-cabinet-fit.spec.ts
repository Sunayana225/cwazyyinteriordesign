import { test, expect } from '@playwright/test';
import { DEFAULT_CONFIG, EMPTY_WARDROBE } from '../../src/lib/design';

test('shallow cabinets retain editable drawers and hide hanging actions after save/reload', async ({ page }) => {
  const config=structuredClone(DEFAULT_CONFIG);
  config.dimensions={width:48,height:48,depth:14};
  config.wardrobe={...EMPTY_WARDROBE,tShirts:20};
  config.shoes={boots:0,heels:0,sneakers:0,flats:0};
  await page.addInitScript(c=>{
    if(!localStorage.getItem('alveo-draft'))localStorage.setItem('alveo-draft',JSON.stringify({version:1,config:c}));
  },config);
  await page.goto('/configure');
  await expect(page.getByRole('button',{name:/Customize a drawer/})).toBeEnabled();
  await page.locator('[data-rearrange-wall]').first().click();
  const dialog=page.getByRole('dialog',{name:/Rearrange /});
  await expect(dialog.getByRole('button',{name:'Add Drawers',exact:true})).toBeVisible();
  await expect(dialog.getByRole('button',{name:'Add Double hang',exact:true})).toHaveCount(0);
  await expect(dialog.getByRole('button',{name:'Add Long hang',exact:true})).toHaveCount(0);
  await dialog.getByRole('button',{name:'Done — use this arrangement'}).click();
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-draft')!).config.zoneOverrides?.columns?.back?.[0]?.type)).toBe('drawers');
  await page.reload();
  await expect(page.getByRole('button',{name:/Customize a drawer/})).toBeEnabled();
  const drawing=page.locator('svg[data-ruler-width]').first();
  await expect(drawing).toBeVisible();
  await drawing.screenshot({path:'test-results/small-cabinet-drawers.png'});
});

test('wall settings preserve shallow depth and show honest shoe shortfalls', async ({ page }) => {
  await page.goto('/configure');
  const depth=page.getByLabel('BACK WALL cabinet depth',{exact:true});
  await depth.evaluate(el=>{let parent=el.parentElement;while(parent){if(parent instanceof HTMLDetailsElement)parent.open=true;parent=parent.parentElement;}});
  await depth.fill('10');await depth.press('Tab');
  await page.getByRole('button',{name:'Apply cabinet depth',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-draft')!).config.planning?.walls?.back?.depth)).toBe(10);
  await page.reload();
  await expect(page.getByLabel('BACK WALL cabinet depth',{exact:true})).toHaveValue('10');
  await page.locator('[data-rearrange-wall]').first().click();
  const dialog=page.getByRole('dialog',{name:/Rearrange /});
  await expect(dialog.getByRole('button',{name:'Add Shoe shelves',exact:true})).toHaveCount(0);
  await expect(dialog.getByRole('button',{name:'Add Drawers',exact:true})).toHaveCount(0);
  await expect(dialog.getByRole('button',{name:'Add Shelves & accessories',exact:true})).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('#studio-fit-tools > summary').click();
  const sneakers=page.getByRole('row').filter({has:page.getByRole('rowheader',{name:'sneakers pairs'})});
  await expect(sneakers).toContainText('Needs 5.00 more');
});
