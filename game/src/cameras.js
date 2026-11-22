// GILDED — the two security cameras. Each is bolted to a wall and sweeps a red cone back and
// forth on a fixed rhythm, so the player can time the crossing. A click on a camera fires one
// of the thief's two EMP charges and kills it for five seconds — a tool with a cost, not a
// free pass.

import { inCone } from './world.js';

export const CAMERA_RANGE = 200;
export const CAMERA_HALF_ANGLE = 0.42;
export const EMP_DURATION = 5;
export const EMP_RADIUS = 26;

const CAMERA_DEFS = [
  {
    name: 'Cam A',
    x: 480,
    y: 22,
    baseAngle: Math.PI / 2, // Faces down into the room from the top wall.
    sweep: 0.95,
    speed: 0.55,
    phase: 0,
  },
  {
    name: 'Cam B',
    x: 938,
    y: 330,
    baseAngle: Math.PI, // Faces left into the room from the right wall.
    sweep: 0.85,
    speed: 0.7,
    phase: 1.6,
  },
];

/** Build the cameras fresh for a new game. */
export function createCameras() {
  return CAMERA_DEFS.map((c) => ({
    name: c.name,
    x: c.x,
    y: c.y,
    baseAngle: c.baseAngle,
    sweep: c.sweep,
    speed: c.speed,
    phase: c.phase,
    angle: c.baseAngle,
    disabled: 0, // Seconds of EMP left; 0 means live.
  }));
}

/** One step: sweep the live cameras; count the disabled ones down. */
export function stepCameras(cameras, time, dt) {
  for (const c of cameras) {
    if (c.disabled > 0) {
      c.disabled = Math.max(0, c.disabled - dt);
      continue;
    }
    c.angle = c.baseAngle + Math.sin(time * c.speed + c.phase) * c.sweep;
  }
}

/**
 * The closest distance at which any live camera currently sees the thief, or Infinity.
 * A disabled camera sees nothing.
 */
export function cameraSeeing(cameras, thief) {
  let closest = Infinity;
  for (const c of cameras) {
    if (c.disabled > 0) continue;
    if (inCone(c.x, c.y, c.angle, CAMERA_RANGE, CAMERA_HALF_ANGLE, thief.x, thief.y)) {
      closest = Math.min(closest, Math.hypot(thief.x - c.x, thief.y - c.y));
    }
  }
  return closest;
}

/**
 * Fire an EMP at a point in the room. When the click lands on a live camera, it goes dark for
 * EMP_DURATION seconds and the charge is spent. Returns the camera hit, or null.
 */
export function empAt(cameras, x, y) {
  for (const c of cameras) {
    if (c.disabled > 0) continue;
    if (Math.hypot(x - c.x, y - c.y) <= EMP_RADIUS) {
      c.disabled = EMP_DURATION;
      return c;
    }
  }
  return null;
}
