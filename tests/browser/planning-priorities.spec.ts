import {test,expect} from '@playwright/test';
import {DEFAULT_CONFIG} from '../../src/lib/design';

test('narrow automatic designs explain omitted storage and remain saveable',async({page})=>{
 const config=structuredClone(DEFAULT_CONFIG);config.dimensions.width=36;
 await page.addInitScript(c=>{if(!localStorage.getItem('alveo-draft'))localStorage.setItem('alveo-draft',JSON.stringify({version:1,config:c}));},config);
 await page.goto('/configure',{waitUntil:'domcontentloaded'});
 const warning=page.getByText(/36.00-inch span: omitted long hang to preserve minimum column widths/);
 await expect(warning).toBeVisible();
 await expect(page.locator('#closet-preview svg[data-ruler-width]').first()).toHaveAttribute('data-ruler-width','36');
 await page.getByRole('button',{name:'Save',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-saved-designs')??'null')?.designs?.[0]?.config?.dimensions?.width)).toBe(36);
 await page.reload({waitUntil:'domcontentloaded'});await expect(warning).toBeVisible();
});

test('overloaded shoe columns show storage for every category that can share the space',async({page})=>{
 const config=structuredClone(DEFAULT_CONFIG);config.dimensions={width:36,height:84,depth:24};
 config.shoes={boots:100,heels:100,sneakers:100,flats:100};
 config.zoneOverrides={columns:{back:[{id:'shoes',type:'shoe-shelves',width:36}]}};
 await page.addInitScript(c=>localStorage.setItem('alveo-draft',JSON.stringify({version:1,config:c})),config);
 await page.goto('/configure',{waitUntil:'domcontentloaded'});
 const svg=page.locator('#closet-preview svg[data-ruler-width]');
 for(const label of ['BOOTS','HEELS','SNEAKERS','FLATS'])await expect(svg.getByText(label,{exact:true}).first()).toBeVisible();
 await page.getByRole('tab',{name:'Summary',exact:true}).click();
 const fit=page.getByRole('progressbar',{name:'Storage needs covered'});
 expect(Number(await fit.getAttribute('aria-valuenow'))).toBeLessThan(Number(await fit.getAttribute('aria-valuemax')));
 await expect(page.getByText(/Additional storage needed for:/)).toBeVisible();
});
