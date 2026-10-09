import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.goto('/configure');
  await expect(page.getByRole('heading', { name: 'Your Closet Preview' })).toBeVisible();
  await expect(page.locator('#closet-preview svg').first()).toBeVisible();
});
test('complete wizard, fractional dimensions, inventory, style and review', async ({ page }) => {
  await page.getByRole('button', { name: /^Next$/ }).click();
  await page.getByRole('button', { name: 'Switch to inches-only' }).click();
  const width = page.getByLabel('Wall Width', { exact: true });
  await width.fill('107.875'); await width.press('Tab');
  await page.getByRole('button', { name: /^Next$/ }).click();
  await page.getByLabel('Shirts & Blouses', { exact: true }).fill('30');
  await page.getByLabel('Shirts & Blouses', { exact: true }).press('Tab');
  await page.getByRole('button', { name: /^Next$/ }).click();
  await page.getByLabel('Boots pairs').fill('7');
  await page.getByRole('button', { name: /^Next$/ }).click();
  await page.getByRole('button', { name: /White Painted/ }).click();
  await page.getByRole('button', { name: 'Review design' }).click();
  const draft = await page.evaluate(() => JSON.parse(localStorage.getItem('alveo-draft')!));
  expect(draft.config.dimensions.width).toBe(107.875); expect(draft.config.wardrobe.shirts).toBe(30); expect(draft.config.shoes.boots).toBe(7); expect(draft.config.userInfo.woodFinish).toBe('white');
});
test('save reload open rename and undo deletion', async ({ page }) => {
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: /Manage saved designs/ }).click();
  const dialog=page.getByRole('dialog', { name: 'Saved designs' });
  await expect(dialog.getByText('Design 1', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Rename' }).click();
  await dialog.getByLabel('Design name').fill('Master bedroom');
  await dialog.getByRole('button', { name: 'Save name' }).click();
  await dialog.getByRole('button', { name: 'Open', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: /Manage saved designs/ }).click();
  await dialog.getByRole('button', { name: 'Delete' }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Undo delete' }).click();
  await page.reload(); await page.getByRole('button', { name: /Manage saved designs/ }).click();
  await expect(dialog.getByText('Master bedroom', { exact: true })).toBeVisible();
});
test('drawer undo is preserved in saved configuration', async ({ page }) => {
  await page.getByRole('button', { name: /Top Ideal for seasonal items/ }).click();
  await page.getByRole('button', { name: 'Undo move' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-saved-designs')!));
  expect(saved.designs[0].config.zoneOverrides?.drawerPosition ?? 'bottom').toBe('bottom');
});
test('storage failure is visible and never reports a durable save', async ({ page }) => {
  await page.evaluate(()=>{ Storage.prototype.setItem = () => { throw new DOMException('full', 'QuotaExceededError'); }; });
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText(/only in memory/)).toBeVisible();
  await expect(page.getByText('Design saved!', { exact:true })).not.toBeVisible();
});
test('changes from a second tab preserve both saves', async ({ page, context }) => {
  const other=await context.newPage(); await other.goto('/configure');
  await expect(other.getByRole('button', {name:'Save',exact:true})).toBeVisible();
  await page.getByRole('button', {name:'Save',exact:true}).click();
  await expect(other.getByRole('button',{name:/Manage saved designs \(1\)/})).toBeVisible();
  await other.getByRole('button',{name:'Save',exact:true}).click();
  await expect(page.getByRole('button',{name:/Manage saved designs \(2\)/})).toBeVisible();
});
test('gallery presets open real configurations', async ({ page }) => {
  await page.goto('/gallery');
  const open=page.getByRole('link',{name:'View and customize layout'}).nth(3);
  const preset=(await open.getAttribute('href'))?.match(/preset=(\d+)/)?.[1];
  await open.click();
  // Client-side navigation commits the URL only once the /configure route is served, which is slow on a cold dev build.
  await expect(page).toHaveURL(new RegExp(`preset=${preset}`),{timeout:30000});
  await expect(page.getByText('EL-D · ISLAND UNIT')).toBeVisible();
  // A previous draft exists already; wait for the new preset's debounced save.
  await expect.poll(()=>page.evaluate(()=>{
    const c=JSON.parse(localStorage.getItem('alveo-draft')!).config;
    return {style:c.userInfo.stylePreference,width:c.roomDimensions?.roomWidth};
  })).toEqual({style:'luxury',width:192});
});
test('preview controls change the actual SVG', async ({ page }) => {
  await page.getByRole('tab',{name:'Style',exact:true}).click();
  await page.getByRole('button',{name:/Brushed Gold/}).click();
  await page.getByRole('tab',{name:'Design style',exact:true}).click();
  await page.getByRole('button',{name:'Sage Green',exact:true}).click();
  await page.getByRole('tab',{name:'Drawing',exact:true}).click();
  await expect(page.locator('#closet-preview')).toContainText('NOT TO SCALE');
  const svg=await page.locator('#closet-preview svg').filter({has:page.locator('title')}).first().evaluate(el=>el.outerHTML);
  expect(svg).toContain('#a77b16'); expect(svg).toContain('#e8f0e8');
  await page.getByRole('button',{name:'Enlarge drawing'}).click();
  await expect(page.getByRole('dialog',{name:'Enlarged closet drawing'})).toBeVisible();
  await page.keyboard.press('Escape');
});
test('keyboard dialog and preview tabs have accessible behavior', async ({ page }) => {
  await page.getByRole('tab',{name:'Drawing',exact:true}).focus(); await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab',{name:'Summary',exact:true})).toBeFocused();
  await page.getByRole('button',{name:/Manage saved designs/}).click();
  await expect(page.getByRole('dialog',{name:'Saved designs'})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:/Manage saved designs/})).toBeFocused();
});
test('current and multi-design exports prepare printable documents without executing names', async ({ page, context }) => {
  await context.addInitScript(()=>{ window.print=()=>{ document.body.dataset.printed='yes'; }; });
  await page.reload();
  await page.getByRole('button',{name:'Export',exact:true}).click();
  const currentPromise=page.waitForEvent('popup');
  await page.getByRole('menuitem',{name:/Current/}).click();
  const printed=await currentPromise;
  await expect(printed.locator('body')).toHaveAttribute('data-printed','yes');
  await expect(printed.getByRole('heading',{name:'Capacity and fit'})).toBeVisible();
  await printed.emulateMedia({media:'print'});
  await printed.screenshot({path:'test-results/print-preview.png',fullPage:true});
  await printed.close();
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.getByRole('button',{name:/Manage saved designs/}).click();
  const d=page.getByRole('dialog',{name:'Saved designs'});
  await d.getByRole('button',{name:'Rename'}).first().click();
  await d.getByLabel('Design name').fill('<img src=x onerror=alert(1)>');
  await d.getByRole('button',{name:'Save name'}).click();
  await d.getByRole('checkbox').nth(0).check(); await d.getByRole('checkbox').nth(1).check();
  const multiplePromise=page.waitForEvent('popup'); await d.getByRole('button',{name:'Export 2 designs'}).click();
  const multiple=await multiplePromise; await expect(multiple.locator('body')).toHaveAttribute('data-printed','yes');
  await expect(multiple.locator('article')).toHaveCount(2); await expect(multiple.locator('img')).toHaveCount(0);
});
test('blocked popup produces an actionable error', async ({ page }) => {
  await page.evaluate(()=>{ window.open=()=>null; });
  await page.getByRole('button',{name:'Export',exact:true}).click(); await page.getByRole('menuitem',{name:/Current/}).click();
  await expect(page.locator('#closet-preview [role=alert]')).toContainText('blocked');
});
test('desktop configurator passes accessibility checks', async ({ page }) => {
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
});
test('mobile layout has no horizontal overflow and menu operates', async ({ page }) => {
  await page.setViewportSize({width:320,height:850});
  await page.getByRole('button',{name:'Toggle menu'}).click();
  await expect(page.getByRole('button',{name:'Toggle menu'})).toHaveAttribute('aria-expanded','true');
  await page.locator('#mobile-navigation a').first().focus(); await page.keyboard.press('Escape');
  const overflow = await page.evaluate(()=>Array.from(document.querySelectorAll('body *')).filter(el=>{const r=el.getBoundingClientRect();return r.width>0 && r.right>innerWidth+1;}).slice(0,12).map(el=>({tag:el.tagName,cls:el.className,width:el.getBoundingClientRect().width,text:el.textContent?.slice(0,80)})));
  expect(overflow).toEqual([]);
  await page.getByRole('link',{name:'Explore your design'}).click();
  await page.screenshot({path:'test-results/mobile-preview.png',fullPage:true});
});

test('mobile step forms and styling remain inside the viewport', async ({ page }) => {
  await page.setViewportSize({width:320,height:850});
  for(let i=0;i<4;i++) {
    await page.getByRole('button',{name:'Next',exact:true}).click();
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  }
  await page.getByRole('tab',{name:'Style',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await expect(page.locator('#panel-style')).toHaveCSS('opacity', '1');
  await expect.poll(() => page.locator('#panel-style').evaluate(el => Array.from(el.querySelectorAll('*')).every(child => getComputedStyle(child).opacity === '1'))).toBe(true);
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
});
test('unit switching preserves eighth-inch measurements and normalizes inches above eleven', async ({ page }) => {
  await page.getByRole('button',{name:'Next',exact:true}).click();
  await page.getByLabel('Wall Width inches').fill('12.125'); await page.getByLabel('Wall Width inches').press('Tab');
  await expect(page.getByLabel('Wall Width feet')).toHaveValue('9'); await expect(page.getByLabel('Wall Width inches')).toHaveValue('0.125');
  await page.getByRole('button',{name:'Switch to inches-only'}).click();
  await expect(page.getByLabel('Wall Width',{exact:true})).toHaveValue('108.125');
  await page.getByRole('button',{name:'Switch to ft + in'}).click();
  await expect(page.getByLabel('Wall Width inches')).toHaveValue('0.125');
});
test('invalid saved data is retained and produces a visible recovery message', async ({ page }) => {
  await page.evaluate(()=>localStorage.setItem('alveo-saved-designs','{"version":99,"designs":[]}'));
  await page.reload();
  await expect(page.getByRole('status').filter({hasText:'unsupported format'})).toBeVisible();
  await page.getByRole('button',{name:'Save',exact:true}).click();
  expect(await page.evaluate(()=>localStorage.getItem('alveo-saved-designs'))).toBe('{"version":99,"designs":[]}');
});
