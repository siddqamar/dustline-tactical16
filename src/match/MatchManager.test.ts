import { describe, expect, it } from 'vitest';
import { MatchManager, MATCH_TIMING } from './MatchManager';
import type { MatchConfig } from './MatchTypes';

const CONFIG: MatchConfig = {
  teamSize: 5,
  difficulty: 'medium',
  startingRole: 'attackers',
  roundsToWin: 4,
};

function advanceToLive(match: MatchManager): void {
  match.update(MATCH_TIMING.buySeconds, false);
  match.update(MATCH_TIMING.deploymentSeconds, true);
}

describe('MatchManager', () => {
  it('moves through buy and deployment before live combat', () => {
    const match = new MatchManager();
    match.start(CONFIG);

    expect(match.current.phase).toBe('buy');
    expect(match.current.roundNumber).toBe(1);
    match.update(MATCH_TIMING.buySeconds, false);
    expect(match.current.phase).toBe('deployment');
    expect(match.current.awaitingPlayer).toBe(true);
    match.update(MATCH_TIMING.deploymentSeconds, true);
    expect(match.current.phase).toBe('live');
    expect(match.isCombatActive).toBe(true);
  });

  it('lets the player finish the buy phase early', () => {
    const match = new MatchManager();
    match.start(CONFIG);

    match.finishBuyPhase();

    expect(match.current.phase).toBe('deployment');
    expect(match.current.awaitingPlayer).toBe(true);
  });

  it('does not award defenders an elimination after the device is planted and attackers die', () => {
    const match = new MatchManager();
    match.start(CONFIG);
    advanceToLive(match);

    match.reportBombPlanted();
    match.reportSquadEliminated(match.squadFor('attackers'));

    expect(match.current.phase).toBe('planted');
    expect(match.current.roundWinner).toBeNull();
    match.reportBombExploded();
    expect(match.current.roundWinner).toBe(match.squadFor('attackers'));
    expect(match.current.roundEndReason).toBe('exploded');
  });

  it('switches the player squad to defense after halftime', () => {
    const match = new MatchManager();
    match.start(CONFIG);

    for (let round = 1; round <= 3; round += 1) {
      advanceToLive(match);
      match.reportSquadEliminated('bravo');
      match.update(MATCH_TIMING.resolutionSeconds, false);
    }

    expect(match.current.roundNumber).toBe(4);
    expect(match.roleFor('alpha')).toBe('defenders');
    expect(match.roleFor('bravo')).toBe('attackers');
  });

  it('ends the match when a squad reaches the configured score', () => {
    const match = new MatchManager();
    match.start({ ...CONFIG, roundsToWin: 1 });
    advanceToLive(match);

    match.reportSquadEliminated('bravo');
    expect(match.current.phase).toBe('round-end');
    expect(match.current.matchWinner).toBe('alpha');
    match.update(MATCH_TIMING.resolutionSeconds, false);
    expect(match.current.phase).toBe('match-end');
  });
});
