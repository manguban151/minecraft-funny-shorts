import type { BenchResult } from './benchmark';
import { RES_720, RES_1080, SLOW_FRAME_MS_THRESHOLD } from './config';
import type { Resolution } from './config';
import type { GpuInfo } from './renderer';
import type { WebCodecsReport } from './webcodecs';

export interface Recommendation {
  readonly resolution: Resolution;
  /** 'webcodecs' = in-browser MP4 export; 'ffmpeg-fallback' = Node + FFmpeg script (later stage). */
  readonly exportPath: 'webcodecs' | 'ffmpeg-fallback';
  readonly reasons: readonly string[];
}

/** Stage 1 heuristic. Real encode speed is measured in Stage 4 and can change this. */
export function recommend(bench: readonly BenchResult[], codec: WebCodecsReport, gpu: GpuInfo): Recommendation {
  const reasons: string[] = [];
  let resolution: Resolution = RES_1080;

  if (!codec.supportedResolutionIds.includes(RES_1080.id)) {
    resolution = RES_720;
    reasons.push(
      codec.available
        ? 'No H.264 encoder config was accepted for 1080x1920, so 720x1280 is recommended.'
        : 'WebCodecs is not available, so the in-browser encoder cannot be used.',
    );
  }

  const full = bench.find((b) => b.resolution.id === RES_1080.id);
  if (full && full.avgMs > SLOW_FRAME_MS_THRESHOLD) {
    resolution = RES_720;
    reasons.push(
      `1080x1920 renders at ${full.avgMs.toFixed(1)} ms/frame, above the ${SLOW_FRAME_MS_THRESHOLD} ms threshold.`,
    );
  }

  if (gpu.isSoftware) {
    reasons.push('Software rendering was detected (no GPU acceleration). Expect slow renders.');
  }

  const exportPath = codec.supportedResolutionIds.includes(resolution.id) ? 'webcodecs' : 'ffmpeg-fallback';
  if (exportPath === 'ffmpeg-fallback') {
    reasons.push('Export would use the Node + FFmpeg fallback path (planned for a later stage).');
  }
  if (reasons.length === 0) {
    reasons.push('1080x1920 renders within budget and an H.264 encoder config is supported.');
  }

  return { resolution, exportPath, reasons };
}
