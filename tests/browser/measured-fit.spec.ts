import {test,expect} from '@playwright/test';
import {DEFAULT_CONFIG,EMPTY_WARDROBE} from '../../src/lib/design';

test('measured hanger spacing updates fit, incremental demand, print and persisted configuration',async({page})=>{
  const config={...structuredClone(DEFAULT_CONFIG),wardrobe:{...EMPTY_WARDROBE,shirts:10},shoes:{boots:0,heels:0,sneakers:0,flats:0}};
  await page.addInitScript(c=>{if(!localStorage.getItem('alveo-draft'))localStorage.setItem('alveo-draft',JSON.stringify({version:1,config:c}));},config);
  await page.goto('/configure');await page.locator('#studio-room-tools > summary').click();
  const input=page.getByLabel('Shirts hanger spacing',{exact:true});await input.fill('3.125');await input.press('Tab');
  await page.locator('#studio-fit-tools > summary').click();
  await expect(page.locator('#studio-fit-tools').getByRole('row',{name:/Short hanging/})).toContainText('31.25');
  await expect(page.locator('#studio-fit-tools')).toContainText('Shirts 3.125 in');
  await page.locator('#studio-inventory-tools > summary').click();await page.locator('#studio-inventory-tools summary').filter({hasText:'Reserve and incremental demand'}).click();
  await expect(page.locator('[id="reserve-help-wardrobe.shirts"]')).toContainText('3.125 in hanging rod');
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-draft')!).config.planning?.hangerSpacing?.shirts)).toBe(3.125);
  await page.reload();await page.locator('#studio-room-tools > summary').click();await expect(input).toHaveValue('3.125');
  await input.fill('0');await input.press('Tab');await expect(input).toHaveAttribute('aria-invalid','true');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-draft')!).config.planning.hangerSpacing.shirts)).toBe(3.125);
  await page.getByRole('button',{name:'Export',exact:true}).click();await page.getByRole('menuitem',{name:'Print options and preview'}).click();
  const dialog=page.getByRole('dialog',{name:'Print options and preview'});await dialog.getByRole('button',{name:'Preview page breaks'}).click();await expect(dialog.frameLocator('iframe').getByText('Shirts 3.125 in',{exact:false})).toBeVisible();
});

test('measured shoe widths and lengths persist and exclude pairs from shallow storage',async({page})=>{
  const config={...structuredClone(DEFAULT_CONFIG),wardrobe:{...EMPTY_WARDROBE},shoes:{boots:0,heels:0,sneakers:8,flats:0}};
  await page.addInitScript(c=>{if(!localStorage.getItem('alveo-draft'))localStorage.setItem('alveo-draft',JSON.stringify({version:1,config:c}));},config);
  await page.goto('/configure');await page.locator('#studio-room-tools > summary').click();
  const width=page.getByLabel('sneakers pair width',{exact:true}),length=page.getByLabel('sneakers shoe length',{exact:true});
  await width.fill('8.125');await width.press('Tab');await length.fill('30');await length.press('Tab');
  await page.locator('#studio-fit-tools > summary').click();
  const row=page.locator('#studio-fit-tools').getByRole('row',{name:/sneakers/});
  await expect(row.getByRole('cell',{name:'0.00',exact:true})).toBeVisible();
  await page.locator('summary').filter({hasText:/Review \d+ layout notices/}).click();
  await expect(page.getByText(/sneakers need 30 in of shelf depth/).first()).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-draft')!).config.planning?.shoeLengths?.sneakers)).toBe(30);
  await page.reload();await page.locator('#studio-room-tools > summary').click();await expect(width).toHaveValue('8.125');await expect(length).toHaveValue('30');
  await length.fill('16.125');await length.press('Tab');await page.locator('#studio-fit-tools > summary').click();
  await expect(row).toContainText('Covered');
  await page.getByRole('button',{name:'Export',exact:true}).click();await page.getByRole('menuitem',{name:'Print options and preview'}).click();
  const dialog=page.getByRole('dialog',{name:'Print options and preview'});await dialog.getByRole('button',{name:'Preview page breaks'}).click();
  await expect(dialog.frameLocator('iframe').getByText('sneakers pair width 8.125 in, length 16.125 in',{exact:false})).toBeVisible();
});
