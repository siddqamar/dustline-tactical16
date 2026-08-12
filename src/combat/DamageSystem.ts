export type HitZone = 'head' | 'body';

export interface DamageResult {
  readonly amount: number;
  readonly zone: HitZone;
  readonly remainingHealth: number;
  readonly killed: boolean;
}

export class Health {
  private currentHealth: number;

  public constructor(public readonly maxHealth: number) {
    this.currentHealth = maxHealth;
  }

  public get current(): number {
    return this.currentHealth;
  }

  public get isDead(): boolean {
    return this.currentHealth <= 0;
  }

  public applyDamage(baseAmount: number, zone: HitZone, multiplier: number): DamageResult {
    const amount = Math.max(0, Math.round(baseAmount * multiplier));
    const before = this.currentHealth;
    this.currentHealth = Math.max(0, this.currentHealth - amount);
    return {
      amount: Math.min(amount, before),
      zone,
      remainingHealth: this.currentHealth,
      killed: this.currentHealth === 0 && before > 0,
    };
  }

  public reset(): void {
    this.currentHealth = this.maxHealth;
  }

  public setCurrent(value: number): void {
    this.currentHealth = Math.max(0, Math.min(this.maxHealth, Math.round(value)));
  }
}
