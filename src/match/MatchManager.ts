import type { MatchConfig, MatchSnapshot, RoundEndReason, SquadId, SquadRoles, TeamRole } from './MatchTypes';
import { opposingRole, opposingSquad } from './MatchTypes';

export type MatchListener = (snapshot: MatchSnapshot) => void;

export const MATCH_TIMING = {
  buySeconds: 12,
  deploymentSeconds: 3,
  resolutionSeconds: 5,
  roundSeconds: 90,
} as const;

const PLAYER_SQUAD: SquadId = 'alpha';

export class MatchManager {
  private config: MatchConfig | null = null;
  private snapshot: MatchSnapshot = {
    phase: 'setup',
    roundNumber: 0,
    phaseRemaining: 0,
    roundRemaining: 0,
    awaitingPlayer: false,
    playerSquad: PLAYER_SQUAD,
    roles: { alpha: 'attackers', bravo: 'defenders' },
    scores: { alpha: 0, bravo: 0 },
    roundWinner: null,
    matchWinner: null,
    roundEndReason: null,
  };
  private readonly listeners = new Set<MatchListener>();

  public get current(): MatchSnapshot {
    return this.snapshot;
  }

  public get settings(): MatchConfig | null {
    return this.config;
  }

  public get isCombatActive(): boolean {
    return (this.snapshot.phase === 'live' || this.snapshot.phase === 'planted') && !this.snapshot.awaitingPlayer;
  }

  public roleFor(squad: SquadId): TeamRole {
    return this.snapshot.roles[squad];
  }

  public squadFor(role: TeamRole): SquadId {
    return this.snapshot.roles.alpha === role ? 'alpha' : 'bravo';
  }

  public subscribe(listener: MatchListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  public start(config: MatchConfig): void {
    this.validateConfig(config);
    this.config = config;
    this.snapshot = {
      ...this.snapshot,
      phase: 'setup',
      roundNumber: 0,
      phaseRemaining: 0,
      roundRemaining: 0,
      awaitingPlayer: false,
      roles: this.rolesForRound(1),
      scores: { alpha: 0, bravo: 0 },
      roundWinner: null,
      matchWinner: null,
      roundEndReason: null,
    };
    this.startNextRound();
  }

  public update(deltaSeconds: number, playerReady: boolean): void {
    if (!this.config || this.snapshot.phase === 'setup' || this.snapshot.phase === 'match-end') {
      return;
    }

    if (this.snapshot.phase === 'round-end') {
      const remaining = Math.max(0, this.snapshot.phaseRemaining - deltaSeconds);
      if (remaining === 0) {
        if (this.snapshot.matchWinner) {
          this.setSnapshot({ ...this.snapshot, phase: 'match-end', phaseRemaining: 0 });
        } else {
          this.startNextRound();
        }
        return;
      }
      this.setSnapshot({ ...this.snapshot, phaseRemaining: remaining });
      return;
    }

    if (this.snapshot.phase === 'buy') {
      const remaining = Math.max(0, this.snapshot.phaseRemaining - deltaSeconds);
      if (remaining === 0) {
        this.setSnapshot({
          ...this.snapshot,
          phase: 'deployment',
          phaseRemaining: MATCH_TIMING.deploymentSeconds,
          awaitingPlayer: true,
        });
        return;
      }
      this.setSnapshot({ ...this.snapshot, phaseRemaining: remaining });
      return;
    }

    if (!playerReady) {
      if (!this.snapshot.awaitingPlayer) {
        this.setSnapshot({ ...this.snapshot, awaitingPlayer: true });
      }
      return;
    }

    if (this.snapshot.awaitingPlayer) {
      this.setSnapshot({ ...this.snapshot, awaitingPlayer: false });
    }

    if (this.snapshot.phase === 'deployment') {
      const remaining = Math.max(0, this.snapshot.phaseRemaining - deltaSeconds);
      if (remaining === 0) {
        this.setSnapshot({
          ...this.snapshot,
          phase: 'live',
          phaseRemaining: 0,
          roundRemaining: MATCH_TIMING.roundSeconds,
          awaitingPlayer: false,
        });
        return;
      }
      this.setSnapshot({ ...this.snapshot, phaseRemaining: remaining });
      return;
    }

    if (this.snapshot.phase === 'live') {
      const remaining = Math.max(0, this.snapshot.roundRemaining - deltaSeconds);
      if (remaining === 0) {
        this.finishRound(this.squadFor('defenders'), 'timeout');
        return;
      }
      this.setSnapshot({ ...this.snapshot, roundRemaining: remaining });
    }
  }

  public finishBuyPhase(): void {
    if (this.snapshot.phase !== 'buy') {
      return;
    }

    this.setSnapshot({
      ...this.snapshot,
      phase: 'deployment',
      phaseRemaining: MATCH_TIMING.deploymentSeconds,
      awaitingPlayer: true,
    });
  }

  public reportSquadEliminated(eliminatedSquad: SquadId): void {
    if (this.snapshot.phase !== 'live' && this.snapshot.phase !== 'planted') {
      return;
    }

    const winner = opposingSquad(eliminatedSquad);
    if (this.snapshot.phase === 'planted' && this.roleFor(eliminatedSquad) === 'attackers') {
      return;
    }
    this.finishRound(winner, 'elimination');
  }

  public reportBombPlanted(): void {
    if (this.snapshot.phase !== 'live') {
      return;
    }
    this.setSnapshot({ ...this.snapshot, phase: 'planted', phaseRemaining: 0 });
  }

  public reportBombDefused(): void {
    if (this.snapshot.phase !== 'planted') {
      return;
    }
    this.finishRound(this.squadFor('defenders'), 'defused');
  }

  public reportBombExploded(): void {
    if (this.snapshot.phase !== 'planted') {
      return;
    }
    this.finishRound(this.squadFor('attackers'), 'exploded');
  }

  private startNextRound(): void {
    const roundNumber = this.snapshot.roundNumber + 1;
    this.setSnapshot({
      ...this.snapshot,
      phase: 'buy',
      roundNumber,
      phaseRemaining: MATCH_TIMING.buySeconds,
      roundRemaining: MATCH_TIMING.roundSeconds,
      awaitingPlayer: false,
      roles: this.rolesForRound(roundNumber),
      roundWinner: null,
      roundEndReason: null,
    });
  }

  private finishRound(winner: SquadId, reason: RoundEndReason): void {
    if (!this.config || this.snapshot.phase === 'round-end' || this.snapshot.phase === 'match-end') {
      return;
    }
    const scores = {
      ...this.snapshot.scores,
      [winner]: this.snapshot.scores[winner] + 1,
    };
    const matchWinner = scores[winner] >= this.config.roundsToWin ? winner : null;
    this.setSnapshot({
      ...this.snapshot,
      phase: 'round-end',
      phaseRemaining: MATCH_TIMING.resolutionSeconds,
      scores,
      roundWinner: winner,
      matchWinner,
      roundEndReason: reason,
      awaitingPlayer: false,
    });
  }

  private rolesForRound(roundNumber: number): SquadRoles {
    const startingRole = this.config?.startingRole ?? 'attackers';
    const roundsToWin = this.config?.roundsToWin ?? 4;
    const playerRole = roundNumber > roundsToWin - 1 ? opposingRole(startingRole) : startingRole;
    return {
      alpha: playerRole,
      bravo: opposingRole(playerRole),
    };
  }

  private validateConfig(config: MatchConfig): void {
    if (config.teamSize < 1 || config.teamSize > 5) {
      throw new Error('Team size must be between one and five.');
    }
    if (!Number.isInteger(config.roundsToWin) || config.roundsToWin < 1) {
      throw new Error('Rounds to win must be a positive integer.');
    }
  }

  private setSnapshot(snapshot: MatchSnapshot): void {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener(snapshot));
  }
}
