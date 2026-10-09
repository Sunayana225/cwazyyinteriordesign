import {test,expect} from '@playwright/test';
import {DEFAULT_CONFIG} from '../../src/lib/design';

test('print review retains room conflicts and explains excluded elevations',async({page})=>{
  const c=structuredClone(DEFAULT_CONFIG);c.closetType='walkin-u';c.roomDimensions={roomWidth:180,roomDepth:144};c.planning={door:{wall:'front',offset:170,width:30,hinge:'left',swing:'in'},windows:[{id:'w',wall:'left',offset:20,width:24,sill:40,height:24}]};
  await page.addInitScript(config=>localStorage.setItem('alveo-draft',JSON.stringify({version:1,config})),c);
  await page.goto('/configure');await page.getByRole('button',{name:'Export',exact:true}).click();await page.getByRole('menuitem',{name:'Print options and preview'}).click();
  const dialog=page.getByRole('dialog',{name:'Print options and preview'}),checks=dialog.getByRole('region',{name:'Export checks'});
  await expect(checks).toContainText('Survey inputs have not been confirmed');await checks.getByText(/Room conflicts \(/).click();await expect(checks).toContainText('Door extends beyond its wall');
  await dialog.getByLabel('LEFT WALL',{exact:true}).uncheck();await expect(checks).toContainText('LEFT WALL (EL-B) elevation omitted; 1 recorded window');
  await dialog.getByRole('button',{name:'Preview page breaks'}).click();const printed=dialog.frameLocator('iframe');await expect(printed.getByRole('heading',{name:'Review before sharing'})).toBeVisible();await expect(printed.getByText(/LEFT WALL \(EL-B\) elevation omitted/)).toBeVisible();
  await checks.getByRole('button',{name:'Include all elevations'}).click();await expect(dialog.getByLabel('LEFT WALL',{exact:true})).toBeChecked();await expect(checks).not.toContainText('elevation omitted');await expect(checks).toContainText('Door extends beyond its wall');
});
