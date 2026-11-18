import { WebGLRenderer } from 'three';
import type { Resolution } from './config';

export interface GpuInfo {
  readonly rendererName: string;
  readonly vendor: string;
  readonly webglVersion: 1 | 2;
  readonly maxTextureSize: number;
  readonly maxRenderbufferSize: number;
  readonly isSoftware: boolean;
}

/**
 * Lightweight renderer: no antialiasing, no stencil, no shadows, pixel ratio fixed to 1.
 * The drawing buffer is exactly the target resolution; CSS scales it for display.
 */
export function createRenderer(canvas: HTMLCanvasElement, resolution: Resolution): WebGLRenderer {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    stencil: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = false;
  renderer.setSize(resolution.width, resolution.height, false);
  return renderer;
}

export function setRenderResolution(renderer: WebGLRenderer, resolution: Resolution): void {
  renderer.setSize(resolution.width, resolution.height, false);
}

export function readGpuInfo(renderer: WebGLRenderer): GpuInfo {
  const gl = renderer.getContext();
  const debugExt = gl.getExtension('WEBGL_debug_renderer_info');
  const rendererName = String(gl.getParameter(debugExt ? debugExt.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
  const vendor = String(gl.getParameter(debugExt ? debugExt.UNMASKED_VENDOR_WEBGL : gl.VENDOR));
  const webglVersion: 1 | 2 =
    typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext ? 2 : 1;

  return {
    rendererName,
    vendor,
    webglVersion,
    maxTextureSize: Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)),
    maxRenderbufferSize: Number(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)),
    isSoftware: /swiftshader|llvmpipe|softpipe|software/i.test(rendererName),
  };
}
