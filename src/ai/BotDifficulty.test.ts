import { describe, expect, it } from 'vitest';
import { WEAPON_DEFINITIONS } from '../weapons/WeaponTypes';
import { BOT_DIFFICULTIES } from './BotDifficulty';

const BOT_WEAPON = WEAPON_DEFINITIONS[2]!;

describe('bot combat pacing', () => {
  it.each(['easy', 'medium'] as const)('keeps the first %s burst survivable', (difficulty) => {
    const profile = BOT_DIFFICULTIES[difficulty];
    const damagePerHit = Math.round(BOT_WEAPON.damage * profile.damageMultiplier);

    expect(damagePerHit * profile.burstSize).toBeLessThan(100);
    expect(profile.maxConcurrentAttackers).toBe(1);
    expect(profile.burstCooldown).toBeGreaterThanOrEqual(1.5);
  });
});
