import type { WebGLRenderer } from 'three';
import {
  BENCH_MEASURED_FRAMES,
  BENCH_WARMUP_FRAMES,
  CLIP_SECONDS_LONG,
  CLIP_SECONDS_SHORT,
  OUTPUT_FPS,
} from './config';
import type { Resolution } from './config';
import { setRenderResolution } from './renderer';
import type { PreviewScene } from './scene';

export interface BenchResult {
  readonly resolution: Resolution;
  readonly frames: number;
  readonly avgMs: number;
  readonly medianMs: number;
  readonly p95Ms: number;
  readonly maxMs: number;
  /** Frames per second if frames are rendered back to back (what offline export needs). */
  readonly throughputFps: number;
  /** Render-only estimate for a 30 s clip, in seconds (excludes encoding). */
  readonly estShortClipSeconds: number;
  /** Render-only estimate for a 60 s clip, in seconds (excludes encoding). */
  readonly estLongClipSeconds: number;
}

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function percentile(sorted: readonly number[], p: number): number {
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1));
  return sorted[index];
}

/**
 * Renders frames back to back at the given resolution, stepping time by 1/30 s per frame
 * exactly like the future exporter will. Each frame is forced to finish on the GPU with a
 * 1x1 readPixels, so the timing is real GPU+CPU cost rather than just command submission.
 */
export async function benchmarkResolution(
  renderer: WebGLRenderer,
  studio: PreviewScene,
  resolution: Resolution,
  onProgress?: (done: number, total: number) => void,
): Promise<BenchResult> {
  setRenderResolution(renderer, resolution);
  const gl = renderer.getContext();
  const pixel = new Uint8Array(4);
  const total = BENCH_WARMUP_FRAMES + BENCH_MEASURED_FRAMES;
  const samples: number[] = [];

  for (let i = 0; i < total; i++) {
    const start = performance.now();
    studio.update(i / OUTPUT_FPS);
    renderer.render(studio.scene, studio.camera);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    const elapsed = performance.now() - start;
    if (i >= BENCH_WARMUP_FRAMES) {
      samples.push(elapsed);
    }
    onProgress?.(i + 1, total);
    await yieldToUi(); // keep the page responsive; not included in the timing
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const avgMs = samples.reduce((sum, v) => sum + v, 0) / samples.length;

  return {
    resolution,
    frames: samples.length,
    avgMs,
    medianMs: percentile(sorted, 0.5),
    p95Ms: percentile(sorted, 0.95),
    maxMs: sorted[sorted.length - 1],
    throughputFps: 1000 / avgMs,
    estShortClipSeconds: (avgMs * OUTPUT_FPS * CLIP_SECONDS_SHORT) / 1000,
    estLongClipSeconds: (avgMs * OUTPUT_FPS * CLIP_SECONDS_LONG) / 1000,
  };
}
