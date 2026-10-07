import { test, expect } from '@playwright/test';
import { ClosetLayoutEngine } from '../../src/engine/ClosetLayoutEngine';
import { defaultInterior, drawerTargets, grid } from '../../src/lib/drawers';
import type { DrawerInterior, DrawerTarget } from '../../src/lib/drawers';
import { DEFAULT_CONFIG } from '../../src/lib/design';

const seedEditor=async(page:any,plan:(target:DrawerTarget)=>DrawerInterior)=>{
  const config=structuredClone(DEFAULT_CONFIG),target=drawerTargets(new ClosetLayoutEngine(config).calculateLayout())[0];
  config.drawerInteriors={[target.id]:{...plan(target),identity:target.identity}};
  await page.addInitScript((c:unknown)=>localStorage.setItem('alveo-draft',JSON.stringify({version:1,config:c})),config);
  await page.goto('/configure');await page.locator('[data-drawer-id]').first().click();
  return page.getByRole('dialog',{name:'Design drawer compartments'});
};
for(const locked of [false,true])test(locked?'locked dividers cannot be merged':'high-count neighbors remain available for precision resizing',async({page})=>{
 const config=structuredClone(DEFAULT_CONFIG),target=drawerTargets(new ClosetLayoutEngine(config).calculateLayout())[0];
 const plan={...defaultInterior(target.drawer),identity:target.identity,cells:grid(1,2).map(c=>({...c,quantity:locked?0:600})),lockedDividers:{x:locked?[.5]:[],y:[]}};
 config.drawerInteriors={[target.id]:plan};
 await page.addInitScript(c=>localStorage.setItem('alveo-draft',JSON.stringify({version:1,config:c})),config);
 await page.goto('/configure');await page.locator('[data-drawer-id]').first().click();
 const d=page.getByRole('dialog',{name:'Design drawer compartments'});
 await d.getByLabel('Merge with adjacent compartment').selectOption({index:1});
 await expect(d.getByRole('button',{name:'Merge compartments',exact:true})).toBeDisabled();
 await expect(d.getByText(locked?'Unlock the shared divider before merging.':/Combined quantity exceeds the 999-item/)).toBeVisible();
 if(!locked){
  await d.locator('summary').filter({hasText:'Precise compartment sizing'}).click();
  await d.getByLabel('Requested usable width (in)').fill('6');
  await d.getByRole('button',{name:'Preview compartment width'}).click();
  await expect(d.getByRole('button',{name:'Apply shared divider change'})).toBeVisible();
 }
});
test('item 004: previews inventory redistribution before replacing a populated arrangement',async({page})=>{
 const d=await seedEditor(page,t=>({...defaultInterior(t.drawer),cells:grid(1,1).map(c=>({...c,quantity:45}))}));
 // Template well counts are measured from the drawer, so read the count the card advertises.
 const jewelry=Number(/^(\d+) wells/.exec(await d.getByRole('button',{name:'Jewelry template',exact:true}).locator('small').innerText())?.[1]??1);
 await d.getByRole('button',{name:'Jewelry template',exact:true}).click();
 const preview=d.getByRole('group',{name:'Arrangement replacement preview'});
 await expect(preview).toBeVisible();await expect(preview).toContainText('45 planned items are redistributed');
 await expect(d.getByRole('button',{name:/^Compartment \d+:/})).toHaveCount(1);
 await d.getByRole('button',{name:'Confirm arrangement replacement'}).click();
 await expect(d.getByRole('button',{name:/^Compartment \d+:/})).toHaveCount(jewelry);
 await expect(d.getByText(new RegExp(`${jewelry} compartments · 45 planned items`))).toBeVisible();
});
test('item 007: split controls respect the configured minimum usable width',async({page})=>{
 const d=await seedEditor(page,t=>({...defaultInterior(t.drawer),cells:grid(1,1),minimumCellWidth:12}));
 await expect(d.getByRole('button',{name:'Split left / right',exact:true})).toBeDisabled();
 await expect(d.locator('[data-split-range]')).toContainText('larger than this compartment');
});
test('item 008: shows the achievable range beside the precision inputs',async({page})=>{
 const d=await seedEditor(page,t=>({...defaultInterior(t.drawer),cells:grid(1,2)}));
 await d.getByLabel('Merge with adjacent compartment').selectOption({index:1});
 await d.locator('summary').filter({hasText:'Precise compartment sizing'}).click();
 await expect(d.locator('[data-achievable="width"]')).toContainText('Achievable');
 await expect(d.locator('[data-achievable="depth"]')).toContainText('Choose the adjacent neighbor');
});
test('item 010: keyboard nudge moves the shared divider by the visible step',async({page})=>{
 const d=await seedEditor(page,t=>({...defaultInterior(t.drawer),cells:grid(1,2)}));
 await d.getByLabel('Merge with adjacent compartment').selectOption({index:1});
 await d.locator('summary').filter({hasText:'Measurements, item fit, divider tools, and custom templates'}).click();
 await d.getByLabel('Divider snap (in)').selectOption('0.5');
 const slider=d.getByLabel('Divider position',{exact:true});const before=Number(await slider.inputValue());
 await slider.focus();await page.keyboard.press(']');
 await expect.poll(async()=>Number(await slider.inputValue())).toBeGreaterThan(before);
});

