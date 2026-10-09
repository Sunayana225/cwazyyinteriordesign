import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { DEFAULT_CONFIG, EMPTY_WARDROBE } from '../../src/lib/design';

const draft=(page:import('@playwright/test').Page)=>page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-draft')??'null')?.config);
const reveal=async(input:import('@playwright/test').Locator)=>input.evaluate(el=>{let parent=el.parentElement;while(parent){if(parent instanceof HTMLDetailsElement)parent.open=true;parent=parent.parentElement;}});

test('elevation retains the surveyed ceiling above a custom cabinet top',async({page})=>{
  const c=structuredClone(DEFAULT_CONFIG);c.dimensions.height=120;c.dimensions.cabinetHeight=84;c.planning={walls:{back:{ceilingHeight:108}}};
  await page.addInitScript(config=>localStorage.setItem('alveo-draft',JSON.stringify({version:1,config})),c);
  await page.goto('/configure');
  const elevation=page.locator('svg[data-ruler-width]').first();
  await expect(elevation).toContainText(`9'-0" ceiling`);
  await elevation.screenshot({path:'test-results/roadmap-measured-elevation.png',style:'header:has(nav){visibility:hidden}'});
});

test('survey confirmation persists, goes stale after measurements change, and can be cleared',async({page})=>{
  await page.goto('/configure');
  const review=page.getByRole('region',{name:'Your storage review'});
  await review.getByRole('button',{name:'I checked the measurements and fixed features'}).click();
  await expect(review.getByRole('status')).toContainText('Confirmed for this geometry');
  await expect.poll(async()=>(await draft(page))?.surveyConfirmation?.version).toBe(1);
  await page.reload();await expect(review.getByRole('status')).toContainText('Confirmed for this geometry');
  const ceiling=page.getByLabel('BACK WALL measured ceiling height',{exact:true});await reveal(ceiling);
  await ceiling.fill('72');await ceiling.press('Tab');
  await expect(review.getByRole('status')).toContainText('Room changed since confirmation');
  const changes=review.getByRole('list',{name:'Changed survey measurements'});
  await expect(changes).toContainText('back wall · ceiling height');
  await expect(changes).toContainText('Confirmed: Inherited');
  await expect(changes).toContainText('Current: 72 in');
  await page.reload();await expect(changes).toContainText('Current: 72 in');
  await page.getByLabel('User mode').selectOption('architect');
  const architect=page.getByRole('region',{name:'Architect coordination review'});
  await architect.getByText('Wall dimensions and offsets',{exact:true}).click();
  await expect(architect.getByRole('row',{name:/BACK WALL/})).toContainText('72.00');
  await architect.getByRole('button',{name:'I checked the measurements and fixed features'}).click();
  await expect(architect.getByRole('list',{name:'Changed survey measurements'})).toHaveCount(0);
  await architect.getByRole('button',{name:'Clear survey confirmation'}).click();
  await expect(architect.getByRole('status')).toContainText('Not confirmed');
  expect((await new AxeBuilder({page}).include('.studio-role-review').withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
  await architect.screenshot({path:'test-results/roadmap-wall-review.png',style:'header:has(nav){visibility:hidden}'});
});

test('homepage role selection works with blocked session storage and keeps autosave available',async({page})=>{
  await page.addInitScript(()=>{
    const get=Storage.prototype.getItem,set=Storage.prototype.setItem,remove=Storage.prototype.removeItem;
    Storage.prototype.getItem=function(key){if(this===sessionStorage)throw new DOMException('blocked','SecurityError');return get.call(this,key);};
    Storage.prototype.setItem=function(key,value){if(this===sessionStorage)throw new DOMException('blocked','SecurityError');return set.call(this,key,value);};
    Storage.prototype.removeItem=function(key){if(this===sessionStorage)throw new DOMException('blocked','SecurityError');return remove.call(this,key);};
  });
  await page.goto('/');await page.getByRole('button',{name:/^Architect Coordinate measured geometry/}).click();
  await expect(page.getByLabel('User mode')).toHaveValue('architect');
  await expect(page).not.toHaveURL(/mode=/);
  await expect.poll(async()=>(await draft(page))?.userInfo?.userType).toBe('architect');
  await page.getByLabel('User mode').selectOption('homeowner');
  await expect.poll(async()=>(await draft(page))?.userInfo?.userType).toBe('homeowner');
  await page.reload();await expect(page.getByLabel('User mode')).toHaveValue('homeowner');
});

test('direct workspace links preserve preset and fragment while consuming the mode once',async({page})=>{
  await page.goto('/configure?preset=4&mode=designer#studio-guide');
  await expect(page.getByLabel('User mode')).toHaveValue('designer');
  await expect(page).toHaveURL(/preset=4#studio-guide$/);
  await expect.poll(async()=>(await draft(page))?.closetType).toBe('island');
  await page.getByLabel('User mode').selectOption('renter');
  await expect.poll(async()=>(await draft(page))?.userInfo?.userType).toBe('renter');
  await page.reload();await expect(page.getByLabel('User mode')).toHaveValue('renter');
});

test('getting-started preferences are independent for each role',async({page})=>{
  await page.goto('/configure');
  await page.getByRole('button',{name:'Hide getting started'}).click();
  await page.getByLabel('User mode').selectOption('architect');
  await expect(page.getByRole('button',{name:'Hide getting started'})).toBeVisible();
  await page.getByLabel('User mode').selectOption('homeowner');
  await expect(page.getByRole('button',{name:'Show getting started'})).toBeVisible();
});

test('alternative review groups equivalent layouts and reports capacity tradeoffs',async({page})=>{
  const c=structuredClone(DEFAULT_CONFIG);c.wardrobe={...EMPTY_WARDROBE,shirts:5};c.shoes={boots:0,heels:0,sneakers:0,flats:0};
  await page.addInitScript(config=>{if(!localStorage.getItem('alveo-draft'))localStorage.setItem('alveo-draft',JSON.stringify({version:1,config}));},c);
  await page.goto('/configure');
  await page.locator('#studio-fit-tools > summary').click();
  await page.getByRole('button',{name:'Compare feasible drawer layouts'}).click();
  await expect(page.locator('#studio-fit-tools').getByRole('button',{name:/Use .* alternative/})).toHaveCount(1);
  await expect(page.getByText('Same geometry for: many-small, few-large, mixed.')).toBeVisible();
  await expect(page.getByText('Capacity changes before applying')).toBeVisible();
  await expect(page.getByText('No measured capacity change from the current layout.')).toBeVisible();
  await page.locator('#studio-fit-tools').screenshot({path:'test-results/roadmap-alternatives.png',style:'header:has(nav){visibility:hidden}'});
});
