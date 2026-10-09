import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {DEFAULT_CONFIG} from '../../src/lib/design';
import {ClosetLayoutEngine} from '../../src/engine/ClosetLayoutEngine';
test('component outline reads actual measurements, switches walls and converts display units',async({page})=>{
  const c=structuredClone(DEFAULT_CONFIG);c.closetType='walkin-u';c.roomDimensions={roomWidth:180,roomDepth:144};c.planning={walls:{back:{floorOffset:12}}};const layout=new ClosetLayoutEngine(c).calculateLayout();
  await page.addInitScript(config=>localStorage.setItem('alveo-draft',JSON.stringify({version:1,config})),c);await page.goto('/configure');await page.locator('#studio-fit-tools > summary').click();await page.getByRole('button',{name:'Inspect elevation measurements',exact:true}).click();const region=page.getByRole('region',{name:'Elevation component measurements'});
  const value=region.getByText('Wall width',{exact:true}).locator('..').locator('dd');await expect(value).toHaveText('180.00 in');await region.getByLabel('Measurement display units').selectOption('cm');await expect(value).toHaveText('457.20 cm');await region.getByLabel('Measurement display units').selectOption('in');
  const first=region.locator('details').first();await first.locator('summary').click();await expect(first).toContainText('15.00 in');const rods=layout.walls[0].zones[0].rods??[];if(rods.length)await expect(first).toContainText(rods[0].height.toFixed(2)+' in');
  await region.getByLabel('Elevation to inspect').selectOption('left');await expect(value).toHaveText(layout.walls.find(w=>w.wallId==='left')!.width.toFixed(2)+' in');await region.locator('details').first().locator('summary').click();await expect(region.getByRole('heading',{name:/Drawer 1/}).first()).toBeVisible();
  expect((await new AxeBuilder({page}).include('section[aria-label="Elevation component measurements"]').analyze()).violations).toEqual([]);
  await page.setViewportSize({width:390,height:844});expect(await region.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-draft')!).config.dimensions.width)).toBe(c.dimensions.width);
});
