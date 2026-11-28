'use strict';

const { test, expect } = require('../fixtures/electron');

test.describe('Launcher', () => {
  test('renders tool cards with Electron preload bridge active', async ({ page }) => {
    const isElectron = await page.evaluate(() => Boolean(window.electronApi && window.electronApi.isElectron));
    expect(isElectron).toBe(true);

    await expect(page.locator('#appTitle')).toBeVisible();
    await expect(page.locator('#sectionsContainer')).toBeVisible();

    const cardCount = await page.locator('#sectionsContainer .tool-card, #sectionsContainer .app-card, #sectionsContainer [data-tool]').count();
    expect(cardCount).toBeGreaterThan(0);
  });

  test('filters tools via search input', async ({ page }) => {
    const search = page.locator('#launcherSearchInput');
    await expect(search).toBeVisible();
    await search.fill('Board');
    await expect(page.locator('#launcherSearchClearBtn')).toBeVisible();

    await page.locator('#launcherSearchClearBtn').click();
    await expect(search).toHaveValue('');
  });
});
