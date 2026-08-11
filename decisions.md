# Operation Sable decisions

## 2026-08-11 - Reframe the game as a military infiltration operation

- Decision: Change the visible product identity from Dustline Tactical to Operation Sable.
- Reason: The requested experience is an original browser military infiltration game inspired by the grounded tension of classic IGI, rather than a CS-style competitive arena.
- Constraint: Keep the existing Three.js renderer and tested match loop while replacing the player-facing theme and vocabulary.

## 2026-08-11 - Use Relay Station 14 as the first map

- Decision: Build a desert intelligence relay station with watchtowers, relay buildings, service roads, perimeter walls, containers, cover lanes, and extraction space.
- Reason: This creates readable stealth routes and direct combat lanes without requiring a large asset-heavy open world.
- Constraint: Keep the map compact enough for mobile browsers while adding landmarks that help players navigate without a minimap.

## 2026-08-11 - Use original generated imagery plus code-authored geometry

- Decision: Use imagegen for the operation backdrop and desert ground material, while keeping collision-critical structures as Three.js geometry.
- Reason: Raster assets add realism and atmosphere, while deterministic geometry keeps collisions, navigation, and performance predictable.
- Constraint: Do not copy branded game assets, logos, or recognizable characters.

## 2026-08-11 - Keep the initial loadout focused

- Decision: Limit the player to a service pistol, field rifle, and field knife.
- Reason: A compact loadout is easier to understand on a phone and makes weapon choice meaningful during stealth and firefights.
- Constraint: The rifle is the only purchased primary, while pistol and knife are always available.

## 2026-08-11 - Use smooth aim zoom instead of a separate tactical camera

- Decision: Use right mouse or an equivalent future touch control for smooth aim-down-sights FOV changes.
- Reason: The request calls for a real-game zoom feel, and continuous first-person aiming supports both stealth observation and direct combat without breaking immersion.
- Constraint: Camera FOV, movement speed, reticle scale, and weapon pose transition together instead of snapping independently.

## 2026-08-11 - Make guard awareness respond to player signature

- Decision: Give guards patrol, alert, engage, and search states, with quieter detection for a stationary or aiming player.
- Reason: Stealth needs to change the outcome of play, not only change the color of the HUD.
- Constraint: Direct combat remains available, and difficulty still controls perception, reaction, accuracy, and cover behavior.

## 2026-08-11 - Use pointer-based touch controls

- Decision: Add a virtual movement stick, right-side look zone, hold-to-fire, hold-to-aim, interaction, reload, and weapon buttons.
- Reason: Pointer Events provide one input model that works on phone browsers and remains compatible with mouse controls.
- Constraint: Touch controls are rendered only for coarse-pointer devices and are hidden during menus to keep mission setup readable.

## 2026-08-11 - Reframe the device objective as an intelligence cache

- Decision: Keep the existing timed relay interaction internally, but present it as caching an intelligence package and completing a transmission.
- Reason: This preserves the tested round-resolution behavior while moving the player-facing objective away from bomb-site language.
- Constraint: The internal state names remain stable for now, so the next objective-system pass can be isolated and tested separately.

## 2026-08-11 - Prefer targeted visual feedback over expensive post-processing

- Decision: Use generated materials and briefing imagery, plus lightweight Three.js geometry for muzzle flash, sway, and impact feedback.
- Reason: These effects improve perceived realism while keeping draw cost and compatibility predictable on phone browsers.
- Constraint: Keep renderer pixel ratio capped and reuse pooled impact effects instead of allocating particles every shot.

## 2026-08-11 - Put a human lead in the opening briefing

- Decision: Generate an original full-body desert operative cutout and place it in the Operation Sable briefing panel.
- Reason: A visible field lead gives the player an immediate human anchor before the first-person camera opens.
- Constraint: Use an original uniform and silhouette with no logos, copied characters, or branded equipment.

## 2026-08-11 - Make the first operation playable immediately

- Decision: Auto-issue the pistol, rifle, and knife, skip the blocking kit confirmation, and enter the first operation automatically.
- Reason: A fresh player should reach movement and combat quickly instead of seeing an immediate failure or waiting behind a setup screen.
- Constraint: Keep the buy menu and purchase handlers in place for a future loadout phase, but do not make them a prerequisite for the opening mission.

## 2026-08-11 - Start with a staffed field

- Decision: Default the squad to three operatives, keep multiple guards active, and extend the opening round to three minutes.
- Reason: Several readable actors and a longer first combat window make the compound feel like an active battlefield while leaving room for stealth.
- Constraint: Reuse the existing bot director and navigation system so field presence remains deterministic and mobile-friendly.

## 2026-08-11 - Keep simulation progress independent from pointer lock

- Decision: Let match timing and bot combat advance while pointer lock is unavailable.
- Reason: Browsers and phones handle focus differently, and the player should not lose the operation before clicking the canvas or touching the controls.
- Constraint: Pointer lock still improves desktop camera control, but it is now an input enhancement rather than a match-state gate.
