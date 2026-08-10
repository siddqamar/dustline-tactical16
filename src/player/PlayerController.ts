import * as THREE from 'three';
import type { BoxCollider, MapSpawn } from '../world/WorldTypes';

const EYE_HEIGHT = 1.65;
const PLAYER_RADIUS = 0.34;
const MAX_PITCH = Math.PI * 0.49;
const WALK_SPEED = 5.8;
const SPRINT_SPEED = 8.2;
const MOUSE_SENSITIVITY = 0.0019;
const ACCELERATION = 20;
const STEP_CLEARANCE = 0.32;

export class PlayerController {
  public readonly position = new THREE.Vector3();

  private readonly input = new Set<string>();
  private readonly velocity = new THREE.Vector3();
  private readonly desiredVelocity = new THREE.Vector3();
  private readonly moveDirection = new THREE.Vector3();
  private readonly upAxis = new THREE.Vector3(0, 1, 0);
  private yaw = 0;
  private pitch = 0;
  private enabled = true;
  private readonly spawnPosition = new THREE.Vector3();
  private readonly spawnYaw: number;

  public constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly canvas: HTMLCanvasElement,
    private readonly colliders: readonly BoxCollider[],
    spawn: MapSpawn,
  ) {
    this.spawnPosition.copy(spawn.position);
    this.spawnYaw = spawn.yaw;
    this.position.copy(spawn.position);
    this.yaw = spawn.yaw;
    this.camera.rotation.order = 'YXZ';
    this.camera.position.copy(this.position);
    this.camera.rotation.set(this.pitch, this.yaw, 0);

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    this.canvas.addEventListener('click', this.handleCanvasClick);
  }

  public get isPointerLocked(): boolean {
    return document.pointerLockElement === this.canvas;
  }

  public get isMoving(): boolean {
    return this.velocity.lengthSq() > 0.2;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.velocity.set(0, 0, 0);
      this.input.clear();
    }
  }

  public reset(): void {
    this.input.clear();
    this.velocity.set(0, 0, 0);
    this.desiredVelocity.set(0, 0, 0);
    this.position.copy(this.spawnPosition);
    this.yaw = this.spawnYaw;
    this.pitch = 0;
    this.camera.position.copy(this.position);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  public update(deltaSeconds: number): void {
    if (!this.enabled) {
      return;
    }

    this.readMovementIntent();
    const blend = 1 - Math.exp(-ACCELERATION * deltaSeconds);
    this.velocity.lerp(this.desiredVelocity, blend);

    const nextX = this.position.x + this.velocity.x * deltaSeconds;
    if (!this.collidesAt(nextX, this.position.z)) {
      this.position.x = nextX;
    } else {
      this.velocity.x = 0;
    }

    const nextZ = this.position.z + this.velocity.z * deltaSeconds;
    if (!this.collidesAt(this.position.x, nextZ)) {
      this.position.z = nextZ;
    } else {
      this.velocity.z = 0;
    }

    this.camera.position.copy(this.position);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  private readMovementIntent(): void {
    const forward = Number(this.input.has('KeyW')) - Number(this.input.has('KeyS'));
    const strafe = Number(this.input.has('KeyD')) - Number(this.input.has('KeyA'));
    this.moveDirection.set(strafe, 0, -forward);

    if (this.moveDirection.lengthSq() > 1) {
      this.moveDirection.normalize();
    }

    const speed = this.input.has('ShiftLeft') || this.input.has('ShiftRight') ? SPRINT_SPEED : WALK_SPEED;
    this.desiredVelocity.set(this.moveDirection.x * speed, 0, this.moveDirection.z * speed);
    this.desiredVelocity.applyAxisAngle(this.upAxis, this.yaw);
  }

  private collidesAt(x: number, z: number): boolean {
    const bodyBottom = this.position.y - EYE_HEIGHT;
    const bodyTop = this.position.y + 0.12;

    for (const collider of this.colliders) {
      if (collider.maxY <= bodyBottom + STEP_CLEARANCE || collider.minY >= bodyTop) {
        continue;
      }

      const nearestX = Math.max(collider.minX, Math.min(x, collider.maxX));
      const nearestZ = Math.max(collider.minZ, Math.min(z, collider.maxZ));
      const distanceX = x - nearestX;
      const distanceZ = z - nearestZ;
      if (distanceX * distanceX + distanceZ * distanceZ < PLAYER_RADIUS * PLAYER_RADIUS) {
        return true;
      }
    }

    return false;
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.enabled || !this.isPointerLocked) {
      return;
    }

    this.input.add(event.code);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.input.delete(event.code);
  };

  private readonly handleMouseMove = (event: MouseEvent): void => {
    if (!this.enabled || !this.isPointerLocked) {
      return;
    }

    this.yaw -= event.movementX * MOUSE_SENSITIVITY;
    this.pitch -= event.movementY * MOUSE_SENSITIVITY;
    this.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch));
  };

  private readonly handlePointerLockChange = (): void => {
    if (!this.isPointerLocked) {
      this.input.clear();
    }
  };

  private readonly handleCanvasClick = (): void => {
    if (this.isPointerLocked) {
      return;
    }

    void this.canvas.requestPointerLock();
  };
}
