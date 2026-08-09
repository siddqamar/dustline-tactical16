import * as THREE from 'three';
import { GameLoop } from './GameLoop';
import { GameState } from './GameState';

const CLEAR_COLOR = 0x0c1113;
const WORLD_SIZE = 120;

export class Game {
  private readonly camera: THREE.PerspectiveCamera;
  private readonly clock = new THREE.Clock();
  private readonly debugElement: HTMLDivElement;
  private readonly loop: GameLoop;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly state = new GameState();
  private readonly scene: THREE.Scene;
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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
    this.mount();
  }

  public start(): void {
    this.state.set('playing');
    this.clock.start();
    this.loop.start();
  }

  public stop(): void {
    this.loop.stop();
    this.clock.stop();
  }

  private mount(): void {
    this.root.replaceChildren(this.canvas, this.createOverlay(), this.debugElement);
    window.addEventListener('resize', this.handleResize, { passive: true });
    window.addEventListener('keydown', this.handleKeyDown);
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

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE),
      new THREE.MeshStandardMaterial({ color: 0x303a38, roughness: 0.96, metalness: 0.02 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const laneMaterial = new THREE.MeshStandardMaterial({
      color: 0x5c665d,
      roughness: 0.84,
      metalness: 0.08,
    });
    const lane = new THREE.Mesh(new THREE.BoxGeometry(28, 0.12, 52), laneMaterial);
    lane.position.y = 0.06;
    lane.receiveShadow = true;
    this.scene.add(lane);

    const markerMaterial = new THREE.MeshStandardMaterial({
      color: 0xb8c46d,
      roughness: 0.56,
      metalness: 0.16,
      emissive: 0x353c18,
      emissiveIntensity: 0.5,
    });
    const markerGeometry = new THREE.BoxGeometry(2.4, 0.2, 0.35);
    for (const z of [-20, -8, 4, 16]) {
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.set(0, 0.16, z);
      marker.castShadow = true;
      this.scene.add(marker);
    }

    const coverMaterial = new THREE.MeshStandardMaterial({
      color: 0x555b56,
      roughness: 0.88,
      metalness: 0.06,
    });
    const coverGeometry = new THREE.BoxGeometry(4.2, 2.1, 2.2);
    for (const position of [
      new THREE.Vector3(-9, 1.05, -16),
      new THREE.Vector3(9, 1.05, -2),
      new THREE.Vector3(-8, 1.05, 12),
    ]) {
      const cover = new THREE.Mesh(coverGeometry, coverMaterial);
      cover.position.copy(position);
      cover.castShadow = true;
      cover.receiveShadow = true;
      this.scene.add(cover);
    }
  }

  private readonly update = (deltaSeconds: number): void => {
    this.frameAccumulator += deltaSeconds;
    this.frameCount += 1;
    if (this.frameAccumulator >= 0.5) {
      const fps = Math.round(this.frameCount / this.frameAccumulator);
      this.debugElement.textContent = `FPS ${fps.toString().padStart(3, '0')}  |  STATE ${this.state.current.toUpperCase()}`;
      this.frameAccumulator = 0;
      this.frameCount = 0;
    }

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
    if (event.key !== 'F3') {
      return;
    }

    event.preventDefault();
    this.debugEnabled = !this.debugEnabled;
    this.debugElement.hidden = !this.debugEnabled;
  };
}

