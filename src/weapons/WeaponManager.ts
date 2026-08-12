import * as THREE from 'three';
import { WEAPON_DEFINITIONS, type WeaponAmmo, type WeaponDefinition, type WeaponShot } from './WeaponTypes';

const VIEWMODEL_ASSETS: Record<string, string> = {
  sidearm: '/assets/sidearm-first-person.webp',
  rifle: '/assets/rifle-first-person.webp',
  knife: '/assets/knife-first-person.webp',
};

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
    this.muzzleFlashMesh.renderOrder = 1002;
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
    const viewportScale = THREE.MathUtils.clamp(this.camera.aspect / 1.15, 0.46, 1);
    const targetX = (aiming ? 0.08 : 0.34) * viewportScale;
    const targetY = (aiming ? -0.22 : -0.31) + bob;
    const targetZ = (aiming ? -0.91 : -0.78) + Math.cos(this.viewModelTime * 0.5) * 0.008 * bobStrength;
    const blend = 1 - Math.exp(-12 * deltaSeconds);
    this.viewModelRoot.position.x = THREE.MathUtils.lerp(this.viewModelRoot.position.x, targetX, blend);
    this.viewModelRoot.position.y = THREE.MathUtils.lerp(this.viewModelRoot.position.y, targetY, blend);
    this.viewModelRoot.position.z = THREE.MathUtils.lerp(this.viewModelRoot.position.z, targetZ + this.recoilKick * 0.16, blend);
    this.viewModelRoot.rotation.x = THREE.MathUtils.lerp(this.viewModelRoot.rotation.x, (aiming ? 0 : -0.05) + this.recoilKick * 0.22, blend);
    this.viewModelRoot.rotation.z = THREE.MathUtils.lerp(this.viewModelRoot.rotation.z, Math.sin(this.viewModelTime * 0.5) * 0.006 * bobStrength, blend);
    this.viewModelRoot.scale.setScalar(viewportScale);
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
    const texture = new THREE.TextureLoader().load(VIEWMODEL_ASSETS[definition.id] ?? VIEWMODEL_ASSETS.sidearm!);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      alphaTest: 0.12,
      depthTest: false,
      depthWrite: false,
      map: texture,
      toneMapped: false,
      transparent: true,
    }));
    sprite.center.set(0.5, 0);
    sprite.position.set(0.04, -0.27, 0);
    const height = definition.category === 'rifle' ? 1.02 : definition.category === 'knife' ? 0.94 : 0.88;
    sprite.scale.set(height * 1.5, height, 1);
    sprite.renderOrder = 1000;
    sprite.raycast = () => {};
    viewModel.add(sprite);

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
