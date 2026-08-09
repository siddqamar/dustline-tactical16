import * as THREE from 'three';
import type { NavigationPoint } from '../world/WorldTypes';

export class Navigation {
  private readonly nodeById = new Map<string, NavigationPoint>();
  private readonly raycaster = new THREE.Raycaster();
  private readonly direction = new THREE.Vector3();

  public constructor(
    points: readonly NavigationPoint[],
    private readonly scene: THREE.Scene,
  ) {
    points.forEach((point) => this.nodeById.set(point.id, point));
  }

  public nearestNode(position: THREE.Vector3): NavigationPoint {
    let nearest = [...this.nodeById.values()][0];
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const node of this.nodeById.values()) {
      const distance = node.position.distanceToSquared(position);
      if (distance < nearestDistance) {
        nearest = node;
        nearestDistance = distance;
      }
    }

    if (!nearest) {
      throw new Error('Navigation graph has no nodes.');
    }
    return nearest;
  }

  public getNode(id: string): NavigationPoint | undefined {
    return this.nodeById.get(id);
  }

  public findPath(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3[] {
    const start = this.nearestNode(from);
    const goal = this.nearestNode(to);
    if (start.id === goal.id) {
      return [goal.position.clone()];
    }

    const queue = [start.id];
    const previous = new Map<string, string | null>([[start.id, null]]);
    for (let index = 0; index < queue.length; index += 1) {
      const currentId = queue[index];
      if (!currentId) {
        continue;
      }
      const current = this.nodeById.get(currentId);
      if (!current) {
        continue;
      }

      for (const neighborId of current.links) {
        if (previous.has(neighborId)) {
          continue;
        }
        previous.set(neighborId, currentId);
        queue.push(neighborId);
        if (neighborId === goal.id) {
          index = queue.length;
          break;
        }
      }
    }

    if (!previous.has(goal.id)) {
      return [goal.position.clone()];
    }

    const pathIds: string[] = [];
    let currentId: string | null = goal.id;
    while (currentId) {
      pathIds.unshift(currentId);
      currentId = previous.get(currentId) ?? null;
    }
    return pathIds.slice(1).map((id) => this.nodeById.get(id)?.position.clone()).filter((position): position is THREE.Vector3 => Boolean(position));
  }

  public canSee(from: THREE.Vector3, to: THREE.Vector3): boolean {
    this.direction.subVectors(to, from);
    const distance = this.direction.length();
    if (distance <= 0.001) {
      return true;
    }

    this.raycaster.set(from, this.direction.normalize());
    this.raycaster.far = distance - 0.12;
    const blocker = this.raycaster.intersectObject(this.scene, true).find((hit) => !this.isIgnored(hit.object));
    return !blocker;
  }

  private isIgnored(object: THREE.Object3D): boolean {
    let current: THREE.Object3D | null = object;
    while (current) {
      if (current.userData.isBot || current.userData.isImpactEffect) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }
}
