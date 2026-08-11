import * as THREE from 'three';
import { WEAPON_DEFINITIONS, type WeaponAmmo, type WeaponDefinition, type WeaponShot } from './WeaponTypes';

const VIEWMODEL_SCALE = 0.62;

export class WeaponManager {
  private readonly ammo = new Map<string, WeaponAmmo>();
  private readonly availableWeaponIds = new Set<string>(['sidearm', 'rifle', 'knife']);
  private readonly viewModelRoot = new THREE.Group();
  private readonly viewModels = new Map<string, THREE.Group>();
  private readonly muzzleFlash = new THREE.PointLight(0xffd3a0, 0, 3.5, 2);
  private readonly muzzleFlashMesh: THREE.Mesh;
  private activeIndex = 0;
  private reloadRemaining = 0;
  private fireCooldown = 0;
  private muzzleFlashRemaining = 0;
  private recoilKick = 0;
  private viewModelTime = 0;

  public constructor(private readonly camera: THREE.PerspectiveCamera) {
    this.viewModelRoot.name = 'first-person-weapon';
    this.camera.add(this.viewModelRoot);
    this.muzzleFlash.position.set(0, 0, -0.9);
    this.viewModelRoot.add(this.muzzleFlash);
    this.muzzleFlashMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.11, 0.42, 8),
      new THREE.MeshBasicMaterial({ color: 0xffd08a, transparent: true, opacity: 0.82, depthWrite: false }),
    );
    this.muzzleFlashMesh.position.set(0, 0, -1.36);
    this.muzzleFlashMesh.rotation.x = -Math.PI / 2;
    this.muzzleFlashMesh.visible = false;
    this.viewModelRoot.add(this.muzzleFlashMesh);

    for (const definition of WEAPON_DEFINITIONS) {
      this.ammo.set(definition.id, {
        magazine: definition.magazineSize,
        reserve: definition.reserveAmmo,
      });
      this.viewModels.set(definition.id, this.createViewModel(definition));
    }

    this.showActiveViewModel();
    window.addEventListener('keydown', this.handleKeyDown);
  }

  public get activeWeapon(): WeaponDefinition {
    return WEAPON_DEFINITIONS[this.activeIndex] ?? WEAPON_DEFINITIONS[0]!;
  }

  public get activeAmmo(): WeaponAmmo {
    const current = this.ammo.get(this.activeWeapon.id);
    if (!current) {
      throw new Error(`Missing ammo state for ${this.activeWeapon.id}.`);
    }
    return current;
  }

  public get isReloading(): boolean {
    return this.reloadRemaining > 0;
  }

  public update(deltaSeconds: number, aiming = false, moving = false): void {
    this.viewModelTime += deltaSeconds * (moving ? 8.5 : 2);
    this.fireCooldown = Math.max(0, this.fireCooldown - deltaSeconds);
    this.muzzleFlashRemaining = Math.max(0, this.muzzleFlashRemaining - deltaSeconds);
    this.muzzleFlash.intensity = this.muzzleFlashRemaining > 0 && this.activeWeapon.category !== 'knife' ? 5 : 0;
    this.muzzleFlashMesh.visible = this.muzzleFlashRemaining > 0 && this.activeWeapon.category !== 'knife';
    this.muzzleFlashMesh.scale.setScalar(0.7 + this.muzzleFlashRemaining * 8);
    this.recoilKick = Math.max(0, this.recoilKick - deltaSeconds * 2.8);
    const bobStrength = moving && !aiming ? 1 : 0.18;
    const bob = Math.sin(this.viewModelTime) * 0.012 * bobStrength;
    const targetX = aiming ? 0.08 : 0.34;
    const targetY = (aiming ? -0.22 : -0.31) + bob;
    const targetZ = (aiming ? -0.91 : -0.78) + Math.cos(this.viewModelTime * 0.5) * 0.008 * bobStrength;
    const blend = 1 - Math.exp(-12 * deltaSeconds);
    this.viewModelRoot.position.x = THREE.MathUtils.lerp(this.viewModelRoot.position.x, targetX, blend);
    this.viewModelRoot.position.y = THREE.MathUtils.lerp(this.viewModelRoot.position.y, targetY, blend);
    this.viewModelRoot.position.z = THREE.MathUtils.lerp(this.viewModelRoot.position.z, targetZ + this.recoilKick * 0.16, blend);
    this.viewModelRoot.rotation.x = THREE.MathUtils.lerp(this.viewModelRoot.rotation.x, (aiming ? 0 : -0.05) + this.recoilKick * 0.22, blend);
    this.viewModelRoot.rotation.z = THREE.MathUtils.lerp(this.viewModelRoot.rotation.z, Math.sin(this.viewModelTime * 0.5) * 0.006 * bobStrength, blend);
    if (this.reloadRemaining <= 0) {
      return;
    }

    this.reloadRemaining = Math.max(0, this.reloadRemaining - deltaSeconds);
    if (this.reloadRemaining === 0) {
      this.finishReload();
    }
  }

  public reset(weaponIds: readonly string[] = ['sidearm', 'rifle', 'knife']): void {
    this.availableWeaponIds.clear();
    this.availableWeaponIds.add('sidearm');
    weaponIds.forEach((id) => {
      if (WEAPON_DEFINITIONS.some((definition) => definition.id === id)) {
        this.availableWeaponIds.add(id);
      }
    });
    this.activeIndex = 0;
    this.reloadRemaining = 0;
    this.fireCooldown = 0;
    this.muzzleFlashRemaining = 0;
    this.muzzleFlash.intensity = 0;
    this.muzzleFlashMesh.visible = false;
    this.recoilKick = 0;
    this.viewModelTime = 0;
    this.viewModelRoot.position.set(0.34, -0.31, -0.78);
    this.viewModelRoot.rotation.set(0, 0, 0);
    for (const definition of WEAPON_DEFINITIONS) {
      this.ammo.set(definition.id, {
        magazine: definition.magazineSize,
        reserve: definition.reserveAmmo,
      });
    }
    this.showActiveViewModel();
  }

  public switchTo(index: number): boolean {
    const definition = WEAPON_DEFINITIONS[index];
    if (!definition || !this.availableWeaponIds.has(definition.id) || index === this.activeIndex || this.isReloading) {
      return false;
    }

    this.activeIndex = index;
    this.fireCooldown = 0.12;
    this.showActiveViewModel();
    return true;
  }

  public grantWeapon(id: string): boolean {
    const index = WEAPON_DEFINITIONS.findIndex((definition) => definition.id === id);
    if (index < 0) {
      return false;
    }

    this.availableWeaponIds.add(id);
    this.activeIndex = index;
    this.showActiveViewModel();
    return true;
  }

  public ownsWeapon(id: string): boolean {
    return this.availableWeaponIds.has(id);
  }

  public startReload(): boolean {
    if (this.isReloading || this.activeAmmo.magazine >= this.activeWeapon.magazineSize || this.activeAmmo.reserve <= 0) {
      return false;
    }

    this.reloadRemaining = this.activeWeapon.reloadDuration;
    return true;
  }

  public tryFire(moving: boolean): WeaponShot | null {
    if (this.isReloading || this.fireCooldown > 0) {
      return null;
    }

    if (this.activeWeapon.category === 'knife') {
      this.fireCooldown = this.activeWeapon.fireInterval;
      return {
        weapon: this.activeWeapon,
        spread: 0,
        recoil: 0,
      };
    }

    if (this.activeAmmo.magazine <= 0) {
      this.startReload();
      return null;
    }

    this.activeAmmo.magazine -= 1;
    this.fireCooldown = this.activeWeapon.fireInterval;
    this.muzzleFlashRemaining = 0.045;
    this.recoilKick = Math.min(0.7, this.recoilKick + this.activeWeapon.recoil * 2.2);
    return {
      weapon: this.activeWeapon,
      spread: this.activeWeapon.hipSpread + (moving ? this.activeWeapon.movementSpread : 0),
      recoil: this.activeWeapon.recoil,
    };
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    this.camera.remove(this.viewModelRoot);
  }

  private finishReload(): void {
    const missing = this.activeWeapon.magazineSize - this.activeAmmo.magazine;
    const loaded = Math.min(missing, this.activeAmmo.reserve);
    this.activeAmmo.magazine += loaded;
    this.activeAmmo.reserve -= loaded;
  }

  private showActiveViewModel(): void {
    this.viewModels.forEach((viewModel, id) => {
      viewModel.visible = id === this.activeWeapon.id && this.availableWeaponIds.has(id);
    });
  }

  private createViewModel(definition: WeaponDefinition): THREE.Group {
    const viewModel = new THREE.Group();
    viewModel.name = `viewmodel-${definition.id}`;
    viewModel.position.set(0.34, -0.31, -0.78);
    viewModel.rotation.set(-0.05, -0.08, -0.025);
    viewModel.scale.setScalar(VIEWMODEL_SCALE);

    const bodyMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(definition.color).multiplyScalar(0.62), roughness: 0.48, metalness: 0.62 });
    const accentMaterial = new THREE.MeshStandardMaterial({ color: 0x1e2424, roughness: 0.58, metalness: 0.72 });
    const polymerMaterial = new THREE.MeshStandardMaterial({ color: 0x111718, roughness: 0.78, metalness: 0.18 });
    if (definition.category === 'knife') {
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.38), accentMaterial);
      handle.position.set(0, -0.2, -0.02);
      handle.rotation.x = -0.2;
      viewModel.add(handle);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.78), bodyMaterial);
      blade.position.set(0, -0.08, -0.54);
      blade.rotation.x = -0.04;
      viewModel.add(blade);
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.06), accentMaterial);
      guard.position.set(0, -0.12, -0.22);
      viewModel.add(guard);
      const handMaterial = new THREE.MeshStandardMaterial({ color: 0x57473d, roughness: 0.88, metalness: 0 });
      const hand = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.28, 5, 8), handMaterial);
      hand.position.set(-0.08, -0.22, -0.08);
      hand.rotation.set(Math.PI / 2, 0, -0.35);
      viewModel.add(hand);
      this.viewModelRoot.add(viewModel);
      return viewModel;
    }

    const bodyWidth = 0.24;
    const bodyLength = definition.category === 'pistol' ? 0.7 : 1.05;
    const body = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth, 0.2, bodyLength), bodyMaterial);
    body.position.z = -bodyLength / 2;
    body.castShadow = true;
    viewModel.add(body);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.17, definition.category === 'pistol' ? 0.55 : 0.42, 0.2), accentMaterial);
    grip.position.set(0, -0.24, 0.03);
    grip.rotation.x = definition.category === 'pistol' ? -0.12 : -0.2;
    grip.castShadow = true;
    viewModel.add(grip);

    const barrelLength = definition.category === 'pistol' ? 0.32 : 0.66;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, barrelLength, 10), accentMaterial);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -bodyLength - barrelLength / 2 + 0.1;
    barrel.castShadow = true;
    viewModel.add(barrel);

    const sightRear = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.1, 0.08), accentMaterial);
    sightRear.position.set(0, 0.17, -0.2);
    sightRear.castShadow = true;
    viewModel.add(sightRear);

    const sightFront = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.13, 0.06), accentMaterial);
    sightFront.position.set(0, 0.15, -bodyLength + 0.08);
    sightFront.castShadow = true;
    viewModel.add(sightFront);

    if (definition.category !== 'pistol') {
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 0.52), polymerMaterial);
      stock.position.set(0, -0.01, 0.26);
      stock.rotation.x = -0.08;
      stock.castShadow = true;
      viewModel.add(stock);

      const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.48, 0.24), polymerMaterial);
      magazine.position.set(0, -0.28, -0.44);
      magazine.rotation.x = -0.16;
      magazine.castShadow = true;
      viewModel.add(magazine);

      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.045, bodyLength * 0.68), accentMaterial);
      rail.position.set(0, 0.125, -bodyLength * 0.5);
      viewModel.add(rail);
    }

    const handMaterial = new THREE.MeshStandardMaterial({ color: 0x57473d, roughness: 0.88, metalness: 0 });
    const supportHand = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.28, 5, 8), handMaterial);
    supportHand.position.set(-0.12, -0.22, definition.category === 'pistol' ? -0.25 : -0.67);
    supportHand.rotation.set(Math.PI / 2, 0, -0.35);
    viewModel.add(supportHand);

    this.viewModelRoot.add(viewModel);
    return viewModel;
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.code.startsWith('Digit')) {
      const index = Number(event.code.slice(-1)) - 1;
      if (index >= 0) {
        this.switchTo(index);
      }
      return;
    }

    if (event.code === 'KeyR') {
      this.startReload();
    }
  };
}
