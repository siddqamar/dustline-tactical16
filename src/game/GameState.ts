export type GameStatus = 'loading' | 'playing' | 'round-end' | 'player-dead' | 'restarting';

export type GameStateListener = (next: GameStatus, previous: GameStatus) => void;

export class GameState {
  private status: GameStatus = 'loading';
  private readonly listeners = new Set<GameStateListener>();

  public get current(): GameStatus {
    return this.status;
  }

  public set(next: GameStatus): void {
    if (this.status === next) {
      return;
    }

    const previous = this.status;
    this.status = next;
    this.listeners.forEach((listener) => listener(next, previous));
  }

  public subscribe(listener: GameStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

