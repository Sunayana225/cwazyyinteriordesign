import {test,expect} from '@playwright/test';
import {DEFAULT_CONFIG} from '../../src/lib/design';

test('architect records survey provenance, persists it, and reviews attribution edits before reconfirming',async({page})=>{
  const config={...structuredClone(DEFAULT_CONFIG),userInfo:{...DEFAULT_CONFIG.userInfo,userType:'architect'}};
  await page.addInitScript(c=>{if(!localStorage.getItem('alveo-draft'))localStorage.setItem('alveo-draft',JSON.stringify({version:1,config:c}));},config);
  await page.goto('/configure');const review=page.getByRole('region',{name:'Architect coordination review'});
  await review.getByLabel('Survey author',{exact:true}).fill('Survey team');
  await review.getByLabel('Survey date',{exact:true}).fill('2026-09-30');await review.getByLabel('Survey date',{exact:true}).press('Tab');
  await review.getByRole('button',{name:'I checked the measurements and fixed features'}).click();
  await expect(review.getByRole('status')).toContainText('Confirmed for this geometry');
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-draft')!).config.surveyConfirmation?.record)).toEqual({author:'Survey team',date:'2026-09-30'});
  await page.reload();await expect(review.getByLabel('Survey author',{exact:true})).toHaveValue('Survey team');await expect(review.getByLabel('Survey date',{exact:true})).toHaveValue('2026-09-30');
  await review.getByLabel('Survey author',{exact:true}).fill('New surveyor');await expect(review.getByRole('status')).toContainText('survey record was edited');
  const changes=review.getByRole('list',{name:'Changed survey measurements'});await expect(changes).toContainText('Confirmed: Survey team');await expect(changes).toContainText('Current: New surveyor');
  await page.getByRole('button',{name:'Export',exact:true}).click();await page.getByRole('menuitem',{name:'Print options and preview'}).click();
  const dialog=page.getByRole('dialog',{name:'Print options and preview'});await dialog.getByRole('button',{name:'Preview page breaks'}).click();
  await expect(dialog.frameLocator('iframe').getByText('Site survey author: New surveyor; survey date: 2026-09-30.',{exact:false})).toBeVisible();
  await expect(dialog.frameLocator('iframe').getByText(/survey record changed since confirmation/)).toBeVisible();
});

test('homeowners can open the optional survey record without changing review status',async({page})=>{
  await page.goto('/configure');const summary=page.locator('summary').filter({hasText:'Survey author and date'});await summary.click();
  await expect(page.getByLabel('Survey author',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'I checked the measurements and fixed features'})).toBeVisible();
});
