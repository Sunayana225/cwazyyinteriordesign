import {test,expect} from '@playwright/test';
import {DEFAULT_CONFIG} from '../../src/lib/design';
import {roomShell} from '../../src/lib/roomShells';
import {defaultInterior,drawerTargets} from '../../src/lib/drawers';
import {ClosetLayoutEngine} from '../../src/engine/ClosetLayoutEngine';

test('room shell preview changes no draft values and apply/undo preserve fit measurements',async({page})=>{
  const config={...structuredClone(DEFAULT_CONFIG),planning:{hangerSpacing:{shirts:3.125},shoeLengths:{boots:16},walls:{back:{priority:'shoes' as const},left:{priority:'hanging' as const}}}};
  const saved={id:'wide',name:'Wide room',shell:roomShell({...DEFAULT_CONFIG,closetType:'walkin-l',roomDimensions:{roomWidth:144,roomDepth:120},dimensions:{width:144,height:120,depth:24},planning:{shoeLengths:{boots:10},walls:{left:{depth:22},back:{depth:24}}}})};
  await page.addInitScript(({config,saved})=>{localStorage.setItem('alveo-draft',JSON.stringify({version:1,config}));localStorage.setItem('alveo-room-shells',JSON.stringify({version:1,shells:[saved]}));},{config,saved});
  await page.goto('/configure');await page.locator('#studio-room-tools > summary').click();await page.locator('summary').filter({hasText:'Reusable room shells'}).click();
  await page.getByLabel('Compare saved room shell').selectOption('wide');const preview=page.getByRole('region',{name:'Room shell geometry preview'});
  await expect(preview.getByRole('img',{name:'Current room floor plan'})).toBeVisible();await expect(preview.getByRole('img',{name:'Proposed room floor plan'})).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-draft')!).config.dimensions.width)).toBe(96);
  await page.getByRole('button',{name:'Apply compared room shell'}).click();await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-draft')!).config.dimensions.width)).toBe(144);
  await expect(page.getByLabel('Shirts hanger spacing',{exact:true})).toHaveValue('3.125');await expect(page.getByLabel('boots shoe length',{exact:true})).toHaveValue('16');
  const length=page.getByLabel('boots shoe length',{exact:true});await length.fill('18');await length.press('Tab');
  await page.getByRole('button',{name:'Undo applied room shell'}).click();await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-draft')!).config.dimensions.width)).toBe(96);await expect(length).toHaveValue('18');
});

test('room preview identifies organizers without a matching drawer before applying',async({page})=>{
  const config=structuredClone(DEFAULT_CONFIG),target=drawerTargets(new ClosetLayoutEngine(config).calculateLayout())[0];
  config.drawerInteriors={[target.id]:{...defaultInterior(target.drawer),identity:target.identity}};
  const saved={id:'shallow',name:'Shallow room',shell:roomShell({...DEFAULT_CONFIG,dimensions:{width:96,height:96,depth:9}})};
  await page.addInitScript(({config,saved})=>{localStorage.setItem('alveo-draft',JSON.stringify({version:1,config}));localStorage.setItem('alveo-room-shells',JSON.stringify({version:1,shells:[saved]}));},{config,saved});
  await page.goto('/configure');await page.locator('#studio-room-tools > summary').click();await page.locator('summary').filter({hasText:'Reusable room shells'}).click();await page.getByLabel('Compare saved room shell').selectOption('shallow');
  await expect(page.getByRole('region',{name:'Room shell geometry preview'})).toContainText('1 organizer plans may need reassignment');
  await page.getByRole('button',{name:'Cancel room shell comparison'}).click();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-draft')!).config.dimensions.depth)).toBe(24);
  expect(await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('alveo-draft')!).config.drawerInteriors))).toEqual([target.id]);
});
