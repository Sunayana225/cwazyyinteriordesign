import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { DEFAULT_CONFIG } from '../../src/lib/design';

const draft=(page:import('@playwright/test').Page)=>page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-draft')??'null')?.config);

test('homeowner gets specific shortages and designer gets the current material direction',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const config=structuredClone(DEFAULT_CONFIG);config.shoes.sneakers=100;
  await page.addInitScript(c=>localStorage.setItem('alveo-draft',JSON.stringify({version:1,config:c})),config);
  await page.goto('/configure');
  const home=page.getByRole('region',{name:'Your storage review'});
  await expect(home.getByRole('heading',{name:'Review storage shortages'})).toBeVisible();
  await home.getByText('See what needs more space',{exact:true}).click();
  await expect(home).toContainText('sneakers: needs 100');
  await home.getByRole('button',{name:'Open storage fit',exact:true}).click();
  await expect(page.locator('#studio-fit-tools > summary')).toBeFocused();
  await page.getByLabel('User mode').selectOption('designer');
  const designer=page.getByRole('region',{name:'Client presentation review'});
  await expect(designer).toContainText('Modern · Walnut · Hardware: automatic for selected style');
  await designer.getByRole('button',{name:'Refine finishes'}).click();
  await expect(page.getByRole('tab',{name:'Style',exact:true})).toHaveAttribute('aria-selected','true');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const result=await new AxeBuilder({page}).include('.studio-role-review').withTags(['wcag2a','wcag2aa']).analyze();
  expect(result.violations).toEqual([]);
  await designer.screenshot({path:'test-results/designer-live-review-mobile.png',style:'header:has(nav) { visibility:hidden; }'});
});

test('switching workspaces preserves the design and persists the selected role',async({page})=>{
  await page.goto('/configure');
  await expect(page.getByLabel('User mode')).toBeEnabled();
  await expect.poll(()=>draft(page)).toBeTruthy();
  const original=await draft(page);
  const names={homeowner:'Make this design your own',renter:'Plan around your existing space',designer:'Refine the client presentation',architect:'Coordinate the space and drawing set',browsing:'Explore what your space could become'};
  for(const [role,heading] of Object.entries(names)){
    await page.getByLabel('User mode').selectOption(role);
    await expect(page.getByRole('heading',{name:heading})).toBeVisible();
    await expect.poll(async()=>(await draft(page))?.userInfo?.userType).toBe(role);
    const current=await draft(page);
    expect({...current,userInfo:{...current.userInfo,userType:original.userInfo.userType}}).toEqual(original);
    await page.locator('#studio-guide summary').click();
    await expect(page.locator('#studio-guide .studio-tool-results button')).toHaveCount(9);
    await page.locator('#studio-guide summary').click();
  }
  await page.reload();await expect(page.getByLabel('User mode')).toHaveValue('browsing');
  await expect(page.getByRole('link',{name:/Explore the gallery/})).toHaveAttribute('href','/gallery');
});

test('homepage role choice applies to an existing draft once without replacing its measurements',async({page})=>{
  const c=structuredClone(DEFAULT_CONFIG);c.dimensions.width=111.5;c.userInfo.woodFinish='dark';
  await page.addInitScript(config=>{if(!localStorage.getItem('alveo-draft'))localStorage.setItem('alveo-draft',JSON.stringify({version:1,config}));},c);
  await page.goto('/');
  await page.getByRole('button',{name:/^Architect Coordinate measured geometry/}).click();
  await expect(page.getByLabel('User mode')).toHaveValue('architect');
  await expect.poll(async()=>(await draft(page))?.userInfo?.userType).toBe('architect');
  expect((await draft(page)).dimensions.width).toBe(111.5);
  expect((await draft(page)).userInfo.woodFinish).toBe('dark');
  await page.getByLabel('User mode').selectOption('homeowner');
  await expect.poll(async()=>(await draft(page))?.userInfo?.userType).toBe('homeowner');
  await page.reload();await expect(page.getByLabel('User mode')).toHaveValue('homeowner');
});

test('architect shortcuts open real controls and the print preset preserves project details',async({page})=>{
  await page.goto('/configure');
  await page.getByLabel('User mode').selectOption('architect');
  await page.getByRole('button',{name:/Coordinate room geometry/}).click();
  await expect(page.locator('#studio-room-tools > summary')).toBeFocused();
  await page.getByRole('button',{name:/Audit capacity & constraints/}).click();
  await expect(page.locator('#studio-fit-tools > summary')).toBeFocused();
  const review=page.getByRole('region',{name:'Architect coordination review'});
  await review.getByText('Wall dimensions and offsets',{exact:true}).click();
  await expect(review.getByRole('region',{name:'Wall dimension schedule'})).toContainText('BACK WALL');
  await page.getByRole('button',{name:/Prepare coordination drawings/}).click();
  const dialog=page.getByRole('dialog',{name:'Print options and preview'});
  await dialog.getByLabel('Project title',{exact:true}).fill('House A – coordination');
  await dialog.getByLabel('Designer / contact',{exact:true}).fill('Project team');
  await expect(dialog.getByLabel('Include room opening and obstacle schedule',{exact:true})).not.toBeChecked();
  await dialog.getByRole('button',{name:'Apply architect print preset'}).click();
  await expect(dialog.getByLabel('Include room opening and obstacle schedule',{exact:true})).toBeChecked();
  await expect(dialog.getByLabel('Project title',{exact:true})).toHaveValue('House A – coordination');
  await expect(dialog.getByLabel('Designer / contact',{exact:true})).toHaveValue('Project team');
  await expect(dialog.getByRole('complementary',{name:'Export document summary'})).toContainText('Room openings and obstacle schedule');
});

test('opening a gallery study keeps the selected workspace',async({page})=>{
  await page.goto('/configure');
  await page.getByLabel('User mode').selectOption('architect');
  await expect.poll(async()=>(await draft(page))?.userInfo?.userType).toBe('architect');
  await page.goto('/configure?preset=4');
  await expect(page.getByLabel('User mode')).toHaveValue('architect');
  await expect.poll(async()=>(await draft(page))?.closetType).toBe('island');
});

test('designer workflow opens finishes, interiors, and a client-focused export package',async({page})=>{
  await page.goto('/configure');await page.getByLabel('User mode').selectOption('designer');
  await page.getByRole('button',{name:/Set the material direction/}).click();
  await expect(page.getByRole('tab',{name:'Style',exact:true})).toHaveAttribute('aria-selected','true');
  await page.getByRole('button',{name:/Detail the interiors/}).click();
  const drawer=page.getByRole('dialog',{name:'Design drawer compartments'});
  await expect(drawer).toBeVisible();await drawer.getByRole('button',{name:'Close editor',exact:true}).click();
  await page.getByRole('button',{name:/Prepare client presentation/}).click();
  const print=page.getByRole('dialog',{name:'Print options and preview'});
  await print.getByRole('button',{name:'Apply interior designer print preset'}).click();
  await expect(print.getByLabel('Include estimated materials worksheet',{exact:true})).toBeChecked();
  await expect(print.getByLabel('Include room opening and obstacle schedule',{exact:true})).not.toBeChecked();
});

test('renter workflow opens existing-room controls and editable arrangements',async({page})=>{
  await page.goto('/configure');await page.getByLabel('User mode').selectOption('renter');
  await page.getByRole('button',{name:/Record fixed features/}).click();
  await expect(page.locator('#studio-room-tools > summary')).toBeFocused();
  await expect(page.getByRole('region',{name:'Existing-room review'})).toContainText('No doors, windows, or obstacles recorded yet');
  await page.getByRole('button',{name:/Arrange your storage/}).click();
  await expect(page.getByRole('dialog',{name:/Rearrange /})).toBeVisible();await page.keyboard.press('Escape');
  await page.getByRole('button',{name:/Check capacity & access/}).click();
  await expect(page.locator('#studio-fit-tools > summary')).toBeFocused();
});

test('mobile architect review reports actual room conflicts and remains accessible',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const config=structuredClone(DEFAULT_CONFIG);config.userInfo.userType='architect';
  config.planning={windows:[{id:'bad-window',wall:'back',offset:90,width:24,sill:36,height:36}]};
  await page.addInitScript(c=>localStorage.setItem('alveo-draft',JSON.stringify({version:1,config:c})),config);
  await page.goto('/configure');
  const review=page.getByRole('region',{name:'Architect coordination review'});
  await expect(review.getByRole('button',{name:'1 Modeled room conflicts'})).toBeVisible();
  await review.getByText('Review 1 room conflict',{exact:true}).click();
  await expect(review).toContainText('18.00 in beyond the wall');
  await review.getByText('Wall dimensions and offsets',{exact:true}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const result=await new AxeBuilder({page}).include('#studio-guide').include('.studio-role-review').withTags(['wcag2a','wcag2aa']).analyze();
  expect(result.violations).toEqual([]);
  await review.screenshot({path:'test-results/architect-review-mobile.png'});
});
