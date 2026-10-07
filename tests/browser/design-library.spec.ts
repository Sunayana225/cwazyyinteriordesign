import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

test.beforeEach(async ({ page }) => {
  await page.goto('/configure');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: /Manage saved designs/ }).click();
});

test('duplicate is independent, persists, and uses unique copy names', async ({ page }) => {
  const dialog = page.getByRole('dialog', { name: 'Saved designs' });
  await dialog.getByRole('button', { name: 'Duplicate' }).click();
  await expect(dialog.getByText('Design 1 (copy)', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Duplicate' }).last().click();
  await expect(dialog.getByText('Design 1 (copy 2)', { exact: true })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('alveo-saved-designs')!).designs);
  expect(new Set(saved.map((d: { id: string }) => d.id)).size).toBe(3);
  expect(saved[1].config).toEqual(saved[0].config);
  await page.reload();
  await page.getByRole('button', { name: /Manage saved designs/ }).click();
  await expect(dialog.getByText('Design 1 (copy 2)', { exact: true })).toBeVisible();
});

test('search selection survives filtering and backups contain the correct full records', async ({ page }) => {
  const dialog = page.getByRole('dialog', { name: 'Saved designs' });
  await dialog.getByRole('button', { name: 'Duplicate' }).click();
  await expect(dialog.getByRole('checkbox')).toHaveCount(2);
  await dialog.getByLabel('Search saved designs').fill('copy');
  await dialog.getByRole('button', { name: 'Select visible' }).click();
  await dialog.getByLabel('Search saved designs').fill('nothing-matches');
  await expect(dialog.getByText('No designs match your search or filters.')).toBeVisible();
  await expect(dialog.getByText(/1 selected \(1 hidden by search\)/)).toBeVisible();
  const selectedDownload = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download selected JSON' }).click();
  const selectedFile = await (await selectedDownload).path();
  const selected = JSON.parse(await readFile(selectedFile!, 'utf8'));
  expect(selected.version).toBe(1);
  expect(selected.designs).toHaveLength(1);
  expect(selected.designs[0].name).toBe('Design 1 (copy)');
  const allDownload = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download all JSON' }).click();
  const file = await (await allDownload).path();
  const all = JSON.parse(await readFile(file!, 'utf8'));
  expect(all.designs).toEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('alveo-saved-designs')!).designs));
  await dialog.getByRole('button', { name: 'Clear selection' }).click();
  await expect(dialog.getByRole('button', { name: 'Download selected JSON' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Clear search' }).click();
  await expect(dialog.getByRole('checkbox')).toHaveCount(2);
});

test('sort and metadata remain accessible in a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const dialog = page.getByRole('dialog', { name: 'Saved designs' });
  await dialog.getByRole('button', { name: 'Duplicate' }).click();
  await expect(dialog.getByRole('checkbox')).toHaveCount(2);
  await dialog.getByLabel('Sort saved designs').selectOption('oldest');
  await expect(dialog.getByRole('checkbox').first()).toHaveAccessibleName('Design 1');
  await dialog.getByLabel('Sort saved designs').selectOption('newest');
  await expect(dialog.getByRole('checkbox').first()).toHaveAccessibleName('Design 1 (copy)');
  await expect(dialog.getByText(/0 drawer organizers/).first()).toBeVisible();
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  const audit = await new AxeBuilder({ page }).include('dialog').analyze();
  expect(audit.violations).toEqual([]);
});

test('a failed duplicate write reports memory-only state inside the dialog', async ({ page }) => {
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('full', 'QuotaExceededError'); }; });
  const dialog = page.getByRole('dialog', { name: 'Saved designs' });
  await dialog.getByRole('button', { name: 'Duplicate' }).click();
  await expect(dialog.getByText(/Copy could not be saved to this device/)).toBeVisible();
  await expect(dialog.getByText('Design 1 (copy)', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Download all JSON' })).toBeEnabled();
});
