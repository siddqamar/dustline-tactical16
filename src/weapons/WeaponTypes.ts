export type WeaponCategory = 'pistol' | 'rifle' | 'knife';

export interface WeaponDefinition {
  readonly id: string;
  readonly label: string;
  readonly category: WeaponCategory;
  readonly damage: number;
  readonly headMultiplier: number;
  readonly fireInterval: number;
  readonly reloadDuration: number;
  readonly magazineSize: number;
  readonly reserveAmmo: number;
  readonly range: number;
  readonly hipSpread: number;
  readonly movementSpread: number;
  readonly recoil: number;
  readonly adsFov: number;
  readonly color: number;
}

export interface WeaponAmmo {
  magazine: number;
  reserve: number;
}

export interface WeaponShot {
  readonly weapon: WeaponDefinition;
  readonly spread: number;
  readonly recoil: number;
}

export const WEAPON_DEFINITIONS: readonly WeaponDefinition[] = [
  {
    id: 'sidearm',
    label: 'P9 SERVICE PISTOL',
    category: 'pistol',
    damage: 34,
    headMultiplier: 2.25,
    fireInterval: 0.19,
    reloadDuration: 1.45,
    magazineSize: 15,
    reserveAmmo: 60,
    range: 88,
    hipSpread: 0.012,
    movementSpread: 0.028,
    recoil: 0.032,
    adsFov: 65,
    color: 0x6d7169,
  },
  {
    id: 'rifle',
    label: 'AR-17 FIELD RIFLE',
    category: 'rifle',
    damage: 39,
    headMultiplier: 2.2,
    fireInterval: 0.095,
    reloadDuration: 2.05,
    magazineSize: 30,
    reserveAmmo: 90,
    range: 150,
    hipSpread: 0.021,
    movementSpread: 0.06,
    recoil: 0.027,
    adsFov: 62,
    color: 0x4f5147,
  },
  {
    id: 'knife',
    label: 'FIELD KNIFE',
    category: 'knife',
    damage: 86,
    headMultiplier: 1,
    fireInterval: 0.72,
    reloadDuration: 0,
    magazineSize: 1,
    reserveAmmo: 0,
    range: 2.9,
    hipSpread: 0,
    movementSpread: 0,
    recoil: 0,
    adsFov: 72,
    color: 0x7f8577,
  },
];
