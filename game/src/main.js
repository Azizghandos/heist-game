// GILDED — boot and the one loop. Input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between five screens: title, play, paused, win and lost.
//
// ?shot=cover|sneak|loot|alarm stages that scene instead of running the loop, paints it twice
// and sets window.__shotReady for a screenshot.

import { createWorld, EVENT_ALARM, EVENT_LOST, EVENT_PICKUP, EVENT_SPOTTED, EVENT_WIN } from './world.js';
import { cameraSeeing, createCameras, empAt, stepCameras } from './cameras.js';
import { createGuards, GUARD_HALF_ANGLE, GUARD_RANGE, guardSeeing, stepGuards } from './guards.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createRenderer, SCREEN_LOST, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { playCameraBeep, playCaught, playEmp, playFootstep, playPickup, playWin, startAlarm, stopAlarm, toggleMute, unlockAudio } from './audio.js';
import { stageShot } from './shots.js';
import { inCone } from './world.js';
import { CAMERA_HALF_ANGLE, CAMERA_RANGE } from './cameras.js';

const STEP = 1 / 60;
/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld();
const guards = createGuards();
const cameras = createCameras();
world.state.guards = guards; // The catch check in world.step reads this array.
world.state.cameras = cameras; // The renderer draws cones and camera bodies from this array.
const renderer = createRenderer(canvas);

window.addEventListener('error', (event) => {
  window.__shotError = String(event.message || event.error || 'unknown error');
  document.title = `GILDED-ERROR: ${window.__shotError}`;
});

function runShot(name) {
  const scene = stageShot(name, world, guards, cameras);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, { timeText: '' });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();
  let stepTimer = 0;
  let beepTimer = 0;

  function announce(message) {
    status.textContent = message;
  }

  function timeText() {
    const total = Math.floor(world.state.time);
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  function startGame() {
    world.reset();
    guards.length = 0;
    guards.push(...createGuards());
    cameras.length = 0;
    cameras.push(...createCameras());
    accumulator = 0;
    stepTimer = 0;
    beepTimer = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Take the idol, leave by the green door.');
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_RESTART && screen !== SCREEN_TITLE) {
      stopAlarm();
      startGame();
      return;
    }
    if (actions & ACTION_CONFIRM) {
      unlockAudio();
      if (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_LOST) startGame();
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
  }

  function handleClicks() {
    if (screen !== SCREEN_PLAY) return;
    for (const click of input.takeClicks()) {
      const field = renderer.toField(click.x, click.y);
      if (world.state.emp <= 0) continue;
      const hit = empAt(cameras, field.x, field.y);
      if (hit) {
        world.state.emp -= 1;
        playEmp();
        announce(`${hit.name} disabled for 5 seconds.`);
      }
    }
  }

  function step() {
    const state = world.state;
    if (screen === SCREEN_TITLE) {
      // The room idles behind the title: cameras sweep, guards patrol, nothing is seen.
      stepCameras(cameras, state.time, STEP);
      stepGuards(guards, state.thief, false, STEP);
      state.time += STEP;
      return;
    }
    const move = input.move();
    const sneak = input.sneaking();
    stepCameras(cameras, state.time, STEP);
    stepGuards(guards, state.thief, state.alarmed, STEP);
    // Who sees the thief right now, and how close is the nearest watcher?
    const guardDist = (() => {
      let closest = Infinity;
      for (const g of guards) {
        if (inCone(g.x, g.y, g.angle, GUARD_RANGE, GUARD_HALF_ANGLE, state.thief.x, state.thief.y)) {
          closest = Math.min(closest, Math.hypot(state.thief.x - g.x, state.thief.y - g.y));
        }
      }
      return closest;
    })();
    const cameraDist = cameraSeeing(cameras, state.thief);
    const spotted = guardDist !== Infinity || cameraDist !== Infinity;
    const seenBy = guardSeeing(guards, state.thief) || (cameraDist !== Infinity ? cameraNameSeeing() : '');
    const events = world.step(STEP, move, sneak, spotted, Math.min(guardDist, cameraDist));
    state.seenBy = spotted ? seenBy : '';
    if (events & EVENT_SPOTTED) announce('Spotted! Get out of the cone!');
    if (events & EVENT_PICKUP) playPickup();
    if (events & EVENT_ALARM) {
      startAlarm();
      announce('Alarm! The guards are coming for you!');
    }
    if (events & EVENT_WIN) {
      stopAlarm();
      playWin();
      screen = SCREEN_WIN;
      announce(`Clean getaway in ${timeText()}.`);
    } else if (events & EVENT_LOST) {
      stopAlarm();
      playCaught();
      screen = SCREEN_LOST;
      announce('Caught! Press R to try again.');
    }
    // Footsteps under the thief, and the camera's warning beep while it watches.
    if (state.moving && state.status === 'playing') {
      stepTimer -= STEP;
      if (stepTimer <= 0) {
        playFootstep(sneak);
        stepTimer = sneak ? 0.55 : 0.38;
      }
    }
    if (spotted && cameraDist !== Infinity && state.status === 'playing') {
      beepTimer -= STEP;
      if (beepTimer <= 0) {
        playCameraBeep();
        beepTimer = 0.5;
      }
    }
  }

  function cameraNameSeeing() {
    const state = world.state;
    for (const c of cameras) {
      if (c.disabled > 0) continue;
      if (inCone(c.x, c.y, c.angle, CAMERA_RANGE, CAMERA_HALF_ANGLE, state.thief.x, state.thief.y)) return c.name;
    }
    return '';
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    handleClicks();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, { timeText: timeText() });
  }

  // Leaving the tab pauses a running game rather than letting the guards close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('GILDED. Press Space or click to begin the heist.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
