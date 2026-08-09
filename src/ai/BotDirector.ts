import * as THREE from 'three';
import { BotController } from './BotController';
import { Navigation } from './Navigation';
import type { MapSpawn } from '../world/WorldTypes';
import type { CoverPoint } from '../world/WorldTypes';
import type { CombatSystem } from '../combat/CombatSystem';
import type { Health } from '../combat/DamageSystem';

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
      const bot = new BotController(`enemy-${index + 1}`, this.navigation, this.combat, this.playerHealth, coverPoints, this.scene, this.spawnPositions[index]!);
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
    this.bots.forEach((bot) => bot.update(deltaSeconds, playerPosition, active));
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
