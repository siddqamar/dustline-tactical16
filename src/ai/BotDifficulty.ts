export type BotDifficulty = 'easy' | 'medium' | 'expert';

export interface BotDifficultyProfile {
  readonly label: string;
  readonly perceptionInterval: number;
  readonly perceptionRange: number;
  readonly reactionDelay: number;
  readonly targetMemory: number;
  readonly accuracy: number;
  readonly patrolSpeed: number;
  readonly pursuitSpeed: number;
  readonly fireIntervalMultiplier: number;
  readonly damageMultiplier: number;
  readonly burstSize: number;
  readonly burstCooldown: number;
  readonly maxConcurrentAttackers: number;
  readonly preferredCombatDistance: number;
  readonly coverBias: number;
}

export const BOT_DIFFICULTIES: Record<BotDifficulty, BotDifficultyProfile> = {
  easy: {
    label: 'EASY',
    perceptionInterval: 0.36,
    perceptionRange: 58,
    reactionDelay: 0.9,
    targetMemory: 1.5,
    accuracy: 0.28,
    patrolSpeed: 2.2,
    pursuitSpeed: 2.5,
    fireIntervalMultiplier: 1.8,
    damageMultiplier: 0.42,
    burstSize: 2,
    burstCooldown: 1.8,
    maxConcurrentAttackers: 1,
    preferredCombatDistance: 17,
    coverBias: 0.08,
  },
  medium: {
    label: 'MEDIUM',
    perceptionInterval: 0.2,
    perceptionRange: 76,
    reactionDelay: 0.65,
    targetMemory: 2.8,
    accuracy: 0.5,
    patrolSpeed: 2.7,
    pursuitSpeed: 3.4,
    fireIntervalMultiplier: 1.45,
    damageMultiplier: 0.55,
    burstSize: 3,
    burstCooldown: 1.5,
    maxConcurrentAttackers: 1,
    preferredCombatDistance: 12,
    coverBias: 0.18,
  },
  expert: {
    label: 'EXPERT',
    perceptionInterval: 0.12,
    perceptionRange: 92,
    reactionDelay: 0.3,
    targetMemory: 4.8,
    accuracy: 0.78,
    patrolSpeed: 3.3,
    pursuitSpeed: 4.25,
    fireIntervalMultiplier: 1.05,
    damageMultiplier: 0.7,
    burstSize: 4,
    burstCooldown: 0.9,
    maxConcurrentAttackers: 2,
    preferredCombatDistance: 8,
    coverBias: 0.34,
  },
};

export function getBotDifficulty(value: string | null): BotDifficulty {
  if (value === 'easy' || value === 'expert') {
    return value;
  }
  return 'medium';
}
