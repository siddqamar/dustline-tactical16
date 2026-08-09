export type WeaponCategory = 'pistol' | 'rifle' | 'sniper';

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
    label: 'M9 VANGUARD',
    category: 'pistol',
    damage: 28,
    headMultiplier: 2.25,
    fireInterval: 0.19,
    reloadDuration: 1.45,
    magazineSize: 15,
    reserveAmmo: 60,
    range: 90,
    hipSpread: 0.012,
    movementSpread: 0.028,
    recoil: 0.032,
    adsFov: 65,
    color: 0x7e8880,
  },
  {
    id: 'handcannon',
    label: 'R6 HANDCANNON',
    category: 'pistol',
    damage: 56,
    headMultiplier: 2.4,
    fireInterval: 0.46,
    reloadDuration: 1.72,
    magazineSize: 6,
    reserveAmmo: 36,
    range: 82,
    hipSpread: 0.018,
    movementSpread: 0.044,
    recoil: 0.085,
    adsFov: 67,
    color: 0x9b815c,
  },
  {
    id: 'carbine',
    label: 'C4 CARBINE',
    category: 'rifle',
    damage: 33,
    headMultiplier: 2.2,
    fireInterval: 0.095,
    reloadDuration: 2.05,
    magazineSize: 30,
    reserveAmmo: 90,
    range: 140,
    hipSpread: 0.021,
    movementSpread: 0.06,
    recoil: 0.027,
    adsFov: 62,
    color: 0x4f5c56,
  },
  {
    id: 'battle-rifle',
    label: 'BR-12 RANGER',
    category: 'rifle',
    damage: 47,
    headMultiplier: 2.35,
    fireInterval: 0.19,
    reloadDuration: 2.18,
    magazineSize: 20,
    reserveAmmo: 80,
    range: 155,
    hipSpread: 0.015,
    movementSpread: 0.048,
    recoil: 0.057,
    adsFov: 60,
    color: 0x6c674e,
  },
  {
    id: 'marksman',
    label: 'M12 MARKSMAN',
    category: 'sniper',
    damage: 92,
    headMultiplier: 2.7,
    fireInterval: 1.05,
    reloadDuration: 2.55,
    magazineSize: 5,
    reserveAmmo: 25,
    range: 260,
    hipSpread: 0.05,
    movementSpread: 0.12,
    recoil: 0.12,
    adsFov: 24,
    color: 0x424b51,
  },
];

