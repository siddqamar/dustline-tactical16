import * as THREE from 'three';
import { WEAPON_DEFINITIONS, type WeaponAmmo, type WeaponDefinition, type WeaponShot } from './WeaponTypes';

const VIEWMODEL_SCALE = 0.86;

export class WeaponManager {
  private readonly ammo = new Map<string, WeaponAmmo>();
  private readonly viewModelRoot = new THREE.Group();
  private readonly viewModels = new Map<string, THREE.Group>();
  private activeIndex = 0;
  private reloadRemaining = 0;
  private fireCooldown = 0;

  public constructor(private readonly camera: THREE.PerspectiveCamera) {
    this.viewModelRoot.name = 'first-person-weapon';
    this.camera.add(this.viewModelRoot);

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

  public update(deltaSeconds: number): void {
    this.fireCooldown = Math.max(0, this.fireCooldown - deltaSeconds);
    if (this.reloadRemaining <= 0) {
      return;
    }

    this.reloadRemaining = Math.max(0, this.reloadRemaining - deltaSeconds);
    if (this.reloadRemaining === 0) {
      this.finishReload();
    }
  }

  public switchTo(index: number): boolean {
    if (index < 0 || index >= WEAPON_DEFINITIONS.length || index === this.activeIndex || this.isReloading) {
      return false;
    }

    this.activeIndex = index;
    this.fireCooldown = 0.12;
    this.showActiveViewModel();
    return true;
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

    if (this.activeAmmo.magazine <= 0) {
      this.startReload();
      return null;
    }

    this.activeAmmo.magazine -= 1;
    this.fireCooldown = this.activeWeapon.fireInterval;
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
      viewModel.visible = id === this.activeWeapon.id;
    });
  }

  private createViewModel(definition: WeaponDefinition): THREE.Group {
    const viewModel = new THREE.Group();
    viewModel.name = `viewmodel-${definition.id}`;
    viewModel.position.set(0.28, -0.24, -0.55);
    viewModel.rotation.set(-0.05, -0.08, -0.025);
    viewModel.scale.setScalar(VIEWMODEL_SCALE);

    const bodyMaterial = new THREE.MeshStandardMaterial({ color: definition.color, roughness: 0.48, metalness: 0.62 });
    const accentMaterial = new THREE.MeshStandardMaterial({ color: 0x1e2424, roughness: 0.58, metalness: 0.72 });
    const bodyWidth = definition.category === 'sniper' ? 0.18 : 0.24;
    const bodyLength = definition.category === 'pistol' ? 0.7 : definition.category === 'sniper' ? 1.4 : 1.05;
    const body = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth, 0.2, bodyLength), bodyMaterial);
    body.position.z = -bodyLength / 2;
    body.castShadow = true;
    viewModel.add(body);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.17, definition.category === 'pistol' ? 0.55 : 0.42, 0.2), accentMaterial);
    grip.position.set(0, -0.24, 0.03);
    grip.rotation.x = definition.category === 'pistol' ? -0.12 : -0.2;
    grip.castShadow = true;
    viewModel.add(grip);

    const barrelLength = definition.category === 'sniper' ? 0.95 : definition.category === 'pistol' ? 0.32 : 0.66;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, barrelLength, 10), accentMaterial);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -bodyLength - barrelLength / 2 + 0.1;
    barrel.castShadow = true;
    viewModel.add(barrel);

    if (definition.category === 'sniper') {
      const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.42, 12), accentMaterial);
      scope.rotation.x = Math.PI / 2;
      scope.position.set(0, 0.16, -0.5);
      viewModel.add(scope);
    }

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
