import { expect, test } from '@playwright/test';

test('renders command center shell', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('VISION V3.0')).toBeVisible();
  await expect(page.getByLabel('3D command globe viewport')).toBeVisible();
  await expect(page.getByText('DATA LAYERS')).toBeVisible();
});
