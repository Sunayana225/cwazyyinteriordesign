import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('discovery shortcuts open real editors and preserve drawer edits', async ({ page }) => {
  await page.goto('/configure');
  const guide = page.getByRole('region', { name: 'Make this design your own' });
  await expect(guide).toBeVisible();
  await guide.getByRole('button', { name: /Customize a drawer/ }).click();
  const editor = page.getByRole('dialog', { name: 'Design drawer compartments' });
  await editor.getByLabel('Compartment label', { exact: true }).fill('Daily jewelry');
  await editor.getByRole('button', { name: 'Apply to drawer', exact: true }).click();
  await guide.getByRole('button', { name: /Customize a drawer/ }).click();
  await expect(editor.getByLabel('Compartment label', { exact: true })).toHaveValue('Daily jewelry');
  await editor.getByRole('button', { name: 'Close editor', exact: true }).click();
  await guide.getByRole('button', { name: /Review what fits/ }).click();
  await expect(page.locator('#studio-fit-tools')).toHaveAttribute('open', '');
  await expect(page.locator('#studio-fit-tools > summary')).toBeFocused();
  await guide.getByRole('link', { name: /Set your brief/ }).click();
  await expect(page.getByRole('group', { name: 'Your design brief' })).toBeFocused();
});

test('searchable tool directory exposes contextual actions and accessible empty results', async ({ page }) => {
  await page.goto('/configure?preset=4');
  const guide = page.getByRole('region', { name: 'Make this design your own' });
  await guide.locator('summary').click();
  const search = guide.getByRole('searchbox', { name: 'Find a design tool' });
  await search.fill('windows');
  await guide.getByRole('button', { name: /Add doors, windows & obstacles/ }).click();
  await expect(page.locator('#studio-room-tools > summary')).toBeFocused();
  await search.fill('seasonal');
  await guide.getByRole('button', { name: /Plan for your household/ }).click();
  await expect(page.locator('#studio-inventory-tools > summary')).toBeFocused();
  await search.fill('no-such-tool');
  await expect(guide.getByRole('status')).toHaveText('0 tools found');
  await guide.getByRole('button', { name: 'Show all tools' }).click();
  await expect(search).toHaveValue('');
  await guide.getByRole('button', { name: /Inspect the floor plan/ }).click();
  await expect(page.getByRole('button', { name: 'Hide floor plan' })).toHaveAttribute('aria-pressed', 'true');
  await guide.getByRole('button', { name: /Choose finishes & hardware/ }).click();
  await expect(page.getByRole('tab', { name: 'Style', exact: true })).toHaveAttribute('aria-selected', 'true');
  await search.fill('pdf');
  await guide.getByRole('button', { name: /Prepare drawings for export/ }).click();
  await expect(page.getByRole('dialog', { name: 'Print options and preview' })).toBeVisible();
});

test('mobile discovery has no overflow and explains unavailable drawer tools', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/configure');
  await page.getByRole('link', { name: 'New here? Discover the tools' }).click();
  const guide = page.getByRole('region', { name: 'Make this design your own' });
  await expect(guide).toBeFocused();
  await guide.locator('summary').click();
  await expect(guide.getByRole('button', { name: /Inspect the floor plan/ })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const result = await new AxeBuilder({ page }).include('#studio-guide').withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(result.violations).toEqual([]);
  await page.getByRole('navigation', { name: 'Design setup steps' }).getByRole('button', { name: 'Wardrobe', exact: true }).click();
  await page.getByText('Inventory starting point', { exact: true }).click();
  await page.getByRole('button', { name: 'Start with an empty inventory' }).click();
  await expect(guide.getByRole('button', { name: /Customize a drawer/ })).toBeDisabled();
  await expect(guide.getByRole('button', { name: /Customize a drawer/ })).toContainText('Add folded clothes or jewelry');
});

test('experienced users can collapse guidance without losing the tool directory', async ({ page }) => {
  await page.goto('/configure');
  const guide = page.getByRole('region', { name: 'Make this design your own' });
  await guide.getByRole('button', { name: 'Hide getting started' }).click();
  await expect(guide.getByRole('link', { name: /Set your brief/ })).not.toBeVisible();
  await page.reload();
  await expect(guide.getByRole('button', { name: 'Show getting started' })).toHaveAttribute('aria-expanded', 'false');
  await guide.locator('summary').click();
  await guide.getByRole('searchbox').fill('save');
  await guide.getByRole('button', { name: /Manage saved designs/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});
