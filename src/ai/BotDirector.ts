import * as THREE from 'three';
import { BotController } from './BotController';
import { Navigation } from './Navigation';
import type { MapSpawn, CoverPoint } from '../world/WorldTypes';
import type { CombatSystem, CombatTarget } from '../combat/CombatSystem';
import type { Health } from '../combat/DamageSystem';
import { BOT_DIFFICULTIES, type BotDifficulty } from './BotDifficulty';
import type { SquadId, SquadRoles, TeamSize } from '../match/MatchTypes';

export interface SquadGoals {
  readonly alpha: readonly THREE.Vector3[];
  readonly bravo: readonly THREE.Vector3[];
}

export interface HumanCombatant {
  readonly id: string;
  readonly squad: SquadId;
  readonly position: THREE.Vector3;
  readonly health: Health;
  readonly damageMultiplier: number;
}

export class BotDirector {
  public readonly bots: BotController[] = [];

  private readonly spawnPositions = new Map<string, THREE.Vector3>();
  private readonly profile;

  public constructor(
    private readonly scene: THREE.Scene,
    private readonly navigation: Navigation,
    private readonly combat: CombatSystem,
    private readonly spawns: readonly MapSpawn[],
    private readonly coverPoints: readonly CoverPoint[],
    public readonly difficulty: BotDifficulty,
    public readonly teamSize: TeamSize,
  ) {
    this.profile = BOT_DIFFICULTIES[difficulty];
    for (let index = 2; index <= teamSize; index += 1) {
      this.createBot(`alpha-${index}`, 'alpha', index - 1);
    }
    for (let index = 1; index <= teamSize; index += 1) {
      this.createBot(`bravo-${index}`, 'bravo', index - 1);
    }
  }

  public update(deltaSeconds: number, human: HumanCombatant, active: boolean, goals: SquadGoals): void {
    this.bots.forEach((bot) => {
      if (bot.health.isDead && bot.state !== 'dead') {
        bot.markDead();
      }
    });

    const botTargets = this.bots.filter((bot) => bot.isAlive).map((bot) => bot.combatTarget);
    const humanTarget: CombatTarget | null = human.health.isDead ? null : {
      ownerId: human.id,
      squad: human.squad,
      position: human.position,
      radius: 0.46,
      zone: 'body',
      multiplier: human.damageMultiplier,
      health: human.health,
    };
    const targets = humanTarget ? [...botTargets, humanTarget] : botTargets;
    this.bots.forEach((bot, index) => {
      const enemies = targets.filter((target) => target.squad !== bot.squad);
      const squadGoals = goals[bot.squad];
      const goal = squadGoals[index % Math.max(1, squadGoals.length)] ?? this.navigation.nearestNode(bot.position).position;
      bot.update(deltaSeconds, enemies, active, true, goal);
    });
  }

  public reset(roles: SquadRoles): void {
    this.bots.forEach((bot) => {
      const index = Number(bot.id.split('-')[1] ?? '1') - 1;
      const spawn = this.getSpawnPosition(roles[bot.squad], index);
      this.spawnPositions.set(bot.id, spawn.clone());
      bot.reset(spawn);
    });
  }

  public markDead(id: string): void {
    this.bots.find((candidate) => candidate.id === id)?.markDead();
  }

  public takeOverNearest(squad: SquadId, position: THREE.Vector3): BotController | null {
    const candidate = this.getLivingBots(squad)
      .sort((left, right) => left.distanceToSquared(position) - right.distanceToSquared(position))[0];
    candidate?.withdrawForTakeover();
    return candidate ?? null;
  }

  public getLivingBots(squad: SquadId): BotController[] {
    return this.bots.filter((bot) => bot.squad === squad && bot.isAlive);
  }

  public getBot(id: string): BotController | undefined {
    return this.bots.find((bot) => bot.id === id && bot.isAlive);
  }

  public aliveCount(squad: SquadId, includeHuman: boolean): number {
    return this.getLivingBots(squad).length + Number(includeHuman);
  }

  public get totalAliveCount(): number {
    return this.bots.filter((bot) => bot.isAlive).length;
  }

  public dispose(): void {
    this.bots.forEach((bot) => {
      bot.hitboxes.forEach((hitbox) => this.combat.unregisterHitbox(hitbox.object));
      this.scene.remove(bot.root);
    });
    this.bots.length = 0;
    this.spawnPositions.clear();
  }

  private createBot(id: string, squad: SquadId, index: number): void {
    const spawn = this.getSpawnPosition(squad === 'alpha' ? 'attackers' : 'defenders', index);
    this.spawnPositions.set(id, spawn.clone());
    const bot = new BotController(id, squad, this.navigation, this.combat, this.coverPoints, this.profile, this.scene, spawn);
    bot.hitboxes.forEach((hitbox) => this.combat.registerHitbox(hitbox));
    this.bots.push(bot);
  }

  private getSpawnPosition(role: 'attackers' | 'defenders', index: number): THREE.Vector3 {
    const prefix = role === 'attackers' ? 'west' : 'east';
    const candidates = this.spawns.filter((spawn) => spawn.id.startsWith(prefix));
    const base = candidates[index % Math.max(1, candidates.length)]?.position.clone()
      ?? new THREE.Vector3(role === 'attackers' ? -29 : 29, 1.65, 0);
    const formationOffsets = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(role === 'attackers' ? -1.8 : 1.8, 0, -2.4),
      new THREE.Vector3(role === 'attackers' ? -1.8 : 1.8, 0, 2.4),
      new THREE.Vector3(0, 0, -4.2),
      new THREE.Vector3(0, 0, 4.2),
    ];
    return base.add(formationOffsets[index] ?? new THREE.Vector3());
  }
}
