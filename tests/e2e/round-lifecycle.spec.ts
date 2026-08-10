import { expect, test } from '@playwright/test';

test('waits for the player before starting the round', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('.game-canvas')).toBeVisible();
  await expect(page.locator('.hud-round-value')).toHaveText('CLICK TO DEPLOY');
  await expect(page.locator('.status-label')).toHaveText('AWAITING PLAYER');

  await page.waitForTimeout(8_000);

  await expect(page.locator('.hud-health-value')).toHaveText('100');
  await expect(page.locator('.hud-round-value')).toHaveText('CLICK TO DEPLOY');
});

test('starts the countdown after the player takes control', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('.game-canvas');
  await expect(canvas).toBeVisible();

  await canvas.click({ position: { x: 400, y: 300 } });
  await expect.poll(() => page.evaluate(() => document.pointerLockElement?.classList.contains('game-canvas') ?? false)).toBe(true);
  await expect(page.locator('.status-label')).toHaveText('RESTARTING');
  await expect(page.locator('.hud-round-value')).toContainText('CONTACT IN', { timeout: 5_000 });
  await expect(page.locator('.hud-round-value')).toHaveText('LIVE COMBAT', { timeout: 3_000 });

  await page.waitForTimeout(1_000);
  await expect(page.locator('.hud-health-value')).toHaveText('100');
});

test('keeps the player alive through the opening combat window', async ({ page }) => {
  await page.goto('/?difficulty=medium');
  const canvas = page.locator('.game-canvas');
  await expect(canvas).toBeVisible();

  await canvas.click({ position: { x: 400, y: 300 } });
  await expect(page.locator('.hud-round-value')).toHaveText('LIVE COMBAT', { timeout: 8_000 });
  await page.waitForTimeout(6_000);

  expect(Number(await page.locator('.hud-health-value').textContent())).toBeGreaterThan(0);
  await expect(page.locator('.hud-round-value')).toHaveText('LIVE COMBAT');
});
