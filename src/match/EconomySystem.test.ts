import { describe, expect, it } from 'vitest';
import { EconomySystem, ECONOMY_RULES } from './EconomySystem';

describe('EconomySystem', () => {
  it('rejects unaffordable purchases and deducts valid purchases', () => {
    const economy = new EconomySystem();
    economy.register('alpha-1', 'alpha');

    expect(economy.purchase('alpha-1', 1000)).toBe(false);
    expect(economy.purchase('alpha-1', 650)).toBe(true);
    expect(economy.get('alpha-1')?.credits).toBe(150);
  });

  it('increases the losing reward through a bounded loss streak', () => {
    const economy = new EconomySystem();
    economy.register('alpha-1', 'alpha');
    economy.register('bravo-1', 'bravo');

    economy.settleRound('bravo');
    const firstLossCredits = economy.get('alpha-1')?.credits ?? 0;
    economy.settleRound('bravo');
    const secondLossCredits = economy.get('alpha-1')?.credits ?? 0;

    expect(firstLossCredits).toBe(ECONOMY_RULES.startingCredits + ECONOMY_RULES.loserBaseReward);
    expect(secondLossCredits - firstLossCredits).toBe(ECONOMY_RULES.loserBaseReward + ECONOMY_RULES.lossStreakStep);
  });
});
