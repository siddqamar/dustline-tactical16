# build a browser-based tactical fps inspired by counter-strike: dust2

## role

act as a senior game developer, 3d graphics engineer, and qa engineer.

build a **fully playable browser-based tactical fps vertical slice** using **three.js**.

the target experience should feel like a polished, realistic tactical fps inspired by the classic counter-strike gameplay and the dust2-style map layout, rather than looking like a basic three.js prototype.

the priority is **playable, responsive, realistic fps combat**, while keeping the game lightweight enough to run smoothly in a normal desktop browser.

---

## phase 1 goal

the first milestone is a complete **single-player bot match**.

the player should be able to:

- load into the map
- move around freely
- look around with the mouse
- aim and shoot
- reload
- switch weapons
- fight enemy bots
- die and restart
- win/lose a round
- play against bots with:
  - easy
  - medium
  - expert

do not build menus, multiplayer networking, accounts, backend infrastructure, or unnecessary systems unless they are required for the playable experience.

focus heavily on making the core gameplay feel good.

---

# map

create a compact tactical map inspired by **counter-strike's dust2**.

the map should have the recognizable tactical structure and flow of a classic bomb-site fps map:

- two opposing spawn areas
- multiple routes between the areas
- narrow corridors
- open combat areas
- long sightlines
- close-quarter areas
- elevated/covered positions
- strategic corners
- cover objects
- two distinct objective-style areas

do not simply create a flat plane with boxes.

the environment should have:

- buildings
- walls
- doors/openings
- windows
- stairs
- platforms
- crates
- barrels
- concrete structures
- believable architectural details
- lighting
- shadows
- environmental props

the map does not need to reproduce every tiny detail from the original game.

prioritize:

1. recognizable tactical layout
2. good gameplay flow
3. believable scale
4. interesting sightlines
5. good performance

use original/generated assets or procedural geometry where appropriate rather than depending on copyrighted game assets.

---

# visual quality

treat the visual target as a **high-quality realistic tactical fps**, not a low-poly demo.

the game should have a grounded, realistic visual style similar to the visual language of classic tactical shooters.

avoid:

- minecraft-like geometry
- toy-like proportions
- extremely low-poly objects
- flat unlit materials
- placeholder-looking environments
- excessive primitive cubes
- unrealistic neon colors

use:

- physically believable materials
- detailed textures where practical
- realistic roughness
- concrete/stone/metal/wood materials
- proper lighting
- ambient occlusion where affordable
- shadows
- fog/atmosphere where appropriate
- subtle environmental variation
- realistic weapon models
- believable character silhouettes

however, **browser performance is more important than visual complexity**.

prefer optimized geometry and textures over unnecessarily expensive assets.

---

# player

implement a proper first-person controller.

controls:

- `w` = forward
- `a` = left
- `s` = backward
- `d` = right
- mouse = look
- left mouse = fire
- right mouse = aim where appropriate
- `r` = reload
- `1`, `2`, `3` etc. = weapon switching
- `shift` = optional movement modifier if appropriate
- `esc` = release mouse pointer

movement should feel responsive and stable.

make sure:

- mouse look works correctly
- pointer lock works
- `w/a/s/d` work consistently
- diagonal movement does not create unrealistic speed
- collision prevents walking through walls
- stairs and small elevation changes work
- player cannot fall through the map
- camera does not clip excessively through geometry
- movement feels like an actual fps rather than a floating camera

---

# weapons

implement multiple weapon categories.

## pistols

at minimum:

- one standard pistol
- one stronger/slower pistol

## rifles

at minimum:

- one assault rifle
- one alternative rifle

## sniper

at minimum:

- one sniper rifle

each weapon should have meaningful differences in:

- damage
- fire rate
- recoil
- spread
- magazine size
- reload time
- movement accuracy
- range
- handling

do not make every gun behave identically with different models.

---

# shooting system

implement actual fps shooting mechanics.

include:

- hitscan or another browser-friendly shooting approach
- muzzle flash
- impact effects
- hit detection
- head/body damage
- recoil
- weapon spread
- reload
- ammunition
- weapon switching
- shooting sound effects
- hit feedback

shots should feel responsive.

avoid fake shooting animations where bullets have no meaningful relationship to the weapon.

implement sensible hitboxes for player and bots.

---

# aiming

add proper fps aiming.

when applicable:

- hip fire
- aim-down-sights
- reduced sensitivity while aiming
- reduced spread
- appropriate weapon animation
- scoped view for sniper

the sniper should feel substantially different from a rifle.

---

# bots

bots are one of the most important parts of phase 1.

implement actual combat-oriented bot ai rather than simply having enemies randomly walk around.

bots should be able to:

- navigate the map
- detect the player
- move toward combat areas
- take cover
- aim toward enemies
- shoot
- reload
- pursue enemies
- react to being shot
- avoid continuously walking into walls
- patrol/search when they don't see the player

use a lightweight navigation solution suitable for a browser.

you can use:

- waypoint graphs
- navigation nodes
- simple navmesh
- raycasting
- steering behaviors
- finite-state machines

choose the approach that gives the best combination of reliability and performance.

---

# difficulty levels

implement three clearly different bot difficulties.

### easy

- slower reaction time
- lower accuracy
- slower target acquisition
- less aggressive
- less effective positioning

### medium

- reasonable reaction time
- moderate accuracy
- better positioning
- more aggressive combat behavior

### expert

- fast reaction
- high accuracy
- better target selection
- better positioning
- better use of cover
- more aggressive
- reacts quickly to player movement

do not simply change bot health to represent difficulty.

the difficulty should primarily come from **ai behavior and combat skill**.

---

# combat feedback

the game should provide strong feedback when fighting.

include:

- crosshair
- ammo counter
- health
- weapon indicator
- hit confirmation
- damage feedback
- muzzle flash
- bullet impact
- death feedback
- reload feedback
- weapon switching feedback

keep the hud clean and tactical.

---

# game loop

implement a simple round-based loop.

example:

1. player spawns
2. bots spawn
3. countdown begins
4. round starts
5. combat happens
6. one side wins
7. round-end screen appears
8. player can restart the round

phase 1 does **not** need full competitive counter-strike rules.

the priority is getting a fun, polished bot combat experience working end-to-end.

---

# audio

add lightweight audio where possible.

include:

- weapon firing
- reload
- footsteps
- impacts
- hit/death sounds
- ambient environment
- round start/end feedback

use browser-compatible audio and keep assets lightweight.

---

# performance requirements

this is extremely important.

the final game must be designed for browser deployment.

target:

- smooth gameplay on normal modern desktop hardware
- stable frame rate
- fast initial loading
- reasonable memory usage
- no unnecessary large assets
- no huge uncompressed textures
- no excessive draw calls
- no expensive per-frame allocations
- no unnecessary physics simulation

use:

- frustum culling
- instancing where useful
- optimized geometry
- compressed/appropriately sized textures
- efficient raycasting
- object reuse
- efficient bot updates
- level-of-detail where useful
- lazy loading where appropriate

avoid expensive operations inside the render loop.

add a simple fps/performance debug mode during development.

---

# technology

use:

- three.js
- javascript or typescript
- vite
- modern browser APIs

prefer typescript if it does not significantly complicate the implementation.

keep the architecture clean and modular.

suggested structure:

```text
src/
  game/
    Game.ts
    GameLoop.ts
    GameState.ts

  player/
    PlayerController.ts
    PlayerCamera.ts

  weapons/
    Weapon.ts
    Pistol.ts
    Rifle.ts
    Sniper.ts
    WeaponManager.ts

  ai/
    Bot.ts
    BotController.ts
    BotDifficulty.ts
    Navigation.ts

  world/
    Map.ts
    Environment.ts
    Collision.ts

  combat/
    DamageSystem.ts
    HitDetection.ts
    ProjectileSystem.ts

  ui/
    HUD.ts
    Menu.ts
    Crosshair.ts

  audio/
    AudioManager.ts

  main.ts

```

you may change this architecture if you have a better approach.

do not over-engineer the project.

---

# browser deployment

the finished project must be deployable to:

- github pages
- vercel

provide the required configuration.

make sure:

```bash
npm install
npm run dev
npm run build

```

work correctly.

the production build must not depend on a local development server.

avoid backend dependencies for phase 1.

---

# development approach

do not try to build everything blindly in one pass.

work iteratively.

### milestone 1 — foundation

create:

- vite/three.js project
- renderer
- camera
- lighting
- basic environment
- player controller
- collision
- pointer lock

then run and test it.

### milestone 2 — combat

add:

- weapons
- shooting
- damage
- health
- reload
- weapon switching
- hud

then test combat manually.

### milestone 3 — map

build the playable dust2-inspired environment.

verify:

- collision
- scale
- sightlines
- navigation
- performance

### milestone 4 — bots

implement:

- navigation
- enemy detection
- combat
- cover
- difficulty levels

test all three difficulties separately.

### milestone 5 — polish

add:

- materials
- lighting
- effects
- audio
- animations
- visual feedback
- better environment details

### milestone 6 — optimization

profile the game.

identify:

- expensive render operations
- excessive draw calls
- memory-heavy assets
- expensive ai updates
- unnecessary allocations

optimize the actual bottlenecks.

### milestone 7 — final testing

play the game yourself.

do not assume it works because the code compiles.

test:

- movement
- mouse look
- shooting
- aiming
- reload
- weapon switching
- collision
- player death
- bot navigation
- bot shooting
- all three difficulty levels
- round restart
- browser refresh
- production build
- different screen sizes
- chrome
- firefox
- edge

fix issues you discover.

---

# important instruction

treat this as a **real game development task**, not a coding demonstration.

do not stop when the page merely renders.

continue implementing, testing, debugging, and polishing until there is a complete playable phase-1 experience.

if something is broken, diagnose the root cause and fix it instead of working around it with temporary hacks.

if an asset is unavailable, create a procedural or lightweight alternative.

if a technically ambitious feature would significantly hurt browser performance, choose the simpler implementation that preserves the gameplay experience.

prioritize in this order:

1. gameplay
2. responsiveness
3. bot ai
4. shooting/combat feel
5. map quality
6. visual quality
7. audio/effects
8. optimization
9. architectural elegance

the final result should feel like a **small but genuinely playable tactical fps**, not a tech demo.

before declaring the task complete, actually run the application, test the core gameplay loop, fix the problems you encounter, and verify that the production build works.