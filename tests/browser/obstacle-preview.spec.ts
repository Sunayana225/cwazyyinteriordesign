import { test,expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { DEFAULT_CONFIG,EMPTY_WARDROBE } from '../../src/lib/design';

test.beforeEach(async({page})=>{
  const config=structuredClone(DEFAULT_CONFIG);config.closetType='walkin-u';config.roomDimensions={roomWidth:100,roomDepth:100};
  config.dimensions.depth=12;config.wardrobe={...EMPTY_WARDROBE};config.shoes={boots:0,heels:0,sneakers:0,flats:0};
  config.planning={door:{wall:'front',offset:0,width:30,hinge:'left',swing:'in',check:'envelope'},obstacles:[{id:'a',label:'Bench',mobility:'movable',x:25,y:73,width:2,depth:2}]};
  await page.addInitScript(c=>{if(!localStorage.getItem('alveo-draft'))localStorage.setItem('alveo-draft',JSON.stringify({version:1,config:c}));},config);
  await page.goto('/configure');await page.locator('#studio-room-tools > summary').click();
});

test('proposed moves preview, cancel without saving, apply and survive reload',async({page})=>{
  const x=page.getByLabel('Obstacle 1 x',{exact:true}),y=page.getByLabel('Obstacle 1 y',{exact:true});
  const choose=page.getByRole('button',{name:/^Preview Bench at/}).first();await choose.click();
  const preview=page.getByRole('region',{name:'Obstacle move preview'});
  await expect(preview).toBeFocused();await expect(x).toHaveValue('25');await expect(y).toHaveValue('73');
  await expect(preview.getByRole('img',{name:/Proposed floor plan with/})).toBeVisible();await expect(preview).toContainText('Nothing has moved yet');
  expect((await new AxeBuilder({page}).include('[aria-label="Obstacle move preview"]').withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
  await preview.screenshot({path:'test-results/obstacle-move-reviewed.png',style:'header:has(nav){visibility:hidden}'});
  await preview.getByRole('button',{name:'Cancel obstacle move'}).click();await expect(x).toHaveValue('25');await expect(choose).toBeFocused();
  await choose.click();await preview.getByRole('button',{name:'Apply obstacle move'}).click();await expect(preview).toHaveCount(0);
  const applied={x:Number(await x.inputValue()),y:Number(await y.inputValue())};expect(applied).not.toEqual({x:25,y:73});
  await expect.poll(()=>page.evaluate(()=>{const o=JSON.parse(localStorage.getItem('alveo-draft')!).config.planning.obstacles[0];return {x:o.x,y:o.y};})).toEqual(applied);
  await page.reload();await page.locator('#studio-room-tools > summary').click();await expect(x).toHaveValue(String(applied.x));await expect(y).toHaveValue(String(applied.y));
});

test('changing a door while reviewing a suggestion prevents applying a stale move',async({page})=>{
  await page.getByRole('button',{name:/^Preview Bench at/}).first().click();
  await page.getByLabel('Door clearance model').selectOption('sector');
  const preview=page.getByRole('region',{name:'Obstacle move preview'});
  await expect(preview.getByRole('status')).toContainText('design changed');
  await expect(preview.getByRole('button',{name:'Apply obstacle move'})).toBeDisabled();
  await expect(page.getByLabel('Obstacle 1 x',{exact:true})).toHaveValue('25');
});

test('fixed objects keep their position and movable classifications persist through duplication and reload',async({page})=>{
  const placement=page.getByLabel('Obstacle 1 placement');await placement.selectOption('fixed');
  await expect(page.getByRole('button',{name:/^Preview Bench at/})).toHaveCount(0);
  await expect(page.getByText('Fixed at its surveyed position.',{exact:false})).toBeVisible();
  await expect(page.getByLabel('Obstacle 1 x',{exact:true})).toHaveValue('25');
  await placement.selectOption('movable');await expect(page.getByRole('button',{name:/^Preview Bench at/}).first()).toBeVisible();
  await page.getByRole('button',{name:'Duplicate obstacle 1'}).click();await expect(page.getByLabel('Obstacle 2 placement')).toHaveValue('movable');
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-draft')!).config.planning.obstacles.length)).toBe(2);
  await page.reload();await page.locator('#studio-room-tools > summary').click();await expect(page.getByLabel('Obstacle 2 placement')).toHaveValue('movable');
  await page.getByRole('button',{name:'Add obstacle',exact:true}).click();await expect(page.getByLabel('Obstacle 3 placement')).toHaveValue('fixed');
});
