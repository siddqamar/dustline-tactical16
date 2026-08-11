import * as THREE from 'three';
import { GameLoop } from './GameLoop';
import { TacticalMap } from '../world/TacticalMap';
import { BombDevice } from '../world/BombDevice';
import { PlayerController } from '../player/PlayerController';
import { WeaponManager } from '../weapons/WeaponManager';
import { CombatSystem, type CombatEvent } from '../combat/CombatSystem';
import { Health } from '../combat/DamageSystem';
import { HUD } from '../ui/HUD';
import { PreMatchMenu } from '../ui/PreMatchMenu';
import { BuyMenu, type BuyItem, type BuyItemId } from '../ui/BuyMenu';
import { MobileControls } from '../ui/MobileControls';
import { Navigation } from '../ai/Navigation';
import { BotDirector, type SquadGoals } from '../ai/BotDirector';
import { getBotDifficulty } from '../ai/BotDifficulty';
import { AudioManager } from '../audio/AudioManager';
import { BombSystem } from '../match/BombSystem';
import { EconomySystem } from '../match/EconomySystem';
import { MatchManager } from '../match/MatchManager';
import type { MatchConfig, MatchPhase, MatchSnapshot, SquadId, TeamRole } from '../match/MatchTypes';
import type { MapSpawn, ObjectiveArea } from '../world/WorldTypes';

const CLEAR_COLOR = 0x211a15;
const PLAYER_ID = 'alpha-1';
const INTERACTION_RANGE = 2.2;

export class Game {
  private readonly camera: THREE.PerspectiveCamera;
  private readonly clock = new THREE.Clock();
  private readonly debugElement: HTMLDivElement;
  private readonly loop: GameLoop;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly map: TacticalMap;
  private readonly navigation: Navigation;
  private readonly player: PlayerController;
  private readonly weapons: WeaponManager;
  private readonly combat: CombatSystem;
  private readonly hud: HUD;
  private readonly match = new MatchManager();
  private readonly bomb = new BombSystem();
  private readonly bombDevice: BombDevice;
  private readonly playerHealth = new Health(100);
  private readonly audio = new AudioManager();
  private readonly canvas: HTMLCanvasElement;
  private readonly overlay: HTMLDivElement;
  private readonly statusElement: HTMLElement;
  private readonly statusLabel: HTMLElement;
  private readonly preMatchMenu: PreMatchMenu;
  private readonly buyMenu: BuyMenu;
  private readonly mobileControls: MobileControls;
  private economy = new EconomySystem();
  private bots: BotDirector | null = null;
  private config: MatchConfig | null = null;
  private selectedSite: ObjectiveArea;
  private currentOperativeId = PLAYER_ID;
  private readonly ownedItems = new Set<BuyItemId>();
  private hasArmor = false;
  private hasDefuseKit = false;
  private footstepRemaining = 0;
  private bombTickRemaining = 0;
  private fireHeld = false;
  private aimHeld = false;
  private mobileFireHeld = false;
  private mobileAimHeld = false;
  private debugEnabled = false;
  private frameAccumulator = 0;
  private frameCount = 0;
  private preparedRound = 0;
  private settledRound = 0;
  private lastPhase: MatchPhase = 'setup';

  public constructor(private readonly root: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CLEAR_COLOR);
    this.scene.fog = new THREE.FogExp2(0x6d5d4d, 0.009);

    this.camera = new THREE.PerspectiveCamera(76, 1, 0.05, 220);
    this.camera.position.set(-29, 1.65, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.35));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.28;
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'game-canvas';
    this.canvas.setAttribute('aria-label', 'Operation Sable game viewport');
    this.scene.add(this.camera);

    this.debugElement = document.createElement('div');
    this.debugElement.className = 'game-debug';
    this.debugElement.hidden = true;

    this.buildLighting();
    this.map = new TacticalMap();
    this.scene.add(this.map.root);
    this.navigation = new Navigation(this.map.navigationPoints, this.scene);
    const playerSpawn = this.requireSpawn('west-main');
    this.player = new PlayerController(this.camera, this.canvas, this.map.colliders, playerSpawn);
    this.weapons = new WeaponManager(this.camera);
    this.combat = new CombatSystem(this.scene, this.camera);
    this.bombDevice = new BombDevice(this.scene);
    this.hud = new HUD(this.weapons);
    this.mobileControls = new MobileControls({
      onMove: (x, y) => this.player.setTouchMove(x, y),
      onLook: (deltaX, deltaY) => this.player.applyTouchLook(deltaX, deltaY),
      onFire: (active) => { this.mobileFireHeld = active; },
      onAim: (active) => { this.mobileAimHeld = active; },
      onInteract: (active) => this.player.setTouchInteracting(active),
      onReload: () => { this.weapons.startReload(); },
      onWeapon: (index) => { this.weapons.switchTo(index); },
    });
    this.player.setTouchMode(this.mobileControls.isTouchDevice);
    this.selectedSite = this.map.objectives[0] ?? { id: 'alpha', position: new THREE.Vector3(-22, 0.06, -22), radius: 5.2 };

    this.preMatchMenu = new PreMatchMenu(this.startMatch, getBotDifficulty(new URLSearchParams(window.location.search).get('difficulty')));
    this.buyMenu = new BuyMenu(this.purchaseItem, this.confirmLoadout);
    this.overlay = this.createOverlay();
    const statusElement = this.overlay.querySelector<HTMLElement>('[data-game-status]');
    const statusLabel = this.overlay.querySelector<HTMLElement>('.status-label');
    if (!statusElement || !statusLabel) {
      throw new Error('Game status overlay is incomplete.');
    }
    this.statusElement = statusElement;
    this.statusLabel = statusLabel;

    this.combat.subscribe(this.handleCombatEvent);
    this.combat.subscribe((event) => this.hud.handleCombatEvent(event));
    this.combat.subscribe((event) => this.audio.handleCombatEvent(event));
    this.match.subscribe(this.handleMatchSnapshot);
    this.bomb.subscribe((snapshot) => {
      this.hud.setBomb(snapshot);
      this.bombDevice.sync(snapshot);
    });
    this.bomb.subscribeToEvents((event) => {
      if (event.type === 'planted') {
        this.match.reportBombPlanted();
        this.audio.playObjectiveCue(true);
      } else if (event.type === 'defused') {
        this.match.reportBombDefused();
        this.audio.playObjectiveCue(true);
      } else {
        this.match.reportBombExploded();
        this.audio.playObjectiveCue(false);
      }
    });

    this.loop = new GameLoop(this.update);
    this.mount();
  }

  public start(): void {
    this.preMatchMenu.show();
    this.clock.start();
    this.loop.start();
  }

  public stop(): void {
    this.loop.stop();
    this.clock.stop();
    this.mobileControls.dispose();
    this.audio.dispose();
  }

  private mount(): void {
    this.root.replaceChildren(this.canvas, this.overlay, this.hud.element, this.mobileControls.element, this.buyMenu.element, this.preMatchMenu.element, this.debugElement);
    window.addEventListener('resize', this.handleResize, { passive: true });
    window.addEventListener('keydown', this.handleKeyDown);
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.canvas.addEventListener('pointerup', this.handlePointerUp);
    this.canvas.addEventListener('pointercancel', this.handlePointerUp);
    this.canvas.addEventListener('contextmenu', this.preventContextMenu);
    this.handleResize();
  }

  private createOverlay(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.className = 'game-overlay';
    overlay.innerHTML = `
      <div class="game-brand">
        <span class="game-brand-mark">S</span>
        <span><strong>OPERATION SABLE</strong><small>RELAY STATION 14 // FIELD LINK</small></span>
      </div>
      <div class="game-status" data-game-status="setup"><span class="status-dot"></span><span class="status-label">OPERATION SETUP</span></div>
      <div class="game-reticle" aria-hidden="true"><span></span><span></span><span></span><span></span><i></i></div>
      <div class="game-vignette" aria-hidden="true"></div>
    `;
    return overlay;
  }

  private buildLighting(): void {
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(170, 28, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          horizonColor: { value: new THREE.Color(0xd0a56c) },
          zenithColor: { value: new THREE.Color(0x392b26) },
        },
        vertexShader: 'varying vec3 vWorldPosition; void main(){ vec4 worldPosition = modelMatrix * vec4(position, 1.0); vWorldPosition = worldPosition.xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'uniform vec3 horizonColor; uniform vec3 zenithColor; varying vec3 vWorldPosition; void main(){ float h = clamp(normalize(vWorldPosition).y * 0.72 + 0.28, 0.0, 1.0); gl_FragColor = vec4(mix(horizonColor, zenithColor, pow(h, 0.7)), 1.0); }',
      }),
    );
    this.scene.add(sky);

    const hemisphere = new THREE.HemisphereLight(0xf2c38a, 0x554334, 2.2);
    this.scene.add(hemisphere);

    const ambient = new THREE.AmbientLight(0xb89b78, 0.68);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffc989, 4.3);
    sun.position.set(-24, 34, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 110;
    sun.shadow.camera.left = -48;
    sun.shadow.camera.right = 48;
    sun.shadow.camera.top = 48;
    sun.shadow.camera.bottom = -48;
    sun.shadow.bias = -0.00025;
    this.scene.add(sun);

    const skyFill = new THREE.DirectionalLight(0x9b9c8b, 1.1);
    skyFill.position.set(32, 18, -24);
    this.scene.add(skyFill);

    const relayFill = new THREE.PointLight(0xe1a96d, 6, 42, 2);
    relayFill.position.set(10, 7, 10);
    this.scene.add(relayFill);
  }

  private readonly startMatch = (config: MatchConfig): void => {
    this.audio.initialize();
    this.config = config;
    this.preMatchMenu.hide();
    this.bots?.dispose();
    this.bots = new BotDirector(this.scene, this.navigation, this.combat, this.map.spawns, this.map.coverPoints, config.difficulty, config.teamSize);
    this.economy = new EconomySystem();
    this.economy.register(PLAYER_ID, 'alpha');
    this.bots.bots.forEach((bot) => this.economy.register(bot.id, bot.squad));
    this.preparedRound = 0;
    this.settledRound = 0;
    this.lastPhase = 'setup';
    this.match.start(config);
  };

  private readonly purchaseItem = (item: BuyItem): void => {
    if (this.match.current.phase !== 'buy' || this.ownedItems.has(item.id)) {
      return;
    }
    if (!this.economy.purchase(this.currentOperativeId, item.cost)) {
      return;
    }

    this.ownedItems.add(item.id);
    if (item.id === 'armor') {
      this.hasArmor = true;
      this.hud.setArmor(true);
    } else if (item.id === 'defuse-kit') {
      this.hasDefuseKit = true;
    } else {
      this.weapons.grantWeapon(item.id);
    }
    this.renderBuyMenu();
  };

  private readonly confirmLoadout = (): void => {
    this.match.finishBuyPhase();
  };

  private readonly update = (deltaSeconds: number): void => {
    this.updateDebug(deltaSeconds);
    this.match.update(deltaSeconds, true);
    const bots = this.bots;
    if (!this.config || !bots) {
      this.bombDevice.update(deltaSeconds, false);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    const combatActive = this.match.isCombatActive;
    this.player.setEnabled(combatActive && !this.playerHealth.isDead && this.player.isPointerLocked);
    this.player.setAiming((this.aimHeld || this.mobileAimHeld) && combatActive && !this.playerHealth.isDead);
    this.player.update(deltaSeconds);
    this.updateMovementAudio(deltaSeconds, combatActive);
    this.weapons.update(deltaSeconds, this.player.isAiming, this.player.isMoving);
    const targetFov = this.player.isAiming ? this.weapons.activeWeapon.adsFov : 76;
    const fovBlend = 1 - Math.exp(-11 * deltaSeconds);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, fovBlend);
    this.camera.updateProjectionMatrix();
    this.overlay.classList.toggle('is-aiming', this.player.isAiming);
    if ((this.fireHeld || this.mobileFireHeld) && combatActive && this.player.isPointerLocked && !this.playerHealth.isDead) {
      const shot = this.weapons.tryFire(this.player.isMoving);
      if (shot) {
        this.combat.fire(shot, this.currentOperativeId, 'alpha');
      }
    }

    const healthBeforeBots = this.playerHealth.current;
    bots.update(deltaSeconds, {
      id: this.currentOperativeId,
      squad: 'alpha',
      position: this.player.position,
      health: this.playerHealth,
      damageMultiplier: this.hasArmor ? 0.72 : 1,
      visibility: this.player.isMoving ? 1 : this.player.isAiming ? 0.68 : 0.46,
    }, combatActive, this.createSquadGoals());
    if (this.playerHealth.current < healthBeforeBots) {
      this.hud.showDamage();
    }

    this.updateBomb(deltaSeconds);
    this.handlePlayerDeath();
    this.evaluateEliminations();
    this.combat.update(deltaSeconds);
    this.bombDevice.update(deltaSeconds, this.bomb.current.state === 'planted' || this.bomb.current.state === 'defusing');
    this.updateBombAudio(deltaSeconds);
    this.hud.setHealth(this.playerHealth.current);
    this.hud.setBomb(this.bomb.current);
    this.hud.setTeamStatus(
      bots.aliveCount('alpha', !this.playerHealth.isDead),
      bots.aliveCount('bravo', false),
    );
    this.hud.update(deltaSeconds);
    this.renderer.render(this.scene, this.camera);
  };

  private readonly handleMatchSnapshot = (snapshot: MatchSnapshot): void => {
    this.hud.setMatch(snapshot);
    if (snapshot.phase === 'deployment' || snapshot.phase === 'live' || snapshot.phase === 'planted') {
      this.mobileControls.show();
    } else {
      this.mobileControls.hide();
    }
    this.setStatus(snapshot.awaitingPlayer ? 'awaiting-player' : snapshot.phase === 'setup' ? 'operation-setup' : snapshot.phase);
    if ((snapshot.phase === 'buy' || snapshot.phase === 'round-end' || snapshot.phase === 'match-end') && this.player.isPointerLocked) {
      document.exitPointerLock();
    }
    if (snapshot.phase !== this.lastPhase) {
      this.audio.handleMatch(snapshot);
      this.lastPhase = snapshot.phase;
    }

    if (snapshot.phase === 'buy') {
      if (snapshot.roundNumber !== this.preparedRound) {
        this.prepareRound(snapshot);
      }
      this.renderBuyMenu();
      this.match.finishBuyPhase();
    } else {
      this.buyMenu.hide();
    }

    if (snapshot.phase === 'round-end' && snapshot.roundNumber !== this.settledRound && snapshot.roundWinner) {
      this.economy.settleRound(snapshot.roundWinner);
      this.settledRound = snapshot.roundNumber;
      this.hud.setEconomy(this.economy.get(this.currentOperativeId)?.credits ?? 0);
    }
  };

  private readonly handleCombatEvent = (event: CombatEvent): void => {
    if (event.type !== 'hit' || !event.result.damage?.killed) {
      return;
    }
    if (event.result.ownerId) {
      this.bots?.markDead(event.result.ownerId);
    }
    if (event.sourceId === this.currentOperativeId) {
      this.economy.awardElimination(this.currentOperativeId);
      this.hud.setEconomy(this.economy.get(this.currentOperativeId)?.credits ?? 0);
    }
  };

  private prepareRound(snapshot: MatchSnapshot): void {
    const bots = this.bots;
    if (!bots) {
      return;
    }
    this.preparedRound = snapshot.roundNumber;
    this.currentOperativeId = PLAYER_ID;
    this.playerHealth.reset();
    this.hasArmor = false;
    this.hasDefuseKit = false;
    this.ownedItems.clear();
    this.weapons.reset();
    this.hud.setArmor(false);
    this.hud.setOperative(this.currentOperativeId);
    this.hud.setEconomy(this.economy.get(this.currentOperativeId)?.credits ?? 0);
    this.hud.setInteraction(null);
    this.fireHeld = false;
    this.selectedSite = this.map.objectives[(snapshot.roundNumber - 1) % Math.max(1, this.map.objectives.length)] ?? this.selectedSite;
    this.player.deploy(this.spawnForRole(snapshot.roles.alpha));
    bots.reset(snapshot.roles);

    const attackerSquad = this.match.squadFor('attackers');
    const carrierId = attackerSquad === 'alpha' ? this.currentOperativeId : bots.getLivingBots(attackerSquad)[0]?.id;
    if (!carrierId) {
      throw new Error('The attacking squad has no breach-device carrier.');
    }
    const carrierPosition = this.operativePosition(carrierId) ?? this.player.position;
    this.bomb.reset(carrierId, { x: carrierPosition.x, y: 0.8, z: carrierPosition.z });
    this.hud.announce(`INSERTION ${snapshot.roundNumber.toString().padStart(2, '0')} // ${snapshot.roles.alpha.toUpperCase()} SQUAD LINKED`, 3.2);
  }

  private renderBuyMenu(): void {
    const account = this.economy.get(this.currentOperativeId);
    this.buyMenu.show({
      credits: account?.credits ?? 0,
      owned: this.ownedItems,
      role: this.match.roleFor('alpha'),
      secondsRemaining: this.match.current.phaseRemaining,
    });
  }

  private createSquadGoals(): SquadGoals {
    const alphaSite = this.map.objectives.find((site) => site.id === 'alpha') ?? this.selectedSite;
    const bravoSite = this.map.objectives.find((site) => site.id === 'bravo') ?? this.selectedSite;
    const bombPosition = new THREE.Vector3(this.bomb.current.position.x, 1.65, this.bomb.current.position.z);
    const goalFor = (squad: SquadId): readonly THREE.Vector3[] => {
      if (this.bomb.current.state === 'planted' || this.bomb.current.state === 'defusing' || this.bomb.current.state === 'dropped') {
        return [bombPosition];
      }
      if (this.match.roleFor(squad) === 'attackers') {
        return [this.selectedSite.position];
      }
      return [alphaSite.position, bravoSite.position];
    };
    return { alpha: goalFor('alpha'), bravo: goalFor('bravo') };
  }

  private updateBomb(deltaSeconds: number): void {
    if (!this.match.isCombatActive) {
      return;
    }
    const snapshot = this.bomb.current;
    this.hud.setInteraction(null);

    if (snapshot.state === 'carried' && snapshot.carrierId) {
      const carrierPosition = this.operativePosition(snapshot.carrierId);
      if (!carrierPosition || !this.operativeAlive(snapshot.carrierId)) {
        const dropPosition = carrierPosition ?? this.player.position;
        this.bomb.drop({ x: dropPosition.x, y: 0.25, z: dropPosition.z });
      } else {
        this.bomb.setCarrierPosition({ x: carrierPosition.x, y: 0.8, z: carrierPosition.z });
        const site = this.siteAt(carrierPosition);
        if (site && this.match.roleFor(this.squadForOperative(snapshot.carrierId)) === 'attackers') {
          if (snapshot.carrierId === this.currentOperativeId) {
            this.hud.setInteraction(this.player.isInteracting ? 'HOLD E // CACHING PACKAGE' : 'HOLD E // CACHE PACKAGE');
            if (this.player.isInteracting) {
              this.bomb.beginPlant(snapshot.carrierId, site.id);
            }
          } else {
            this.bomb.beginPlant(snapshot.carrierId, site.id);
          }
        }
      }
    } else if (snapshot.state === 'planting' && snapshot.operatorId && snapshot.siteId) {
      const operatorPosition = this.operativePosition(snapshot.operatorId);
      const site = this.map.objectives.find((objective) => objective.id === snapshot.siteId);
      const operatorActive = operatorPosition && site && this.withinArea(operatorPosition, site.position, site.radius);
      const humanReleased = snapshot.operatorId === this.currentOperativeId && !this.player.isInteracting;
      if (!operatorActive || !this.operativeAlive(snapshot.operatorId) || humanReleased) {
        this.bomb.cancelPlant();
      }
    } else if (snapshot.state === 'dropped') {
      this.updateDroppedBomb();
    } else if (snapshot.state === 'planted') {
      this.beginNearbyDefuse();
    } else if (snapshot.state === 'defusing' && snapshot.operatorId) {
      const operatorPosition = this.operativePosition(snapshot.operatorId);
      const bombPosition = new THREE.Vector3(snapshot.position.x, snapshot.position.y, snapshot.position.z);
      const humanReleased = snapshot.operatorId === this.currentOperativeId && !this.player.isInteracting;
      if (!operatorPosition || !this.operativeAlive(snapshot.operatorId) || !this.withinArea(operatorPosition, bombPosition, INTERACTION_RANGE) || humanReleased) {
        this.bomb.cancelDefuse();
      }
    }

    this.bomb.update(deltaSeconds);
  }

  private updateDroppedBomb(): void {
    const bots = this.bots;
    if (!bots) {
      return;
    }
    const bombPosition = new THREE.Vector3(this.bomb.current.position.x, 1.65, this.bomb.current.position.z);
    const attackerSquad = this.match.squadFor('attackers');
    if (attackerSquad === 'alpha' && !this.playerHealth.isDead && this.withinArea(this.player.position, bombPosition, INTERACTION_RANGE)) {
      this.hud.setInteraction('PRESS E // RECOVER PACKAGE');
      if (this.player.isInteracting) {
        this.bomb.pickUp(this.currentOperativeId);
      }
      return;
    }
    const bot = bots.getLivingBots(attackerSquad)
      .sort((left, right) => left.distanceToSquared(bombPosition) - right.distanceToSquared(bombPosition))[0];
    if (bot && this.withinArea(bot.position, bombPosition, 1.5)) {
      this.bomb.pickUp(bot.id);
    }
  }

  private beginNearbyDefuse(): void {
    const bots = this.bots;
    if (!bots) {
      return;
    }
    const snapshot = this.bomb.current;
    const bombPosition = new THREE.Vector3(snapshot.position.x, 1.65, snapshot.position.z);
    const defenders = this.match.squadFor('defenders');
    if (defenders === 'alpha' && !this.playerHealth.isDead && this.withinArea(this.player.position, bombPosition, INTERACTION_RANGE)) {
      this.hud.setInteraction(this.player.isInteracting ? 'HOLD E // OVERRIDING CACHE' : 'HOLD E // OVERRIDE CACHE');
      if (this.player.isInteracting) {
        this.bomb.beginDefuse(this.currentOperativeId, this.hasDefuseKit);
      }
      return;
    }
    const bot = bots.getLivingBots(defenders)
      .sort((left, right) => left.distanceToSquared(bombPosition) - right.distanceToSquared(bombPosition))[0];
    if (bot && this.withinArea(bot.position, bombPosition, INTERACTION_RANGE)) {
      this.bomb.beginDefuse(bot.id, false);
    }
  }

  private handlePlayerDeath(): void {
    const bots = this.bots;
    if (!bots || !this.playerHealth.isDead || !this.match.isCombatActive) {
      return;
    }
    const replacement = bots.takeOverNearest('alpha', this.player.position);
    if (!replacement) {
      this.hud.announce('SQUAD ELIMINATED', 3);
      return;
    }

    const inheritedHealth = replacement.health.current;
    this.currentOperativeId = replacement.id;
    this.playerHealth.setCurrent(inheritedHealth);
    this.player.takeControl(replacement.position, replacement.yaw);
    this.weapons.reset(['sidearm', 'rifle', 'knife']);
    this.hasArmor = false;
    this.hasDefuseKit = false;
    this.hud.setArmor(false);
    this.hud.setOperative(this.currentOperativeId);
    this.hud.setEconomy(this.economy.get(this.currentOperativeId)?.credits ?? 0);
    this.hud.announce(`CONTROL TRANSFER // ${this.currentOperativeId.replace('-', ' ').toUpperCase()}`, 2.6);
  }

  private evaluateEliminations(): void {
    const bots = this.bots;
    if (!bots || !this.match.isCombatActive) {
      return;
    }
    const alphaAlive = bots.aliveCount('alpha', !this.playerHealth.isDead);
    const bravoAlive = bots.aliveCount('bravo', false);
    if (alphaAlive === 0) {
      this.match.reportSquadEliminated('alpha');
    } else if (bravoAlive === 0) {
      this.match.reportSquadEliminated('bravo');
    }
  }

  private operativePosition(id: string): THREE.Vector3 | null {
    if (id === this.currentOperativeId) {
      return this.player.position;
    }
    return this.bots?.bots.find((bot) => bot.id === id)?.position ?? null;
  }

  private operativeAlive(id: string): boolean {
    if (id === this.currentOperativeId) {
      return !this.playerHealth.isDead;
    }
    return this.bots?.bots.find((bot) => bot.id === id)?.isAlive ?? false;
  }

  private squadForOperative(id: string): SquadId {
    return id.startsWith('bravo-') ? 'bravo' : 'alpha';
  }

  private siteAt(position: THREE.Vector3): ObjectiveArea | null {
    return this.map.objectives.find((site) => this.withinArea(position, site.position, site.radius)) ?? null;
  }

  private withinArea(position: THREE.Vector3, center: THREE.Vector3, radius: number): boolean {
    const deltaX = position.x - center.x;
    const deltaZ = position.z - center.z;
    return deltaX * deltaX + deltaZ * deltaZ <= radius * radius;
  }

  private spawnForRole(role: TeamRole): MapSpawn {
    return this.requireSpawn(role === 'attackers' ? 'west-main' : 'east-main');
  }

  private requireSpawn(id: string): MapSpawn {
    const spawn = this.map?.spawns.find((candidate) => candidate.id === id);
    if (!spawn) {
      if (!this.map) {
        const fallbackPosition = id.startsWith('west') ? new THREE.Vector3(-29, 1.65, 0) : new THREE.Vector3(29, 1.65, 0);
        return { id, position: fallbackPosition, yaw: id.startsWith('west') ? -Math.PI / 2 : Math.PI / 2 };
      }
      throw new Error(`Tactical map does not define spawn ${id}.`);
    }
    return spawn;
  }

  private updateMovementAudio(deltaSeconds: number, combatActive: boolean): void {
    this.footstepRemaining = Math.max(0, this.footstepRemaining - deltaSeconds);
    if (combatActive && this.player.isMoving && this.player.isPointerLocked && this.footstepRemaining === 0) {
      this.audio.playFootstep();
      this.footstepRemaining = 0.42;
    }
  }

  private updateBombAudio(deltaSeconds: number): void {
    if (this.bomb.current.state !== 'planted' && this.bomb.current.state !== 'defusing') {
      this.bombTickRemaining = 0;
      return;
    }
    this.bombTickRemaining = Math.max(0, this.bombTickRemaining - deltaSeconds);
    if (this.bombTickRemaining === 0) {
      const urgent = this.bomb.current.fuseRemaining < 10;
      this.audio.playBombTick(urgent);
      this.bombTickRemaining = urgent ? 0.42 : 0.85;
    }
  }

  private updateDebug(deltaSeconds: number): void {
    this.frameAccumulator += deltaSeconds;
    this.frameCount += 1;
    if (this.frameAccumulator < 0.5) {
      return;
    }
    const fps = Math.round(this.frameCount / this.frameAccumulator);
    const renderInfo = this.renderer.info.render;
    this.debugElement.textContent = `FPS ${fps.toString().padStart(3, '0')}  |  DRAW ${renderInfo.calls.toString().padStart(3, '0')}  |  TRI ${Math.round(renderInfo.triangles / 1000).toString().padStart(3, '0')}K  |  BOTS ${(this.bots?.totalAliveCount ?? 0).toString().padStart(2, '0')}`;
    this.frameAccumulator = 0;
    this.frameCount = 0;
  }

  private setStatus(status: string): void {
    this.statusElement.dataset.gameStatus = status;
    this.statusLabel.textContent = status.replaceAll('-', ' ').toUpperCase();
  }

  private readonly handleResize = (): void => {
    const width = Math.max(this.root.clientWidth, 1);
    const height = Math.max(this.root.clientHeight, 1);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' && this.match.current.phase === 'match-end') {
      document.exitPointerLock();
      this.preMatchMenu.show();
      this.setStatus('operation-setup');
      return;
    }
    if (event.code === 'KeyR' && this.match.isCombatActive) {
      this.audio.playReload();
    }
    if (event.key !== 'F3') {
      return;
    }
    event.preventDefault();
    this.debugEnabled = !this.debugEnabled;
    this.debugElement.hidden = !this.debugEnabled;
  };

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') {
      return;
    }
    this.audio.initialize();
    if (event.button === 0) {
      this.fireHeld = true;
    } else if (event.button === 2) {
      this.aimHeld = true;
    }
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') {
      return;
    }
    if (event.button === 0) {
      this.fireHeld = false;
    } else if (event.button === 2) {
      this.aimHeld = false;
    }
  };

  private readonly preventContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };
}
