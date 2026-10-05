import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('drawer section navigation preserves edits and grouped settings stay accessible',async({page})=>{
 await page.goto('/configure');await page.locator('[data-drawer-id]:visible').first().click();
 const d=page.getByRole('dialog',{name:'Design drawer compartments'}),nav=d.getByRole('navigation',{name:'Drawer settings sections'});
 await d.getByLabel('Compartment label',{exact:true}).fill('Everyday accessories');
 await nav.getByRole('button',{name:'Construction',exact:true}).click();await expect(d.getByLabel('Minimum usable compartment width')).toBeVisible();
 await nav.getByRole('button',{name:'Measurements & fit'}).click();await expect(d.getByLabel('Use measured internal dimensions')).toBeVisible();
 await nav.getByRole('button',{name:'Compartment',exact:true}).click();await expect(d.getByLabel('Compartment label',{exact:true})).toHaveValue('Everyday accessories');
 await expect(d.locator('[data-settings-section="compartment"]')).toBeFocused();
 const result=await new AxeBuilder({page}).include('dialog[open]').withTags(['wcag2a','wcag2aa']).analyze();expect(result.violations).toEqual([]);
 await d.evaluate(el=>el.scrollTo(0,0));await d.screenshot({path:'docs/settings-drawer-desktop.png'});
 await d.getByRole('button',{name:'Apply to drawer',exact:true}).click();await page.locator('[data-drawer-id]:visible').first().click();await expect(d.getByLabel('Compartment label',{exact:true})).toHaveValue('Everyday accessories');
});
test('print groups and room navigation fit mobile without losing choices',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/configure');await page.locator('summary').filter({hasText:'Room openings, wall preferences, and sizing assumptions'}).click();
 await page.getByRole('navigation',{name:'Room settings sections'}).getByRole('button',{name:'Windows',exact:true}).click();await page.getByRole('button',{name:'Add window',exact:true}).click();await page.getByLabel('Window 1 name').fill('Dressing window');
 await page.getByRole('navigation',{name:'Room settings sections'}).getByRole('button',{name:'Door',exact:true}).click();await expect(page.getByLabel('Use measured door opening')).toBeVisible();
 await page.getByRole('button',{name:'Export',exact:true}).click();await page.getByRole('menuitem',{name:'Print options and preview'}).click();
 const d=page.getByRole('dialog',{name:'Print options and preview'});await d.getByLabel('Project title',{exact:true}).fill('Primary suite');await d.getByLabel('Paper size').selectOption('Letter');
 await expect(d.getByRole('complementary',{name:'Export document summary'})).toContainText('Primary suite');await expect(d.getByRole('complementary',{name:'Export document summary'})).toContainText('Letter');
 expect(await d.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 const result=await new AxeBuilder({page}).include('dialog[open]').withTags(['wcag2a','wcag2aa']).analyze();expect(result.violations).toEqual([]);
 await d.evaluate(el=>el.scrollTo(0,0));await d.screenshot({path:'docs/settings-print-mobile.png'});await d.getByRole('button',{name:'Cancel print options'}).click();
 await expect(page.getByLabel('Window 1 name')).toHaveValue('Dressing window');
});
test('style categories support keyboard navigation and preserve selections',async({page})=>{
 await page.goto('/configure');await page.getByRole('tab',{name:'Style',exact:true}).click();await page.getByRole('tab',{name:'Finishes',exact:true}).focus();await page.keyboard.press('ArrowRight');await expect(page.getByRole('tab',{name:'Design style',exact:true})).toBeFocused();await page.getByRole('button',{name:'Sage Green',exact:true}).click();await page.keyboard.press('Tab');
 await page.getByRole('tab',{name:'Finishes',exact:true}).click();await page.getByRole('tab',{name:'Design style',exact:true}).click();await expect(page.getByRole('button',{name:'Sage Green',exact:true})).toHaveAttribute('aria-pressed','true');
});
