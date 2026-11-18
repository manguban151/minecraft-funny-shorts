# minecraft-funny-shorts
AI-powered Minecraft-style funny 3D animation for YouTube Shorts.

## Status

Stage 1 of 4 (scaffold, Three.js preview, benchmark, WebCodecs check). Branch: `feature/animation-engine-v1`.

## Requirements

- Node.js `^20.19.0` or `>=22.12.0` (required by Vite 8)
- A Chromium-based browser (Chrome on ChromeOS)

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (normally http://localhost:5173). If the Chromebook does not forward the port,
run `npm run dev -- --host` and open `http://penguin.linux.test:5173`.

Other scripts:

- `npm run typecheck`: TypeScript check, no output files
- `npm run build`: production build into `dist/`
- `npm run preview`: serve the production build

## Stage 1 benchmark

Click **Run benchmark** in the panel. It renders a test scene at 540x960 and 1080x1920, checks WebCodecs H.264
support, and recommends 1080x1920 or the 720x1280 fallback. **Copy report** puts the results on the clipboard.

## Roadmap

1. Scaffold, preview, benchmark (this stage)
2. Animation timeline
3. Blockbench model loader and original blocky characters
4. WebCodecs MP4 export, sound effects and captions
