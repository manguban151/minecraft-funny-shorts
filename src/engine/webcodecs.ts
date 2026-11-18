import { OUTPUT_FPS, RES_720, RES_1080 } from './config';
import type { Resolution } from './config';

export interface CodecProbe {
  readonly resolution: Resolution;
  readonly profile: string;
  readonly codec: string;
  /** Config accepted with hardwareAcceleration: 'prefer-hardware'. */
  readonly hardware: boolean;
  /** Config accepted with hardwareAcceleration: 'prefer-software'. */
  readonly software: boolean;
}

export interface WebCodecsReport {
  readonly available: boolean;
  readonly probes: readonly CodecProbe[];
  /** Resolution ids for which at least one H.264 config is supported. */
  readonly supportedResolutionIds: readonly string[];
}

// Level 4.1 covers 1080x1920 @ 30 fps. Three profiles, best compatibility last.
const PROFILES = [
  { profile: 'High 4.1', codec: 'avc1.640029' },
  { profile: 'Main 4.1', codec: 'avc1.4d0029' },
  { profile: 'Baseline 4.1', codec: 'avc1.42e029' },
] as const;

const BITRATE_BY_RESOLUTION: Readonly<Record<string, number>> = {
  [RES_1080.id]: 8_000_000,
  [RES_720.id]: 5_000_000,
};

async function isConfigSupported(config: VideoEncoderConfig): Promise<boolean> {
  try {
    const result = await VideoEncoder.isConfigSupported(config);
    return result.supported === true;
  } catch {
    return false;
  }
}

/** Only asks the browser whether it could encode; nothing is encoded in Stage 1. */
export async function probeWebCodecs(): Promise<WebCodecsReport> {
  const available = typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined';
  if (!available) {
    return { available: false, probes: [], supportedResolutionIds: [] };
  }

  const probes: CodecProbe[] = [];
  for (const resolution of [RES_1080, RES_720]) {
    for (const { profile, codec } of PROFILES) {
      const base: VideoEncoderConfig = {
        codec,
        width: resolution.width,
        height: resolution.height,
        framerate: OUTPUT_FPS,
        bitrate: BITRATE_BY_RESOLUTION[resolution.id],
        avc: { format: 'avc' },
      };
      const hardware = await isConfigSupported({ ...base, hardwareAcceleration: 'prefer-hardware' });
      const software = await isConfigSupported({ ...base, hardwareAcceleration: 'prefer-software' });
      probes.push({ resolution, profile, codec, hardware, software });
    }
  }

  const supportedResolutionIds = [RES_1080, RES_720]
    .filter((res) => probes.some((p) => p.resolution.id === res.id && (p.hardware || p.software)))
    .map((res) => res.id);

  return { available: true, probes, supportedResolutionIds };
}
