import { describe, expect, it } from 'vitest';
import { Health } from '../combat/DamageSystem';
import { GameState } from './GameState';
import { RoundManager } from './RoundManager';

function createRound(): { round: RoundManager; state: GameState } {
  const state = new GameState();
  const round = new RoundManager(state, new Health(100));
  round.startRound();
  return { round, state };
}

describe('RoundManager player readiness', () => {
  it('does not advance the deployment countdown before the player has control', () => {
    const { round, state } = createRound();

    round.update(30, false);

    expect(round.current.phase).toBe('countdown');
    expect(round.current.countdown).toBe(3);
    expect(round.current.awaitingPlayer).toBe(true);
    expect(state.current).toBe('awaiting-player');
    expect(round.isCombatActive).toBe(false);
  });

  it('starts combat only after readiness and the deployment grace period', () => {
    const { round, state } = createRound();

    round.update(3, true);
    expect(round.current.phase).toBe('active');
    expect(state.current).toBe('playing');
    expect(round.isCombatActive).toBe(false);
    expect(round.engagementCountdown).toBe(2);

    round.update(2, true);
    expect(round.isCombatActive).toBe(true);
    expect(round.engagementCountdown).toBe(0);
  });

  it('pauses combat whenever the player loses control', () => {
    const { round, state } = createRound();
    round.update(3, true);
    round.update(2, true);

    round.update(10, false);

    expect(round.current.phase).toBe('active');
    expect(round.current.awaitingPlayer).toBe(true);
    expect(state.current).toBe('paused');
    expect(round.isCombatActive).toBe(false);
    expect(round.engagementCountdown).toBe(0);
  });
});
