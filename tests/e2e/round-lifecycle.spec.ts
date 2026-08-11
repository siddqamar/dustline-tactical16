import { expect, test } from '@playwright/test';

async function startOperation(page: import('@playwright/test').Page, teamSize = '3', difficulty = 'easy'): Promise<void> {
  await page.goto(`/?difficulty=${difficulty}`);
  await expect(page.locator('.prematch-menu')).toBeVisible();
  await page.locator('[data-team-size]').selectOption(teamSize);
  await page.locator('[data-start-operation]').click();
  await expect(page.locator('.buy-menu')).toBeHidden();
  await expect(page.locator('.hud-round-value')).toHaveText('LIVE COMBAT', { timeout: 8_000 });
}

async function deploy(page: import('@playwright/test').Page): Promise<void> {
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

test('starts a staffed field operation with the selected squad size', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-team-size]').selectOption('4');
  await page.locator('[data-role="defenders"]').click();
  await page.locator('[data-start-operation]').click();

  await expect(page.locator('.buy-menu')).toBeHidden();
  await expect(page.locator('.hud-alpha-alive')).toHaveText('4');
  await expect(page.locator('.hud-bravo-alive')).toHaveText('4');
  await expect(page.locator('.hud-round-value')).toHaveText('LIVE COMBAT', { timeout: 8_000 });
});

test('issues the full kit before the opening combat window', async ({ page }) => {
  await startOperation(page);
  await expect(page.locator('.hud-weapon-name')).toHaveText('P9 SERVICE PISTOL');
  await page.keyboard.press('Digit2');
  await expect(page.locator('.hud-weapon-name')).toHaveText('AR-17 FIELD RIFLE');
  await page.keyboard.press('Digit3');
  await expect(page.locator('.hud-weapon-name')).toHaveText('FIELD KNIFE');
  await expect(page.locator('.hud-round-value')).toHaveText('LIVE COMBAT', { timeout: 8_000 });
  await deploy(page);

  await expect(page.locator('.status-label')).toHaveText('LIVE');
  await expect(page.locator('.hud-alpha-alive')).toHaveText('3');
  await expect(page.locator('.hud-bravo-alive')).toHaveText('3');
});

test('keeps the controlled operative alive through the opening engagement window', async ({ page }) => {
  await startOperation(page, '5', 'medium');
  await deploy(page);
  await page.waitForTimeout(6_000);

  expect(Number(await page.locator('.hud-health-value').textContent())).toBeGreaterThan(0);
  await expect(page.locator('.hud-operative')).toContainText('SABLE');
  await expect(page.locator('.hud-round-value')).not.toHaveText('OPERATION FAILED');
});
