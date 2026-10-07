import {test,expect} from '@playwright/test';

test('every template thumbnail agrees with its applied drawing and labeled well count',async({page})=>{
 await page.goto('/configure');await page.locator('[data-drawer-id]:visible').first().click();
 const d=page.getByRole('dialog',{name:'Design drawer compartments'});
 for(const name of ['Open tray','Socks','Jewelry','Watches','Ties','Belts','Folded clothes','Tech','Underwear']){
  const card=d.getByRole('button',{name:`${name} template`,exact:true});
  const geometry=await card.locator('svg').evaluate(svg=>{const view=(svg as SVGSVGElement).viewBox.baseVal;return Array.from(svg.querySelectorAll(':scope > g > rect:first-child')).map(r=>({x:Number(r.getAttribute('x'))/view.width,y:Number(r.getAttribute('y'))/view.height,w:Number(r.getAttribute('width'))/view.width,h:Number(r.getAttribute('height'))/view.height}));});
  expect(geometry.length).toBeGreaterThan(0);await card.click();await expect(card).toHaveAttribute('aria-pressed','true');await expect(d.locator('[data-cell-id]')).toHaveCount(geometry.length);
  const applied=await d.locator('[data-cell-id]').evaluateAll(nodes=>nodes.map(node=>{const s=(node as HTMLElement).style;return{x:parseFloat(s.left)/100,y:parseFloat(s.top)/100,w:parseFloat(s.width)/100,h:parseFloat(s.height)/100};}));
  applied.forEach((cell,i)=>{for(const key of ['x','y','w','h'] as const)expect(cell[key]).toBeCloseTo(geometry[i][key],5);});
  if(name==='Open tray')expect(applied).toEqual([{x:0,y:0,w:1,h:1}]);
  if(name==='Jewelry'){await expect(d.getByRole('button',{name:/^Compartment \d+: Ring roll/}).first()).toBeAttached();await expect(d.locator('[data-cell-id] [data-item-guides] path').first()).toBeAttached();}
 }
 await d.getByRole('button',{name:'Jewelry template',exact:true}).click();await d.evaluate(el=>el.scrollTo(0,0));await d.screenshot({path:'test-results/jewelry-template-reviewed.png'});
 await page.setViewportSize({width:390,height:844});expect(await d.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
});

test('template well counts respond to divider thickness without inventing space',async({page})=>{
 await page.goto('/configure');await page.locator('[data-drawer-id]:visible').first().click();const d=page.getByRole('dialog',{name:'Design drawer compartments'}),card=d.getByRole('button',{name:'Socks template',exact:true});
 await d.getByLabel('Divider thickness (in)',{exact:true}).selectOption('0.125');await card.click();const thin=await d.locator('[data-cell-id]').count();
 await d.getByLabel('Divider thickness (in)',{exact:true}).selectOption('1');await card.click();const thick=await d.locator('[data-cell-id]').count();expect(thick).toBeLessThanOrEqual(thin);
 await d.getByRole('button',{name:'Open tray template',exact:true}).click();await d.getByRole('button',{name:'Apply to drawer',exact:true}).click();await page.reload();await page.locator('[data-drawer-id]:visible').first().click();await expect(d.locator('[data-cell-id]')).toHaveCount(1);await expect(d.getByLabel('Compartment label',{exact:true})).toHaveValue('Open tray');
});
