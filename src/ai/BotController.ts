import * as THREE from 'three';
import { Navigation } from './Navigation';
import { Health } from '../combat/DamageSystem';
import type { CombatHitbox, CombatTarget, CombatSystem } from '../combat/CombatSystem';
import { WEAPON_DEFINITIONS, type WeaponShot } from '../weapons/WeaponTypes';
import type { CoverPoint } from '../world/WorldTypes';
import type { BotDifficultyProfile } from './BotDifficulty';

export type BotState = 'patrol' | 'search' | 'pursue' | 'dead';

const BOT_WEAPON = WEAPON_DEFINITIONS[2]!;

export class BotController {
  public readonly position: THREE.Vector3;
  public readonly root = new THREE.Group();
  public readonly health = new Health(100);
  public state: BotState = 'patrol';

  private readonly movement = new THREE.Vector3();
  private readonly target = new THREE.Vector3();
  private readonly aimDirection = new THREE.Vector3();
  private readonly coverTarget = new THREE.Vector3();
  private path: THREE.Vector3[] = [];
  private pathIndex = 0;
  private perceptionRemaining = 0;
  private memoryRemaining = 0;
  private patrolNode: THREE.Vector3;
  private playerVisible = false;
  private coverSelected = false;
  private magazine = BOT_WEAPON.magazineSize;
  private reserve = BOT_WEAPON.reserveAmmo;
  private fireCooldown = 0;
  private reloadRemaining = 0;
  private reactionRemaining = 0;
  private bodyMesh!: THREE.Mesh;
  private headMesh!: THREE.Mesh;

  public constructor(
    public readonly id: string,
    private readonly navigation: Navigation,
    private readonly combat: CombatSystem,
    private readonly playerHealth: Health,
    private readonly coverPoints: readonly CoverPoint[],
    private readonly profile: BotDifficultyProfile,
    scene: THREE.Scene,
    spawn: THREE.Vector3,
  ) {
    this.position = spawn.clone();
    this.patrolNode = this.navigation.nearestNode(this.position).position.clone();
    this.root.name = `bot-${id}`;
    this.root.userData.isBot = true;
    this.buildVisual();
    this.syncVisual();
    scene.add(this.root);
  }

  public update(deltaSeconds: number, playerPosition: THREE.Vector3, active: boolean): void {
    if (!active || this.state === 'dead') {
      return;
    }

    this.perceptionRemaining -= deltaSeconds;
    if (this.perceptionRemaining <= 0) {
      this.perceptionRemaining = this.profile.perceptionInterval;
      this.updatePerception(playerPosition);
    }

    if (this.state === 'pursue' || this.state === 'search') {
      this.target.copy(this.state === 'pursue' ? playerPosition : this.coverSelected ? this.coverTarget : this.patrolNode);
      if (this.state === 'pursue' && this.position.distanceToSquared(playerPosition) <= this.profile.preferredCombatDistance * this.profile.preferredCombatDistance) {
        this.faceTarget(playerPosition);
      } else {
        this.moveToward(this.target, this.state === 'pursue' ? this.profile.pursuitSpeed : this.profile.patrolSpeed, deltaSeconds);
      }
    } else {
      this.moveToward(this.patrolNode, this.profile.patrolSpeed, deltaSeconds);
    }

    if (this.position.distanceToSquared(this.patrolNode) < 2.6 && this.state === 'patrol') {
      const next = this.navigation.findPath(this.position, this.pickPatrolTarget());
      this.path = next;
      this.pathIndex = 0;
      this.patrolNode = this.path[0] ?? this.patrolNode;
    }

    this.updateWeapon(deltaSeconds);
    this.updateCombat(playerPosition);

    this.syncVisual();
  }

  public reset(spawn: THREE.Vector3): void {
    this.position.copy(spawn);
    this.state = 'patrol';
    this.memoryRemaining = 0;
    this.playerVisible = false;
    this.coverSelected = false;
    this.reactionRemaining = 0;
    this.magazine = BOT_WEAPON.magazineSize;
    this.reserve = BOT_WEAPON.reserveAmmo;
    this.fireCooldown = 0;
    this.reloadRemaining = 0;
    this.health.reset();
    this.path = [];
    this.pathIndex = 0;
    this.patrolNode = this.navigation.nearestNode(this.position).position.clone();
    this.syncVisual();
  }

  public markDead(): void {
    this.state = 'dead';
    this.root.visible = false;
  }

  public get hitboxes(): readonly CombatHitbox[] {
    return [
      { ownerId: this.id, zone: 'body', multiplier: 1, object: this.bodyMesh, health: this.health },
      { ownerId: this.id, zone: 'head', multiplier: 2.25, object: this.headMesh, health: this.health },
    ];
  }

  private updatePerception(playerPosition: THREE.Vector3): void {
    const distance = this.position.distanceTo(playerPosition);
    const wasVisible = this.playerVisible;
    const visible = distance < this.profile.perceptionRange && this.navigation.canSee(this.position, playerPosition);
    this.playerVisible = visible;
    if (visible) {
      this.state = 'pursue';
      this.memoryRemaining = this.profile.targetMemory;
      if (!wasVisible) {
        this.reactionRemaining = this.profile.reactionDelay;
      }
      this.target.copy(playerPosition);
      this.coverSelected = false;
      return;
    }

    this.memoryRemaining = Math.max(0, this.memoryRemaining - this.profile.perceptionInterval);
    if (this.memoryRemaining > 0) {
      this.state = 'search';
      if (!this.coverSelected) {
        this.selectCover(playerPosition);
      }
    } else {
      this.state = 'patrol';
      this.coverSelected = false;
    }
  }

  private updateWeapon(deltaSeconds: number): void {
    this.fireCooldown = Math.max(0, this.fireCooldown - deltaSeconds);
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

  private updateCombat(playerPosition: THREE.Vector3): void {
    if (this.state !== 'pursue' || !this.playerVisible || this.reloadRemaining > 0 || this.reactionRemaining > 0) {
      return;
    }

    if (this.magazine <= 0) {
      if (this.reserve > 0) {
        this.reloadRemaining = BOT_WEAPON.reloadDuration;
      }
      return;
    }

    if (this.fireCooldown > 0 || this.position.distanceToSquared(playerPosition) > BOT_WEAPON.range * BOT_WEAPON.range) {
      return;
    }

    this.aimDirection.subVectors(playerPosition, this.position).normalize();
    const aimError = (1 - this.profile.accuracy) * 0.065;
    this.aimDirection.x += (Math.random() - 0.5) * aimError;
    this.aimDirection.y += (Math.random() - 0.5) * aimError;
    this.aimDirection.z += (Math.random() - 0.5) * aimError;
    const shot: WeaponShot = { weapon: BOT_WEAPON, spread: 0, recoil: BOT_WEAPON.recoil };
    const target: CombatTarget = {
      ownerId: 'player',
      position: playerPosition,
      radius: 0.46,
      zone: 'body',
      multiplier: 1,
      health: this.playerHealth,
    };
    this.combat.fireAtTarget(this.position, this.aimDirection, shot, target, this.id);
    this.magazine -= 1;
    this.fireCooldown = BOT_WEAPON.fireInterval * this.profile.fireIntervalMultiplier;
  }

  private selectCover(playerPosition: THREE.Vector3): void {
    let best: CoverPoint | undefined;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const cover of this.coverPoints) {
      const distanceToBot = cover.position.distanceToSquared(this.position);
      const distanceToPlayer = cover.position.distanceToSquared(playerPosition);
      const score = distanceToBot - distanceToPlayer * this.profile.coverBias;
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
      if (this.state === 'patrol' && this.pathIndex < this.path.length - 1) {
        this.pathIndex += 1;
        this.patrolNode = this.path[this.pathIndex] ?? this.patrolNode;
      }
      return;
    }

    this.movement.multiplyScalar(1 / distance);
    const movementAmount = Math.min(distance, speed * deltaSeconds);
    this.position.addScaledVector(this.movement, movementAmount);
    this.root.rotation.y = Math.atan2(this.movement.x, this.movement.z);
  }

  private faceTarget(target: THREE.Vector3): void {
    this.movement.subVectors(target, this.position);
    this.movement.y = 0;
    if (this.movement.lengthSq() > 0.001) {
      this.root.rotation.y = Math.atan2(this.movement.x, this.movement.z);
    }
  }

  private pickPatrolTarget(): THREE.Vector3 {
    const current = this.navigation.nearestNode(this.position);
    const next = current.links[Math.floor(Math.random() * current.links.length)];
    return next ? this.navigation.getNode(next)?.position ?? this.patrolNode : this.patrolNode;
  }

  private buildVisual(): void {
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x343f3c, roughness: 0.84, metalness: 0.12 });
    const armorMaterial = new THREE.MeshStandardMaterial({ color: 0x596052, roughness: 0.68, metalness: 0.22 });
    this.bodyMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.85, 5, 10), bodyMaterial);
    this.bodyMesh.position.y = 1.02;
    this.bodyMesh.castShadow = true;
    this.bodyMesh.userData.isBot = true;
    this.root.add(this.bodyMesh);

    this.headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 8), armorMaterial);
    this.headMesh.position.y = 1.9;
    this.headMesh.castShadow = true;
    this.headMesh.userData.isBot = true;
    this.root.add(this.headMesh);

    const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 0.3), armorMaterial);
    shoulder.position.set(0, 1.35, -0.08);
    shoulder.castShadow = true;
    shoulder.userData.isBot = true;
    this.root.add(shoulder);
  }

  private syncVisual(): void {
    this.root.position.set(this.position.x, 0, this.position.z);
    this.root.visible = this.state !== 'dead';
  }
}
