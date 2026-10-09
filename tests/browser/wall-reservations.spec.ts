import {test,expect} from '@playwright/test';
import {DEFAULT_CONFIG} from '../../src/lib/design';

test('reserved spans identify overlapping causes, open their settings and appear in print',async({page})=>{
  const config={...structuredClone(DEFAULT_CONFIG),planning:{windows:[{id:'bay',wall:'back',offset:24,width:24,sill:30,height:24,label:'Bay window'}],obstacles:[{id:'column',label:'Column',x:36,y:0,width:24,depth:12}]}};
  await page.addInitScript(c=>localStorage.setItem('alveo-draft',JSON.stringify({version:1,config:c})),config);
  await page.goto('/configure');await page.locator('#studio-fit-tools > summary').click();
  const spans=page.getByRole('region',{name:'BACK WALL reserved spans'});
  await expect(spans).toContainText('36.00–48.00 in (12.00 in): Window 1: Bay window + Obstacle: Column');
  await spans.getByRole('button',{name:'Window 1: Bay window'}).first().click();
  await expect(page.getByLabel('Window 1 name')).toBeFocused();
  await page.getByRole('button',{name:'Export',exact:true}).click();await page.getByRole('menuitem',{name:'Print options and preview'}).click();
  const dialog=page.getByRole('dialog',{name:'Print options and preview'});await dialog.getByLabel('Include room opening and obstacle schedule').check();await dialog.getByRole('button',{name:'Preview page breaks'}).click();
  const print=dialog.frameLocator('iframe');await expect(print.getByRole('heading',{name:'Reserved wall spans'})).toBeVisible();await expect(print.getByRole('row',{name:/36.00–48.00/})).toContainText('Bay window + Obstacle: Column');
});

test('floor-offset preview uses constrained cabinetry and leaves the draft unchanged until applied',async({page})=>{
  const config={...structuredClone(DEFAULT_CONFIG),dimensions:{width:96,height:120,depth:24,cabinetHeight:84},planning:{walls:{back:{ceilingHeight:72,floorOffset:4}}}};
  await page.addInitScript(c=>{if(!localStorage.getItem('alveo-draft'))localStorage.setItem('alveo-draft',JSON.stringify({version:1,config:c}));},config);
  await page.goto('/configure');await page.locator('#studio-room-tools > summary').click();
  const offset=page.getByLabel('BACK WALL floor offset',{exact:true});await offset.fill('10');await offset.press('Tab');
  await expect(page.getByText('back: usable storage height 65.00 → 59.00 in, after the toe kick; lower edge raised to 10 in.')).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-draft')!).config.planning.walls.back.floorOffset)).toBe(4);
  await page.getByRole('button',{name:'Apply floor offset',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-draft')!).config.planning.walls.back.floorOffset)).toBe(10);
});
