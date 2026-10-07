import {test,expect} from '@playwright/test';
test('custom depth and tall ceiling commit and survive reload',async({page})=>{
 await page.goto('/configure');await page.getByRole('button',{name:/^Next$/}).click();
 for(const [label,value] of [['Wall Width feet','12'],['Wall Width inches','1.625'],['Cabinet Depth feet','6'],['Cabinet Depth inches','10'],['Ceiling Height feet','25'],['Ceiling Height inches','6']]){
  const field=page.getByLabel(label,{exact:true});await field.fill(value);await field.press('Tab');
 }
 await expect(page.getByText('This will create a deep cabinet', {exact:false})).toBeVisible();
 await expect(page.getByRole('alert').filter({hasText:/Current generator supports measurements/})).toHaveCount(0);
 await expect.poll(async()=>page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-draft')!).config.dimensions)).toEqual({width:145.625,depth:82,height:306});
 await page.reload();
 await expect.poll(async()=>page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-draft')!).config.dimensions)).toEqual({width:145.625,depth:82,height:306});
 await expect(page.locator('#closet-preview svg').first()).toBeVisible();
});

test('independent cabinet height leaves room above cabinetry and persists',async({page})=>{
 await page.goto('/configure');await page.getByRole('button',{name:/^Next$/}).click();
 await page.getByLabel('Ceiling Height feet',{exact:true}).fill('25');await page.getByLabel('Ceiling Height feet',{exact:true}).press('Tab');
 await page.getByLabel('Set cabinet height separately from ceiling').check();
 await expect(page.getByLabel('Cabinet Height feet',{exact:true})).toHaveValue('8');
 await expect(page.getByText('Space above cabinets:',{exact:false})).toContainText("17'-0");
 await expect.poll(async()=>page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-draft')!).config.dimensions.cabinetHeight)).toBe(96);
 await page.reload();
 await expect.poll(async()=>page.evaluate(()=>JSON.parse(localStorage.getItem('alveo-draft')!).config.dimensions.cabinetHeight)).toBe(96);
 await expect(page.locator('#closet-preview svg').first()).toBeVisible();
});
