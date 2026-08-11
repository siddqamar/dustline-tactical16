# IGI-Infiltration browser game rework

## Direction

- [x] Confirm desert intelligence facility as the first map direction.
- [x] Confirm rifle, pistol, and knife as the initial loadout.
- [x] Support both stealth and direct combat.
- [x] Treat desktop and mobile browsers as first-class targets.
- [x] Resolve the zoom request as smooth first-person aim zoom without a separate tactical camera.

## Baseline and branch

- [x] Create branch `feat/igi-infiltration-rework`.
- [x] Run baseline build, unit tests, and browser E2E checks.
- [x] Record the current entry points and execution flow.

## Commit 1 - map and operation foundation

- [x] Replace the CS-style arena language with an original desert intelligence compound.
- [x] Add readable infiltration lanes, cover, buildings, towers, service roads, and extraction space.
- [x] Define one operation objective flow that supports stealth or firefight completion.
- [x] Add map rationale to `decisions.md`.

## Commit 2 - weapons and player feel

- [x] Rework the weapon set to rifle, pistol, and knife.
- [x] Add weapon-specific damage, range, recoil, fire cadence, and handling.
- [x] Add smooth aim zoom, FOV interpolation, weapon sway, recoil feedback, and knife range behavior.
- [ ] Keep controls compatible with keyboard/mouse and touch.

## Commit 3 - guards, awareness, and objectives

- [x] Replace round/bomb bot behavior with patrol, alert, search, cover, and pursuit behavior.
- [x] Make difficulty affect bot decisions and reaction quality rather than only health.
- [x] Add objective, detection, and mission result states.
- [x] Add readable feedback for stealth and combat outcomes.

## Commit 4 - mobile controls and responsive presentation

- [x] Add touch movement, look, fire, aim, weapon switch, and interaction controls.
- [x] Make HUD, canvas, menus, and input zones adapt to phone aspect ratios and safe areas.
- [x] Preserve mouse/keyboard controls on desktop.
- [x] Verify touch and desktop flows in browser tests where supported.

## Commit 5 - realistic visual pass

- [x] Generate original raster assets with imagegen for military environment materials and atmosphere.
- [ ] Improve lighting, shadows, fog, terrain detail, muzzle flashes, impact effects, and hit feedback.
- [ ] Improve weapon presentation and the tactical HUD without copying branded game assets.
- [ ] Keep asset sizes and rendering cost suitable for mobile browsers.

## Commit 6 - verification and documentation

- [ ] Run build, unit tests, and E2E tests.
- [ ] Fix regressions and obvious visual or interaction issues found during browser verification.
- [ ] Complete `decisions.md` with the reason for every material decision.
- [ ] Complete `flow.md` with concise entry points, function calls, and execution flow.
- [ ] Update this checklist as each item is completed.
- [ ] Commit each focused stage with a descriptive message and bullet-point details.
