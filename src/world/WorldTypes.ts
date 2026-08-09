import type * as THREE from 'three';

export interface BoxCollider {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
  readonly minZ: number;
  readonly maxZ: number;
}

export interface MapSpawn {
  readonly id: string;
  readonly position: THREE.Vector3;
  readonly yaw: number;
}

export interface CoverPoint {
  readonly id: string;
  readonly position: THREE.Vector3;
  readonly facing: THREE.Vector3;
  readonly radius: number;
}

export interface ObjectiveArea {
  readonly id: 'alpha' | 'bravo';
  readonly position: THREE.Vector3;
  readonly radius: number;
}

