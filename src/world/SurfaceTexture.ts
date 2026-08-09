import * as THREE from 'three';

type SurfaceType = 'concrete' | 'wood' | 'metal' | 'ground';

const SURFACE_COLORS: Record<SurfaceType, { readonly base: [number, number, number]; readonly variation: number }> = {
  concrete: { base: [132, 128, 116], variation: 22 },
  wood: { base: [112, 83, 51], variation: 28 },
  metal: { base: [92, 101, 96], variation: 16 },
  ground: { base: [62, 68, 62], variation: 18 },
};

export function createSurfaceTexture(type: SurfaceType, repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not create a procedural surface texture context.');
  }

  const palette = SURFACE_COLORS[type];
  const image = context.createImageData(canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const index = (y * canvas.width + x) * 4;
      const wave = Math.sin(x * 0.17 + y * 0.031) * 0.5 + Math.cos(y * 0.13 - x * 0.047) * 0.5;
      const grain = ((x * 17 + y * 31 + x * y * 7) % 23) - 11;
      const value = grain + wave * palette.variation;
      image.data[index] = clampColor(palette.base[0] + value);
      image.data[index + 1] = clampColor(palette.base[1] + value);
      image.data[index + 2] = clampColor(palette.base[2] + value);
      image.data[index + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);

  if (type === 'wood') {
    context.globalAlpha = 0.18;
    context.strokeStyle = '#23170e';
    context.lineWidth = 2;
    for (let y = 8; y < canvas.height; y += 16) {
      context.beginPath();
      context.moveTo(0, y);
      context.bezierCurveTo(32, y - 4, 80, y + 5, 128, y - 2);
      context.stroke();
    }
    context.globalAlpha = 1;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 4;
  return texture;
}

function clampColor(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

