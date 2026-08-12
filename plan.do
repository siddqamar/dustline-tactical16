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
- [x] Keep controls compatible with keyboard/mouse and touch.

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
- [x] Improve lighting, shadows, fog, terrain detail, muzzle flashes, impact effects, and hit feedback.
- [x] Improve weapon presentation and the tactical HUD without copying branded game assets.
- [x] Keep asset sizes and rendering cost suitable for mobile browsers.

## Commit 6 - verification and documentation

- [x] Run final build, unit tests, and E2E tests.
- [x] Fix regressions and obvious visual or interaction issues found during browser verification.
- [x] Complete `decisions.md` with the reason for every material decision.
- [x] Complete `flow.md` with concise entry points, function calls, and execution flow.
- [x] Update this checklist as each item is completed.
- [x] Commit each focused stage with a descriptive message and bullet-point details.

## Follow-up - playable opening and battlefield presence

- [x] Generate and validate a full-body military operative asset with imagegen.
- [x] Add the operative to the mission briefing so the opening has a visible human lead.
- [x] Auto-issue the full kit and enter deployment after starting the first mission.
- [x] Prevent pointer-lock or menu state from pausing the live mission unexpectedly.
- [x] Default to a multi-person squad and make squadmates and guards arrive in the playable field.
- [x] Extend the initial combat window so the first operation does not resolve before the player can engage.
- [x] Add regression coverage for immediate playable start and multiple field combatants.
- [x] Update `decisions.md` and `flow.md` with the new opening flow.
- [x] Commit the opening-flow and character work separately from later polish.

## Follow-up - true in-field combat experience

- [x] Reproduce the no-movement bug through the end-user browser flow.
- [x] Remove hidden pointer-lock gates from keyboard movement and weapon fire.
- [x] Generate and integrate realistic Sable and guard combatants inside the Three.js field.
- [x] Generate and integrate realistic pistol, rifle, and knife first-person views.
- [x] Keep generated weapon views responsive on phone browsers.
- [x] Add an opening fire delay, coordinated bot fire, and squad reinforcement waves.
- [x] Extend the live mission to five minutes and default new players to easy guard doctrine.
- [x] Add E2E coverage for movement, firing, and a sustained opening firefight.
- [x] Perform desktop and phone visual checks of the live viewport.
- [x] Update `decisions.md` and `flow.md` with the corrected execution flow.
- [x] Commit input, combat continuity, and in-field visuals in focused stages.

## Follow-up - push hygiene and reproducible outputs

- [x] Audit tracked and untracked files against the build, test, analysis, and asset flows.
- [x] Add dependencies, build output, compiler metadata, test reports, local analysis, scratch files, and editor noise to `.gitignore`.
- [x] Exclude the unused legacy `dustline-tactical16.gif` without excluding runtime assets under `public/assets/`.
- [x] Document ignored output paths in `flow.md`.
- [x] Record the push-hygiene decision and tracking boundary in `decisions.md`.
- [x] Verify ignored files and preserve source, tests, configuration, documentation, and runtime assets.
