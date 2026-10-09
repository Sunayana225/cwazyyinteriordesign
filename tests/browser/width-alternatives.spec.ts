import {test,expect} from '@playwright/test';
import {DEFAULT_CONFIG} from '../../src/lib/design';

test('width alternatives apply exact widths, persist, and invalidate obsolete results',async({page})=>{
  await page.addInitScript(c=>{if(!localStorage.getItem('alveo-draft'))localStorage.setItem('alveo-draft',JSON.stringify({version:1,config:c}));},DEFAULT_CONFIG);
  await page.goto('/configure');await page.locator('#studio-fit-tools > summary').click();
  await page.getByRole('button',{name:'Explore width allocations'}).click();
  const explorer=page.getByRole('region',{name:'Width allocation alternatives'});
  await explorer.getByRole('button',{name:'Find width alternatives'}).click();
  await expect(explorer.getByRole('status')).toContainText('layouts examined');
  const apply=explorer.getByRole('button',{name:/^Use BACK WALL:/}).first();await expect(apply).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-draft')!).config.zoneOverrides?.columns?.back)).toBeUndefined();
  await apply.click();
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-draft')!).config.zoneOverrides?.columns?.back?.length??0)).toBeGreaterThan(1);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-draft')!).config);
  expect(saved.zoneOverrides.columns.back.reduce((n:number,c:{width:number})=>n+c.width,0)).toBeCloseTo(96);
  expect(saved.userInfo).toEqual(DEFAULT_CONFIG.userInfo);
  await expect(explorer.getByRole('button',{name:/^Use BACK WALL:/})).toHaveCount(0);
  await explorer.getByRole('button',{name:'Find width alternatives'}).click();
  await expect(explorer.getByRole('status')).toContainText('0 layouts examined');
  await explorer.getByText('Walls preserved by this search').click();
  await expect(explorer).toContainText('manually edited columns are preserved');
  await page.reload();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-draft')!).config.zoneOverrides.columns.back)).toEqual(saved.zoneOverrides.columns.back);
});
