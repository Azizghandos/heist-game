// GILDED — the two night guards. Each walks a fixed patrol between two waypoints, sweeping a
// yellow vision cone ahead of him. He can be read: the cone shows exactly where he looks, and
// his pace never changes on patrol. When the alarm sounds he stops patrolling and converges on
// the thief; when it ends he walks back to his route.

import { FIELD, WALL, inCone } from './world.js';

export const GUARD_RANGE = 175;
export const GUARD_HALF_ANGLE = 0.5;
export const GUARD_PATROL_SPEED = 56;
export const GUARD_CHASE_SPEED = 135;
export const GUARD_RADIUS = 13;

// Two patrols that cross the room's open lanes, so every route has a moment it is watched.
const PATROLS = [
  {
    name: 'Marco',
    waypoints: [
      { x: 150, y: 300 },
      { x: 820, y: 300 },
    ],
    speed: 58,
    start: { x: 150, y: 300 },
  },
  {
    name: 'Lena',
    waypoints: [
      { x: 700, y: 130 },
      { x: 700, y: 540 },
    ],
    speed: 50,
    start: { x: 700, y: 540 },
  },
];

function turnToward(current, target, maxTurn) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) <= maxTurn) return target;
  return current + Math.sign(diff) * maxTurn;
}

/** Build the guards fresh for a new game. */
export function createGuards() {
  return PATROLS.map((p) => ({
    name: p.name,
    x: p.start.x,
    y: p.start.y,
    angle: 0,
    waypoints: p.waypoints,
    // Starts at 0: the arrival check advances a guard who spawns on a waypoint, so both
    // patrols head out along their route at once.
    waypointIndex: 0,
    speed: p.speed,
    chasing: false,
    returning: false,
    r: GUARD_RADIUS,
  }));
}

/**
 * One step for both guards. `alarmed` makes them chase the thief; otherwise they patrol, or
 * walk back to the nearest waypoint after a chase. Returns the closest distance at which any
 * guard currently sees the thief, or Infinity when none does.
 */
export function stepGuards(guards, thief, alarmed, dt) {
  let closestSeen = Infinity;
  for (const g of guards) {
    if (alarmed) {
      g.chasing = true;
      g.returning = false;
      const dx = thief.x - g.x;
      const dy = thief.y - g.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 1) {
        g.angle = turnToward(g.angle, Math.atan2(dy, dx), 6 * dt);
        g.x += (dx / dist) * GUARD_CHASE_SPEED * dt;
        g.y += (dy / dist) * GUARD_CHASE_SPEED * dt;
      }
    } else {
      if (g.chasing) {
        // The alarm is over: head for the nearest waypoint, then resume the patrol.
        g.chasing = false;
        g.returning = true;
        let best = 0;
        let bestDist = Infinity;
        for (let i = 0; i < g.waypoints.length; i += 1) {
          const d = Math.hypot(g.waypoints[i].x - g.x, g.waypoints[i].y - g.y);
          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        }
        g.waypointIndex = best;
      }
      const target = g.waypoints[g.waypointIndex];
      const dx = target.x - g.x;
      const dy = target.y - g.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 4) {
        g.waypointIndex = (g.waypointIndex + 1) % g.waypoints.length;
        g.returning = false;
      } else {
        g.angle = turnToward(g.angle, Math.atan2(dy, dx), 4 * dt);
        g.x += (dx / dist) * g.speed * dt;
        g.y += (dy / dist) * g.speed * dt;
      }
    }
    g.x = Math.max(WALL + g.r, Math.min(FIELD.width - WALL - g.r, g.x));
    g.y = Math.max(WALL + g.r, Math.min(FIELD.height - WALL - g.r, g.y));
    if (inCone(g.x, g.y, g.angle, GUARD_RANGE, GUARD_HALF_ANGLE, thief.x, thief.y)) {
      closestSeen = Math.min(closestSeen, Math.hypot(thief.x - g.x, thief.y - g.y));
    }
  }
  return closestSeen;
}

/** The name of the first guard whose cone holds the thief, or '' when none does. */
export function guardSeeing(guards, thief) {
  for (const g of guards) {
    if (inCone(g.x, g.y, g.angle, GUARD_RANGE, GUARD_HALF_ANGLE, thief.x, thief.y)) return g.name;
  }
  return '';
}
