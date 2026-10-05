import { test, expect } from '@playwright/test';
import { DEFAULT_CONFIG } from '../../src/lib/design';
import { ClosetLayoutEngine } from '../../src/engine/ClosetLayoutEngine';
import { ClosetSVGRenderer } from '../../src/renderer/ClosetSVGRenderer';
import { renderFloorPlan } from '../../src/renderer/FloorPlanRenderer';
import { buildPrintDocument } from '../../src/engine/PDFExporter';
import type { ClosetConfiguration } from '../../src/types/closet';

for (const [name, width, height, type] of [
  ['narrow',36,84,'reach-in'], ['standard',96,96,'reach-in'], ['wide',336,96,'walkin-u'], ['tall',120,600,'walkin-u'], ['island',192,108,'island'],
] as const) test('drawing fixture ' + name, async ({ page }) => {
  const c: ClosetConfiguration = structuredClone(DEFAULT_CONFIG);
  c.dimensions = {width,height,depth:24}; c.closetType=type; c.roomDimensions={roomWidth:width,roomDepth:144};
  const layout=new ClosetLayoutEngine(c).calculateLayout();
  const svg=new ClosetSVGRenderer(layout,{showDimensions:true,showLabels:true,style:'modern',woodFinish:'medium'}).renderElevation();
  await page.setContent('<main style="width:1000px;margin:0 auto">'+svg+'</main>');
  const clipped=await page.locator('svg').evaluate(root=>{
    const box=(root as SVGSVGElement).viewBox.baseVal;
    return Array.from(root.querySelectorAll('text')).filter(t=>{
      const r=t.getBBox(); return r.x < -1 || r.x+r.width>box.width+1 || r.y < -1 || r.y+r.height>box.height+1;
    }).map(t=>t.textContent);
  });
  expect(clipped).toEqual([]);
  await expect(page.locator('main')).toHaveScreenshot(name + '.png', { animations: 'disabled' });
  if(type==='island') {
    await page.setContent(renderFloorPlan(layout,{...c.roomDimensions!,unitDepth:24}));
    await expect(page.locator('svg')).toHaveScreenshot('island-floor-plan.png');
  }
});
test('multi-wall print pagination uses one complete drawing per page', async ({ page }) => {
  const c=structuredClone(DEFAULT_CONFIG); c.closetType='island'; c.roomDimensions={roomWidth:192,roomDepth:144};
  const layout=new ClosetLayoutEngine(c).calculateLayout();
  await page.setContent(buildPrintDocument([{config:c,layout,fileName:'Island study'}]));
  await page.emulateMedia({media:'print'});
  await expect(page.locator('.drawing')).toHaveCount(5);
  for(const drawing of await page.locator('.drawing').all()) {
    expect(await drawing.evaluate(el=>getComputedStyle(el).breakBefore)).toBe('page');
    expect(await drawing.evaluate(el=>getComputedStyle(el).breakInside)).toBe('avoid');
    const height=await drawing.evaluate(el=>el.getBoundingClientRect().height);
    expect(height).toBeLessThan(1009); // A4 printable height, 267mm at 96dpi.
  }
  await page.screenshot({path:'test-results/island-print.png',fullPage:true});
});
