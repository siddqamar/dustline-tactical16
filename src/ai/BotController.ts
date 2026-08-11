import * as THREE from 'three';
import { Navigation } from './Navigation';
import { Health } from '../combat/DamageSystem';
import type { CombatHitbox, CombatTarget, CombatSystem } from '../combat/CombatSystem';
import { WEAPON_DEFINITIONS, type WeaponShot } from '../weapons/WeaponTypes';
import type { CoverPoint } from '../world/WorldTypes';
import type { BotDifficultyProfile } from './BotDifficulty';
import type { SquadId } from '../match/MatchTypes';

export type BotState = 'patrol' | 'alert' | 'engage' | 'search' | 'dead' | 'controlled';

const BOT_WEAPON = WEAPON_DEFINITIONS.find((weapon) => weapon.id === 'rifle') ?? WEAPON_DEFINITIONS[0]!;
const GOAL_REPATH_DISTANCE = 4;

export class BotController {
  public readonly position: THREE.Vector3;
  public readonly root = new THREE.Group();
  public readonly health = new Health(100);
  public state: BotState = 'patrol';

  private readonly movement = new THREE.Vector3();
  private readonly targetPosition = new THREE.Vector3();
  private readonly aimDirection = new THREE.Vector3();
  private readonly coverTarget = new THREE.Vector3();
  private readonly lastGoal = new THREE.Vector3(Number.POSITIVE_INFINITY, 0, 0);
  private path: THREE.Vector3[] = [];
  private pathIndex = 0;
  private perceptionRemaining = 0;
  private memoryRemaining = 0;
  private focusedTargetId: string | null = null;
  private targetVisible = false;
  private coverSelected = false;
  private magazine = BOT_WEAPON.magazineSize;
  private reserve = BOT_WEAPON.reserveAmmo;
  private fireCooldown = 0;
  private burstCooldownRemaining = 0;
  private burstShotsRemaining = 0;
  private reloadRemaining = 0;
  private reactionRemaining = 0;
  private movementTime = 0;
  private bodyMesh!: THREE.Mesh;
  private headMesh!: THREE.Mesh;
  private visualBody!: THREE.Group;

  public constructor(
    public readonly id: string,
    public readonly squad: SquadId,
    private readonly navigation: Navigation,
    private readonly combat: CombatSystem,
    private readonly coverPoints: readonly CoverPoint[],
    private readonly profile: BotDifficultyProfile,
    scene: THREE.Scene,
    spawn: THREE.Vector3,
  ) {
    this.position = spawn.clone();
    this.root.name = `operative-${id}`;
    this.root.userData.isBot = true;
    this.buildVisual();
    this.syncVisual(0);
    scene.add(this.root);
  }

  public update(
    deltaSeconds: number,
    enemies: readonly CombatTarget[],
    active: boolean,
    canFire: boolean,
    tacticalGoal: THREE.Vector3,
  ): void {
    if (!active || this.state === 'dead' || this.state === 'controlled') {
      return;
    }

    this.perceptionRemaining -= deltaSeconds;
    if (this.perceptionRemaining <= 0) {
      this.perceptionRemaining = this.profile.perceptionInterval;
      this.updatePerception(enemies);
    }

    const target = this.focusedTargetId ? enemies.find((enemy) => enemy.ownerId === this.focusedTargetId && !enemy.health.isDead) : undefined;
    if (target && (this.targetVisible || this.memoryRemaining > 0)) {
      this.targetPosition.copy(target.position);
      if (this.targetVisible && this.position.distanceToSquared(target.position) <= this.profile.preferredCombatDistance * this.profile.preferredCombatDistance) {
        this.faceTarget(target.position);
      } else {
        this.moveToward(target.position, this.profile.pursuitSpeed, deltaSeconds);
      }
    } else if (this.state === 'search' && this.coverSelected) {
      this.moveToward(this.coverTarget, this.profile.patrolSpeed, deltaSeconds);
    } else {
      this.followTacticalGoal(tacticalGoal, deltaSeconds);
    }

    this.updateWeapon(deltaSeconds);
    if (target) {
      this.updateCombat(target, canFire);
    }

    this.syncVisual(deltaSeconds);
  }

  public reset(spawn: THREE.Vector3): void {
    this.position.copy(spawn);
      this.state = 'patrol';
    this.memoryRemaining = 0;
    this.focusedTargetId = null;
    this.targetVisible = false;
    this.coverSelected = false;
    this.reactionRemaining = 0;
    this.magazine = BOT_WEAPON.magazineSize;
    this.reserve = BOT_WEAPON.reserveAmmo;
    this.fireCooldown = 0;
    this.burstCooldownRemaining = 0;
    this.burstShotsRemaining = 0;
    this.reloadRemaining = 0;
    this.health.reset();
    this.path = [];
    this.pathIndex = 0;
    this.lastGoal.set(Number.POSITIVE_INFINITY, 0, 0);
    this.syncVisual(0);
  }

  public markDead(): void {
    this.state = 'dead';
    this.root.visible = false;
  }

  public withdrawForTakeover(): void {
    this.state = 'controlled';
    this.root.visible = false;
  }

  public get yaw(): number {
    return this.root.rotation.y;
  }

  public get hitboxes(): readonly CombatHitbox[] {
    return [
      { ownerId: this.id, squad: this.squad, zone: 'body', multiplier: 1, object: this.bodyMesh, health: this.health },
      { ownerId: this.id, squad: this.squad, zone: 'head', multiplier: 2.25, object: this.headMesh, health: this.health },
    ];
  }

  public get combatTarget(): CombatTarget {
    return {
      ownerId: this.id,
      squad: this.squad,
      position: this.position,
      radius: 0.48,
      zone: 'body',
      multiplier: 1,
      health: this.health,
    };
  }

  public get isAlive(): boolean {
    return this.state !== 'dead' && this.state !== 'controlled' && !this.health.isDead;
  }

  public distanceToSquared(target: THREE.Vector3): number {
    return this.position.distanceToSquared(target);
  }

  private updatePerception(enemies: readonly CombatTarget[]): void {
    const previousTarget = this.focusedTargetId;
    const visibleTargets = enemies
      .filter((enemy) => {
        const visibility = THREE.MathUtils.clamp(enemy.visibility ?? 1, 0.35, 1);
        const detectableRange = this.profile.perceptionRange * THREE.MathUtils.lerp(0.56, 1, visibility);
        return !enemy.health.isDead && this.position.distanceToSquared(enemy.position) < detectableRange * detectableRange;
      })
      .filter((enemy) => this.navigation.canSee(this.position, enemy.position))
      .sort((left, right) => this.position.distanceToSquared(left.position) - this.position.distanceToSquared(right.position));
    const visibleTarget = visibleTargets[0];
    if (visibleTarget) {
      this.focusedTargetId = visibleTarget.ownerId;
      this.targetVisible = true;
      this.state = this.reactionRemaining > 0 ? 'alert' : 'engage';
      this.memoryRemaining = this.profile.targetMemory;
      this.coverSelected = false;
      if (previousTarget !== visibleTarget.ownerId) {
        this.reactionRemaining = this.profile.reactionDelay;
      }
      return;
    }

    this.targetVisible = false;
    this.memoryRemaining = Math.max(0, this.memoryRemaining - this.profile.perceptionInterval);
    const rememberedTarget = enemies.find((enemy) => enemy.ownerId === this.focusedTargetId && !enemy.health.isDead);
    if (this.memoryRemaining > 0 && rememberedTarget) {
      this.state = 'search';
      if (!this.coverSelected) {
        this.selectCover(rememberedTarget.position);
      }
      return;
    }

    this.focusedTargetId = null;
      this.state = 'patrol';
    this.coverSelected = false;
  }

  private updateWeapon(deltaSeconds: number): void {
    this.fireCooldown = Math.max(0, this.fireCooldown - deltaSeconds);
    this.burstCooldownRemaining = Math.max(0, this.burstCooldownRemaining - deltaSeconds);
    this.reactionRemaining = Math.max(0, this.reactionRemaining - deltaSeconds);
    if (this.reloadRemaining <= 0) {
      return;
    }

    this.reloadRemaining = Math.max(0, this.reloadRemaining - deltaSeconds);
    if (this.reloadRemaining === 0) {
      const loaded = Math.min(BOT_WEAPON.magazineSize - this.magazine, this.reserve);
      this.magazine += loaded;
      this.reserve -= loaded;
    }
  }

  private updateCombat(target: CombatTarget, canFire: boolean): void {
    if (!canFire || !this.targetVisible || this.reloadRemaining > 0 || this.reactionRemaining > 0 || this.burstCooldownRemaining > 0) {
      return;
    }

    if (this.magazine <= 0) {
      if (this.reserve > 0) {
        this.reloadRemaining = BOT_WEAPON.reloadDuration;
      }
      return;
    }

    if (this.fireCooldown > 0 || this.position.distanceToSquared(target.position) > BOT_WEAPON.range * BOT_WEAPON.range) {
      return;
    }

    if (this.burstShotsRemaining === 0) {
      this.burstShotsRemaining = this.profile.burstSize;
    }

    this.aimDirection.subVectors(target.position, this.position).normalize();
    const aimError = (1 - this.profile.accuracy) * 0.065;
    this.aimDirection.x += (Math.random() - 0.5) * aimError;
    this.aimDirection.y += (Math.random() - 0.5) * aimError;
    this.aimDirection.z += (Math.random() - 0.5) * aimError;
    const shot: WeaponShot = { weapon: BOT_WEAPON, spread: 0, recoil: BOT_WEAPON.recoil };
    this.combat.fireAtTarget(this.position, this.aimDirection, shot, target, this.id, this.squad);
    this.magazine -= 1;
    this.burstShotsRemaining -= 1;
    this.fireCooldown = BOT_WEAPON.fireInterval * this.profile.fireIntervalMultiplier;
    if (this.burstShotsRemaining === 0) {
      this.burstCooldownRemaining = this.profile.burstCooldown;
    }
  }

  private followTacticalGoal(goal: THREE.Vector3, deltaSeconds: number): void {
    if (this.lastGoal.distanceToSquared(goal) > GOAL_REPATH_DISTANCE * GOAL_REPATH_DISTANCE || this.path.length === 0) {
      this.lastGoal.copy(goal);
      this.path = this.navigation.findPath(this.position, goal);
      this.path.push(goal.clone());
      this.pathIndex = 0;
    }

    const waypoint = this.path[this.pathIndex] ?? goal;
    this.moveToward(waypoint, this.profile.pursuitSpeed, deltaSeconds);
    if (this.position.distanceToSquared(waypoint) < 1.4 && this.pathIndex < this.path.length - 1) {
      this.pathIndex += 1;
    }
  }

  private selectCover(enemyPosition: THREE.Vector3): void {
    let best: CoverPoint | undefined;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const cover of this.coverPoints) {
      const distanceToBot = cover.position.distanceToSquared(this.position);
      const distanceToEnemy = cover.position.distanceToSquared(enemyPosition);
      const score = distanceToBot - distanceToEnemy * this.profile.coverBias;
      if (score < bestScore) {
        best = cover;
        bestScore = score;
      }
    }

    if (best) {
      this.coverTarget.copy(best.position);
      this.coverSelected = true;
    }
  }

  private moveToward(target: THREE.Vector3, speed: number, deltaSeconds: number): void {
    this.movement.subVectors(target, this.position);
    this.movement.y = 0;
    const distance = this.movement.length();
    if (distance <= 0.08) {
      return;
    }

    this.movement.multiplyScalar(1 / distance);
    this.position.addScaledVector(this.movement, Math.min(distance, speed * deltaSeconds));
    this.root.rotation.y = Math.atan2(this.movement.x, this.movement.z);
    this.movementTime += deltaSeconds * speed;
  }

  private faceTarget(target: THREE.Vector3): void {
    this.movement.subVectors(target, this.position);
    this.movement.y = 0;
    if (this.movement.lengthSq() > 0.001) {
      this.root.rotation.y = Math.atan2(this.movement.x, this.movement.z);
    }
  }

  private buildVisual(): void {
    const uniformColor = this.squad === 'alpha' ? 0x394843 : 0x4b4039;
    const accentColor = this.squad === 'alpha' ? 0x789c91 : 0xb77a58;
    const uniform = new THREE.MeshStandardMaterial({ color: uniformColor, roughness: 0.88, metalness: 0.04 });
    const armor = new THREE.MeshStandardMaterial({ color: 0x202827, roughness: 0.62, metalness: 0.24 });
    const accent = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.65, metalness: 0.08 });
    const skin = new THREE.MeshStandardMaterial({ color: 0x806856, roughness: 0.82, metalness: 0 });
    const weapon = new THREE.MeshStandardMaterial({ color: 0x171c1d, roughness: 0.42, metalness: 0.68 });
    this.visualBody = new THREE.Group();
    this.root.add(this.visualBody);

    this.bodyMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.72, 6, 12), uniform);
    this.bodyMesh.position.y = 1.12;
    this.addVisual(this.bodyMesh);

    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.68, 0.34), armor);
    vest.position.set(0, 1.24, -0.03);
    this.addVisual(vest);

    const chestPatch = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.025), accent);
    chestPatch.position.set(0, 1.34, -0.215);
    this.addVisual(chestPatch);

    this.headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.245, 16, 12), skin);
    this.headMesh.position.y = 1.92;
    this.addVisual(this.headMesh);

    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 9, 0, Math.PI * 2, 0, Math.PI * 0.58), armor);
    helmet.position.y = 1.99;
    this.addVisual(helmet);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.09, 0.035), accent);
    visor.position.set(0, 1.94, -0.225);
    this.addVisual(visor);

    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.55, 5, 8), uniform);
      arm.position.set(side * 0.46, 1.22, -0.12);
      arm.rotation.z = side * -0.16;
      arm.rotation.x = -0.76;
      this.addVisual(arm);

      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.62, 5, 8), uniform);
      leg.position.set(side * 0.19, 0.47, 0);
      this.addVisual(leg);

      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.42), armor);
      boot.position.set(side * 0.19, 0.12, -0.08);
      this.addVisual(boot);
    }

    const rifle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 1.05), weapon);
    rifle.position.set(0.2, 1.22, -0.52);
    rifle.rotation.set(-0.08, 0, -0.15);
    this.addVisual(rifle);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.58, 10), weapon);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0.2, 1.24, -1.28);
    this.addVisual(barrel);
  }

  private addVisual(mesh: THREE.Mesh): void {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.isBot = true;
    this.visualBody.add(mesh);
  }

  private syncVisual(deltaSeconds: number): void {
    this.root.position.set(this.position.x, 0, this.position.z);
    this.root.visible = this.state !== 'dead' && this.state !== 'controlled';
    const moving = this.movement.lengthSq() > 0.1 && deltaSeconds > 0;
    this.visualBody.position.y = moving ? Math.sin(this.movementTime * 3.2) * 0.025 : THREE.MathUtils.lerp(this.visualBody.position.y, 0, 0.2);
  }
}
