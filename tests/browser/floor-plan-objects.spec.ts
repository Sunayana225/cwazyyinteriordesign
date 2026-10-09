import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {DEFAULT_CONFIG} from '../../src/lib/design';
import {readFileSync} from 'node:fs';

test('floor plan opens object settings with mouse and keyboard, including the enlarged view',async({page})=>{
  const config={...structuredClone(DEFAULT_CONFIG),closetType:'walkin-u',roomDimensions:{roomWidth:180,roomDepth:160},planning:{
    windows:[{id:'window',label:'Garden',wall:'right',offset:20,width:24,sill:36,height:36}],
    obstacles:[{id:'bench',label:'Bench',x:60,y:90,width:18,depth:18,mobility:'movable'}],
    door:{wall:'front',offset:60,width:30,hinge:'left',swing:'in'},
  }};
  await page.addInitScript(c=>localStorage.setItem('alveo-draft',JSON.stringify({version:1,config:c})),config);
  await page.goto('/configure');await page.getByRole('button',{name:'Show floor plan',exact:true}).click();
  const plan=page.getByRole('group',{name:'Closet floor plan'});
  await expect(plan).toBeVisible();await expect(plan.locator('[data-opening="window"]')).toHaveAttribute('x','178');
  await plan.getByRole('button',{name:'Edit window Garden'}).click();await expect(page.getByLabel('Window 1 name',{exact:true})).toBeFocused();
  await page.getByLabel('Find room objects').fill('no-match');
  await plan.getByRole('button',{name:'Edit obstacle Bench'}).focus();await page.keyboard.press('Enter');
  await expect(page.getByLabel('Obstacle 1 label')).toBeFocused();await expect(page.getByLabel('Find room objects')).toHaveValue('');
  await plan.getByRole('button',{name:'Edit room door'}).focus();await page.keyboard.press('Space');await expect(page.getByLabel('Use measured door opening')).toBeFocused();
  await page.getByRole('button',{name:'Enlarge drawing',exact:true}).first().click();
  const enlarged=page.getByRole('dialog',{name:'Enlarged closet drawing'});
  await enlarged.getByRole('button',{name:'Edit obstacle Bench'}).click();await expect(enlarged).not.toBeVisible();await expect(page.getByLabel('Obstacle 1 label')).toBeFocused();
  expect((await new AxeBuilder({page}).include('svg[aria-label="Closet floor plan"]').withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
  await plan.screenshot({path:'test-results/floor-plan-objects-reviewed.png',style:'header:has(nav){visibility:hidden}'});
});

test('floor-plan drawing code is requested only when the plan is opened',async({page})=>{
  test.skip(!process.env.PLAYWRIGHT_BASE_URL,'Requires the production build and its loadable manifest.');
  const manifest=JSON.parse(readFileSync('.next/react-loadable-manifest.json','utf8')) as Record<string,{files:string[]}>;
  const files=Object.entries(manifest).find(([key])=>key.endsWith('-> ./FloorPlanCanvas'))?.[1].files??[];
  expect(files.length).toBeGreaterThan(0);
  const scripts:string[]=[];page.on('request',r=>{if(r.resourceType()==='script')scripts.push(r.url());});
  await page.goto('/configure?preset=4');await page.getByRole('button',{name:'Show floor plan',exact:true}).waitFor();
  for(const file of files)expect(scripts.some(url=>url.endsWith(`/_next/${file}`))).toBe(false);
  await page.getByRole('button',{name:'Show floor plan',exact:true}).click();
  await expect(page.getByRole('group',{name:'Closet floor plan'})).toBeVisible();
  for(const file of files)expect(scripts.some(url=>url.endsWith(`/_next/${file}`))).toBe(true);
  await page.getByRole('group',{name:'Closet floor plan'}).getByRole('button',{name:'Show RIGHT WALL elevation'}).click();
  await expect(page.getByRole('button',{name:/EL-C · RIGHT WALL/})).toHaveAttribute('aria-pressed','true');
});
