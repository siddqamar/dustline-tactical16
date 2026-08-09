# Phase 1 implementation plan

This plan turns `idea.md` into a sequence of small, reviewable commits for a playable single-player tactical FPS vertical slice.

The workspace currently contains only the product brief, so the first implementation commit assumes a new Vite and Three.js project.

## Scope guardrails

- Deliver one complete single-player bot match with movement, shooting, weapon switching, rounds, death, restart, and easy, medium, and expert bots.
- Keep the map, assets, audio, and runtime lightweight enough for a normal modern desktop browser.
- Use original procedural or generated assets and a Dust2-inspired tactical structure without copying proprietary game assets.
- Keep multiplayer, accounts, backend services, full competitive rules, and large menu systems out of phase 1.
- Keep every commit buildable and limited to one coherent vertical slice concern.

## Commit sequence

### 1. `chore: scaffold the browser game project`

Depends on: none.

- Create the Vite project with TypeScript, Three.js, and the initial `src/` structure.
- Add `dev`, `build`, and preview scripts that work from a fresh install.
- Add the base HTML entry point, source configuration, and a minimal application bootstrap.
- Add a lightweight development error surface so startup failures are visible in the browser.

Acceptance checks:

- `npm install` completes successfully.
- `npm run dev` serves the application.
- `npm run build` completes without TypeScript or bundler errors.

### 2. `feat: add the game runtime and render loop`

Depends on: commit 1.

- Add the renderer, scene, camera, resize handling, lighting baseline, and animation loop.
- Add a small game state model for loading, playing, round end, player death, and restart states.
- Add a development-only FPS and frame-time readout.
- Keep per-frame work explicit and avoid allocations in the hot path.

Acceptance checks:

- The application renders a lit Three.js scene at different window sizes.
- The render loop starts and stops cleanly with game state changes.
- The debug readout can be enabled during development without appearing in the release HUD.

### 3. `feat: build the graybox tactical map`

Depends on: commit 2.

- Build a compact original map with two spawn areas, two objective-style areas, connecting routes, corridors, open spaces, long sightlines, close-quarter spaces, elevation, cover, and tactical corners.
- Add reusable procedural geometry for buildings, walls, openings, stairs, platforms, crates, barrels, and concrete structures.
- Define spawn points, cover points, combat areas, and navigation metadata alongside the map.
- Establish believable player scale and a collision representation that can be reused by movement and bots.

Acceptance checks:

- The player can visually identify the two sides, major routes, and two objective-style areas.
- The map is not a flat plane of unstructured boxes and has usable tactical variation.
- Geometry and collision boundaries are deterministic and can be regenerated from source data.

### 4. `feat: implement first-person movement and pointer lock`

Depends on: commits 2 and 3.

- Implement WASD movement, mouse look, pointer lock, escape-to-release, and normalized diagonal movement.
- Add player collision, wall blocking, stair and small elevation handling, floor protection, and camera height.
- Add movement state needed for accuracy, footsteps, and bot-facing gameplay systems.
- Keep camera motion responsive and prevent excessive clipping through environment geometry.

Acceptance checks:

- The player moves and looks reliably after pointer lock is acquired.
- The player cannot walk through walls, fall through the map, or gain speed by moving diagonally.
- Escape releases the pointer and the player can reacquire control.

### 5. `feat: add weapon inventory and handling`

Depends on: commit 4.

- Add data-driven weapon definitions and a weapon manager.
- Add one standard pistol, one stronger slower pistol, two rifles, and one sniper rifle.
- Give each weapon distinct damage, fire rate, recoil, spread, magazine size, reload time, movement accuracy, range, and handling values.
- Implement weapon switching, ammunition state, reload timing, firing cooldowns, and first-person weapon presentation.

Acceptance checks:

- Weapon keys switch to the expected weapon and preserve ammunition state.
- Reloading respects magazine capacity and reload time.
- The five weapons are mechanically distinct before visual polish is added.

### 6. `feat: implement hitscan combat and damage`

Depends on: commit 5.

- Implement browser-friendly hitscan shooting with muzzle origin, range, spread, and recoil.
- Add player and bot hitboxes with head and body damage zones.
- Add health, damage application, death state, and friendly target filtering where needed.
- Add impact events and a combat event interface for UI, audio, and effects.

Acceptance checks:

- A shot reaches the correct target or environment surface based on line of sight.
- Head and body hits produce different damage results.
- Ammunition, fire rate, recoil, spread, and movement accuracy affect the result rather than only changing presentation.
- Player and bot death events are emitted exactly once.

### 7. `feat: add the tactical HUD and combat feedback`

Depends on: commits 5 and 6.

- Add a clean tactical HUD with crosshair, health, ammunition, active weapon, reload state, and round status.
- Add hit confirmation, damage feedback, muzzle flash, impact effects, weapon switching feedback, and death feedback.
- Keep feedback readable without covering important sightlines.
- Make feedback event-driven so it does not duplicate combat logic.

Acceptance checks:

- The HUD always reflects the current weapon, magazine, reserve ammunition, and health.
- The player can distinguish a hit, taking damage, reloading, switching weapons, and dying.
- Feedback works at common desktop viewport sizes without overlapping or clipping.

### 8. `feat: add the round lifecycle and restart flow`

Depends on: commits 2, 4, and 6.

- Add player and bot spawn/reset handling, countdown, active combat, win and lose evaluation, round-end presentation, and restart.
- Reset transient weapon, health, bot, and navigation state between rounds.
- Keep phase 1 round rules intentionally simple and focused on completing the playable combat loop.

Acceptance checks:

- A round starts with a countdown, reaches active combat, and ends when one side wins.
- The player can die, see the result, and restart without refreshing the page.
- A restarted round does not retain stale health, ammunition, bot, or event state.

### 9. `feat: add bot navigation and perception`

Depends on: commits 3, 4, and 8.

- Implement a lightweight waypoint graph or equivalent navigation layer using the map's authored navigation metadata.
- Add patrol, search, pursuit, line-of-sight checks, target detection, and simple steering that avoids repeatedly walking into walls.
- Add update throttling and bounded raycasts so bot logic remains suitable for a browser frame budget.
- Expose navigation and perception state for later combat and difficulty tuning.

Acceptance checks:

- Bots can travel between spawn areas and combat areas without getting permanently stuck.
- Bots patrol or search when they cannot see the player and pursue when they acquire a target.
- Bots respect walls and line of sight when deciding whether they can detect or shoot the player.

### 10. `feat: add bot combat and cover behavior`

Depends on commits 6, 7, and 9.

- Add bot aim, target selection, shooting, recoil and spread usage, reloading, reaction to damage, and death handling.
- Add cover selection, peek or engage behavior, retreat behavior, and combat-area movement.
- Reuse the same damage, hit detection, ammunition, and combat feedback paths as the player where practical.
- Add safeguards against bots firing through geometry or continuously targeting dead actors.

Acceptance checks:

- Bots can detect, pursue, take cover, aim, shoot, reload, react to being shot, and die.
- Bots do not continuously walk into walls or fire through solid map geometry.
- A complete round can end because of bot combat without scripted player interaction.

### 11. `feat: add behavior-based bot difficulty profiles`

Depends on: commit 10.

- Add easy, medium, and expert profiles that tune reaction delay, target acquisition, accuracy, aggression, positioning, cover usage, and target selection.
- Keep difficulty differences primarily behavioral and skill-based rather than health-based.
- Add a development selector or configuration path that makes each difficulty easy to test.

Acceptance checks:

- All three difficulty levels can complete a match against the player.
- Easy, medium, and expert produce observably different reaction, accuracy, aggression, and positioning behavior.
- Bot health and damage are not the sole or primary difficulty mechanism.

### 12. `feat: add realistic environment materials and lighting`

Depends on commits 3 and 7.

- Replace graybox presentation with optimized concrete, stone, metal, wood, and barrel or crate materials.
- Add believable lighting, shadows, ambient occlusion where affordable, atmospheric fog where useful, and environmental variation.
- Add architectural details and original lightweight props without making the scene dependent on large copyrighted assets.
- Preserve the tactical readability and sightlines established by the graybox map.

Acceptance checks:

- The environment reads as a grounded tactical FPS rather than a primitive geometry demo.
- Materials have believable roughness and lighting response without flat unlit surfaces or neon placeholder colors.
- Visual improvements do not break collision, navigation, or performance targets.

### 13. `feat: add lightweight tactical audio`

Depends on commits 5, 6, 8, and 12.

- Add browser-compatible weapon firing, reload, footsteps, impacts, hit or death, ambient, and round start or end audio.
- Centralize audio loading, playback, volume, and cleanup in an audio manager.
- Keep files compressed and avoid starting audio before browser interaction permits it.

Acceptance checks:

- Core combat and round transitions have distinct audible feedback.
- Footsteps respond to movement without creating a new sound every frame.
- Audio remains usable after restarting rounds and does not leak stale playback state.

### 14. `perf: profile and optimize the browser runtime`

Depends on commits 10, 12, and 13.

- Profile rendering, raycasts, bot updates, allocations, draw calls, texture memory, and load time using the development debug mode and browser tools.
- Apply measured improvements such as frustum culling, instancing, reused objects, bounded AI updates, optimized raycasting, texture sizing, and lazy loading.
- Remove temporary debug cost from production builds while retaining an intentional development performance mode.

Acceptance checks:

- The game maintains a stable frame rate on normal modern desktop hardware during combat with multiple bots.
- No large uncompressed or unnecessary assets remain in the production bundle.
- The optimization commit includes a short record of measured bottlenecks and the changes made for them.

### 15. `chore: configure GitHub Pages and Vercel deployment`

Depends on commit 14.

- Add the Vite base-path and static hosting configuration required for GitHub Pages.
- Add the minimal Vercel configuration needed for a client-side static build.
- Verify that the production bundle does not require a local development server or backend service.

Acceptance checks:

- `npm run build` succeeds with production settings.
- The built files load correctly from a GitHub Pages-style subpath.
- The built files load correctly from Vercel with client-side asset paths resolved.

### 16. `test: verify the phase 1 gameplay slice end to end`

Depends on all previous commits.

- Run the application through the real browser renderer and test the complete gameplay path.
- Verify movement, mouse look, pointer lock, aiming, firing, recoil, spread, reload, weapon switching, hit zones, collision, death, bot navigation, bot shooting, all difficulty levels, round restart, refresh, production build, common screen sizes, Chrome, Firefox, and Edge.
- Fix issues found during this pass in focused follow-up commits that name the failing behavior.
- Do not declare phase 1 complete based only on a successful compile or a page that renders.

Acceptance checks:

- A fresh install can launch a playable match and complete multiple rounds without a page refresh.
- The core gameplay loop works in the production build as well as development mode.
- The final browser test checklist is recorded with any known limitations explicitly documented.

## Working rules for each commit

- Run the narrowest relevant manual or automated check after every commit, and run `npm run build` whenever source or configuration changes.
- Keep data definitions, rendering, simulation, UI, audio, and deployment concerns in their owning modules instead of adding cross-cutting shortcuts.
- Do not combine visual polish, AI tuning, and unrelated bug fixes in the same commit.
- If testing exposes a defect, add a focused fix commit immediately after the commit that introduced or revealed it.
- Keep generated build output and local profiling artifacts out of source control unless deployment configuration explicitly requires them.

## Phase 1 definition of done

- The browser loads an original, tactical, Dust2-inspired map with believable scale, cover, sightlines, lighting, and optimized assets.
- The player can move, look, aim, fire, reload, switch between distinct weapons, receive feedback, die, restart, and win or lose rounds.
- Bots navigate, detect, pursue, take cover, fight, reload, react to damage, and behave differently at easy, medium, and expert difficulty.
- Development profiling has been used to address real bottlenecks, and the release build is deployable to GitHub Pages and Vercel.
- The full gameplay loop has been tested in real browsers instead of being accepted solely because the code compiles.
