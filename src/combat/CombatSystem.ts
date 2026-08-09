import * as THREE from 'three';
import type { WeaponShot } from '../weapons/WeaponTypes';
import { Health, type DamageResult, type HitZone } from './DamageSystem';

const MAX_IMPACT_EFFECTS = 32;
const IMPACT_LIFETIME = 0.18;

export interface CombatHitbox {
  readonly ownerId: string;
  readonly zone: HitZone;
  readonly multiplier: number;
  readonly object: THREE.Object3D;
  readonly health: Health;
}

export interface ShotResult {
  readonly hit: boolean;
  readonly point: THREE.Vector3;
  readonly damage: DamageResult | null;
  readonly ownerId: string | null;
}

export type CombatEvent =
  | { readonly type: 'shot'; readonly shot: WeaponShot; readonly result: ShotResult }
  | { readonly type: 'hit'; readonly shot: WeaponShot; readonly result: ShotResult };

export type CombatEventListener = (event: CombatEvent) => void;

interface ImpactEffect {
  readonly mesh: THREE.Mesh;
  lifetime: number;
}

export class CombatSystem {
  private readonly raycaster = new THREE.Raycaster();
  private readonly impactDirection = new THREE.Vector3();
  private readonly impactEffects: ImpactEffect[] = [];
  private readonly registeredHitboxes = new Map<THREE.Object3D, CombatHitbox>();
  private readonly listeners = new Set<CombatEventListener>();
  private impactCursor = 0;

  public constructor(
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.PerspectiveCamera,
  ) {
    const impactGeometry = new THREE.SphereGeometry(0.055, 8, 6);
    const impactMaterial = new THREE.MeshBasicMaterial({ color: 0xe4d2a2 });
    for (let index = 0; index < MAX_IMPACT_EFFECTS; index += 1) {
      const mesh = new THREE.Mesh(impactGeometry, impactMaterial);
      mesh.visible = false;
      mesh.userData.isImpactEffect = true;
      this.scene.add(mesh);
      this.impactEffects.push({ mesh, lifetime: 0 });
    }
  }

  public registerHitbox(hitbox: CombatHitbox): void {
    hitbox.object.userData.combatHitbox = hitbox;
    this.registeredHitboxes.set(hitbox.object, hitbox);
  }

  public unregisterHitbox(object: THREE.Object3D): void {
    delete object.userData.combatHitbox;
    this.registeredHitboxes.delete(object);
  }

  public subscribe(listener: CombatEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public fire(shot: WeaponShot): ShotResult {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    this.raycaster.far = shot.weapon.range;
    const intersections = this.raycaster.intersectObject(this.scene, true);
    const intersection = intersections.find((candidate) => !candidate.object.userData.isImpactEffect);
    if (!intersection) {
      const point = this.camera.getWorldDirection(this.impactDirection).multiplyScalar(shot.weapon.range).add(this.camera.position);
      const result = { hit: false, point: point.clone(), damage: null, ownerId: null };
      this.emit({ type: 'shot', shot, result });
      return result;
    }

    const point = intersection.point.clone();
    const hitbox = this.findHitbox(intersection.object);
    if (!hitbox) {
      this.spawnImpact(point);
      const result = { hit: true, point, damage: null, ownerId: null };
      this.emit({ type: 'shot', shot, result });
      return result;
    }

    const damage = hitbox.health.applyDamage(shot.weapon.damage, hitbox.zone, hitbox.multiplier);
    this.spawnImpact(point);
    const result = { hit: true, point, damage, ownerId: hitbox.ownerId };
    this.emit({ type: 'shot', shot, result });
    this.emit({ type: 'hit', shot, result });
    return result;
  }

  public update(deltaSeconds: number): void {
    for (const effect of this.impactEffects) {
      if (effect.lifetime <= 0) {
        continue;
      }

      effect.lifetime -= deltaSeconds;
      effect.mesh.visible = effect.lifetime > 0;
      effect.mesh.scale.setScalar(Math.max(0.25, effect.lifetime / IMPACT_LIFETIME));
    }
  }

  private findHitbox(object: THREE.Object3D): CombatHitbox | null {
    let current: THREE.Object3D | null = object;
    while (current) {
      const hitbox = this.registeredHitboxes.get(current);
      if (hitbox) {
        return hitbox;
      }
      current = current.parent;
    }
    return null;
  }

  private spawnImpact(point: THREE.Vector3): void {
    const effect = this.impactEffects[this.impactCursor];
    if (!effect) {
      return;
    }

    this.impactCursor = (this.impactCursor + 1) % this.impactEffects.length;
    effect.mesh.position.copy(point);
    effect.mesh.scale.setScalar(1);
    effect.mesh.visible = true;
    effect.lifetime = IMPACT_LIFETIME;
  }

  private emit(event: CombatEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }
}
