import * as THREE from 'three';
import { BotController } from './BotController';
import { Navigation } from './Navigation';
import type { MapSpawn } from '../world/WorldTypes';

export class BotDirector {
  public readonly bots: BotController[] = [];

  private readonly spawnPositions: THREE.Vector3[] = [];

  public constructor(
    private readonly scene: THREE.Scene,
    private readonly navigation: Navigation,
    spawns: readonly MapSpawn[],
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
      this.bots.push(new BotController(`enemy-${index + 1}`, this.navigation, this.scene, this.spawnPositions[index]!));
    }
  }

  public update(deltaSeconds: number, playerPosition: THREE.Vector3, active: boolean): void {
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

  public get aliveCount(): number {
    return this.bots.filter((bot) => bot.state !== 'dead').length;
  }
}

