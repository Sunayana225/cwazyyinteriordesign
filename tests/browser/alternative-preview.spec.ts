import {test,expect} from '@playwright/test';
import {DEFAULT_CONFIG} from '../../src/lib/design';
import {ClosetLayoutEngine} from '../../src/engine/ClosetLayoutEngine';
import {drawerTargets,defaultInterior} from '../../src/lib/drawers';

test('alternatives show elevations and retain organizer plans after reviewing impacts',async({page})=>{
  const config=structuredClone(DEFAULT_CONFIG);config.userInfo.drawerPreference='many-small';
  config.drawerInteriors=Object.fromEntries(drawerTargets(new ClosetLayoutEngine(config).calculateLayout()).map((t,i)=>[t.id,{...defaultInterior(t.drawer),name:`Packing plan ${i+1}`} ]));
  await page.addInitScript(c=>{if(!localStorage.getItem('alveo-draft'))localStorage.setItem('alveo-draft',JSON.stringify({version:1,config:c}));},config);
  await page.goto('/configure');await page.locator('#studio-fit-tools > summary').click();await page.getByRole('button',{name:'Compare feasible drawer layouts'}).click();
  const card=page.getByRole('region',{name:'few-large layout option'}),apply=card.getByRole('button',{name:'Use few-large alternative'});
  await expect(apply).toBeDisabled();await expect(card).toContainText('Organizer changes to review');
  await card.getByRole('button',{name:'Compare few-large elevations'}).click();
  const comparison=card.getByRole('region',{name:'Alternative elevation comparison'});
  await expect(comparison.getByRole('region',{name:'Current elevation'}).locator('svg').first()).toBeVisible();
  await expect(comparison.getByRole('region',{name:'Proposed elevation'}).locator('svg').first()).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-draft')!).config.userInfo.drawerPreference)).toBe('many-small');
  await card.getByLabel('I reviewed the organizer changes for few-large').check();await expect(apply).toBeEnabled();await apply.click();
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-draft')!).config.userInfo.drawerPreference)).toBe('few-large');
  const names=Object.values(config.drawerInteriors).map(p=>p.name).sort();
  await expect.poll(()=>page.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('alveo-draft')!).config.drawerInteriors).map((p:any)=>p.name).sort())).toEqual(names);
  await page.reload();expect(await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('alveo-draft')!).config.drawerInteriors).length)).toBe(names.length);
});
