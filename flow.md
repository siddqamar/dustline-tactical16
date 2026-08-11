# Operation Sable execution flow

## Browser entry point

1. `index.html` loads the Vite module at `src/main.ts`.
2. `src/main.ts` finds `#app`, creates `Game`, and calls `game.start()`.
3. `Game` creates the Three.js scene, camera, renderer, map, player, weapons, combat system, bots, HUD, menus, and touch controls.
4. `Game.start()` opens the operation setup menu and starts `GameLoop`.

## Per-frame flow

1. `GameLoop.tick()` calculates the frame delta and calls `Game.update(deltaSeconds)`.
2. `Game.update()` advances `MatchManager` and decides whether the match is in setup, deployment, or live combat.
3. `PlayerController.update()` reads keyboard or virtual-stick movement, applies collision checks, and updates the camera position and view angles.
4. `WeaponManager.update()` advances reloads, recoil, aim transition, weapon sway, and muzzle flash effects.
5. If fire is held, `WeaponManager.tryFire()` creates a shot and `CombatSystem.fire()` traces it from the camera.
6. `CombatSystem` checks scene geometry and bot hitboxes, applies damage, creates an impact effect, and emits combat events.
7. `BotDirector.update()` builds enemy targets and sends each live bot its tactical goal.
8. `BotController.update()` checks visibility, moves through `Navigation`, changes between patrol, alert, engage, and search, and fires the rifle when its reaction and burst rules allow it.
9. `Game` updates the intelligence-cache objective, player health, team counts, audio timers, HUD text, and renderer.
10. Three.js renders the current scene and camera to the browser canvas.

## Match and objective flow

1. The setup menu calls `Game.startMatch()` with team size, guard difficulty, and insertion assignment.
2. `MatchManager.start()` begins the first preparation phase.
3. `Game.handleMatchSnapshot()` prepares the round, resets health and weapons, spawns the player squad and guard squad, and issues the full field kit.
4. The first buy snapshot is immediately passed to `MatchManager.finishBuyPhase()`, so the kit screen cannot block the first playable moment.
5. `MatchManager` enters deployment and then live combat without requiring pointer lock to advance the simulation.
6. The player can click the canvas for desktop look control or use the touch controls on a phone browser.
7. The attacking operative carries the internal timed package state to a relay area and holds the interaction control.
8. The HUD presents this internal state as caching intel, transmitting, overriding the cache, or recovering a dropped package.
9. Elimination, timeout, cache override, or completed transmission is reported back to `MatchManager`.
10. `MatchManager` records the round result, switches roles when required, and eventually reports operation success or failure.

## Mobile input flow

1. `MobileControls` detects a coarse pointer and shows only during deployment or live gameplay.
2. The left virtual stick calls `PlayerController.setTouchMove()`.
3. The right look zone calls `PlayerController.applyTouchLook()`.
4. Fire, aim, interaction, reload, and weapon buttons update the same Game and PlayerController state used by mouse and keyboard input.
5. Touch mode treats active touch input as the player-ready signal, so mobile browsers do not depend on pointer lock.
