import {test,expect} from '@playwright/test';

test('failed SVG and backup downloads clean up and allow retry',async({page})=>{
  await page.addInitScript(()=>{
    const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL),click=HTMLAnchorElement.prototype.click;
    const state={active:new Set<string>(),fail:true};Object.assign(window,{downloadProbe:state});
    URL.createObjectURL=blob=>{const url=create(blob);state.active.add(url);return url;};
    URL.revokeObjectURL=url=>{state.active.delete(url);revoke(url);};
    HTMLAnchorElement.prototype.click=function(){if(this.download&&state.fail)throw new Error('Simulated download failure');return click.call(this);};
  });
  await page.goto('/configure');
  const cleaned=async()=>{await expect(page.locator('a[download]')).toHaveCount(0);await expect.poll(()=>page.evaluate(()=>(window as any).downloadProbe.active.size)).toBe(0);};
  await page.locator('[data-drawer-id]').first().click();const editor=page.getByRole('dialog',{name:'Design drawer compartments'});
  await editor.getByRole('button',{name:'Download SVG',exact:true}).click();await expect(editor).toContainText('The organizer SVG could not be downloaded');await cleaned();await editor.getByRole('button',{name:'Close editor'}).click();
  await page.getByRole('button',{name:'Show 3D room view',exact:true}).click();const view=page.getByRole('region',{name:'3D room preview'});
  await view.getByRole('button',{name:'Download 3D SVG'}).click();await expect(view.getByRole('alert')).toContainText('could not be downloaded');await cleaned();
  await page.evaluate(()=>{(window as any).downloadProbe.fail=false;});const requested=page.waitForEvent('download');await view.getByRole('button',{name:'Download 3D SVG'}).click();const file=await requested;expect(file.suggestedFilename()).toBe('closet-spatial-view.svg');expect(await file.failure()).toBeNull();await cleaned();await expect(view.getByRole('alert')).toHaveCount(0);
  await page.evaluate(()=>{(window as any).downloadProbe.fail=true;});await page.getByRole('button',{name:'Save',exact:true}).click();await page.getByRole('button',{name:/Manage saved designs/}).click();const library=page.getByRole('dialog',{name:'Saved designs'});
  await library.getByRole('button',{name:'Download all JSON',exact:true}).click();await expect(library).toContainText('The backup could not be downloaded');await cleaned();
});
