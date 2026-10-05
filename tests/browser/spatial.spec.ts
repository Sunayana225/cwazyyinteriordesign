import { test, expect } from '@playwright/test';
import { DEFAULT_CONFIG } from '../../src/lib/design';
test('island spatial view supports camera controls and retains real island geometry',async({page})=>{
 const config={...DEFAULT_CONFIG,closetType:'island',roomDimensions:{roomWidth:192,roomDepth:180}};
 await page.addInitScript(c=>localStorage.setItem('alveo-draft',JSON.stringify({version:1,config:c})),config);
 await page.goto('/configure');await page.getByRole('button',{name:'Show 3D room view',exact:true}).click();
 const view=page.getByRole('region',{name:'3D room preview'});
 await expect(view.getByText(/Freestanding island:/)).toBeVisible();
 await expect(view.getByRole('list',{name:'Island clearances'}).getByRole('listitem')).toHaveCount(4);
 const geometry=await view.locator('svg').innerHTML();await view.getByRole('button',{name:'Rotate right',exact:true}).click();await expect.poll(()=>view.locator('svg').innerHTML()).not.toBe(geometry);
 await view.getByRole('button',{name:'Reset 3D view'}).click();
 await view.scrollIntoViewIfNeeded();await view.screenshot({path:'test-results/island-spatial.png'});
 await view.getByLabel('Isolate island').check();await expect(view.locator('[data-spatial-wall="back"]')).toHaveCount(0);expect(await view.locator('[data-part="countertop"]').count()).toBeGreaterThan(0);
 await page.setViewportSize({width:390,height:844});await expect.poll(()=>view.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
});
test('spatial view explains an omitted island',async({page})=>{
 const config={...DEFAULT_CONFIG,closetType:'island',roomDimensions:{roomWidth:96,roomDepth:96}};
 await page.addInitScript(c=>localStorage.setItem('alveo-draft',JSON.stringify({version:1,config:c})),config);await page.goto('/configure');await page.getByRole('button',{name:'Show 3D room view',exact:true}).click();
 const view=page.getByRole('region',{name:'3D room preview'});await expect(view.getByRole('status')).toContainText('Island omitted');await expect(view.getByLabel('Isolate island')).toHaveCount(0);
});

test('3D drawers, openings, camera presets, drag rotation, visibility and export work together',async({page})=>{
 const config={...DEFAULT_CONFIG,closetType:'island',roomDimensions:{roomWidth:192,roomDepth:180},planning:{door:{wall:'front',offset:70,width:30,hinge:'right',swing:'out'},windows:[{id:'window',wall:'back',offset:35,width:30,sill:48,height:24}]}};
 await page.addInitScript(c=>localStorage.setItem('alveo-draft',JSON.stringify({version:1,config:c})),config);await page.goto('/configure');await page.getByRole('button',{name:'Show 3D room view',exact:true}).click();
 const view=page.getByRole('region',{name:'3D room preview'});
 await expect(view.locator('[data-opening="door"]')).toHaveCount(1);await expect(view.locator('[data-opening="window"]')).toHaveCount(1);
 await view.getByLabel('Camera preset').selectOption('overhead');await expect(view.getByText(/90° elevation/)).toBeVisible();await view.getByRole('button',{name:'Reset 3D view'}).click();
 await view.locator('summary').filter({hasText:'Visible storage walls'}).click();await view.getByLabel('Show LEFT WALL in 3D').uncheck();await expect(view.locator('[data-spatial-wall="left"]')).toHaveCount(0);
 await view.getByLabel('Isolate island').check();
 await view.locator('[data-spatial-drawer="island-unit:0:0"]').click();
 const editor=page.getByRole('dialog',{name:'Design drawer compartments'});await expect(editor).toBeVisible();await editor.getByRole('button',{name:'Close editor',exact:true}).click();
 await view.getByLabel('Drag to rotate').check();const svg=view.locator('svg');await svg.scrollIntoViewIfNeeded();const box=await svg.boundingBox();await page.mouse.move(box!.x+box!.width/2,box!.y+box!.height/2);await page.mouse.down();await page.mouse.move(box!.x+box!.width/2+50,box!.y+box!.height/2,{steps:5});await page.mouse.up();await expect(view.getByText(/Camera: 0° rotation/)).toBeVisible();await expect(editor).not.toBeVisible();
 const download=page.waitForEvent('download');await view.getByRole('button',{name:'Download 3D SVG'}).click();expect((await download).suggestedFilename()).toBe('closet-spatial-view.svg');
 await view.getByRole('button',{name:'Reset 3D view'}).click();await expect(view.getByLabel('Show LEFT WALL in 3D')).toBeChecked();await expect(view.getByLabel('Drag to rotate')).not.toBeChecked();
 await view.screenshot({path:'test-results/spatial-openings.png'});
});
