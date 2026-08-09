import * as THREE from 'three';
import { Navigation } from './Navigation';

export type BotState = 'patrol' | 'search' | 'pursue' | 'dead';

const PATROL_SPEED = 2.7;
const PURSUIT_SPEED = 3.4;
const PERCEPTION_INTERVAL = 0.18;
const TARGET_MEMORY = 3.2;

export class BotController {
  public readonly position: THREE.Vector3;
  public readonly root = new THREE.Group();
  public state: BotState = 'patrol';

  private readonly movement = new THREE.Vector3();
  private readonly target = new THREE.Vector3();
  private path: THREE.Vector3[] = [];
  private pathIndex = 0;
  private perceptionRemaining = 0;
  private memoryRemaining = 0;
  private patrolNode: THREE.Vector3;

  public constructor(
    public readonly id: string,
    private readonly navigation: Navigation,
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
      this.target.copy(this.state === 'pursue' ? playerPosition : this.patrolNode);
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

    this.syncVisual();
  }

  public reset(spawn: THREE.Vector3): void {
    this.position.copy(spawn);
    this.state = 'patrol';
    this.memoryRemaining = 0;
    this.path = [];
    this.pathIndex = 0;
    this.patrolNode = this.navigation.nearestNode(this.position).position.clone();
    this.syncVisual();
  }

  public markDead(): void {
    this.state = 'dead';
    this.root.visible = false;
  }

  private updatePerception(playerPosition: THREE.Vector3): void {
    const distance = this.position.distanceTo(playerPosition);
    const visible = distance < 82 && this.navigation.canSee(this.position, playerPosition);
    if (visible) {
      this.state = 'pursue';
      this.memoryRemaining = TARGET_MEMORY;
      this.target.copy(playerPosition);
      return;
    }

    this.memoryRemaining = Math.max(0, this.memoryRemaining - PERCEPTION_INTERVAL);
    if (this.memoryRemaining > 0) {
      this.state = 'search';
    } else {
      this.state = 'patrol';
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
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.85, 5, 10), bodyMaterial);
    body.position.y = 1.02;
    body.castShadow = true;
    body.userData.isBot = true;
    this.root.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 8), armorMaterial);
    head.position.y = 1.9;
    head.castShadow = true;
    head.userData.isBot = true;
    this.root.add(head);

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
