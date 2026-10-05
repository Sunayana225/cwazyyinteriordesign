import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
for(const route of ['/','/gallery','/about'])test('route accessibility '+route,async({page})=>{
  await page.goto(route);await expect(page.locator('main')).toBeVisible();
  // Check the final rendered state, after entrance animations settle.
  await expect.poll(()=>page.locator('h1').first().evaluate(el=>{
    let node:Element|null=el;while(node){if(getComputedStyle(node).opacity!=='1')return false;node=node.parentElement;}return true;
  })).toBe(true);
  await expect.poll(()=>page.locator('main').evaluate(el=>Array.from(el.querySelectorAll('[style]')).every(child=>['0','1'].includes(getComputedStyle(child).opacity)))).toBe(true);
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
});
test('gallery SVGs remain stable across server renders and hydration',async({page})=>{
  const errors:string[]=[];page.on('console',msg=>{if(/hydrat|did not match|server rendered/i.test(msg.text()))errors.push(msg.text());});page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/gallery');await expect(page.getByRole('link',{name:'View and customize layout'})).toHaveCount(6);
  await page.reload();await expect(page.getByRole('link',{name:'View and customize layout'})).toHaveCount(6);
  await page.getByRole('button',{name:'Minimal',exact:true}).click();await expect(page.getByRole('link',{name:'View and customize layout'})).toHaveCount(1);
  expect(errors).toEqual([]);
});
