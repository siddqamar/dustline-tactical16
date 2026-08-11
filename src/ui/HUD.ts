import type { CombatEvent } from '../combat/CombatSystem';
import type { WeaponManager } from '../weapons/WeaponManager';
import type { MatchSnapshot } from '../match/MatchTypes';
import type { BombSnapshot } from '../match/BombSystem';

export class HUD {
  public readonly element = document.createElement('div');

  private readonly healthValue: HTMLElement;
  private readonly healthBar: HTMLElement;
  private readonly armorValue: HTMLElement;
  private readonly ammoValue: HTMLElement;
  private readonly weaponValue: HTMLElement;
  private readonly reloadValue: HTMLElement;
  private readonly hitMarker: HTMLElement;
  private readonly damageFlash: HTMLElement;
  private readonly roundValue: HTMLElement;
  private readonly roundNumber: HTMLElement;
  private readonly alphaScore: HTMLElement;
  private readonly bravoScore: HTMLElement;
  private readonly timerValue: HTMLElement;
  private readonly objectiveValue: HTMLElement;
  private readonly alphaAlive: HTMLElement;
  private readonly bravoAlive: HTMLElement;
  private readonly creditsValue: HTMLElement;
  private readonly operativeValue: HTMLElement;
  private readonly interactionValue: HTMLElement;
  private readonly announcementValue: HTMLElement;
  private hitMarkerTimer = 0;
  private damageFlashTimer = 0;
  private announcementTimer = 0;
  private currentOperativeId = 'alpha-1';
  private lastAmmoText = '';
  private lastWeaponText = '';
  private lastReloading = false;

  public constructor(private readonly weapons: WeaponManager) {
    this.element.className = 'tactical-hud';
    this.element.innerHTML = `
      <div class="hud-scoreboard">
        <div class="hud-team hud-team-alpha"><span>ALPHA</span><strong class="hud-alpha-score">0</strong><i class="hud-alpha-alive">1</i></div>
        <div class="hud-match-clock"><small class="hud-round-number">ROUND 01</small><strong class="hud-timer">01:30</strong></div>
        <div class="hud-team hud-team-bravo"><i class="hud-bravo-alive">1</i><strong class="hud-bravo-score">0</strong><span>BRAVO</span></div>
      </div>
      <div class="hud-round"><strong class="hud-round-value">OPERATION SETUP</strong><span class="hud-objective">AWAITING ORDERS</span></div>
      <div class="hud-controls"><span>WASD</span> MOVE <span>SHIFT</span> SPRINT <span>LMB</span> FIRE <span>E</span> INTERACT <span>R</span> RELOAD <span>1-5</span> WEAPONS</div>
      <div class="hud-health">
        <div class="hud-block-label"><span>VITALS</span><strong class="hud-health-value">100</strong></div>
        <div class="hud-health-track"><i class="hud-health-bar"></i></div>
        <div class="hud-armor-value">NO ARMOR</div>
      </div>
      <div class="hud-identity"><span>CONTROL</span><strong class="hud-operative">ALPHA 1</strong><small class="hud-credits">$00800</small></div>
      <div class="hud-weapon">
        <div class="hud-weapon-name">P9 SERVICE PISTOL</div>
        <div class="hud-ammo"><strong class="hud-ammo-value">15 / 60</strong><span>READY</span></div>
        <div class="hud-reload" hidden>RELOADING</div>
      </div>
      <div class="hud-interaction" hidden></div>
      <div class="hud-announcement" hidden></div>
      <div class="hud-hit-marker" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <div class="hud-damage-flash" aria-hidden="true"></div>
    `;

    this.healthValue = this.requireElement('.hud-health-value');
    this.healthBar = this.requireElement('.hud-health-bar');
    this.armorValue = this.requireElement('.hud-armor-value');
    this.ammoValue = this.requireElement('.hud-ammo-value');
    this.weaponValue = this.requireElement('.hud-weapon-name');
    this.reloadValue = this.requireElement('.hud-reload');
    this.hitMarker = this.requireElement('.hud-hit-marker');
    this.damageFlash = this.requireElement('.hud-damage-flash');
    this.roundValue = this.requireElement('.hud-round-value');
    this.roundNumber = this.requireElement('.hud-round-number');
    this.alphaScore = this.requireElement('.hud-alpha-score');
    this.bravoScore = this.requireElement('.hud-bravo-score');
    this.timerValue = this.requireElement('.hud-timer');
    this.objectiveValue = this.requireElement('.hud-objective');
    this.alphaAlive = this.requireElement('.hud-alpha-alive');
    this.bravoAlive = this.requireElement('.hud-bravo-alive');
    this.creditsValue = this.requireElement('.hud-credits');
    this.operativeValue = this.requireElement('.hud-operative');
    this.interactionValue = this.requireElement('.hud-interaction');
    this.announcementValue = this.requireElement('.hud-announcement');
  }

  public update(deltaSeconds: number): void {
    const ammo = this.weapons.activeAmmo;
    const ammoText = `${ammo.magazine.toString().padStart(2, '0')} / ${ammo.reserve.toString().padStart(2, '0')}`;
    const weaponText = this.weapons.activeWeapon.label;
    const reloading = this.weapons.isReloading;
    if (ammoText !== this.lastAmmoText) {
      this.ammoValue.textContent = ammoText;
      this.lastAmmoText = ammoText;
    }
    if (weaponText !== this.lastWeaponText) {
      this.weaponValue.textContent = weaponText;
      this.lastWeaponText = weaponText;
    }
    if (reloading !== this.lastReloading) {
      this.reloadValue.hidden = !reloading;
      this.lastReloading = reloading;
    }
    this.hitMarkerTimer = Math.max(0, this.hitMarkerTimer - deltaSeconds);
    this.damageFlashTimer = Math.max(0, this.damageFlashTimer - deltaSeconds);
    this.announcementTimer = Math.max(0, this.announcementTimer - deltaSeconds);
    this.hitMarker.style.opacity = this.hitMarkerTimer > 0 ? '1' : '0';
    this.damageFlash.style.opacity = `${Math.min(0.3, this.damageFlashTimer * 2.7)}`;
    this.announcementValue.hidden = this.announcementTimer === 0;
  }

  public setHealth(value: number): void {
    const health = Math.max(0, Math.min(100, value));
    const healthText = Math.round(health).toString().padStart(3, '0');
    if (this.healthValue.textContent !== healthText) {
      this.healthValue.textContent = healthText;
      this.healthBar.style.transform = `scaleX(${health / 100})`;
    }
  }

  public setArmor(enabled: boolean): void {
    this.armorValue.textContent = enabled ? 'COMPOSITE ARMOR' : 'NO ARMOR';
    this.armorValue.classList.toggle('is-equipped', enabled);
  }

  public handleCombatEvent(event: CombatEvent): void {
    if (event.type !== 'hit' || !event.result.damage || event.sourceId !== this.currentOperativeId) {
      return;
    }
    this.hitMarkerTimer = event.result.damage.killed ? 0.3 : 0.16;
    this.hitMarker.classList.toggle('is-kill', event.result.damage.killed);
  }

  public setMatch(snapshot: MatchSnapshot): void {
    this.roundNumber.textContent = `ROUND ${snapshot.roundNumber.toString().padStart(2, '0')}`;
    this.alphaScore.textContent = snapshot.scores.alpha.toString();
    this.bravoScore.textContent = snapshot.scores.bravo.toString();
    const remaining = snapshot.phase === 'live' ? snapshot.roundRemaining : snapshot.phaseRemaining;
    this.timerValue.textContent = this.formatTime(remaining);

    if (snapshot.awaitingPlayer && (snapshot.phase === 'live' || snapshot.phase === 'planted')) {
      this.roundValue.textContent = 'CLICK TO RESUME';
      this.objectiveValue.textContent = 'SIMULATION PAUSED';
      return;
    }

    if (snapshot.phase === 'buy') {
      this.roundValue.textContent = 'BUY PHASE';
      this.objectiveValue.textContent = `${snapshot.roles.alpha === 'attackers' ? 'BREACH' : 'WARDEN'} ASSIGNMENT`;
    } else if (snapshot.phase === 'deployment') {
      this.roundValue.textContent = snapshot.awaitingPlayer ? 'CLICK TO DEPLOY' : `DEPLOY IN ${Math.ceil(snapshot.phaseRemaining)}`;
      this.objectiveValue.textContent = 'POINTER LOCK REQUIRED';
    } else if (snapshot.phase === 'live') {
      this.roundValue.textContent = 'LIVE COMBAT';
      this.objectiveValue.textContent = snapshot.roles.alpha === 'attackers' ? 'PLANT THE DEVICE' : 'DEFEND BOTH SITES';
    } else if (snapshot.phase === 'planted') {
      this.roundValue.textContent = 'DEVICE ARMED';
      this.objectiveValue.textContent = snapshot.roles.alpha === 'attackers' ? 'DEFEND THE DEVICE' : 'DEFUSE THE DEVICE';
    } else if (snapshot.phase === 'round-end') {
      this.roundValue.textContent = snapshot.roundWinner === snapshot.playerSquad ? 'ROUND SECURED' : 'ROUND LOST';
      this.objectiveValue.textContent = (snapshot.roundEndReason ?? 'resolved').replace('-', ' ').toUpperCase();
    } else if (snapshot.phase === 'match-end') {
      this.roundValue.textContent = snapshot.matchWinner === snapshot.playerSquad ? 'OPERATION COMPLETE' : 'OPERATION FAILED';
      this.objectiveValue.textContent = 'PRESS ENTER FOR NEW OPERATION';
    }
  }

  public setBomb(snapshot: BombSnapshot): void {
    if (snapshot.state === 'planting') {
      this.objectiveValue.textContent = `ARMING ${Math.round(snapshot.actionProgress * 100)}%`;
    } else if (snapshot.state === 'defusing') {
      this.objectiveValue.textContent = `DEFUSING ${Math.round(snapshot.actionProgress * 100)}%`;
    } else if (snapshot.state === 'planted') {
      this.timerValue.textContent = this.formatTime(snapshot.fuseRemaining);
    } else if (snapshot.state === 'dropped') {
      this.objectiveValue.textContent = 'DEVICE DROPPED';
    }
  }

  public setTeamStatus(alpha: number, bravo: number): void {
    this.alphaAlive.textContent = alpha.toString();
    this.bravoAlive.textContent = bravo.toString();
  }

  public setEconomy(credits: number): void {
    this.creditsValue.textContent = `$${credits.toString().padStart(5, '0')}`;
  }

  public setOperative(id: string): void {
    this.currentOperativeId = id;
    this.operativeValue.textContent = id.replace('-', ' ').toUpperCase();
  }

  public setInteraction(message: string | null): void {
    this.interactionValue.hidden = !message;
    this.interactionValue.textContent = message ?? '';
  }

  public announce(message: string, seconds = 2.4): void {
    this.announcementValue.textContent = message;
    this.announcementValue.hidden = false;
    this.announcementTimer = seconds;
  }

  public showDamage(): void {
    this.damageFlashTimer = 0.24;
  }

  private requireElement(selector: string): HTMLElement {
    const element = this.element.querySelector<HTMLElement>(selector);
    if (!element) {
      throw new Error(`HUD element ${selector} is missing.`);
    }
    return element;
  }

  private formatTime(seconds: number): string {
    const safeSeconds = Math.max(0, Math.ceil(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    return `${minutes.toString().padStart(2, '0')}:${(safeSeconds % 60).toString().padStart(2, '0')}`;
  }
}
