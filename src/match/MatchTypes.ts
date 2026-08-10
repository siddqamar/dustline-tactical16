import type { BotDifficulty } from '../ai/BotDifficulty';

export const TEAM_SIZES = [1, 2, 3, 4, 5] as const;

export type TeamSize = (typeof TEAM_SIZES)[number];
export type SquadId = 'alpha' | 'bravo';
export type TeamRole = 'attackers' | 'defenders';
export type MatchPhase = 'setup' | 'buy' | 'deployment' | 'live' | 'planted' | 'round-end' | 'match-end';
export type RoundEndReason = 'elimination' | 'timeout' | 'defused' | 'exploded';

export interface MatchConfig {
  readonly teamSize: TeamSize;
  readonly difficulty: BotDifficulty;
  readonly startingRole: TeamRole;
  readonly roundsToWin: number;
}
export interface SquadRoles {
  readonly alpha: TeamRole;
  readonly bravo: TeamRole;
}

export interface SquadScores {
  readonly alpha: number;
  readonly bravo: number;
}

export interface MatchSnapshot {
  readonly phase: MatchPhase;
  readonly roundNumber: number;
  readonly phaseRemaining: number;
  readonly roundRemaining: number;
  readonly awaitingPlayer: boolean;
  readonly playerSquad: SquadId;
  readonly roles: SquadRoles;
  readonly scores: SquadScores;
  readonly roundWinner: SquadId | null;
  readonly matchWinner: SquadId | null;
  readonly roundEndReason: RoundEndReason | null;
}

export function opposingSquad(squad: SquadId): SquadId {
  return squad === 'alpha' ? 'bravo' : 'alpha';
}

export function opposingRole(role: TeamRole): TeamRole {
  return role === 'attackers' ? 'defenders' : 'attackers';
}
