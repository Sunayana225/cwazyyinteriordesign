import { test,expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test.beforeEach(async({page})=>{await page.goto('/configure');await expect(page.locator('[data-drawer-id]').first()).toBeVisible();});
const editor=(page:any)=>page.getByRole('dialog',{name:'Design drawer compartments'});
/** Template well counts are measured from the drawer, so read the count the card
 * itself advertises rather than hardcoding one. Also asserts card and plan agree. */
const advertised=async(d:any,name:string)=>{
  const text=await d.getByRole('button',{name:`${name} template`,exact:true}).locator('small').innerText();
  return Number(/^(\d+) wells/.exec(text)?.[1]??1);
};
test('click drawer, design compartments, apply, save and restore',async({page})=>{
  await page.locator('[data-drawer-id]').first().click();const d=editor(page);await expect(d).toBeVisible();
  const jewelry=await advertised(d,'Jewelry');
  await d.getByRole('button',{name:'Jewelry template',exact:true}).click();
  await expect(d.getByRole('button',{name:/^Compartment \d+:/})).toHaveCount(jewelry);
  await d.getByLabel('Compartment label',{exact:true}).fill('Daily rings');
  await d.getByLabel('Planned quantity').fill('6');
  await d.getByLabel('Organizer name').fill('My jewelry');
  await d.getByLabel('Base liner').selectOption('Velvet');
  await d.evaluate((el:HTMLElement)=>{el.scrollTop=0;});
  await page.screenshot({path:'test-results/drawer-desktop.png'});
  await d.getByRole('button',{name:'Apply to drawer',exact:true}).click();
  await expect(page.locator('[data-drawer-open]').first()).toBeFocused();
  await page.getByRole('button',{name:'Save',exact:true}).click();await page.reload();
  await page.locator('[data-drawer-id]').first().click();
  await expect(d.getByLabel('Organizer name')).toHaveValue('My jewelry');
  await expect(d.getByLabel('Compartment label',{exact:true})).toHaveValue('Daily rings');
  await expect(d.getByLabel('Base liner')).toHaveValue('Velvet');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-saved-designs')!));expect(Object.values(saved.designs[0].config.drawerInteriors)).toHaveLength(1);
});
test('split merge undo redo and discard work with the keyboard',async({page})=>{
  const face=page.locator('[data-drawer-id]').first();await face.focus();await page.keyboard.press('Enter');const d=editor(page);
  await d.getByRole('button',{name:'Split left / right',exact:true}).click();
  await expect(d.getByRole('button',{name:/^Compartment \d+:/})).toHaveCount(2);
  await d.getByRole('button',{name:'Undo',exact:true}).click();await expect(d.getByRole('button',{name:/^Compartment \d+:/})).toHaveCount(1);
  await d.getByRole('button',{name:'Redo',exact:true}).click();
  await d.getByLabel('Merge with adjacent compartment').selectOption({index:1});await d.getByRole('button',{name:'Merge compartments',exact:true}).click();await d.getByRole('button',{name:'Confirm merge',exact:true}).click();
  await expect(d.getByRole('button',{name:/^Compartment \d+:/})).toHaveCount(1);
  await d.getByLabel('Organizer notes').fill('Not applied');await page.keyboard.press('Escape');
  await expect(d.getByText('Discard unapplied changes?')).toBeVisible();await d.getByRole('button',{name:'Discard changes'}).click();await expect(d).not.toBeVisible();
  await expect(page.locator('[data-drawer-open]').first()).toBeFocused();
});
test('copy paste batch apply and SVG download',async({page})=>{
  await page.locator('[data-drawer-id]').first().click();const d=editor(page);
  const socks=await advertised(d,'Socks');
  await d.getByRole('button',{name:'Socks template',exact:true}).click();await d.getByRole('button',{name:'Copy organizer'}).click();
  const download=page.waitForEvent('download');await d.getByRole('button',{name:'Download SVG'}).click();expect((await download).suggestedFilename()).toBe('drawer-compartments.svg');
  await d.getByRole('button',{name:'Apply to drawer',exact:true}).click();
  await page.locator('[data-drawer-id]').nth(1).click();await d.getByRole('button',{name:'Paste organizer'}).click();
  // Paste carries the copied compartments across, so the count follows the source drawer.
  await expect(d.getByRole('button',{name:/^Compartment \d+:/})).toHaveCount(socks);
  await d.getByRole('button',{name:'Apply to matching drawers'}).click();
  await d.getByRole('button',{name:'Confirm batch application'}).click();
  await expect.poll(()=>page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('alveo-draft')!).config.drawerInteriors).length)).toBeGreaterThan(1);
});
test('drawer editor fits mobile and passes accessibility checks',async({page})=>{
  await page.setViewportSize({width:320,height:850});await page.locator('[data-drawer-id]').first().click();const d=editor(page);
  await expect(d).toBeVisible();
  expect(await d.evaluate((el:HTMLElement)=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  const result=await new AxeBuilder({page}).include('[aria-labelledby="drawer-title"]').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
  await page.screenshot({path:'test-results/drawer-mobile.png'});
});
test('layout tools, fit settings and view controls update the organizer',async({page})=>{
  await page.locator('[data-drawer-id]').first().click();const d=editor(page);
  await d.getByLabel('Grid rows').selectOption('3');await d.getByLabel('Grid columns').selectOption('2');await d.getByRole('button',{name:'Create grid'}).click();
  await expect(d.getByRole('button',{name:/^Compartment \d+:/})).toHaveCount(6);
  await d.getByRole('button',{name:'Rotate arrangement'}).click();await d.getByRole('button',{name:'Confirm arrangement rotation'}).click();await d.getByRole('button',{name:'Mirror arrangement'}).click();
  await d.getByLabel('Divider material',{exact:true}).selectOption('Oak');await d.getByLabel('Divider thickness (in)',{exact:true}).selectOption('0.5');await d.getByLabel('Edge allowance per side (in)',{exact:true}).selectOption('1');
  await d.getByLabel('Display units').selectOption('cm');await expect(d.getByText(/Usable estimate:/)).toContainText('cm');
  await d.getByLabel('Plan zoom').selectOption('1.5');await d.getByRole('checkbox',{name:'Labels',exact:true}).uncheck();await d.getByRole('checkbox',{name:'Measurements',exact:true}).uncheck();
  await d.getByRole('button',{name:'Apply to drawer',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('alveo-draft')!).config.drawerInteriors??{}).length)).toBeGreaterThan(0);
  const plan=await page.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('alveo-draft')!).config.drawerInteriors)[0] as any);
  expect(plan.material).toBe('Oak');expect(plan.thickness).toBe(.5);expect(plan.clearance).toBe(1);expect(plan.cells).toHaveLength(6);
});
test('resized and missing drawer organizers are retained and explained',async({page})=>{
  await page.locator('[data-drawer-id]').nth(1).click();const d=editor(page);await d.getByLabel('Organizer name').fill('Keep this plan');await d.getByRole('button',{name:'Apply to drawer',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('alveo-draft')!).config.drawerInteriors??{}).length)).toBeGreaterThan(0);
  await page.evaluate(()=>{const draft=JSON.parse(localStorage.getItem('alveo-draft')!);draft.config.userInfo.drawerPreference='few-large';draft.config.drawerInteriors['left:99:99']=structuredClone(Object.values(draft.config.drawerInteriors)[0]);localStorage.setItem('alveo-draft',JSON.stringify(draft));});await page.reload();
  await expect(page.getByText(/organizer\(s\) belong to drawers no longer/)).toBeVisible();
  await page.locator('[data-drawer-id]').nth(1).click();await expect(d.getByText(/Drawer size changed/)).toBeVisible();await expect(d.getByLabel('Organizer name')).toHaveValue('Keep this plan');
});
test('organizers appear in printable exports',async({page,context})=>{
  await context.addInitScript(()=>{window.print=()=>{document.body.dataset.printed='yes';};});await page.reload();
  await page.locator('[data-drawer-id]').first().click();const d=editor(page);await d.getByLabel('Organizer name').fill('Travel kit');await d.getByRole('button',{name:'Apply to drawer',exact:true}).click();
  await page.getByRole('button',{name:'Export',exact:true}).click();const popup=page.waitForEvent('popup');await page.getByRole('menuitem',{name:/Current/}).click();const p=await popup;
  await expect(p.locator('body')).toHaveAttribute('data-printed','yes');await expect(p.getByRole('heading',{name:'Drawer organizer: Travel kit'})).toBeVisible();
});
