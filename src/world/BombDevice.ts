import * as THREE from 'three';
import type { BombSnapshot } from '../match/BombSystem';

export class BombDevice {
  public readonly root = new THREE.Group();

  private readonly statusLight: THREE.Mesh;
  private readonly blast: THREE.Mesh;
  private readonly blastLight = new THREE.PointLight(0xffa04a, 0, 24, 2);
  private elapsed = 0;
  private blastRemaining = 0;

  public constructor(scene: THREE.Scene) {
    this.root.name = 'breach-device';
    this.root.userData.isImpactEffect = true;
    const caseMaterial = new THREE.MeshStandardMaterial({ color: 0x202723, roughness: 0.7, metalness: 0.36 });
    const panelMaterial = new THREE.MeshStandardMaterial({ color: 0x101515, roughness: 0.38, metalness: 0.62 });
    const wireMaterial = new THREE.MeshStandardMaterial({ color: 0xb87932, roughness: 0.58, metalness: 0.24 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.26, 0.52), caseMaterial);
    body.castShadow = true;
    this.root.add(body);

    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.32), panelMaterial);
    panel.position.y = 0.15;
    panel.rotation.x = -0.05;
    this.root.add(panel);

    for (const offset of [-0.16, 0, 0.16]) {
      const wire = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.018, 6, 18, Math.PI), wireMaterial);
      wire.position.set(offset, 0.18, 0);
      wire.rotation.set(Math.PI / 2, 0, Math.PI / 2);
      this.root.add(wire);
    }

    this.statusLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xff4838 }),
    );
    this.statusLight.position.set(0.14, 0.19, -0.05);
    this.root.add(this.statusLight);

    this.blast = new THREE.Mesh(
      new THREE.SphereGeometry(1, 20, 14),
      new THREE.MeshBasicMaterial({ color: 0xffb25f, transparent: true, opacity: 0, depthWrite: false }),
    );
    this.blast.visible = false;
    scene.add(this.root, this.blast, this.blastLight);
  }

  public sync(snapshot: BombSnapshot): void {
    this.root.position.set(snapshot.position.x, Math.max(0.2, snapshot.position.y), snapshot.position.z);
    this.root.visible = snapshot.state !== 'idle' && snapshot.state !== 'defused' && snapshot.state !== 'exploded';
    if (snapshot.state === 'planted' || snapshot.state === 'defusing') {
      this.root.rotation.set(0, this.root.rotation.y, 0);
    } else {
      this.root.rotation.set(0.22, this.root.rotation.y, 0.08);
    }
    if (snapshot.state === 'exploded') {
      this.triggerBlast();
    }
  }

  public update(deltaSeconds: number, armed: boolean): void {
    this.elapsed += deltaSeconds;
    this.statusLight.visible = !armed || Math.sin(this.elapsed * 12) > 0;
    this.root.rotation.y += armed ? deltaSeconds * 0.06 : deltaSeconds * 0.18;
    if (this.blastRemaining <= 0) {
      return;
    }
    this.blastRemaining = Math.max(0, this.blastRemaining - deltaSeconds);
    const progress = 1 - this.blastRemaining / 0.65;
    this.blast.visible = this.blastRemaining > 0;
    this.blast.scale.setScalar(1 + progress * 12);
    const material = this.blast.material as THREE.MeshBasicMaterial;
    material.opacity = Math.max(0, 0.75 * (1 - progress));
    this.blastLight.intensity = Math.max(0, 22 * (1 - progress));
  }

  private triggerBlast(): void {
    this.blast.position.copy(this.root.position);
    this.blastLight.position.copy(this.root.position);
    this.blastRemaining = 0.65;
    this.blast.visible = true;
  }
}
