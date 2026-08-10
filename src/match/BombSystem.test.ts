import { describe, expect, it, vi } from 'vitest';
import { BombSystem, BOMB_TIMING } from './BombSystem';

describe('BombSystem', () => {
  it('requires the carrier to plant and emits a planted event', () => {
    const bomb = new BombSystem();
    const listener = vi.fn();
    bomb.subscribeToEvents(listener);
    bomb.reset('alpha-1', { x: 0, y: 0, z: 0 });

    expect(bomb.beginPlant('alpha-2', 'alpha')).toBe(false);
    expect(bomb.beginPlant('alpha-1', 'alpha')).toBe(true);
    bomb.update(BOMB_TIMING.plantSeconds);

    expect(bomb.current.state).toBe('planted');
    expect(bomb.current.fuseRemaining).toBe(BOMB_TIMING.fuseSeconds);
    expect(listener).toHaveBeenCalledWith({ type: 'planted', siteId: 'alpha' });
  });

  it('finishes a kit defuse before the fuse expires', () => {
    const bomb = new BombSystem();
    bomb.reset('alpha-1', { x: 0, y: 0, z: 0 });
    bomb.beginPlant('alpha-1', 'bravo');
    bomb.update(BOMB_TIMING.plantSeconds);

    expect(bomb.beginDefuse('bravo-1', true)).toBe(true);
    bomb.update(BOMB_TIMING.defuseWithKitSeconds);

    expect(bomb.current.state).toBe('defused');
  });

  it('explodes when a defuse cannot finish before the fuse', () => {
    const bomb = new BombSystem();
    bomb.reset('alpha-1', { x: 0, y: 0, z: 0 });
    bomb.beginPlant('alpha-1', 'bravo');
    bomb.update(BOMB_TIMING.plantSeconds);
    bomb.update(BOMB_TIMING.fuseSeconds - 2);

    bomb.beginDefuse('bravo-1', false);
    bomb.update(2);

    expect(bomb.current.state).toBe('exploded');
  });
});
