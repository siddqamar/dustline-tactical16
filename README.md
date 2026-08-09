# Dustline Tactical

Dustline Tactical is a browser-first tactical FPS vertical slice built with Three.js, TypeScript, and Vite.

## Local development

```bash
npm install
npm run dev
npm run build
npm run preview
```

Click the game viewport to capture the mouse pointer.

Use `W`, `A`, `S`, and `D` to move.

Use the mouse to look and the left mouse button to fire.

Use `R` to reload and number keys `1` through `5` to switch weapons.

Press `Escape` to release the pointer and `Enter` to restart after a round ends.

Press `F3` to show the development FPS, draw-call, triangle, and bot counters.

## Difficulty testing

The bot profile can be selected through the URL query string.

Use `?difficulty=easy`, `?difficulty=medium`, or `?difficulty=expert`.

The default profile is medium.

## Deployment

The production build is static and has no backend dependency.

The included GitHub Actions workflow publishes the `dist` directory to GitHub Pages from the `master` or `main` branch.

Vercel can deploy the repository directly using the included `vercel.json` rewrite configuration.

## Current phase 1 scope

The project includes a procedural tactical map, first-person movement, pointer lock, five weapon profiles, hitscan combat, reusable damage hitboxes, HUD feedback, round state, bots, cover-aware search, three difficulty profiles, procedural audio, and a browser performance overlay.

Multiplayer, accounts, backend infrastructure, and full competitive bomb rules remain outside the single-player vertical slice scope.

