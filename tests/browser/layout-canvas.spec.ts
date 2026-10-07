import { test, expect } from '@playwright/test';

const canvas=(page:any)=>page.getByRole('dialog',{name:/^Rearrange /});
const open=async(page:any)=>{
  await page.goto('/configure');
  const launch=page.locator('[data-rearrange-wall]').first();
  await expect(launch).toBeVisible();
  await launch.click();
  const d=canvas(page);await expect(d).toBeVisible();return d;
};
/** Elements are listed as "N. Label · W in" buttons; read the widths off them. */
const widths=async(d:any)=>{
  const labels=await d.getByRole('group',{name:'Select an element'}).getByRole('button').allInnerTexts();
  return labels.map((t:string)=>Number(/·\s*([\d.]+) in/.exec(t)?.[1]??0));
};
const types=async(d:any)=>{
  const labels=await d.getByRole('group',{name:'Select an element'}).getByRole('button').allInnerTexts();
  return labels.map((t:string)=>/^\d+\.\s*(.+?)\s*·/.exec(t)?.[1]??'');
};

test('imports the generated wall as elements that fill it exactly',async({page})=>{
  const d=await open(page);
  const w=await widths(d);
  expect(w.length).toBeGreaterThan(0);
  const total=w.reduce((a:number,b:number)=>a+b,0);
  await expect(d.getByRole('img',{name:/elevation, \d+ elements across/})).toBeVisible();
  const stated=Number(/across ([\d.]+) in/.exec(await d.getByRole('img',{name:/elevation/}).getAttribute('aria-label')??'')?.[1]??0);
  expect(total).toBeCloseTo(stated,0);
});

test('reorders, resizes, retypes and deletes elements, keeping the wall full',async({page})=>{
  const d=await open(page);
  const before=await widths(d);
  expect(before.length).toBeGreaterThanOrEqual(2);
  const total=before.reduce((a:number,b:number)=>a+b,0);
  const firstType=(await types(d))[0];

  // Reorder: move element 1 right and confirm the order changed.
  await d.getByRole('group',{name:'Select an element'}).getByRole('button').first().click();
  await d.getByRole('button',{name:'Move right',exact:true}).click();
  expect((await types(d))[1]).toBe(firstType);

  // Resize: the wall must still be fully covered afterwards.
  await d.getByRole('group',{name:'Select an element'}).getByRole('button').first().click();
  await d.getByLabel('Width (inches)').fill('30');
  await d.getByLabel('Width (inches)').blur();
  expect((await widths(d)).reduce((a:number,b:number)=>a+b,0)).toBeCloseTo(total,0);

  // Retype, then delete, still covering the wall.
  await d.getByLabel('Element type').selectOption('drawers');
  expect((await types(d))[0]).toBe('Drawers');
  const count=(await widths(d)).length;
  await d.getByRole('button',{name:'Delete element',exact:true}).click();
  expect((await widths(d))).toHaveLength(count-1);
  expect((await widths(d)).reduce((a:number,b:number)=>a+b,0)).toBeCloseTo(total,0);
});

test('adds an element and undoes it',async({page})=>{
  const d=await open(page);
  const before=(await widths(d)).length;
  const add=d.getByRole('button',{name:'Add Drawers',exact:true});
  await expect(add).toBeEnabled();
  await add.click();
  expect((await widths(d))).toHaveLength(before+1);
  await d.getByRole('button',{name:'Undo',exact:true}).click();
  expect((await widths(d))).toHaveLength(before);
});

test('Done persists the arrangement and Remove restores the generated layout',async({page})=>{
  const d=await open(page);
  expect((await widths(d)).length).toBeGreaterThanOrEqual(2);
  await d.getByRole('group',{name:'Select an element'}).getByRole('button').first().click();
  await d.getByRole('button',{name:'Move right',exact:true}).click();
  const arranged=await types(d);
  await d.getByRole('button',{name:/^Done/}).click();
  await expect(d).toBeHidden();

  // Saved as a column override on the configuration, which the engine re-applies.
  // Closing the dialog commits React state; the draft write is debounced.
  // Wait for the observable persisted result, not an arbitrary sleep.
  const readColumns=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-draft')??'null')?.config.zoneOverrides?.columns);
  await expect.poll(readColumns).toBeTruthy();
  const stored=await readColumns();
  const wall=Object.keys(stored)[0];
  expect(stored[wall].length).toBe(arranged.length);

  // Reopening shows the saved arrangement, and it survives a reload.
  await page.reload();
  await expect(page.locator('[data-rearrange-wall]').first()).toContainText('Customized');
  const again=await open(page);
  expect(await types(again)).toEqual(arranged);

  await again.getByRole('button',{name:'Remove my arrangement',exact:true}).click();
  await expect(again).toBeHidden();
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-draft')!).config.zoneOverrides?.columns)).toBeFalsy();
});
