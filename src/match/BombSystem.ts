export type BombState = 'idle' | 'carried' | 'dropped' | 'planting' | 'planted' | 'defusing' | 'defused' | 'exploded';
export type BombSiteId = 'alpha' | 'bravo';
export type BombEvent = { readonly type: 'planted'; readonly siteId: BombSiteId } | { readonly type: 'defused' } | { readonly type: 'exploded' };

export interface WorldPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}
export interface BombSnapshot {
  readonly state: BombState;
  readonly carrierId: string | null;
  readonly operatorId: string | null;
  readonly siteId: BombSiteId | null;
  readonly position: WorldPoint;
  readonly actionProgress: number;
  readonly fuseRemaining: number;
}

export type BombListener = (snapshot: BombSnapshot) => void;
export type BombEventListener = (event: BombEvent) => void;

export const BOMB_TIMING = {
  defuseSeconds: 10,
  defuseWithKitSeconds: 5,
  fuseSeconds: 35,
  plantSeconds: 3,
} as const;

export class BombSystem {
  private snapshot: BombSnapshot = {
    state: 'idle',
    carrierId: null,
    operatorId: null,
    siteId: null,
    position: { x: 0, y: 0, z: 0 },
    actionProgress: 0,
    fuseRemaining: 0,
  };
  private actionDuration = 0;
  private readonly listeners = new Set<BombListener>();
  private readonly eventListeners = new Set<BombEventListener>();

  public get current(): BombSnapshot {
    return this.snapshot;
  }

  public subscribe(listener: BombListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  public subscribeToEvents(listener: BombEventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  public reset(carrierId: string, position: WorldPoint): void {
    this.actionDuration = 0;
    this.setSnapshot({
      state: 'carried',
      carrierId,
      operatorId: null,
      siteId: null,
      position: { ...position },
      actionProgress: 0,
      fuseRemaining: 0,
    });
  }

  public setCarrierPosition(position: WorldPoint): void {
    if (this.snapshot.state !== 'carried') {
      return;
    }
    this.setSnapshot({ ...this.snapshot, position: { ...position } });
  }

  public drop(position: WorldPoint): void {
    if (this.snapshot.state !== 'carried') {
      return;
    }
    this.setSnapshot({ ...this.snapshot, state: 'dropped', carrierId: null, position: { ...position } });
  }

  public pickUp(operatorId: string): void {
    if (this.snapshot.state !== 'dropped') {
      return;
    }
    this.setSnapshot({ ...this.snapshot, state: 'carried', carrierId: operatorId, operatorId: null });
  }

  public beginPlant(operatorId: string, siteId: BombSiteId): boolean {
    if (this.snapshot.state !== 'carried' || this.snapshot.carrierId !== operatorId) {
      return false;
    }
    this.actionDuration = BOMB_TIMING.plantSeconds;
    this.setSnapshot({ ...this.snapshot, state: 'planting', operatorId, siteId, actionProgress: 0 });
    return true;
  }

  public cancelPlant(): void {
    if (this.snapshot.state !== 'planting') {
      return;
    }
    this.actionDuration = 0;
    this.setSnapshot({ ...this.snapshot, state: 'carried', operatorId: null, siteId: null, actionProgress: 0 });
  }

  public beginDefuse(operatorId: string, hasKit: boolean): boolean {
    if (this.snapshot.state !== 'planted') {
      return false;
    }
    this.actionDuration = hasKit ? BOMB_TIMING.defuseWithKitSeconds : BOMB_TIMING.defuseSeconds;
    this.setSnapshot({ ...this.snapshot, state: 'defusing', operatorId, actionProgress: 0 });
    return true;
  }

  public cancelDefuse(): void {
    if (this.snapshot.state !== 'defusing') {
      return;
    }
    this.actionDuration = 0;
    this.setSnapshot({ ...this.snapshot, state: 'planted', operatorId: null, actionProgress: 0 });
  }

  public update(deltaSeconds: number): void {
    if (this.snapshot.state === 'planting') {
      const progress = Math.min(1, this.snapshot.actionProgress + deltaSeconds / this.actionDuration);
      if (progress === 1) {
        const siteId = this.snapshot.siteId;
        if (!siteId) {
          throw new Error('A planting device must have a site.');
        }
        this.actionDuration = 0;
        this.setSnapshot({
          ...this.snapshot,
          state: 'planted',
          carrierId: null,
          operatorId: null,
          actionProgress: 0,
          fuseRemaining: BOMB_TIMING.fuseSeconds,
        });
        this.emit({ type: 'planted', siteId });
        return;
      }
      this.setSnapshot({ ...this.snapshot, actionProgress: progress });
      return;
    }

    if (this.snapshot.state === 'planted') {
      this.updateFuse(deltaSeconds);
      return;
    }

    if (this.snapshot.state === 'defusing') {
      const timeToDefuse = (1 - this.snapshot.actionProgress) * this.actionDuration;
      if (timeToDefuse <= deltaSeconds && timeToDefuse <= this.snapshot.fuseRemaining) {
        this.actionDuration = 0;
        this.setSnapshot({ ...this.snapshot, state: 'defused', operatorId: null, actionProgress: 1 });
        this.emit({ type: 'defused' });
        return;
      }
      const fuseRemaining = Math.max(0, this.snapshot.fuseRemaining - deltaSeconds);
      if (fuseRemaining === 0) {
        this.explode();
        return;
      }
      const progress = Math.min(1, this.snapshot.actionProgress + deltaSeconds / this.actionDuration);
      this.setSnapshot({ ...this.snapshot, fuseRemaining, actionProgress: progress });
    }
  }

  private updateFuse(deltaSeconds: number): void {
    const fuseRemaining = Math.max(0, this.snapshot.fuseRemaining - deltaSeconds);
    if (fuseRemaining === 0) {
      this.explode();
      return;
    }
    this.setSnapshot({ ...this.snapshot, fuseRemaining });
  }

  private explode(): void {
    this.actionDuration = 0;
    this.setSnapshot({ ...this.snapshot, state: 'exploded', operatorId: null, actionProgress: 0, fuseRemaining: 0 });
    this.emit({ type: 'exploded' });
  }

  private setSnapshot(snapshot: BombSnapshot): void {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener(snapshot));
  }

  private emit(event: BombEvent): void {
    this.eventListeners.forEach((listener) => listener(event));
  }
}
