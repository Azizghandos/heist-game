# GILDED — a one-room heist

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/Azizghandos/heist-game/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/Azizghandos/heist-game/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

One gallery. One golden idol. Two guards, two cameras, and one thief — you.

GILDED is a complete top-down heist game that runs offline in a desktop browser from static
files: no build step, no network, no libraries. The whole room is visible in a single frame —
every guard patrol, every sweeping camera cone, the glowing idol and the green exit door — so
every plan is made by reading the room, not by memorising it.

## How to play

Serve the game and open it in a desktop browser:

```
node serve.ts
# open http://localhost:8080
```

- **Move:** WASD or arrow keys. **Sneak:** hold Shift to move slowly and raise the alarm
  half as fast while you are seen.
- **EMP:** click a security camera to disable it for 5 seconds. You carry 2 charges — spend
  them, don't waste them.
- **Goal:** cross the gallery, take the Gilded Idol from its pedestal, then leave through the
  green service door on the right wall.
- **Alarm:** standing inside a guard's yellow cone or a camera's red cone raises the alarm
  meter. Sneaking slows the rise; hiding behind a display case blocks line of sight and lets
  the meter drain. When the meter fills, the alarm sounds and both guards converge on you.
- **Caught:** a guard who reaches you ends the night. **R** restarts, **P** pauses, **M**
  mutes. All sound is synthesised with WebAudio — footsteps, camera beeps, the alarm wail,
  and the win and caught jingles — no audio files.

The guards walk fixed patrols you can learn: Marco crosses the room east–west, Lena walks
north–south past the pedestal. The cameras sweep on fixed rhythms. There are several routes
through the cases — the patient one wins.

## Screenshots

- `1-cover.jpg` — the whole gallery at a glance: the thief at the entrance, the idol glowing
  on its pedestal, both cones sweeping, the alarm quiet.
- `2-sneak.jpg` — sneaking behind the JEWELS case, a breath outside a camera's red cone.
- `3-loot.jpg` — the idol in hand, a guard's cone already turning toward the pedestal.
- `4-alarm.jpg` — the alarm wailing, both guards converging, the thief running for the green
  door with one camera EMP'd.

## Structure

- `game/index.html` — the page and canvas.
- `game/src/main.js` — boot, the fixed-step loop, screens, shot mode.
- `game/src/world.js` — the room, line of sight, collision, the alarm and win/lose rules.
- `game/src/guards.js` — patrols, vision cones, the chase when the alarm sounds.
- `game/src/cameras.js` — sweeping cameras and the EMP.
- `game/src/render.js` — all canvas drawing, the HUD and the overlays.
- `game/src/audio.js` — WebAudio synth: footsteps, beeps, alarm, jingles.
- `game/src/input.js` — keyboard and mouse.
- `game/src/shots.js` — the four deterministic screenshot scenes (`?shot=cover|sneak|loot|alarm`).
- `main.ts` — the make.fun hand-in program (Node 22, stdlib only): copies `game/` and
  `screenshots/` to `/output` and writes `dossier.json` with `vendor/makefun-game.ts`.
- `serve.ts` — a tiny static server for local play.

## Entry

Built for the make.fun bounty [Make the best heist game](https://make.fun/bounty/best-heist-game-20261122-0559).
Try make.fun yourself: https://make.fun/?ref=660zm28c
