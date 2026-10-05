import { test, expect } from '@playwright/test';

test('wheel zoom holds the pointer anchor and native two-finger gestures zoom the canvas',async({page,context})=>{
  await page.goto('/configure');const region=page.getByRole('region',{name:'Drawing canvas. Use zoom controls and scroll to pan.'}).first();await region.scrollIntoViewIfNeeded();
  const box=await region.boundingBox();expect(box).not.toBeNull();const x=box!.x+box!.width/2,y=box!.y+Math.min(box!.height/2,100);
  const before=await region.evaluate(el=>({left:el.scrollLeft,top:el.scrollTop}));
  await page.mouse.move(x,y);await page.keyboard.down('Control');await page.mouse.wheel(0,-80);await page.keyboard.up('Control');
  await expect.poll(()=>region.locator('div[role=presentation]').evaluate(el=>parseFloat((el as HTMLElement).style.width))).toBeGreaterThan(100);
  await expect.poll(async()=>{const after=await region.evaluate(el=>({left:el.scrollLeft,zoom:parseFloat((el.firstElementChild as HTMLElement).style.width)/100}));return Math.abs(after.left-((before.left+box!.width/2)*after.zoom-box!.width/2));}).toBeLessThan(5);
  await page.getByRole('button',{name:'Reset view',exact:true}).click();
  const client=await context.newCDPSession(page);await client.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-20,y,id:0},{x:x+20,y,id:1}]});
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-30,y,id:0},{x:x+30,y,id:1}]});
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-60,y,id:0},{x:x+60,y,id:1}]});
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect.poll(()=>region.locator('div[role=presentation]').evaluate(el=>parseFloat((el as HTMLElement).style.width))).toBeGreaterThan(100);
  await page.getByRole('button',{name:'Fit to viewport'}).click();await expect.poll(()=>region.locator('div[role=presentation]').evaluate(el=>parseFloat((el as HTMLElement).style.width))).toBeLessThanOrEqual(100);
});

test('spatial cell focus, coalesced undo, multi-cell editing and organizer removal work',async({page})=>{
  await page.goto('/configure');await page.locator('[data-drawer-id]').first().click();const d=page.getByRole('dialog',{name:'Design drawer compartments'});await d.getByRole('button',{name:'Create grid',exact:true}).click();const cells=d.getByRole('button',{name:/^Compartment \d+:/});await cells.first().focus();await page.keyboard.press('ArrowDown');await expect(cells.nth(2)).toBeFocused();
  await d.getByLabel('Organizer name').fill('');await d.getByLabel('Organizer name').pressSequentially('Travel',{delay:10});await d.getByRole('button',{name:'Undo',exact:true}).click();await expect(d.getByLabel('Organizer name')).toHaveValue('Drawer organizer');
  await d.locator('summary').filter({hasText:'Measurements, item fit, divider tools, and custom templates'}).click();await d.locator('summary').filter({hasText:'Change multiple compartments'}).click();await d.getByRole('checkbox',{name:/Select compartment 1:/}).check();await d.getByRole('checkbox',{name:/Select compartment 2:/}).check();await d.getByRole('combobox',{name:'Selected contents',exact:true}).selectOption('Jewelry');
  await d.getByRole('button',{name:'Apply to drawer',exact:true}).click();await page.getByRole('button',{name:'Save',exact:true}).click();const plan=await page.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('alveo-saved-designs')!).designs[0].config.drawerInteriors)[0] as any);expect(plan.cells.filter((c:any)=>c.category==='Jewelry')).toHaveLength(2);
  await page.locator('[data-drawer-id]').first().click();await d.getByRole('button',{name:'Remove organizer',exact:true}).click();await expect.poll(()=>page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('alveo-draft')!).config.drawerInteriors??{}).length)).toBe(0);
});

test('retained organizers can be reassigned after a fit preview without losing the plan',async({page})=>{
  await page.goto('/configure');await page.locator('[data-drawer-id]').first().click();const d=page.getByRole('dialog',{name:'Design drawer compartments'});await d.getByLabel('Organizer name').fill('Retained plan');await d.getByRole('button',{name:'Apply to drawer',exact:true}).click();await expect.poll(()=>page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('alveo-draft')!).config.drawerInteriors??{}).length)).toBe(1);
  await page.evaluate(()=>{const draft=JSON.parse(localStorage.getItem('alveo-draft')!);const plan=Object.values(draft.config.drawerInteriors)[0] as any;draft.config.drawerInteriors={'left:99:99':{...plan,identity:'removed-drawer'}};localStorage.setItem('alveo-draft',JSON.stringify(draft));});await page.reload();await page.locator('summary').filter({hasText:'Reassign retained organizers'}).click();await page.getByRole('button',{name:'Preview reassignment'}).click();await expect(page.getByText('The destination has no organizer.')).toBeVisible();await page.getByRole('button',{name:'Confirm reassignment'}).click();await expect(page.getByText(/organizer\(s\) belong to drawers no longer/)).toHaveCount(0);await page.locator('[data-drawer-id]').first().click();await expect(d.getByLabel('Organizer name')).toHaveValue('Retained plan');
});

