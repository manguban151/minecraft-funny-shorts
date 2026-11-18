import type { BenchResult } from './benchmark';
import type { Recommendation } from './recommend';
import type { GpuInfo } from './renderer';
import type { WebCodecsReport } from './webcodecs';

const yesNo = (value: boolean): string => (value ? 'yes' : 'no');

export function formatCodecSection(codec: WebCodecsReport): string {
  const lines = ['WebCodecs H.264 (VideoEncoder.isConfigSupported)'];
  if (!codec.available) {
    lines.push('  VideoEncoder / VideoFrame: NOT available in this browser');
    return lines.join('\n');
  }
  lines.push('  VideoEncoder / VideoFrame: available');
  for (const p of codec.probes) {
    lines.push(
      `  ${p.resolution.id} ${p.profile} (${p.codec}): prefer-hardware ${yesNo(p.hardware)}, prefer-software ${yesNo(p.software)}`,
    );
  }
  lines.push(
    `  Resolutions with a supported config: ${codec.supportedResolutionIds.length > 0 ? codec.supportedResolutionIds.join(', ') : 'none'}`,
  );
  return lines.join('\n');
}

export interface FullReportInput {
  readonly gpu: GpuInfo;
  readonly bench: readonly BenchResult[];
  readonly codec: WebCodecsReport;
  readonly rec: Recommendation;
}

export function formatFullReport({ gpu, bench, codec, rec }: FullReportInput): string {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const lines: string[] = [
    'minecraft-funny-shorts - Stage 1 benchmark',
    `Date: ${new Date().toISOString()}`,
    `Browser: ${navigator.userAgent}`,
    `CPU threads: ${navigator.hardwareConcurrency ?? 'unknown'}  |  Device memory: ${nav.deviceMemory ?? 'unknown'} GB`,
    '',
    `GPU: ${gpu.rendererName}`,
    `GPU vendor: ${gpu.vendor}`,
    `WebGL ${gpu.webglVersion}  |  max texture ${gpu.maxTextureSize}  |  max renderbuffer ${gpu.maxRenderbufferSize}`,
    `Software rendering detected: ${yesNo(gpu.isSoftware)}`,
    '',
    'Render benchmark (test scene, frames rendered back to back, GPU-synced)',
  ];

  for (const b of bench) {
    lines.push(
      `  ${b.resolution.id}: avg ${b.avgMs.toFixed(1)} ms | median ${b.medianMs.toFixed(1)} ms | p95 ${b.p95Ms.toFixed(1)} ms | max ${b.maxMs.toFixed(1)} ms | ~${b.throughputFps.toFixed(1)} fps`,
      `    render-only estimate: 30 s clip ~${b.estShortClipSeconds.toFixed(0)} s, 60 s clip ~${b.estLongClipSeconds.toFixed(0)} s (encoding not included)`,
    );
  }

  lines.push('', formatCodecSection(codec), '');
  lines.push(`Recommendation: ${rec.resolution.id} via ${rec.exportPath}`);
  for (const reason of rec.reasons) {
    lines.push(`  - ${reason}`);
  }
  lines.push('', 'Note: the test scene is a stand-in. Real scenes with characters will cost somewhat more.');
  return lines.join('\n');
}
