# Dustline Tactical

Dustline Tactical is a single-player, browser-first tactical FPS built with Three.js, TypeScript, and Vite.
V2 expands the original combat range into a complete first-to-four bomb-defusal match with configurable squad sizes, bot teammates, an economy, loadouts, side switching, and teammate takeover.

## Local development

```bash
npm install
npm run dev
npm run build
npm test
npm run test:e2e
```

The development server prints the local URL after it starts.
Open that URL in a desktop Chromium browser for the intended pointer-lock experience.

## Starting an operation

The operation setup screen lets you choose 1v1 through 5v5, an enemy difficulty, and whether Alpha starts on attack or defense.
You always control an Alpha operative, and bots fill every other slot on both squads.
The first squad to win four rounds wins the operation, and assignments switch after round three.

Each round opens with a buy phase.
Confirm the loadout, click the viewport to capture the pointer, and wait for deployment to complete.

## Controls

- Use `W`, `A`, `S`, and `D` to move.
- Hold `Shift` to sprint.
- Use the mouse to look and the left mouse button to fire.
- Hold `E` to plant or defuse the breach device, and press `E` to recover a dropped device.
- Use `R` to reload.
- Use number keys `1` through `5` to select owned weapons.
- Use `Escape` to release the pointer.
- Use `F3` to show FPS, draw-call, triangle, and active-bot counters.

When the controlled operative dies, control automatically transfers to the nearest living Alpha bot.
The round ends only when its elimination or device objective is actually resolved.

## Match rules

Attackers carry the breach device and may arm it at site A or site B.
Defenders win on a live-round timeout, by eliminating attackers before a plant, or by defusing an armed device.
Attackers win by eliminating defenders, or by allowing the armed device to detonate.
Eliminating attackers after a plant does not end the round because defenders must still defuse.

The buy phase lasts twelve seconds, deployment lasts three seconds, and the live round lasts ninety seconds.
Planting takes three seconds, the fuse lasts thirty-five seconds, and defusing takes ten seconds or five seconds with a kit.

## Difficulty

Easy, medium, and expert profiles tune awareness, reaction delay, accuracy, movement, burst behavior, and damage pressure.
Difficulty does not add hidden health to bots.
For repeatable browser checks, a default difficulty can also be provided with `?difficulty=easy`, `?difficulty=medium`, or `?difficulty=expert`.

## Architecture documentation

Local V2 planning notes are maintained in `decison.md` and `V2_FILE_CHANGES.md`.
These files are intentionally ignored by Git and remain available only in the working copy where they were created.

## Deployment

The production build is static and has no backend dependency.
Vercel can deploy the repository directly using the included `vercel.json` rewrite configuration.
