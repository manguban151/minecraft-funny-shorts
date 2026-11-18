export interface Resolution {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly label: string;
}

export const RES_540: Resolution = { id: '540x960', width: 540, height: 960, label: '540 × 960 (light preview)' };
export const RES_720: Resolution = { id: '720x1280', width: 720, height: 1280, label: '720 × 1280 (fallback export)' };
export const RES_1080: Resolution = { id: '1080x1920', width: 1080, height: 1920, label: '1080 × 1920 (primary export)' };

/** Resolutions selectable for the live preview. */
export const PREVIEW_RESOLUTIONS: readonly Resolution[] = [RES_540, RES_720, RES_1080];
export const DEFAULT_PREVIEW: Resolution = RES_540;

/** Resolutions measured by the benchmark. */
export const BENCH_RESOLUTIONS: readonly Resolution[] = [RES_540, RES_1080];

/** Output frame rate for the final video. The preview is capped to the same rate to save CPU/GPU. */
export const OUTPUT_FPS = 30;
export const PREVIEW_FRAME_INTERVAL_MS = 1000 / OUTPUT_FPS;

export const BENCH_WARMUP_FRAMES = 8;
export const BENCH_MEASURED_FRAMES = 60;

/**
 * Stage 1 heuristic: if one 1080x1920 frame takes longer than this to render,
 * recommend the 720x1280 fallback. 150 ms/frame is about 4.5 minutes of render-only
 * time for a 60 s clip (1800 frames). Refine once the real exporter exists.
 */
export const SLOW_FRAME_MS_THRESHOLD = 150;

export const CLIP_SECONDS_SHORT = 30;
export const CLIP_SECONDS_LONG = 60;
