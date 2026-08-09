import * as THREE from 'three';
import type { BoxCollider, CoverPoint, MapSpawn, ObjectiveArea } from './WorldTypes';

const MAP_HALF_SIZE = 38;
const WALL_HEIGHT = 3.4;

interface BoxOptions {
  readonly collidable?: boolean;
  readonly castShadow?: boolean;
  readonly receiveShadow?: boolean;
  readonly material?: THREE.Material;
}

export class TacticalMap {
  public readonly root = new THREE.Group();
  public readonly colliders: BoxCollider[] = [];
  public readonly spawns: MapSpawn[] = [];
  public readonly coverPoints: CoverPoint[] = [];
  public readonly objectives: ObjectiveArea[] = [];

  private readonly geometryCache = new Map<string, THREE.BoxGeometry>();
  private readonly materials = {
    concrete: new THREE.MeshStandardMaterial({ color: 0x716f66, roughness: 0.91, metalness: 0.03 }),
    concreteLight: new THREE.MeshStandardMaterial({ color: 0x8b8779, roughness: 0.88, metalness: 0.02 }),
    darkConcrete: new THREE.MeshStandardMaterial({ color: 0x4e524f, roughness: 0.94, metalness: 0.02 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x725a3c, roughness: 0.83, metalness: 0.02 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x555c58, roughness: 0.54, metalness: 0.46 }),
    siteAlpha: new THREE.MeshStandardMaterial({ color: 0xa99542, roughness: 0.73, metalness: 0.04, emissive: 0x342e0a, emissiveIntensity: 0.3 }),
    siteBravo: new THREE.MeshStandardMaterial({ color: 0x4b8b8c, roughness: 0.72, metalness: 0.05, emissive: 0x0a2d2d, emissiveIntensity: 0.34 }),
    ground: new THREE.MeshStandardMaterial({ color: 0x373b38, roughness: 0.98, metalness: 0.01 }),
  };

  public constructor() {
    this.buildGround();
    this.buildPerimeter();
    this.buildRoutes();
    this.buildSpawnCompounds();
    this.buildObjectiveAreas();
    this.buildCoverAndDetails();
    this.defineNavigationData();
  }

  private buildGround(): void {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(MAP_HALF_SIZE * 2, MAP_HALF_SIZE * 2), this.materials.ground);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.root.add(ground);

    const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x484b46, roughness: 0.97, metalness: 0.01 });
    this.addBox(new THREE.Vector3(0, 0.025, 0), new THREE.Vector3(10, 0.05, 74), { material: roadMaterial, collidable: false });
    this.addBox(new THREE.Vector3(0, 0.028, -20), new THREE.Vector3(64, 0.055, 7), { material: roadMaterial, collidable: false });
    this.addBox(new THREE.Vector3(0, 0.03, 20), new THREE.Vector3(64, 0.06, 7), { material: roadMaterial, collidable: false });
  }

  private buildPerimeter(): void {
    this.addBox(new THREE.Vector3(-MAP_HALF_SIZE, WALL_HEIGHT / 2, 0), new THREE.Vector3(1.2, WALL_HEIGHT, 76));
    this.addBox(new THREE.Vector3(MAP_HALF_SIZE, WALL_HEIGHT / 2, 0), new THREE.Vector3(1.2, WALL_HEIGHT, 76));
    this.addBox(new THREE.Vector3(0, WALL_HEIGHT / 2, -MAP_HALF_SIZE), new THREE.Vector3(76, WALL_HEIGHT, 1.2));
    this.addBox(new THREE.Vector3(0, WALL_HEIGHT / 2, MAP_HALF_SIZE), new THREE.Vector3(76, WALL_HEIGHT, 1.2));

    for (const x of [-30, -18, 18, 30]) {
      this.addBox(new THREE.Vector3(x, 0.2, -37.1), new THREE.Vector3(0.42, 0.4, 0.35), { material: this.materials.concreteLight });
    }
  }

  private buildRoutes(): void {
    this.addBox(new THREE.Vector3(-16, WALL_HEIGHT / 2, -8), new THREE.Vector3(18, WALL_HEIGHT, 0.8));
    this.addBox(new THREE.Vector3(16, WALL_HEIGHT / 2, -8), new THREE.Vector3(18, WALL_HEIGHT, 0.8));
    this.addBox(new THREE.Vector3(-16, WALL_HEIGHT / 2, 8), new THREE.Vector3(18, WALL_HEIGHT, 0.8));
    this.addBox(new THREE.Vector3(16, WALL_HEIGHT / 2, 8), new THREE.Vector3(18, WALL_HEIGHT, 0.8));

    this.addBox(new THREE.Vector3(-23, WALL_HEIGHT / 2, -14), new THREE.Vector3(0.8, WALL_HEIGHT, 11));
    this.addBox(new THREE.Vector3(-23, WALL_HEIGHT / 2, 14), new THREE.Vector3(0.8, WALL_HEIGHT, 11));
    this.addBox(new THREE.Vector3(23, WALL_HEIGHT / 2, -14), new THREE.Vector3(0.8, WALL_HEIGHT, 11));
    this.addBox(new THREE.Vector3(23, WALL_HEIGHT / 2, 14), new THREE.Vector3(0.8, WALL_HEIGHT, 11));

    this.addBuilding(new THREE.Vector3(-5.5, 1.7, -23), new THREE.Vector3(16, 3.4, 8), 'upper');
    this.addBuilding(new THREE.Vector3(5.5, 1.7, 23), new THREE.Vector3(16, 3.4, 8), 'lower');

    this.addStepSet(new THREE.Vector3(-15, 0, 0), 1, 5, 1.1, 1.7);
    this.addStepSet(new THREE.Vector3(15, 0, 0), 1, 5, 1.1, 1.7);
  }

  private buildSpawnCompounds(): void {
    this.addBox(new THREE.Vector3(-31.5, 1.7, -19), new THREE.Vector3(5, 3.4, 11));
    this.addBox(new THREE.Vector3(-31.5, 1.7, 19), new THREE.Vector3(5, 3.4, 11));
    this.addBox(new THREE.Vector3(31.5, 1.7, -19), new THREE.Vector3(5, 3.4, 11));
    this.addBox(new THREE.Vector3(31.5, 1.7, 19), new THREE.Vector3(5, 3.4, 11));

    this.addBox(new THREE.Vector3(-27, 1.1, -31), new THREE.Vector3(15, 2.2, 0.8), { material: this.materials.darkConcrete });
    this.addBox(new THREE.Vector3(27, 1.1, 31), new THREE.Vector3(15, 2.2, 0.8), { material: this.materials.darkConcrete });
    this.addBox(new THREE.Vector3(-27, 1.1, 31), new THREE.Vector3(15, 2.2, 0.8), { material: this.materials.darkConcrete });
    this.addBox(new THREE.Vector3(27, 1.1, -31), new THREE.Vector3(15, 2.2, 0.8), { material: this.materials.darkConcrete });

    this.addBox(new THREE.Vector3(-33.5, 0.75, 0), new THREE.Vector3(3, 1.5, 7), { material: this.materials.concreteLight });
    this.addBox(new THREE.Vector3(33.5, 0.75, 0), new THREE.Vector3(3, 1.5, 7), { material: this.materials.concreteLight });

    this.spawns.push(
      { id: 'west-main', position: new THREE.Vector3(-29, 1.65, 0), yaw: 0 },
      { id: 'west-upper', position: new THREE.Vector3(-30, 1.65, -19), yaw: 0.4 },
      { id: 'east-main', position: new THREE.Vector3(29, 1.65, 0), yaw: Math.PI },
      { id: 'east-lower', position: new THREE.Vector3(30, 1.65, 19), yaw: Math.PI - 0.4 },
    );
  }

  private buildObjectiveAreas(): void {
    this.addObjective('alpha', new THREE.Vector3(-22, 0.06, -22), this.materials.siteAlpha);
    this.addObjective('bravo', new THREE.Vector3(22, 0.06, 22), this.materials.siteBravo);
  }

  private addObjective(id: 'alpha' | 'bravo', position: THREE.Vector3, material: THREE.Material): void {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.2, 0.12, 32), material);
    pad.position.copy(position);
    pad.receiveShadow = true;
    this.root.add(pad);

    const ring = new THREE.Mesh(new THREE.RingGeometry(5.2, 5.45, 32), material);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(position.x, position.y + 0.08, position.z);
    this.root.add(ring);

    this.objectives.push({ id, position: position.clone(), radius: 5.2 });
  }

  private buildCoverAndDetails(): void {
    this.addCrateStack(new THREE.Vector3(-12, 0, 0), 2, this.materials.wood);
    this.addCrateStack(new THREE.Vector3(12, 0, 0), 2, this.materials.wood);
    this.addCrateStack(new THREE.Vector3(-16, 0, -19), 3, this.materials.wood);
    this.addCrateStack(new THREE.Vector3(16, 0, 19), 3, this.materials.wood);
    this.addCrateStack(new THREE.Vector3(0, 0, 15), 2, this.materials.wood);
    this.addBarrelCluster(new THREE.Vector3(-3, 0, -16));
    this.addBarrelCluster(new THREE.Vector3(4, 0, 16));

    this.addBox(new THREE.Vector3(-3, 1.4, 0), new THREE.Vector3(1.3, 2.8, 5.5), { material: this.materials.metal });
    this.addBox(new THREE.Vector3(3, 1.4, 0), new THREE.Vector3(1.3, 2.8, 5.5), { material: this.materials.metal });
  }

  private addCrateStack(position: THREE.Vector3, count: number, material: THREE.Material): void {
    const size = 1.6;
    for (let index = 0; index < count; index += 1) {
      const offset = index % 2 === 0 ? -0.48 : 0.48;
      this.addBox(new THREE.Vector3(position.x + offset, size / 2 + (index > 1 ? size : 0), position.z), new THREE.Vector3(size, size, size), { material });
    }

    this.coverPoints.push({
      id: `crate-${position.x}-${position.z}`,
      position: position.clone().setY(1.65),
      facing: new THREE.Vector3(position.x > 0 ? -1 : 1, 0, 0),
      radius: 2.4,
    });
  }

  private addBarrelCluster(position: THREE.Vector3): void {
    const barrelGeometry = new THREE.CylinderGeometry(0.55, 0.62, 1.2, 16);
    for (const offset of [-0.62, 0, 0.62]) {
      const barrel = new THREE.Mesh(barrelGeometry, this.materials.metal);
      barrel.position.set(position.x + offset, 0.6, position.z + (offset === 0 ? 0.35 : 0));
      barrel.castShadow = true;
      barrel.receiveShadow = true;
      this.root.add(barrel);
      this.colliders.push(this.createCollider(barrel.position, new THREE.Vector3(0.62, 0.6, 0.62)));
    }

    this.coverPoints.push({
      id: `barrels-${position.x}-${position.z}`,
      position: position.clone().setY(1.2),
      facing: new THREE.Vector3(0, 0, 1),
      radius: 2.2,
    });
  }

  private addBuilding(position: THREE.Vector3, size: THREE.Vector3, id: string): void {
    const wallThickness = 0.7;
    const opening = 4.2;
    const sideLength = (size.x - opening) / 2;
    this.addBox(new THREE.Vector3(position.x - (opening + sideLength) / 2, position.y, position.z - size.z / 2), new THREE.Vector3(sideLength, size.y, wallThickness));
    this.addBox(new THREE.Vector3(position.x + (opening + sideLength) / 2, position.y, position.z - size.z / 2), new THREE.Vector3(sideLength, size.y, wallThickness));
    this.addBox(new THREE.Vector3(position.x, position.y, position.z + size.z / 2), new THREE.Vector3(size.x, size.y, wallThickness));
    this.addBox(new THREE.Vector3(position.x - size.x / 2, position.y, position.z), new THREE.Vector3(wallThickness, size.y, size.z));
    this.addBox(new THREE.Vector3(position.x + size.x / 2, position.y, position.z), new THREE.Vector3(wallThickness, size.y, size.z));

    const sign = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.6, 0.08), id === 'upper' ? this.materials.siteAlpha : this.materials.siteBravo);
    sign.position.set(position.x, position.y + 0.9, position.z - size.z / 2 - 0.06);
    sign.castShadow = true;
    this.root.add(sign);
  }

  private addStepSet(position: THREE.Vector3, direction: number, count: number, width: number, depth: number): void {
    for (let index = 0; index < count; index += 1) {
      const height = 0.18 * (index + 1);
      this.addBox(
        new THREE.Vector3(position.x + direction * depth * index, height / 2, position.z),
        new THREE.Vector3(depth, height, width),
        { material: this.materials.concreteLight },
      );
    }
  }

  private defineNavigationData(): void {
    const navigationPoints = [
      new THREE.Vector3(-27, 1.65, 0),
      new THREE.Vector3(-18, 1.65, 0),
      new THREE.Vector3(0, 1.65, 0),
      new THREE.Vector3(18, 1.65, 0),
      new THREE.Vector3(27, 1.65, 0),
      new THREE.Vector3(-21, 1.65, -20),
      new THREE.Vector3(0, 1.65, -20),
      new THREE.Vector3(21, 1.65, -20),
      new THREE.Vector3(-21, 1.65, 20),
      new THREE.Vector3(0, 1.65, 20),
      new THREE.Vector3(21, 1.65, 20),
    ];

    navigationPoints.forEach((position, index) => {
      this.coverPoints.push({
        id: `nav-${index}`,
        position: position.clone(),
        facing: new THREE.Vector3(index < navigationPoints.length / 2 ? 1 : -1, 0, 0),
        radius: 3.2,
      });
    });
  }

  private addBox(position: THREE.Vector3, size: THREE.Vector3, options: BoxOptions = {}): THREE.Mesh {
    const geometry = this.getBoxGeometry(size);
    const mesh = new THREE.Mesh(geometry, options.material ?? this.materials.concrete);
    mesh.position.copy(position);
    mesh.castShadow = options.castShadow ?? true;
    mesh.receiveShadow = options.receiveShadow ?? true;
    this.root.add(mesh);

    if (options.collidable !== false && size.y > 0.25) {
      this.colliders.push(this.createCollider(position, size));
    }

    return mesh;
  }

  private getBoxGeometry(size: THREE.Vector3): THREE.BoxGeometry {
    const key = `${size.x}:${size.y}:${size.z}`;
    const cached = this.geometryCache.get(key);
    if (cached) {
      return cached;
    }

    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    this.geometryCache.set(key, geometry);
    return geometry;
  }

  private createCollider(position: THREE.Vector3, size: THREE.Vector3): BoxCollider {
    return {
      minX: position.x - size.x / 2,
      maxX: position.x + size.x / 2,
      minY: position.y - size.y / 2,
      maxY: position.y + size.y / 2,
      minZ: position.z - size.z / 2,
      maxZ: position.z + size.z / 2,
    };
  }
}

