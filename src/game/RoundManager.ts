import type { GameState } from './GameState';
import type { Health } from '../combat/DamageSystem';

export type RoundPhase = 'countdown' | 'active' | 'round-end';
export type RoundWinner = 'player' | 'enemies' | null;

export interface RoundSnapshot {
  readonly phase: RoundPhase;
  readonly roundNumber: number;
  readonly countdown: number;
  readonly winner: RoundWinner;
  readonly awaitingPlayer: boolean;
}

export type RoundListener = (snapshot: RoundSnapshot) => void;

const COUNTDOWN_SECONDS = 3;
const DEPLOYMENT_GRACE_SECONDS = 2;

export class RoundManager {
  private snapshot: RoundSnapshot = {
    phase: 'countdown',
    roundNumber: 0,
    countdown: COUNTDOWN_SECONDS,
    winner: null,
    awaitingPlayer: true,
  };
  private activeElapsed = 0;
  private readonly listeners = new Set<RoundListener>();

  public constructor(
    private readonly gameState: GameState,
    private readonly playerHealth: Health,
  ) {}

  public get current(): RoundSnapshot {
    return this.snapshot;
  }

  public get isActive(): boolean {
    return this.snapshot.phase === 'active';
  }

  public get isCombatActive(): boolean {
    return this.isActive && !this.snapshot.awaitingPlayer && this.activeElapsed >= DEPLOYMENT_GRACE_SECONDS;
  }

  public subscribe(listener: RoundListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  public startRound(): void {
    this.playerHealth.reset();
    this.activeElapsed = 0;
    this.setSnapshot({
      phase: 'countdown',
      roundNumber: this.snapshot.roundNumber + 1,
      countdown: COUNTDOWN_SECONDS,
      winner: null,
      awaitingPlayer: true,
    });
    this.gameState.set('awaiting-player');
  }

  public update(deltaSeconds: number, playerReady: boolean): void {
    if (this.snapshot.phase === 'round-end') {
      return;
    }

    if (!playerReady) {
      if (!this.snapshot.awaitingPlayer) {
        this.setSnapshot({ ...this.snapshot, awaitingPlayer: true });
      }
      this.gameState.set(this.snapshot.phase === 'active' ? 'paused' : 'awaiting-player');
      return;
    }

    if (this.snapshot.awaitingPlayer) {
      this.setSnapshot({ ...this.snapshot, awaitingPlayer: false });
      this.gameState.set(this.snapshot.phase === 'active' ? 'playing' : 'restarting');
    }

    if (this.snapshot.phase === 'active') {
      this.activeElapsed += deltaSeconds;
      return;
    }

    if (this.snapshot.phase !== 'countdown') {
      return;
    }

    const countdown = Math.max(0, this.snapshot.countdown - deltaSeconds);
    if (countdown === 0) {
      this.activeElapsed = 0;
      this.setSnapshot({ ...this.snapshot, phase: 'active', countdown: 0, awaitingPlayer: false });
      this.gameState.set('playing');
      return;
    }

    this.setSnapshot({ ...this.snapshot, countdown });
  }

  public notifyPlayerDeath(): void {
    if (!this.isActive) {
      return;
    }

    this.gameState.set('player-dead');
    this.endRound('enemies');
  }

  public notifyEnemiesEliminated(): void {
    if (!this.isActive) {
      return;
    }

    this.endRound('player');
  }

  public restart(): void {
    if (this.snapshot.phase === 'active') {
      return;
    }

    this.startRound();
  }

  private endRound(winner: RoundWinner): void {
    this.setSnapshot({ ...this.snapshot, phase: 'round-end', winner });
    this.gameState.set('round-end');
  }

  private setSnapshot(snapshot: RoundSnapshot): void {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener(snapshot));
  }
}
