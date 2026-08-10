import * as THREE from 'three';
import { BotController } from './BotController';
import { Navigation } from './Navigation';
import type { MapSpawn } from '../world/WorldTypes';
import type { CoverPoint } from '../world/WorldTypes';
import type { CombatSystem } from '../combat/CombatSystem';
import type { Health } from '../combat/DamageSystem';
import { BOT_DIFFICULTIES, type BotDifficulty } from './BotDifficulty';

export class BotDirector {
  public readonly bots: BotController[] = [];

  private readonly spawnPositions: THREE.Vector3[] = [];

  public constructor(
    private readonly scene: THREE.Scene,
    private readonly navigation: Navigation,
    private readonly combat: CombatSystem,
    private readonly playerHealth: Health,
    spawns: readonly MapSpawn[],
    coverPoints: readonly CoverPoint[],
    public readonly difficulty: BotDifficulty,
  ) {
    const eastSpawns = spawns.filter((spawn) => spawn.id.startsWith('east'));
    const offsets = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-2.2, 0, -1.6),
      new THREE.Vector3(2.4, 0, 1.4),
      new THREE.Vector3(0, 0, 3.2),
    ];
    for (let index = 0; index < offsets.length; index += 1) {
      const spawn = eastSpawns[index % Math.max(1, eastSpawns.length)];
      if (!spawn) {
        continue;
      }
      this.spawnPositions.push(spawn.position.clone().add(offsets[index] ?? new THREE.Vector3()));
      const bot = new BotController(`enemy-${index + 1}`, this.navigation, this.combat, this.playerHealth, coverPoints, BOT_DIFFICULTIES[difficulty], this.scene, this.spawnPositions[index]!);
      bot.hitboxes.forEach((hitbox) => this.combat.registerHitbox(hitbox));
      this.bots.push(bot);
    }
  }

  public update(deltaSeconds: number, playerPosition: THREE.Vector3, active: boolean): void {
    this.bots.forEach((bot) => {
      if (bot.health.isDead && bot.state !== 'dead') {
        bot.markDead();
      }
    });
    const attackers = new Set(
      this.bots
        .filter((bot) => bot.canEngage)
        .sort((left, right) => left.position.distanceToSquared(playerPosition) - right.position.distanceToSquared(playerPosition))
        .slice(0, BOT_DIFFICULTIES[this.difficulty].maxConcurrentAttackers),
    );
    this.bots.forEach((bot) => bot.update(deltaSeconds, playerPosition, active, attackers.has(bot)));
  }

  public reset(): void {
    this.bots.forEach((bot, index) => {
      const spawn = this.spawnPositions[index];
      if (spawn) {
        bot.reset(spawn);
      }
    });
  }

  public markDead(id: string): void {
    const bot = this.bots.find((candidate) => candidate.id === id);
    bot?.markDead();
  }

  public get aliveCount(): number {
    return this.bots.filter((bot) => bot.state !== 'dead').length;
  }
}
