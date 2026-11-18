import { benchmarkResolution } from './engine/benchmark';
import type { BenchResult } from './engine/benchmark';
import {
  BENCH_RESOLUTIONS,
  DEFAULT_PREVIEW,
  OUTPUT_FPS,
  PREVIEW_FRAME_INTERVAL_MS,
  PREVIEW_RESOLUTIONS,
} from './engine/config';
import { FpsCounter, getEl } from './engine/hud';
import { recommend } from './engine/recommend';
import { createRenderer, readGpuInfo, setRenderResolution } from './engine/renderer';
import { formatCodecSection, formatFullReport } from './engine/report';
import { buildPreviewScene } from './engine/scene';
import { probeWebCodecs } from './engine/webcodecs';

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function tryCreateRenderer(canvas: HTMLCanvasElement) {
  try {
    return createRenderer(canvas, DEFAULT_PREVIEW);
  } catch {
    return null;
  }
}

function main(): void {
  const canvas = getEl<HTMLCanvasElement>('stage');
  const statusEl = getEl<HTMLElement>('status');
  const reportEl = getEl<HTMLElement>('report');
  const resSelect = getEl<HTMLSelectElement>('preview-res');
  const pauseBtn = getEl<HTMLButtonElement>('btn-pause');
  const benchBtn = getEl<HTMLButtonElement>('btn-bench');
  const codecBtn = getEl<HTMLButtonElement>('btn-codec');
  const copyBtn = getEl<HTMLButtonElement>('btn-copy');
  const hud = {
    fps: getEl<HTMLElement>('hud-fps'),
    interval: getEl<HTMLElement>('hud-interval'),
    canvas: getEl<HTMLElement>('hud-canvas'),
    draw: getEl<HTMLElement>('hud-draw'),
    gpu: getEl<HTMLElement>('hud-gpu'),
    vendor: getEl<HTMLElement>('hud-vendor'),
    webgl: getEl<HTMLElement>('hud-webgl'),
    limits: getEl<HTMLElement>('hud-limits'),
    warning: getEl<HTMLElement>('hud-warning'),
  };

  const renderer = tryCreateRenderer(canvas);
  if (!renderer) {
    statusEl.textContent = 'Could not start WebGL. Check chrome://gpu and that hardware acceleration is enabled.';
    return;
  }

  const studio = buildPreviewScene();
  const gpu = readGpuInfo(renderer);
  const fpsCounter = new FpsCounter();
  let previewRes = DEFAULT_PREVIEW;
  let paused = false;
  let busy = false;

  for (const res of PREVIEW_RESOLUTIONS) {
    const option = document.createElement('option');
    option.value = res.id;
    option.textContent = res.label;
    resSelect.append(option);
  }
  resSelect.value = previewRes.id;

  function setStatus(text: string): void {
    statusEl.textContent = text;
  }

  function setControlsDisabled(disabled: boolean): void {
    for (const el of [resSelect, pauseBtn, benchBtn, codecBtn, copyBtn]) {
      el.disabled = disabled;
    }
  }

  function updateStaticHud(): void {
    hud.canvas.textContent = `${previewRes.width} × ${previewRes.height} (pixel ratio forced to 1; page DPR ${window.devicePixelRatio})`;
    hud.gpu.textContent = gpu.rendererName;
    hud.vendor.textContent = gpu.vendor;
    hud.webgl.textContent = `WebGL ${gpu.webglVersion}`;
    hud.limits.textContent = `texture ${gpu.maxTextureSize} · renderbuffer ${gpu.maxRenderbufferSize}`;
    hud.warning.hidden = !gpu.isSoftware;
    if (gpu.isSoftware) {
      hud.warning.textContent = 'Software rendering detected: the GPU is not being used. Expect low FPS.';
    }
  }

  function updateLiveHud(): void {
    hud.fps.textContent = `${fpsCounter.fps.toFixed(1)} fps (target ${OUTPUT_FPS})`;
    hud.interval.textContent = `${fpsCounter.intervalMs.toFixed(1)} ms/frame`;
    hud.draw.textContent = `${renderer!.info.render.calls} calls · ${renderer!.info.render.triangles} triangles`;
  }

  function renderOnce(timeSeconds: number): void {
    studio.update(timeSeconds);
    renderer!.render(studio.scene, studio.camera);
  }

  const startMs = performance.now();
  let lastRenderMs = 0;

  function loop(now: number): void {
    requestAnimationFrame(loop);
    if (paused || busy) {
      return;
    }
    if (now - lastRenderMs < PREVIEW_FRAME_INTERVAL_MS - 1) {
      return; // capped to 30 fps to save CPU/GPU
    }
    lastRenderMs = now;
    renderOnce((now - startMs) / 1000);
    if (fpsCounter.tick(now)) {
      updateLiveHud();
    }
  }

  resSelect.addEventListener('change', () => {
    previewRes = PREVIEW_RESOLUTIONS.find((r) => r.id === resSelect.value) ?? previewRes;
    setRenderResolution(renderer, previewRes);
    renderOnce((performance.now() - startMs) / 1000); // resizing clears the canvas
    fpsCounter.reset();
    updateStaticHud();
  });

  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.textContent = paused ? 'Resume preview' : 'Pause preview';
    fpsCounter.reset();
    setStatus(paused ? 'Preview paused (no rendering, minimal CPU/GPU use).' : 'Preview running.');
  });

  codecBtn.addEventListener('click', async () => {
    if (busy) {
      return;
    }
    busy = true;
    setControlsDisabled(true);
    setStatus('Checking WebCodecs H.264 support…');
    try {
      reportEl.textContent = formatCodecSection(await probeWebCodecs());
      setStatus('WebCodecs check complete.');
    } catch (err) {
      setStatus(`WebCodecs check failed: ${errorMessage(err)}`);
    } finally {
      busy = false;
      setControlsDisabled(false);
    }
  });

  benchBtn.addEventListener('click', async () => {
    if (busy) {
      return;
    }
    busy = true;
    setControlsDisabled(true);
    try {
      const results: BenchResult[] = [];
      for (const res of BENCH_RESOLUTIONS) {
        results.push(
          await benchmarkResolution(renderer, studio, res, (done, total) =>
            setStatus(`Benchmarking ${res.id}: frame ${done}/${total}…`),
          ),
        );
      }
      setStatus('Checking WebCodecs H.264 support…');
      const codec = await probeWebCodecs();
      const rec = recommend(results, codec, gpu);
      reportEl.textContent = formatFullReport({ gpu, bench: results, codec, rec });
      setStatus('Benchmark complete. Use "Copy report" to share the results.');
    } catch (err) {
      setStatus(`Benchmark failed: ${errorMessage(err)}`);
    } finally {
      setRenderResolution(renderer, previewRes);
      renderOnce((performance.now() - startMs) / 1000);
      fpsCounter.reset();
      busy = false;
      setControlsDisabled(false);
    }
  });

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(reportEl.textContent ?? '');
      setStatus('Report copied to the clipboard.');
    } catch {
      setStatus('Could not copy automatically. Select the report text and copy it manually.');
    }
  });

  updateStaticHud();
  renderOnce(0);
  requestAnimationFrame(loop);
}

main();
