import type { SquadId } from './MatchTypes';

export interface EconomyAccount {
  readonly operativeId: string;
  readonly squad: SquadId;
  readonly credits: number;
  readonly lossStreak: number;
}
export const ECONOMY_RULES = {
  eliminationReward: 300,
  loserBaseReward: 1400,
  lossStreakStep: 500,
  maxCredits: 16000,
  maxLossReward: 3400,
  objectiveReward: 300,
  startingCredits: 800,
  winnerReward: 3250,
} as const;

export class EconomySystem {
  private readonly accounts = new Map<string, EconomyAccount>();

  public register(operativeId: string, squad: SquadId): void {
    this.accounts.set(operativeId, {
      operativeId,
      squad,
      credits: ECONOMY_RULES.startingCredits,
      lossStreak: 0,
    });
  }

  public get(operativeId: string): EconomyAccount | undefined {
    return this.accounts.get(operativeId);
  }

  public purchase(operativeId: string, cost: number): boolean {
    const account = this.accounts.get(operativeId);
    if (!account || cost < 0 || account.credits < cost) {
      return false;
    }
    this.accounts.set(operativeId, { ...account, credits: account.credits - cost });
    return true;
  }

  public awardElimination(operativeId: string): void {
    this.addCredits(operativeId, ECONOMY_RULES.eliminationReward);
  }

  public awardObjective(operativeId: string): void {
    this.addCredits(operativeId, ECONOMY_RULES.objectiveReward);
  }

  public settleRound(winner: SquadId): void {
    for (const account of this.accounts.values()) {
      if (account.squad === winner) {
        this.accounts.set(account.operativeId, {
          ...account,
          credits: Math.min(ECONOMY_RULES.maxCredits, account.credits + ECONOMY_RULES.winnerReward),
          lossStreak: 0,
        });
        continue;
      }
      const lossStreak = account.lossStreak + 1;
      const reward = Math.min(ECONOMY_RULES.maxLossReward, ECONOMY_RULES.loserBaseReward + (lossStreak - 1) * ECONOMY_RULES.lossStreakStep);
      this.accounts.set(account.operativeId, {
        ...account,
        credits: Math.min(ECONOMY_RULES.maxCredits, account.credits + reward),
        lossStreak,
      });
    }
  }

  public reset(): void {
    this.accounts.forEach((account) => {
      this.accounts.set(account.operativeId, {
        ...account,
        credits: ECONOMY_RULES.startingCredits,
        lossStreak: 0,
      });
    });
  }

  private addCredits(operativeId: string, amount: number): void {
    const account = this.accounts.get(operativeId);
    if (!account) {
      return;
    }
    this.accounts.set(operativeId, {
      ...account,
      credits: Math.min(ECONOMY_RULES.maxCredits, account.credits + amount),
    });
  }
}
