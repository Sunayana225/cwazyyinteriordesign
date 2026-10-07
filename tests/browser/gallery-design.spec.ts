import {test,expect} from '@playwright/test';
test('gallery switches drawings, filters designs and fits mobile',async({page})=>{
 await page.goto('/gallery');await expect(page.locator('.gallery-design')).toHaveCount(6);
 await expect(page.locator('.gallery-art [data-part="drawer"]').first()).toBeVisible();
 await page.getByRole('button',{name:'Elevation',exact:true}).click();
 await expect(page.locator('.gallery-art svg[data-ruler-width]')).toHaveCount(6);
 await page.getByRole('button',{name:'Small Space',exact:true}).click();
 await expect(page.locator('.gallery-design')).toHaveCount(1);
 await expect(page.locator('.gallery-specs')).toContainText("5'-0");
 await expect(page.locator('.gallery-specs')).toContainText("2'-0");
 await page.getByRole('button',{name:'All',exact:true}).click();
 await page.getByRole('button',{name:'3D space',exact:true}).click();
 await page.screenshot({path:'test-results/gallery-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/gallery-mobile.png',fullPage:true});
});
