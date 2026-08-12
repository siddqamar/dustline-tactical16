import { describe, expect, it } from 'vitest';
import { WEAPON_DEFINITIONS } from '../weapons/WeaponTypes';
import { BOT_DIFFICULTIES, getBotDifficulty } from './BotDifficulty';

const BOT_WEAPON = WEAPON_DEFINITIONS.find((weapon) => weapon.id === 'rifle')!;

describe('bot combat pacing', () => {
  it('starts new players on the forgiving guard doctrine', () => {
    expect(getBotDifficulty(null)).toBe('easy');
  });

  it.each(['easy', 'medium'] as const)('keeps the first %s burst survivable', (difficulty) => {
    const profile = BOT_DIFFICULTIES[difficulty];
    const damagePerHit = Math.round(BOT_WEAPON.damage * profile.damageMultiplier);

    expect(damagePerHit * profile.burstSize).toBeLessThan(100);
    expect(profile.maxConcurrentAttackers).toBe(1);
    expect(profile.burstCooldown).toBeGreaterThanOrEqual(1.5);
  });
});
