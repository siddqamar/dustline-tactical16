import type { CombatEvent } from '../combat/CombatSystem';
import type { WeaponManager } from '../weapons/WeaponManager';

export class HUD {
  public readonly element = document.createElement('div');

  private readonly healthValue: HTMLElement;
  private readonly healthBar: HTMLElement;
  private readonly ammoValue: HTMLElement;
  private readonly weaponValue: HTMLElement;
  private readonly reloadValue: HTMLElement;
  private readonly hitMarker: HTMLElement;
  private readonly damageFlash: HTMLElement;
  private hitMarkerTimer = 0;
  private damageFlashTimer = 0;
  private health = 100;

  public constructor(private readonly weapons: WeaponManager) {
    this.element.className = 'tactical-hud';
    this.element.innerHTML = `
      <div class="hud-controls">
        <span>WASD</span> MOVE
        <span>MOUSE</span> LOOK
        <span>LMB</span> FIRE
        <span>R</span> RELOAD
        <span>1-5</span> WEAPONS
      </div>
      <div class="hud-health">
        <div class="hud-block-label"><span>VITALS</span><strong class="hud-health-value">100</strong></div>
        <div class="hud-health-track"><i class="hud-health-bar"></i></div>
      </div>
      <div class="hud-weapon">
        <div class="hud-weapon-name">M9 VANGUARD</div>
        <div class="hud-ammo"><strong class="hud-ammo-value">15 / 60</strong><span>READY</span></div>
        <div class="hud-reload" hidden>RELOADING</div>
      </div>
      <div class="hud-hit-marker" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <div class="hud-damage-flash" aria-hidden="true"></div>
    `;

    const healthValue = this.element.querySelector<HTMLElement>('.hud-health-value');
    const healthBar = this.element.querySelector<HTMLElement>('.hud-health-bar');
    const ammoValue = this.element.querySelector<HTMLElement>('.hud-ammo-value');
    const weaponValue = this.element.querySelector<HTMLElement>('.hud-weapon-name');
    const reloadValue = this.element.querySelector<HTMLElement>('.hud-reload');
    const hitMarker = this.element.querySelector<HTMLElement>('.hud-hit-marker');
    const damageFlash = this.element.querySelector<HTMLElement>('.hud-damage-flash');
    if (!healthValue || !healthBar || !ammoValue || !weaponValue || !reloadValue || !hitMarker || !damageFlash) {
      throw new Error('HUD template is incomplete.');
    }

    this.healthValue = healthValue;
    this.healthBar = healthBar;
    this.ammoValue = ammoValue;
    this.weaponValue = weaponValue;
    this.reloadValue = reloadValue;
    this.hitMarker = hitMarker;
    this.damageFlash = damageFlash;
  }

  public update(deltaSeconds: number): void {
    const ammo = this.weapons.activeAmmo;
    this.ammoValue.textContent = `${ammo.magazine.toString().padStart(2, '0')} / ${ammo.reserve.toString().padStart(2, '0')}`;
    this.weaponValue.textContent = this.weapons.activeWeapon.label;
    this.reloadValue.hidden = !this.weapons.isReloading;
    this.hitMarkerTimer = Math.max(0, this.hitMarkerTimer - deltaSeconds);
    this.damageFlashTimer = Math.max(0, this.damageFlashTimer - deltaSeconds);
    this.hitMarker.style.opacity = this.hitMarkerTimer > 0 ? '1' : '0';
    this.damageFlash.style.opacity = `${Math.min(0.26, this.damageFlashTimer * 2.4)}`;
  }

  public setHealth(value: number): void {
    this.health = Math.max(0, Math.min(100, value));
    this.healthValue.textContent = Math.round(this.health).toString().padStart(3, '0');
    this.healthBar.style.transform = `scaleX(${this.health / 100})`;
  }

  public handleCombatEvent(event: CombatEvent): void {
    if (event.type !== 'hit' || !event.result.damage) {
      return;
    }

    this.hitMarkerTimer = 0.16;
  }

  public showDamage(): void {
    this.damageFlashTimer = 0.24;
  }
}

