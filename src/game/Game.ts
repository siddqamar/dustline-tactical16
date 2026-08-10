import * as THREE from 'three';
import { GameLoop } from './GameLoop';
import { GameState } from './GameState';
import { TacticalMap } from '../world/TacticalMap';
import { PlayerController } from '../player/PlayerController';
import { WeaponManager } from '../weapons/WeaponManager';
import { CombatSystem } from '../combat/CombatSystem';
import { Health } from '../combat/DamageSystem';
import { HUD } from '../ui/HUD';
import { RoundManager } from './RoundManager';
import { Navigation } from '../ai/Navigation';
import { BotDirector } from '../ai/BotDirector';
import { getBotDifficulty } from '../ai/BotDifficulty';
import { AudioManager } from '../audio/AudioManager';

const CLEAR_COLOR = 0x0c1113;

export class Game {
  private readonly camera: THREE.PerspectiveCamera;
  private readonly clock = new THREE.Clock();
  private readonly debugElement: HTMLDivElement;
  private readonly loop: GameLoop;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly state = new GameState();
  private readonly scene: THREE.Scene;
  private readonly map: TacticalMap;
  private readonly player: PlayerController;
  private readonly weapons: WeaponManager;
  private readonly combat: CombatSystem;
  private readonly hud: HUD;
  private readonly playerHealth = new Health(100);
  private readonly round: RoundManager;
  private readonly bots: BotDirector;
  private readonly audio = new AudioManager();
  private footstepRemaining = 0;
  private fireHeld = false;
  private readonly canvas: HTMLCanvasElement;
  private debugEnabled = false;
  private frameAccumulator = 0;
  private frameCount = 0;

  public constructor(private readonly root: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CLEAR_COLOR);
    this.scene.fog = new THREE.Fog(CLEAR_COLOR, 28, 105);

    this.camera = new THREE.PerspectiveCamera(72, 1, 0.05, 220);
    this.camera.position.set(0, 2.1, 8);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'game-canvas';
    this.canvas.setAttribute('aria-label', 'Dustline Tactical game viewport');

    this.debugElement = document.createElement('div');
    this.debugElement.className = 'game-debug';
    this.debugElement.hidden = true;

    this.loop = new GameLoop(this.update);
    this.buildRuntimePreview();
    this.map = new TacticalMap();
    this.scene.add(this.map.root);
    const navigation = new Navigation(this.map.navigationPoints, this.scene);
    const playerSpawn = this.map.spawns.find((spawn) => spawn.id === 'west-main') ?? this.map.spawns[0];
    if (!playerSpawn) {
      throw new Error('Tactical map does not define a player spawn.');
    }
    this.player = new PlayerController(this.camera, this.canvas, this.map.colliders, playerSpawn);
    this.weapons = new WeaponManager(this.camera);
    this.combat = new CombatSystem(this.scene, this.camera);
    const difficulty = getBotDifficulty(new URLSearchParams(window.location.search).get('difficulty'));
    this.bots = new BotDirector(this.scene, navigation, this.combat, this.playerHealth, this.map.spawns, this.map.coverPoints, difficulty);
    this.hud = new HUD(this.weapons);
    this.combat.subscribe((event) => this.hud.handleCombatEvent(event));
    this.combat.subscribe((event) => this.audio.handleCombatEvent(event));
    this.round = new RoundManager(this.state, this.playerHealth);
    this.round.subscribe((snapshot) => this.hud.setRound(snapshot));
    this.round.subscribe((snapshot) => this.audio.handleRound(snapshot));
    this.mount();
  }

  public start(): void {
    this.bots.reset();
    this.round.startRound();
    this.clock.start();
    this.loop.start();
  }

  public stop(): void {
    this.loop.stop();
    this.clock.stop();
  }

  private mount(): void {
    this.root.replaceChildren(this.canvas, this.createOverlay(), this.hud.element, this.debugElement);
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
        <span class="game-brand-mark">D</span>
        <span>
          <strong>DUSTLINE</strong>
          <small>TACTICAL RANGE // ONLINE</small>
        </span>
      </div>
      <div class="game-status" data-game-status="loading">
        <span class="status-dot"></span>
        <span class="status-label">INITIALIZING</span>
      </div>
      <div class="game-reticle" aria-hidden="true">
        <span></span><span></span><span></span><span></span><i></i>
      </div>
    `;

    this.state.subscribe((next) => {
      const status = overlay.querySelector<HTMLElement>('[data-game-status]');
      const label = overlay.querySelector<HTMLElement>('.status-label');
      if (!status || !label) {
        return;
      }

      status.dataset.gameStatus = next;
      label.textContent = next.replace('-', ' ').toUpperCase();
    });

    return overlay;
  }

  private buildRuntimePreview(): void {
    const hemiLight = new THREE.HemisphereLight(0xbac8c2, 0x252525, 1.5);
    this.scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffe5be, 2.2);
    keyLight.position.set(-18, 30, 12);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 90;
    keyLight.shadow.camera.left = -45;
    keyLight.shadow.camera.right = 45;
    keyLight.shadow.camera.top = 45;
    keyLight.shadow.camera.bottom = -45;
    this.scene.add(keyLight);
  }

  private readonly update = (deltaSeconds: number): void => {
    this.frameAccumulator += deltaSeconds;
    this.frameCount += 1;
    if (this.frameAccumulator >= 0.5) {
      const fps = Math.round(this.frameCount / this.frameAccumulator);
      const renderInfo = this.renderer.info.render;
      this.debugElement.textContent = `FPS ${fps.toString().padStart(3, '0')}  |  DRAW ${renderInfo.calls.toString().padStart(3, '0')}  |  TRI ${Math.round(renderInfo.triangles / 1000).toString().padStart(3, '0')}K  |  BOTS ${this.bots.aliveCount}`;
      this.frameAccumulator = 0;
      this.frameCount = 0;
    }

    this.round.update(deltaSeconds);
    this.player.setEnabled(this.round.isActive);
    this.player.update(deltaSeconds);
    this.footstepRemaining = Math.max(0, this.footstepRemaining - deltaSeconds);
    if (this.round.isActive && this.player.isMoving && this.player.isPointerLocked && this.footstepRemaining === 0) {
      this.audio.playFootstep();
      this.footstepRemaining = 0.42;
    }
    this.weapons.update(deltaSeconds);
    if (this.fireHeld && this.player.isPointerLocked && this.round.isActive) {
      const shot = this.weapons.tryFire(this.player.isMoving);
      if (shot) {
        const result = this.combat.fire(shot);
        if (result.damage && result.ownerId && result.damage.killed) {
          this.bots.markDead(result.ownerId);
        }
      }
    }
    const healthBeforeBots = this.playerHealth.current;
    this.bots.update(deltaSeconds, this.player.position, this.round.isCombatActive);
    if (this.playerHealth.current < healthBeforeBots) {
      this.hud.showDamage();
    }
    if (this.playerHealth.isDead) {
      this.round.notifyPlayerDeath();
    } else if (this.bots.aliveCount === 0) {
      this.round.notifyEnemiesEliminated();
    }
    this.combat.update(deltaSeconds);
    this.hud.setHealth(this.playerHealth.current);
    this.hud.update(deltaSeconds);
    this.renderer.render(this.scene, this.camera);
  };

  private readonly handleResize = (): void => {
    const width = Math.max(this.root.clientWidth, 1);
    const height = Math.max(this.root.clientHeight, 1);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter') {
      this.round.restart();
      return;
    }

    if (event.code === 'KeyR') {
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
    this.audio.initialize();
    if (event.button === 0) {
      this.fireHeld = true;
    }
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (event.button === 0) {
      this.fireHeld = false;
    }
  };

  private readonly preventContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };
}
