/** Looks up a required element by id and fails loudly if index.html and the code drift apart. */
export function getEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Missing element #${id} in index.html`);
  }
  return el as T;
}

/** Rolling FPS measured over ~500 ms windows. */
export class FpsCounter {
  fps = 0;
  intervalMs = 0;
  private frames = 0;
  private windowStart = performance.now();

  reset(): void {
    this.fps = 0;
    this.intervalMs = 0;
    this.frames = 0;
    this.windowStart = performance.now();
  }

  /** Call once per rendered frame. Returns true when fps/intervalMs were just refreshed. */
  tick(nowMs: number): boolean {
    this.frames++;
    const elapsed = nowMs - this.windowStart;
    if (elapsed < 500) {
      return false;
    }
    this.fps = (this.frames * 1000) / elapsed;
    this.intervalMs = elapsed / this.frames;
    this.frames = 0;
    this.windowStart = nowMs;
    return true;
  }
}
