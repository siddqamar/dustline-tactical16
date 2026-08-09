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
  readonly preferredCombatDistance: number;
  readonly coverBias: number;
}

export const BOT_DIFFICULTIES: Record<BotDifficulty, BotDifficultyProfile> = {
  easy: {
    label: 'EASY',
    perceptionInterval: 0.36,
    perceptionRange: 58,
    reactionDelay: 0.72,
    targetMemory: 1.5,
    accuracy: 0.34,
    patrolSpeed: 2.2,
    pursuitSpeed: 2.5,
    fireIntervalMultiplier: 1.35,
    preferredCombatDistance: 17,
    coverBias: 0.08,
  },
  medium: {
    label: 'MEDIUM',
    perceptionInterval: 0.2,
    perceptionRange: 76,
    reactionDelay: 0.35,
    targetMemory: 2.8,
    accuracy: 0.62,
    patrolSpeed: 2.7,
    pursuitSpeed: 3.4,
    fireIntervalMultiplier: 1,
    preferredCombatDistance: 12,
    coverBias: 0.18,
  },
  expert: {
    label: 'EXPERT',
    perceptionInterval: 0.12,
    perceptionRange: 92,
    reactionDelay: 0.12,
    targetMemory: 4.8,
    accuracy: 0.9,
    patrolSpeed: 3.3,
    pursuitSpeed: 4.25,
    fireIntervalMultiplier: 0.82,
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

