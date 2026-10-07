import { test, expect } from '@playwright/test';
import { DEFAULT_CONFIG, EMPTY_WARDROBE } from '../../src/lib/design';

test('a split wall shows its shoe collection once and preserves full inventory after save and reload', async ({ page }) => {
  const config = structuredClone(DEFAULT_CONFIG);
  config.dimensions.width = 144;
  config.wardrobe = { ...EMPTY_WARDROBE, bags: 2 };
  config.shoes = { boots: 0, heels: 0, sneakers: 4, flats: 0 };
  config.planning = { windows: [{ id: 'w', wall: 'back', offset: 60, width: 24, sill: 24, height: 36 }] };
  await page.addInitScript(c => {
    if (!localStorage.getItem('alveo-draft')) localStorage.setItem('alveo-draft', JSON.stringify({ version: 1, config: c }));
  }, config);
  await page.goto('/configure', { waitUntil: 'domcontentloaded' });
  const svg = page.locator('#closet-preview svg[data-ruler-width]').first();
  await expect(svg.getByText('SNEAKERS', { exact: true })).toHaveCount(1);
  await expect(svg.getByText('SNEAKERS', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect.poll(() => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('alveo-saved-designs') ?? 'null')?.designs?.[0]?.config;
    return [saved?.wardrobe?.bags, saved?.shoes?.sneakers];
  })).toEqual([2, 4]);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(svg.getByText('SNEAKERS', { exact: true })).toHaveCount(1);
  await svg.screenshot({ path: 'test-results/shared-inventory-elevation.png' });
  await page.getByRole('tab', { name: 'Summary', exact: true }).click();
  const fit = page.getByRole('progressbar', { name: 'Storage needs covered' });
  await expect(fit).toHaveAttribute('aria-valuenow', '2');
  await expect(fit).toHaveAttribute('aria-valuemax', '2');
});
