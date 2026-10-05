import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('studio shows a larger preview, accessible choices, and one drawing perspective at a time',async({page})=>{
 await page.goto('/configure?preset=4');
 await expect(page.getByRole('heading',{name:'Your space. Thoughtfully arranged.'})).toBeVisible();
 const setup=page.locator('.studio-setup'),preview=page.locator('.studio-preview');
 expect((await preview.boundingBox())!.width).toBeGreaterThan((await setup.boundingBox())!.width);
 await expect(page.getByRole('navigation',{name:'Design setup steps'}).getByRole('button',{name:'Shape',exact:true})).toHaveAttribute('aria-current','step');
 await page.getByRole('button',{name:'Show 3D room view',exact:true}).click();
 await expect(page.getByRole('region',{name:'3D room preview'})).toBeVisible();await expect(page.getByRole('region',{name:'Drawing canvas. Use zoom controls and scroll to pan.'})).not.toBeVisible();
 await page.getByRole('button',{name:'Show floor plan',exact:true}).click();await expect(page.getByRole('region',{name:'3D room preview'})).not.toBeVisible();
 await page.locator('[data-wall-id="left"]:visible').click();await expect(page.getByRole('button',{name:'Elevation',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-drawer-id]:visible').first().click();await expect(page.getByRole('dialog',{name:'Design drawer compartments'})).toBeVisible();await page.getByRole('button',{name:'Close editor',exact:true}).click();
 const result=await new AxeBuilder({page}).include('#main-content').withTags(['wcag2a','wcag2aa']).analyze();expect(result.violations).toEqual([]);
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'docs/studio-desktop-reviewed.png',fullPage:true});
});
test('mobile setup stays in bounds and advanced tools remain reachable',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/configure');
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Next',exact:true}).click();await expect(page.getByRole('button',{name:'Space',exact:true})).toHaveAttribute('aria-current','step');
 await page.getByRole('link',{name:'Explore your design'}).click();await expect(page.getByRole('heading',{name:'Your Closet Preview'})).toBeInViewport();
 await page.locator('summary').filter({hasText:'Room openings, wall preferences, and sizing assumptions'}).click();await expect(page.getByLabel('Use measured door opening')).toBeVisible();
 await page.locator('summary').filter({hasText:'Device storage & recovery'}).click();await expect(page.getByRole('button',{name:'Download raw recovery data'})).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'docs/studio-mobile-reviewed.png',fullPage:true});
});
