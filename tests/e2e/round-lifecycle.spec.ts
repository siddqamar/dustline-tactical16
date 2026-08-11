import { expect, test } from '@playwright/test';

async function startOperation(page: import('@playwright/test').Page, teamSize = '3', difficulty = 'easy'): Promise<void> {
  await page.goto(`/?difficulty=${difficulty}`);
  await expect(page.locator('.prematch-menu')).toBeVisible();
  await page.locator('[data-team-size]').selectOption(teamSize);
  await page.locator('[data-start-operation]').click();
  await expect(page.locator('.buy-menu')).toBeVisible();
}

async function deploy(page: import('@playwright/test').Page): Promise<void> {
  await page.locator('[data-deploy]').click();
  const canvas = page.locator('.game-canvas');
  await expect(canvas).toBeVisible();
  await canvas.click({ position: { x: 480, y: 270 } });
  await expect.poll(() => page.evaluate(() => document.pointerLockElement?.classList.contains('game-canvas') ?? false)).toBe(true);
}

test('waits in operation setup without starting hidden combat', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('.prematch-menu')).toBeVisible();
  await expect(page.locator('[data-start-operation]')).toHaveText('BEGIN INSERTION');
  await expect(page.locator('.status-label')).toHaveText('OPERATION SETUP');
  await page.waitForTimeout(3_000);
  await expect(page.locator('.prematch-menu')).toBeVisible();
  await expect(page.locator('.hud-health-value')).toHaveText('100');
});

test('applies team size and role choices before opening the buy phase', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-team-size]').selectOption('4');
  await page.locator('[data-role="defenders"]').click();
  await page.locator('[data-start-operation]').click();

  await expect(page.locator('.buy-menu')).toBeVisible();
  await expect(page.locator('[data-buy-role]')).toHaveText('OVERWATCH KIT');
  await expect(page.locator('.hud-alpha-alive')).toHaveText('4');
  await expect(page.locator('.hud-round-value')).toHaveText('BUY PHASE');
});

test('enters live combat only after loadout confirmation and player deployment', async ({ page }) => {
  await startOperation(page);
  await expect(page.locator('[data-buy-credits]')).toHaveText('$00800');
  await page.locator('[data-buy-item="armor"]').click();
  await expect(page.locator('[data-buy-credits]')).toHaveText('$00150');
  await deploy(page);

  await expect(page.locator('.hud-round-value')).toHaveText('LIVE COMBAT', { timeout: 6_000 });
  await expect(page.locator('.status-label')).toHaveText('LIVE');
  await expect(page.locator('.hud-armor-value')).toHaveText('COMPOSITE ARMOR');
  await expect(page.locator('.hud-alpha-alive')).toHaveText('3');
  await expect(page.locator('.hud-bravo-alive')).toHaveText('3');
});

test('keeps the controlled operative alive through the opening engagement window', async ({ page }) => {
  await startOperation(page, '5', 'medium');
  await deploy(page);
  await expect(page.locator('.hud-round-value')).toHaveText('LIVE COMBAT', { timeout: 6_000 });
  await page.waitForTimeout(6_000);

  expect(Number(await page.locator('.hud-health-value').textContent())).toBeGreaterThan(0);
  await expect(page.locator('.hud-operative')).toContainText('ALPHA');
  await expect(page.locator('.hud-round-value')).not.toHaveText('OPERATION FAILED');
});
