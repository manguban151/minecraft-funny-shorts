import {
  AmbientLight,
  BoxGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  NearestFilter,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
} from 'three';

export interface PreviewScene {
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  /** Deterministic: the scene state depends only on timeSeconds. */
  update(timeSeconds: number): void;
}

const GROUND_SIZE = 15;

/** Small seeded PRNG so procedural textures are identical on every run. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/** Original 16x16 noise texture (not an official Minecraft texture), drawn at runtime. */
function makeBlockTexture(base: readonly [number, number, number], seed: number, jitter = 26): CanvasTexture {
  const size = 16;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas is not available');
  }
  const rand = mulberry32(seed);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const j = (rand() - 0.5) * 2 * jitter;
      ctx.fillStyle = `rgb(${clampByte(base[0] + j)},${clampByte(base[1] + j)},${clampByte(base[2] + j)})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function buildPreviewScene(): PreviewScene {
  const scene = new Scene();
  scene.background = new Color(0x8fd3ff);

  const camera = new PerspectiveCamera(45, 9 / 16, 0.1, 60);

  scene.add(new AmbientLight(0xffffff, 1.0));
  const sun = new DirectionalLight(0xffffff, 2.2);
  sun.position.set(5, 10, 4);
  scene.add(sun);

  const cube = new BoxGeometry(1, 1, 1);
  const grass = new MeshLambertMaterial({ map: makeBlockTexture([92, 150, 60], 1) });
  const dirt = new MeshLambertMaterial({ map: makeBlockTexture([134, 96, 67], 2) });
  const stone = new MeshLambertMaterial({ map: makeBlockTexture([128, 128, 128], 3, 18) });

  // Ground: one InstancedMesh = a single draw call for the whole floor.
  const ground = new InstancedMesh(cube, grass, GROUND_SIZE * GROUND_SIZE);
  const matrix = new Matrix4();
  const tint = new Color();
  const rand = mulberry32(7);
  const half = (GROUND_SIZE - 1) / 2;
  let index = 0;
  for (let z = 0; z < GROUND_SIZE; z++) {
    for (let x = 0; x < GROUND_SIZE; x++) {
      matrix.setPosition(x - half, -0.5, z - half);
      ground.setMatrixAt(index, matrix);
      const shade = 0.88 + rand() * 0.24;
      tint.setRGB(shade, shade, shade);
      ground.setColorAt(index, tint);
      index++;
    }
  }
  ground.instanceMatrix.needsUpdate = true;
  if (ground.instanceColor) {
    ground.instanceColor.needsUpdate = true;
  }
  scene.add(ground);

  // A small stone tower and a spinning dirt block, so motion is visible in the benchmark.
  for (let level = 0; level < 3; level++) {
    const block = new Mesh(cube, stone);
    block.position.set(-1.1, 0.5 + level, 0);
    scene.add(block);
  }
  const spinner = new Mesh(cube, dirt);
  scene.add(spinner);

  function update(timeSeconds: number): void {
    spinner.position.set(1.1, 1.4 + Math.sin(timeSeconds * 2.2) * 0.25, 0);
    spinner.rotation.y = timeSeconds * 1.6;

    const angle = Math.sin(timeSeconds * 0.35) * 0.45;
    const radius = 9.5;
    camera.position.set(Math.sin(angle) * radius, 4.2, Math.cos(angle) * radius);
    camera.lookAt(0, 1.4, 0);
  }

  update(0);
  return { scene, camera, update };
}
