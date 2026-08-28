import * as THREE from 'three';
import relayGuardUrl from '../assets/relay-guard-field.webp';
import sableCommandoUrl from '../assets/sable-commando-field.webp';
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
const BOT_TEXTURES = new Map<SquadId, THREE.Texture>();

function getBotTexture(squad: SquadId): THREE.Texture {
  const cached = BOT_TEXTURES.get(squad);
  if (cached) {
    return cached;
  }

  const path = squad === 'alpha' ? sableCommandoUrl : relayGuardUrl;
  const texture = new THREE.TextureLoader().load(path);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  BOT_TEXTURES.set(squad, texture);
  return texture;
}

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
  private characterSprite!: THREE.Sprite;
  private muzzleFlash!: THREE.PointLight;
  private muzzleFlashRemaining = 0;

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
    this.muzzleFlashRemaining = 0;
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
    this.muzzleFlashRemaining = Math.max(0, this.muzzleFlashRemaining - deltaSeconds);
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
    this.muzzleFlashRemaining = 0.065;
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
    this.visualBody = new THREE.Group();
    this.root.add(this.visualBody);

    const hitboxMaterial = new THREE.MeshBasicMaterial({
      colorWrite: false,
      depthWrite: false,
      opacity: 0,
      transparent: true,
    });
    this.bodyMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.78, 6, 12), hitboxMaterial);
    this.bodyMesh.position.y = 1.12;
    this.bodyMesh.userData.isBot = true;
    this.visualBody.add(this.bodyMesh);

    this.headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.25, 14, 10), hitboxMaterial);
    this.headMesh.position.y = 1.92;
    this.headMesh.userData.isBot = true;
    this.visualBody.add(this.headMesh);

    const spriteMaterial = new THREE.SpriteMaterial({
      alphaTest: 0.16,
      depthTest: true,
      depthWrite: true,
      map: getBotTexture(this.squad),
      toneMapped: false,
      transparent: true,
    });
    this.characterSprite = new THREE.Sprite(spriteMaterial);
    this.characterSprite.center.set(0.5, 0);
    this.characterSprite.position.y = 0.02;
    this.characterSprite.scale.set(1.43, 2.15, 1);
    this.characterSprite.userData.isBot = true;
    this.characterSprite.raycast = () => {};
    this.visualBody.add(this.characterSprite);

    const groundShadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.48, 18),
      new THREE.MeshBasicMaterial({ color: 0x080706, depthWrite: false, opacity: 0.28, transparent: true }),
    );
    groundShadow.rotation.x = -Math.PI / 2;
    groundShadow.position.y = 0.012;
    groundShadow.raycast = () => {};
    this.root.add(groundShadow);

    this.muzzleFlash = new THREE.PointLight(0xffb45f, 0, 4.5, 2);
    this.muzzleFlash.position.set(0.28, 1.28, -0.55);
    this.root.add(this.muzzleFlash);
  }

  private syncVisual(deltaSeconds: number): void {
    this.root.position.set(this.position.x, 0, this.position.z);
    this.root.visible = this.state !== 'dead' && this.state !== 'controlled';
    const moving = this.movement.lengthSq() > 0.1 && deltaSeconds > 0;
    this.visualBody.position.y = moving ? Math.abs(Math.sin(this.movementTime * 3.5)) * 0.045 : THREE.MathUtils.lerp(this.visualBody.position.y, 0, 0.2);
    (this.characterSprite.material as THREE.SpriteMaterial).rotation = moving ? Math.sin(this.movementTime * 2.2) * 0.012 : 0;
    this.muzzleFlash.intensity = this.muzzleFlashRemaining > 0 ? 5.5 : 0;
  }
}
