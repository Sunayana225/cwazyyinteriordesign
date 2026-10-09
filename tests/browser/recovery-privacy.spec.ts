import {test,expect} from '@playwright/test';
test('recovery explains full-data files and downloads diagnostics without private text',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('alveo-saved-designs','PRIVATE_CONTACT@example.com'));
  await page.goto('/configure');await page.getByText('Device storage & recovery',{exact:true}).click();
  const privacy=page.getByRole('region',{name:'Project data and privacy'});await expect(privacy).toContainText('do not provide account permissions');await expect(privacy).toContainText('does not upload project contents');
  await page.getByText('Storage usage and recovery report',{exact:true}).click();await expect(page.getByRole('button',{name:'Download memory recovery snapshot'})).toHaveAttribute('aria-describedby','memory-recovery-scope');await expect(page.locator('#diagnostic-scope')).toContainText('cannot restore a project');
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download recovery report',exact:true}).click();const download=await pending;expect(download.suggestedFilename()).toBe('alveo-recovery-report.json');const stream=await download.createReadStream();let raw='';for await(const chunk of stream!)raw+=chunk.toString();const report=JSON.parse(raw);expect(report.named.readable).toBe(false);expect(raw).not.toContain('PRIVATE');expect(raw).not.toContain('example.com');expect(await page.evaluate(()=>localStorage.getItem('alveo-saved-designs'))).toBe('PRIVATE_CONTACT@example.com');
  await page.setViewportSize({width:390,height:844});expect(await privacy.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
});
