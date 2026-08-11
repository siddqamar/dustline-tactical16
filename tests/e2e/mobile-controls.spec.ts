import { expect, test } from '@playwright/test';

test.use({
  hasTouch: true,
  isMobile: true,
  viewport: { width: 390, height: 844 },
});

test('shows touch controls after mobile deployment', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-start-operation]').click();
  await expect(page.locator('.buy-menu')).toBeVisible();
  await expect(page.locator('.mobile-controls')).toBeHidden();

  await page.locator('[data-deploy]').click();
  await expect(page.locator('.mobile-controls')).toBeVisible();
  await expect(page.locator('[data-mobile-fire]')).toBeVisible();
  await expect(page.locator('[data-mobile-aim]')).toBeVisible();
  await expect(page.locator('[data-mobile-weapon="1"]')).toBeVisible();
});
