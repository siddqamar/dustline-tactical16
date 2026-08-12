import { expect, test } from '@playwright/test';

test.use({
  hasTouch: true,
  isMobile: true,
  viewport: { width: 390, height: 844 },
});

test('shows touch controls when the mobile operation opens', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-start-operation]').click();
  await expect(page.locator('.mobile-controls')).toBeVisible();
  await expect(page.locator('[data-mobile-fire]')).toBeVisible();
  await expect(page.locator('[data-mobile-aim]')).toBeVisible();
  await expect(page.locator('[data-mobile-weapon="1"]')).toBeVisible();
  await expect(page.locator('.hud-round-value')).toHaveText('LIVE COMBAT', { timeout: 8_000 });
});
