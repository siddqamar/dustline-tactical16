import * as THREE from 'three';
import { Navigation } from './Navigation';
import { Health } from '../combat/DamageSystem';
import type { CombatHitbox, CombatTarget, CombatSystem } from '../combat/CombatSystem';
import { WEAPON_DEFINITIONS, type WeaponShot } from '../weapons/WeaponTypes';
import type { CoverPoint } from '../world/WorldTypes';

export type BotState = 'patrol' | 'search' | 'pursue' | 'dead';

const PATROL_SPEED = 2.7;
const PURSUIT_SPEED = 3.4;
const PERCEPTION_INTERVAL = 0.18;
const TARGET_MEMORY = 3.2;
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
  private bodyMesh!: THREE.Mesh;
  private headMesh!: THREE.Mesh;

  public constructor(
    public readonly id: string,
    private readonly navigation: Navigation,
    private readonly combat: CombatSystem,
    private readonly playerHealth: Health,
    private readonly coverPoints: readonly CoverPoint[],
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
      this.perceptionRemaining = PERCEPTION_INTERVAL;
      this.updatePerception(playerPosition);
    }

    if (this.state === 'pursue' || this.state === 'search') {
      this.target.copy(this.state === 'pursue' ? playerPosition : this.coverSelected ? this.coverTarget : this.patrolNode);
      this.moveToward(this.target, this.state === 'pursue' ? PURSUIT_SPEED : PATROL_SPEED, deltaSeconds);
    } else {
      this.moveToward(this.patrolNode, PATROL_SPEED, deltaSeconds);
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
    const visible = distance < 82 && this.navigation.canSee(this.position, playerPosition);
    this.playerVisible = visible;
    if (visible) {
      this.state = 'pursue';
      this.memoryRemaining = TARGET_MEMORY;
      this.target.copy(playerPosition);
      this.coverSelected = false;
      return;
    }

    this.memoryRemaining = Math.max(0, this.memoryRemaining - PERCEPTION_INTERVAL);
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
    if (this.state !== 'pursue' || !this.playerVisible || this.reloadRemaining > 0) {
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
    const aimError = 0.018;
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
    this.fireCooldown = BOT_WEAPON.fireInterval * 1.65;
  }

  private selectCover(playerPosition: THREE.Vector3): void {
    let best: CoverPoint | undefined;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const cover of this.coverPoints) {
      const distanceToBot = cover.position.distanceToSquared(this.position);
      const distanceToPlayer = cover.position.distanceToSquared(playerPosition);
      const score = distanceToBot - distanceToPlayer * 0.18;
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
