import * as THREE from 'three';
import type { BoxCollider, CoverPoint, MapSpawn, NavigationPoint, ObjectiveArea } from './WorldTypes';
import { createSurfaceTexture } from './SurfaceTexture';

const MAP_HALF_SIZE = 42;
const WALL_HEIGHT = 4.2;

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
  public readonly navigationPoints: NavigationPoint[] = [];
  public readonly objectives: ObjectiveArea[] = [];

  private readonly geometryCache = new Map<string, THREE.BoxGeometry>();
  private readonly materials = {
    concrete: new THREE.MeshStandardMaterial({ color: 0x6f6757, map: createSurfaceTexture('concrete', 1.5, 1.5), roughness: 0.93, metalness: 0.03 }),
    concreteLight: new THREE.MeshStandardMaterial({ color: 0x9a8d72, map: createSurfaceTexture('concrete', 1.1, 1.1), roughness: 0.9, metalness: 0.02 }),
    darkConcrete: new THREE.MeshStandardMaterial({ color: 0x3f403b, map: createSurfaceTexture('concrete', 2, 2), roughness: 0.96, metalness: 0.02 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x765839, map: createSurfaceTexture('wood', 1.2, 1.2), roughness: 0.86, metalness: 0.02 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x4f514a, map: createSurfaceTexture('metal', 1.3, 1.3), roughness: 0.62, metalness: 0.42 }),
    siteAlpha: new THREE.MeshStandardMaterial({ color: 0xb49d51, roughness: 0.76, metalness: 0.04, emissive: 0x3f300a, emissiveIntensity: 0.2 }),
    siteBravo: new THREE.MeshStandardMaterial({ color: 0x8f6047, roughness: 0.75, metalness: 0.05, emissive: 0x32160d, emissiveIntensity: 0.2 }),
    ground: new THREE.MeshStandardMaterial({ color: 0xb58b56, map: createSurfaceTexture('ground', 4, 4), roughness: 1, metalness: 0.01 }),
    paint: new THREE.MeshStandardMaterial({ color: 0xc4ae72, roughness: 0.81, metalness: 0.03 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x52625e, roughness: 0.24, metalness: 0.28, transparent: true, opacity: 0.58, emissive: 0x17221e, emissiveIntensity: 0.18 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x181b1a, roughness: 0.96, metalness: 0.01 }),
  };

  public constructor() {
    this.buildGround();
    this.buildPerimeter();
    this.buildRoutes();
    this.buildSpawnCompounds();
    this.buildObjectiveAreas();
    this.buildCoverAndDetails();
    this.buildEnvironmentalDetails();
    this.defineNavigationData();
  }

  private buildGround(): void {
    const groundTexture = new THREE.TextureLoader().load('/assets/sable-desert-ground.png');
    groundTexture.colorSpace = THREE.SRGBColorSpace;
    groundTexture.wrapS = THREE.RepeatWrapping;
    groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(7, 7);
    this.materials.ground.map = groundTexture;
    this.materials.ground.needsUpdate = true;

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(MAP_HALF_SIZE * 2, MAP_HALF_SIZE * 2), this.materials.ground);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.root.add(ground);

    const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x5e5140, map: createSurfaceTexture('ground', 2.8, 2.8), roughness: 0.99, metalness: 0.01 });
    this.addBox(new THREE.Vector3(0, 0.025, 0), new THREE.Vector3(10, 0.05, 74), { material: roadMaterial, collidable: false });
    this.addBox(new THREE.Vector3(0, 0.028, -20), new THREE.Vector3(64, 0.055, 7), { material: roadMaterial, collidable: false });
    this.addBox(new THREE.Vector3(0, 0.03, 20), new THREE.Vector3(64, 0.06, 7), { material: roadMaterial, collidable: false });
    this.addDune(new THREE.Vector3(-35, 0, 28), 10, 2.4);
    this.addDune(new THREE.Vector3(34, 0, -26), 8, 1.9);
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
      { id: 'west-main', position: new THREE.Vector3(-29, 1.65, 0), yaw: -Math.PI / 2 },
      { id: 'west-upper', position: new THREE.Vector3(-27, 1.65, -26), yaw: -Math.PI / 2 },
      { id: 'east-main', position: new THREE.Vector3(29, 1.65, 0), yaw: Math.PI / 2 },
      { id: 'east-lower', position: new THREE.Vector3(27, 1.65, 26), yaw: Math.PI / 2 },
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
    this.addBox(new THREE.Vector3(position.x, position.y + size.y / 2, position.z), new THREE.Vector3(size.x + 0.2, 0.28, size.z + 0.2), { material: this.materials.metal });

    for (const windowOffset of [-3.2, 3.2]) {
      this.addBox(
        new THREE.Vector3(position.x + windowOffset, position.y + 0.25, position.z + size.z / 2 + 0.365),
        new THREE.Vector3(2.2, 0.9, 0.04),
        { material: this.materials.glass, collidable: false, castShadow: false },
      );
    }

    const sign = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.6, 0.08), id === 'upper' ? this.materials.siteAlpha : this.materials.siteBravo);
    sign.position.set(position.x, position.y + 0.9, position.z - size.z / 2 - 0.06);
    sign.castShadow = true;
    this.root.add(sign);
  }

  private buildEnvironmentalDetails(): void {
    this.addRoadMarkings();
    this.addUtilityLights();
    this.addPipeRuns();
    this.addSecurityDetails();
    this.addGroundDetails();
    this.addWayfindingSign('A // RELAY', new THREE.Vector3(-21.5, 2.5, -27.8), 0, 0xc3ad55);
    this.addWayfindingSign('B // YARD', new THREE.Vector3(21.5, 2.5, 27.8), Math.PI, 0x5aa5a5);
    this.addWatchtower(new THREE.Vector3(-34, 0, -29), 'NORTH WATCH');
    this.addWatchtower(new THREE.Vector3(34, 0, 29), 'SOUTH WATCH');
    this.addRelayDish(new THREE.Vector3(12, 0, -25));
    this.addShippingContainer(new THREE.Vector3(-11, 1.15, 27), Math.PI / 2, 0x656044);
    this.addShippingContainer(new THREE.Vector3(11, 1.15, -27), -Math.PI / 2, 0x4c5148);
    this.addRockCluster(new THREE.Vector3(-31, 0, 30), 5);
    this.addRockCluster(new THREE.Vector3(31, 0, -30), 4);
    this.addDesertBrush(new THREE.Vector3(-7, 0, 29));
    this.addDesertBrush(new THREE.Vector3(7, 0, -29));
  }

  private addDune(position: THREE.Vector3, width: number, height: number): void {
    const duneMaterial = new THREE.MeshStandardMaterial({ color: 0xa68151, roughness: 1, metalness: 0 });
    const dune = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), duneMaterial);
    dune.position.copy(position);
    dune.scale.set(width, height, width * 0.54);
    dune.receiveShadow = true;
    this.root.add(dune);
  }

  private addWatchtower(position: THREE.Vector3, label: string): void {
    const towerGroup = new THREE.Group();
    towerGroup.position.copy(position);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x343936, roughness: 0.72, metalness: 0.62 });
    const cabinMaterial = new THREE.MeshStandardMaterial({ color: 0x554b3e, roughness: 0.86, metalness: 0.3 });
    for (const x of [-1.2, 1.2]) {
      for (const z of [-1.2, 1.2]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 6.6, 8), legMaterial);
        leg.position.set(x, 3.3, z);
        leg.castShadow = true;
        towerGroup.add(leg);
      }
    }
    const platform = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.25, 3.2), legMaterial);
    platform.position.y = 6.2;
    platform.castShadow = true;
    towerGroup.add(platform);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.55, 2.7), cabinMaterial);
    cabin.position.y = 7.05;
    cabin.castShadow = true;
    towerGroup.add(cabin);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.15, 0.65, 4), legMaterial);
    roof.position.y = 8.15;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    towerGroup.add(roof);
    this.root.add(towerGroup);

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 0.42),
      new THREE.MeshStandardMaterial({ color: 0x2d3028, roughness: 0.82, metalness: 0.08 }),
    );
    sign.position.set(position.x, 5.3, position.z + 1.7);
    sign.rotation.x = -Math.PI / 2;
    this.root.add(sign);
    void label;
  }

  private addRelayDish(position: THREE.Vector3): void {
    const dishMaterial = new THREE.MeshStandardMaterial({ color: 0x85816e, roughness: 0.42, metalness: 0.66 });
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 5.8, 12), this.materials.metal);
    mast.position.set(position.x, 2.9, position.z);
    mast.castShadow = true;
    this.root.add(mast);
    const dish = new THREE.Mesh(new THREE.SphereGeometry(2.15, 24, 12, 0, Math.PI, 0, Math.PI / 2), dishMaterial);
    dish.position.set(position.x, 5.45, position.z);
    dish.rotation.z = -0.32;
    dish.castShadow = true;
    this.root.add(dish);
  }

  private addShippingContainer(position: THREE.Vector3, rotationY: number, color: number): void {
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.74, metalness: 0.52, map: createSurfaceTexture('metal', 2, 2) });
    const container = this.addBox(position, new THREE.Vector3(3.2, 2.3, 9.2), { material });
    container.rotation.y = rotationY;
  }

  private addRockCluster(position: THREE.Vector3, count: number): void {
    const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x5c5141, roughness: 0.98, metalness: 0 });
    for (let index = 0; index < count; index += 1) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45 + index * 0.07, 0), rockMaterial);
      rock.position.set(position.x + (index - count / 2) * 0.7, 0.34 + index * 0.05, position.z + Math.sin(index) * 0.5);
      rock.scale.set(1.2, 0.8 + (index % 2) * 0.26, 0.8);
      rock.rotation.set(0.2 * index, 0.4 * index, 0.1 * index);
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.root.add(rock);
    }
  }

  private addDesertBrush(position: THREE.Vector3): void {
    const brushMaterial = new THREE.MeshStandardMaterial({ color: 0x5f623b, roughness: 1, metalness: 0 });
    for (let index = 0; index < 7; index += 1) {
      const blade = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.85 + index * 0.03, 5), brushMaterial);
      blade.position.set(position.x + Math.cos(index) * 0.48, 0.4, position.z + Math.sin(index) * 0.42);
      blade.rotation.z = (index - 3) * 0.08;
      blade.castShadow = true;
      this.root.add(blade);
    }
  }

  private addRoadMarkings(): void {
    for (let z = -32; z <= 32; z += 8) {
      this.addBox(new THREE.Vector3(0, 0.062, z), new THREE.Vector3(0.16, 0.016, 3.8), { material: this.materials.paint, collidable: false, castShadow: false });
    }
    for (const x of [-26, -18, 18, 26]) {
      this.addBox(new THREE.Vector3(x, 0.064, -20), new THREE.Vector3(3.8, 0.018, 0.14), { material: this.materials.paint, collidable: false, castShadow: false });
      this.addBox(new THREE.Vector3(x, 0.064, 20), new THREE.Vector3(3.8, 0.018, 0.14), { material: this.materials.paint, collidable: false, castShadow: false });
    }
  }

  private addUtilityLights(): void {
    const poleMaterial = this.materials.metal;
    const lampMaterial = new THREE.MeshStandardMaterial({ color: 0xd9d1b0, emissive: 0xffdf9d, emissiveIntensity: 3.2, roughness: 0.28 });
    const positions = [
      new THREE.Vector3(-18, 0, -30),
      new THREE.Vector3(18, 0, -30),
      new THREE.Vector3(-18, 0, 30),
      new THREE.Vector3(18, 0, 30),
    ];
    positions.forEach((position, index) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 5.8, 10), poleMaterial);
      pole.position.set(position.x, 2.9, position.z);
      pole.castShadow = true;
      this.root.add(pole);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 0.1), poleMaterial);
      arm.position.set(position.x + (position.x < 0 ? 0.55 : -0.55), 5.65, position.z);
      this.root.add(arm);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.26), lampMaterial);
      lamp.position.set(position.x + (position.x < 0 ? 1.08 : -1.08), 5.55, position.z);
      this.root.add(lamp);
      if (index < 2) {
        const light = new THREE.PointLight(0xffce88, 5.5, 18, 2);
        light.position.copy(lamp.position).setY(5.2);
        this.root.add(light);
      }
    });
  }

  private addPipeRuns(): void {
    const pipeMaterial = new THREE.MeshStandardMaterial({ color: 0x6b7772, roughness: 0.5, metalness: 0.58 });
    for (const z of [-11, 11]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 27, 14), pipeMaterial);
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(0, 2.75, z);
      pipe.castShadow = true;
      this.root.add(pipe);
      for (const x of [-12, 0, 12]) {
        const support = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.8, 0.18), this.materials.metal);
        support.position.set(x, 1.4, z);
        support.castShadow = true;
        this.root.add(support);
      }
    }
  }

  private addSecurityDetails(): void {
    for (const x of [-33, -27, 27, 33]) {
      const barrier = this.addBox(new THREE.Vector3(x, 0.42, x < 0 ? 6 : -6), new THREE.Vector3(3.8, 0.84, 0.55), { material: this.materials.concreteLight });
      barrier.rotation.y = x < 0 ? -0.1 : 0.1;
    }
    for (const x of [-30, -10, 10, 30]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.8, 8), this.materials.metal);
      post.position.set(x, 1.4, -36.2);
      post.castShadow = true;
      this.root.add(post);
    }
  }

  private addGroundDetails(): void {
    const puddleMaterial = new THREE.MeshStandardMaterial({ color: 0x263536, roughness: 0.12, metalness: 0.58, transparent: true, opacity: 0.7 });
    const puddles = [
      new THREE.Vector3(-8, 0.071, 5),
      new THREE.Vector3(14, 0.071, -4),
      new THREE.Vector3(5, 0.071, 29),
    ];
    puddles.forEach((position, index) => {
      const puddle = new THREE.Mesh(new THREE.CircleGeometry(1.2 + index * 0.35, 22), puddleMaterial);
      puddle.rotation.x = -Math.PI / 2;
      puddle.scale.x = 1.8;
      puddle.position.copy(position);
      puddle.receiveShadow = true;
      this.root.add(puddle);
    });

    const tireGeometry = new THREE.TorusGeometry(0.43, 0.13, 9, 18);
    for (const position of [new THREE.Vector3(-26, 0.48, 27), new THREE.Vector3(25, 0.48, -27)]) {
      const tire = new THREE.Mesh(tireGeometry, this.materials.rubber);
      tire.position.copy(position);
      tire.rotation.y = Math.PI / 2;
      tire.castShadow = true;
      this.root.add(tire);
    }
  }

  private addWayfindingSign(label: string, position: THREE.Vector3, rotationY: number, accent: number): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }
    context.fillStyle = '#101617';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = `#${accent.toString(16).padStart(6, '0')}`;
    context.fillRect(0, 0, 16, canvas.height);
    context.strokeStyle = '#596461';
    context.lineWidth = 3;
    context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    context.fillStyle = '#e4e9e1';
    context.font = '700 52px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label, canvas.width / 2, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6, metalness: 0.18, emissive: accent, emissiveIntensity: 0.08 });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 1.2), material);
    sign.position.copy(position);
    sign.rotation.y = rotationY;
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
    const navigationPoints: readonly NavigationPoint[] = [
      { id: 'west', position: new THREE.Vector3(-27, 1.65, 0), links: ['west-mid', 'upper-west', 'lower-west'] },
      { id: 'west-mid', position: new THREE.Vector3(-18, 1.65, 0), links: ['west', 'center', 'upper-west', 'upper-center'] },
      { id: 'center', position: new THREE.Vector3(0, 1.65, 0), links: ['west-mid', 'east-mid', 'upper-center', 'lower-center'] },
      { id: 'east-mid', position: new THREE.Vector3(18, 1.65, 0), links: ['center', 'east', 'upper-center', 'lower-center'] },
      { id: 'east', position: new THREE.Vector3(27, 1.65, 0), links: ['east-mid', 'upper-east', 'lower-east'] },
      { id: 'upper-west', position: new THREE.Vector3(-21, 1.65, -20), links: ['west', 'west-mid', 'upper-center'] },
      { id: 'upper-center', position: new THREE.Vector3(0, 1.65, -20), links: ['upper-west', 'upper-east', 'west-mid', 'east-mid'] },
      { id: 'upper-east', position: new THREE.Vector3(21, 1.65, -20), links: ['upper-center', 'east'] },
      { id: 'lower-west', position: new THREE.Vector3(-21, 1.65, 20), links: ['west', 'lower-center'] },
      { id: 'lower-center', position: new THREE.Vector3(0, 1.65, 20), links: ['lower-west', 'lower-east', 'center', 'east-mid'] },
      { id: 'lower-east', position: new THREE.Vector3(21, 1.65, 20), links: ['lower-center', 'east'] },
    ];

    navigationPoints.forEach((node, index) => {
      this.navigationPoints.push(node);
      this.coverPoints.push({
        id: `nav-${index}`,
        position: node.position.clone(),
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
