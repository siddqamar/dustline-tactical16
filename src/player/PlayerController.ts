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
const TOUCH_LOOK_SENSITIVITY = 0.0042;

export class PlayerController {
  public readonly position = new THREE.Vector3();

  private readonly input = new Set<string>();
  private readonly velocity = new THREE.Vector3();
  private readonly desiredVelocity = new THREE.Vector3();
  private readonly moveDirection = new THREE.Vector3();
  private readonly upAxis = new THREE.Vector3(0, 1, 0);
  private yaw = 0;
  private pitch = 0;
  private aiming = false;
  private touchMoveX = 0;
  private touchMoveY = 0;
  private touchInteracting = false;
  private touchMode = false;
  private enabled = true;
  private readonly spawnPosition = new THREE.Vector3();
  private spawnYaw: number;

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
    this.touchMode = window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window;

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    this.canvas.addEventListener('click', this.handleCanvasClick);
  }

  public get isPointerLocked(): boolean {
    return this.touchMode || document.pointerLockElement === this.canvas;
  }

  public get isMoving(): boolean {
    return this.velocity.lengthSq() > 0.2;
  }

  public get isInteracting(): boolean {
    return this.input.has('KeyE') || this.touchInteracting;
  }

  public get isAiming(): boolean {
    return this.aiming;
  }

  public setAiming(aiming: boolean): void {
    this.aiming = aiming;
  }

  public setTouchMode(enabled: boolean): void {
    this.touchMode = enabled;
  }

  public setTouchMove(x: number, y: number): void {
    this.touchMoveX = Math.max(-1, Math.min(1, x));
    this.touchMoveY = Math.max(-1, Math.min(1, y));
  }

  public setTouchInteracting(active: boolean): void {
    this.touchInteracting = active;
  }

  public applyTouchLook(deltaX: number, deltaY: number): void {
    this.applyLookDelta(deltaX, deltaY, TOUCH_LOOK_SENSITIVITY);
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.velocity.set(0, 0, 0);
      this.aiming = false;
      this.touchMoveX = 0;
      this.touchMoveY = 0;
      this.touchInteracting = false;
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
    this.aiming = false;
    this.touchMoveX = 0;
    this.touchMoveY = 0;
    this.touchInteracting = false;
    this.camera.position.copy(this.position);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  public deploy(spawn: MapSpawn): void {
    this.spawnPosition.copy(spawn.position);
    this.spawnYaw = spawn.yaw;
    this.reset();
  }

  public takeControl(position: THREE.Vector3, yaw: number): void {
    this.input.clear();
    this.velocity.set(0, 0, 0);
    this.desiredVelocity.set(0, 0, 0);
    this.position.copy(position);
    this.yaw = yaw;
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
    const forward = Number(this.input.has('KeyW')) - Number(this.input.has('KeyS')) + this.touchMoveY;
    const strafe = Number(this.input.has('KeyD')) - Number(this.input.has('KeyA')) + this.touchMoveX;
    this.moveDirection.set(strafe, 0, -forward);

    if (this.moveDirection.lengthSq() > 1) {
      this.moveDirection.normalize();
    }

    const sprinting = this.input.has('ShiftLeft') || this.input.has('ShiftRight');
    const speed = this.aiming ? WALK_SPEED * 0.68 : sprinting ? SPRINT_SPEED : WALK_SPEED;
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
    if (!this.enabled) {
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

    this.applyLookDelta(event.movementX, event.movementY, MOUSE_SENSITIVITY);
  };

  private applyLookDelta(deltaX: number, deltaY: number, sensitivity: number): void {
    this.yaw -= deltaX * sensitivity;
    this.pitch -= deltaY * sensitivity;
    this.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch));
  }

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
