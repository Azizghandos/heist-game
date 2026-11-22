// GILDED — the screenshot scenes behind ?shot=cover|sneak|loot|alarm. Each one stages a real
// game state by hand — the same thief, guards, cameras and alarm the live game uses — so the
// frame is exactly what a moment of play looks like, and the same name always gives the same
// frame. No simulation, no randomness: every position is written down here.

import { LOOT } from './world.js';
import { SCREEN_PLAY } from './render.js';

/** Put the thief somewhere and give the room a moment in time. */
function placeThief(state, x, y, sneaking, time) {
  state.thief.x = x;
  state.thief.y = y;
  state.thief.sneaking = sneaking;
  state.thief.moving = true;
  state.time = time;
  state.status = 'playing';
  state.lootTaken = false;
  state.alarm = 0;
  state.alarmed = false;
  state.alarmTimer = 0;
  state.seen = false;
  state.seenBy = '';
  state.emp = 2;
}

function placeGuard(guard, x, y, angle) {
  guard.x = x;
  guard.y = y;
  guard.angle = angle;
  guard.chasing = false;
  guard.returning = false;
}

/**
 * Set `world`, `guards` and `cameras` to the named scene (cover, sneak, loot or alarm; any
 * other name is cover) and return the screen to draw over it.
 */
export function stageShot(name, world, guards, cameras) {
  const state = world.state;
  world.reset();
  guards.forEach((g, i) => {
    g.chasing = false;
    g.returning = false;
    g.waypointIndex = i;
  });
  cameras.forEach((c) => {
    c.disabled = 0;
  });

  if (name === 'sneak') {
    // Crouched just past the JEWELS case, a breath outside Cam B's red cone.
    placeThief(state, 832, 481, true, 42);
    state.alarm = 32;
    state.seen = false;
    placeGuard(guards[0], 330, 300, 0.1);
    placeGuard(guards[1], 700, 210, Math.PI / 2);
    cameras[0].angle = 1.35;
    cameras[1].angle = Math.PI - 0.45;
    return { screen: SCREEN_PLAY };
  }

  if (name === 'loot') {
    // The idol is in hand; Lena's cone is already turning toward the pedestal.
    placeThief(state, LOOT.x - 8, LOOT.y + 34, false, 68);
    state.lootTaken = true;
    state.alarm = 55;
    state.seen = true;
    state.seenBy = 'Lena';
    state.emp = 1;
    placeGuard(guards[0], 330, 290, -0.4);
    placeGuard(guards[1], 700, 250, Math.PI / 2);
    cameras[0].angle = 0.9;
    cameras[1].angle = Math.PI + 0.3;
    return { screen: SCREEN_PLAY };
  }

  if (name === 'alarm') {
    // The alarm is wailing, both guards are converging, and the thief runs for the green door.
    placeThief(state, 884, 216, false, 84);
    state.lootTaken = true;
    state.alarm = 100;
    state.alarmed = true;
    state.alarmTimer = 4.2;
    state.seen = true;
    state.seenBy = 'Marco';
    state.emp = 0;
    placeGuard(guards[0], 700, 250, 0.35);
    placeGuard(guards[1], 812, 330, -1.2);
    guards[0].chasing = true;
    guards[1].chasing = true;
    cameras[0].angle = 1.9;
    cameras[1].angle = Math.PI - 0.2;
    cameras[1].disabled = 2.5; // One camera EMP'd in the escape.
    return { screen: SCREEN_PLAY };
  }

  // Cover: the whole room at a glance — thief at the entrance, the idol glowing on its
  // pedestal, both cones sweeping, the alarm quiet.
  placeThief(state, 100, 585, false, 0);
  placeGuard(guards[0], 300, 300, 0);
  placeGuard(guards[1], 700, 505, -Math.PI / 2);
  cameras[0].angle = 1.15;
  cameras[1].angle = Math.PI + 0.35;
  return { screen: SCREEN_PLAY };
}
