import {test,expect} from '@playwright/test';
test('adaptive shelves fill the accessory column and respect saved opening settings',async({page})=>{
 await page.goto('/configure');
 await expect(page.locator('[data-storage-symbol=folded-stack]').first()).toBeVisible();
 await page.locator('svg[data-ruler-width]').first().screenshot({path:'test-results/adaptive-shelves.png'});
 const input=page.getByLabel('Minimum accessory shelf opening',{exact:true});
 await input.evaluate(el=>{let p=el.parentElement;while(p){if(p instanceof HTMLDetailsElement)p.open=true;p=p.parentElement;}});
 await input.fill('24');await input.press('Tab');
 // Optional chaining so the poll retries while the debounced draft write lands; a
 // throw inside page.evaluate propagates and would fail the poll outright.
 await expect.poll(async()=>page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-draft')!).config.planning?.accessoryShelfOpening)).toBe(24);
 await page.reload();await expect(page.getByLabel('Minimum accessory shelf opening',{exact:true})).toHaveValue('24');
});
