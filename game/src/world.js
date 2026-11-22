// GILDED — the room, its rules and its state. No drawing and no browser in here: the
// gallery floor, the display cases that block sight and movement, the thief, the loot and the
// exit, the alarm meter and what step() reports as bit flags. Guards and cameras live in their
// own files and are stepped by the caller; this file only owns the geometry they all share.

export const FIELD = { width: 960, height: 640 };
export const WALL = 16;

export const EVENT_LOOT = 1;
export const EVENT_WIN = 2;
export const EVENT_LOST = 4;
export const EVENT_ALARM = 8;
export const EVENT_SPOTTED = 16;
export const EVENT_PICKUP = 32;

export const THIEF_RADIUS = 12;
export const WALK_SPEED = 155;
export const SNEAK_SPEED = 72;
export const CATCH_RADIUS = 20;
export const LOOT_RADIUS = 30;

export const ALARM_MAX = 100;
export const ALARM_RISE = 38;
export const ALARM_RISE_SNEAK = 19;
export const ALARM_CLOSE_BONUS = 20;
export const ALARM_CLOSE_DIST = 70;
export const ALARM_DECAY = 16;
export const ALARM_DURATION = 6;

// The gallery floor: five glass display cases. They are cover — they block movement and they
// block a guard's or a camera's line of sight, so the thief plans routes from case to case.
export const CASES = [
  { x: 170, y: 150, w: 150, h: 64, label: 'PORCELAIN' },
  { x: 470, y: 100, w: 64, h: 150, label: 'MASKS' },
  { x: 600, y: 400, w: 170, h: 64, label: 'JEWELS' },
  { x: 230, y: 430, w: 64, h: 130, label: 'COINS' },
  { x: 380, y: 300, w: 130, h: 56, label: 'SCROLLS' },
];

// The golden idol on its glowing pedestal, and the green service door out.
export const LOOT = { x: 800, y: 120 };
export const EXIT = { x: 924, y: 96, w: 36, h: 76 };
export const ENTRANCE = { x: 100, y: 585 };

function segmentHitsRect(x1, y1, x2, y2, rect) {
  // A segment crosses a rectangle when an endpoint is inside it, or it crosses an edge.
  if (x1 >= rect.x && x1 <= rect.x + rect.w && y1 >= rect.y && y1 <= rect.y + rect.h) return true;
  if (x2 >= rect.x && x2 <= rect.x + rect.w && y2 >= rect.y && y2 <= rect.y + rect.h) return true;
  const edges = [
    [rect.x, rect.y, rect.x + rect.w, rect.y],
    [rect.x + rect.w, rect.y, rect.x + rect.w, rect.y + rect.h],
    [rect.x + rect.w, rect.y + rect.h, rect.x, rect.y + rect.h],
    [rect.x, rect.y + rect.h, rect.x, rect.y],
  ];
  for (const [ax, ay, bx, by] of edges) {
    const d1 = (bx - ax) * (y1 - ay) - (by - ay) * (x1 - ax);
    const d2 = (bx - ax) * (y2 - ay) - (by - ay) * (x2 - ax);
    const d3 = (x2 - x1) * (by - y1) - (y2 - y1) * (bx - x1);
    const d4 = (x2 - x1) * (ay - y1) - (y2 - y1) * (ax - x1);
    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  }
  return false;
}

/** True when nothing — no display case — stands between the two points. */
export function hasLineOfSight(x1, y1, x2, y2) {
  for (const c of CASES) if (segmentHitsRect(x1, y1, x2, y2, c)) return false;
  return true;
}

/** True when the target sits inside the watcher's cone and is not hidden behind a case. */
export function inCone(ox, oy, angle, range, halfAngle, tx, ty) {
  const dx = tx - ox;
  const dy = ty - oy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  let diff = Math.atan2(dy, dx) - angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > halfAngle) return false;
  return hasLineOfSight(ox, oy, tx, ty);
}

/** Push a circle out of a rectangle it overlaps; returns the corrected centre. */
export function pushOutOfRect(px, py, r, rect) {
  const cx = Math.max(rect.x, Math.min(px, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(py, rect.y + rect.h));
  const dx = px - cx;
  const dy = py - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return [px, py];
  if (d2 === 0) {
    // Centre inside the rectangle: shove out along the shortest side.
    const left = px - rect.x;
    const right = rect.x + rect.w - px;
    const top = py - rect.y;
    const bottom = rect.y + rect.h - py;
    const m = Math.min(left, right, top, bottom);
    if (m === left) return [rect.x - r, py];
    if (m === right) return [rect.x + rect.w + r, py];
    if (m === top) return [px, rect.y - r];
    return [px, rect.y + rect.h + r];
  }
  const d = Math.sqrt(d2);
  return [cx + (dx / d) * r, cy + (dy / d) * r];
}

export function createWorld() {
  const state = {
    thief: { x: ENTRANCE.x, y: ENTRANCE.y, r: THIEF_RADIUS, sneaking: false, moving: false },
    guards: [],
    cameras: [],
    lootTaken: false,
    lootGlow: 0,
    alarm: 0,
    alarmed: false,
    alarmTimer: 0,
    seen: false,
    seenBy: '',
    emp: 2,
    time: 0,
    status: 'playing', // 'playing' | 'won' | 'lost'
    endReason: '',
    stepCount: 0,
  };

  function reset() {
    state.thief.x = ENTRANCE.x;
    state.thief.y = ENTRANCE.y;
    state.thief.sneaking = false;
    state.thief.moving = false;
    state.lootTaken = false;
    state.lootGlow = 0;
    state.alarm = 0;
    state.alarmed = false;
    state.alarmTimer = 0;
    state.seen = false;
    state.seenBy = '';
    state.emp = 2;
    state.time = 0;
    state.status = 'playing';
    state.endReason = '';
    state.stepCount = 0;
  }

  /**
   * One fixed step. `move` is {x, y} in -1..1, `sneak` slows the thief and halves the alarm
   * rise. `spotted` is set by the caller from the guards'/cameras' cones before this call —
   * pass the closest watcher distance too, so a near miss is scarier than a far one.
   * Returns the events of this step as bit flags.
   */
  function step(dt, move, sneak, spotted, spotDist) {
    let events = 0;
    if (state.status !== 'playing') return events;
    state.time += dt;
    state.stepCount += 1;

    const speed = sneak ? SNEAK_SPEED : WALK_SPEED;
    const len = Math.hypot(move.x, move.y);
    state.thief.sneaking = sneak;
    state.thief.moving = len > 0.01;
    if (len > 0.01) {
      let nx = state.thief.x + (move.x / len) * speed * dt;
      let ny = state.thief.y + (move.y / len) * speed * dt;
      nx = Math.max(WALL + state.thief.r, Math.min(FIELD.width - WALL - state.thief.r, nx));
      ny = Math.max(WALL + state.thief.r, Math.min(FIELD.height - WALL - state.thief.r, ny));
      for (const c of CASES) {
        [nx, ny] = pushOutOfRect(nx, ny, state.thief.r, c);
      }
      state.thief.x = nx;
      state.thief.y = ny;
    }

    // The alarm: seen and it climbs (slower while sneaking, faster up close); hidden and it
    // drains. Full means the alarm sounds and every guard converges on the thief.
    const wasSeen = state.seen;
    state.seen = spotted;
    if (spotted) {
      let rise = sneak ? ALARM_RISE_SNEAK : ALARM_RISE;
      if (spotDist < ALARM_CLOSE_DIST) rise += ALARM_CLOSE_BONUS;
      state.alarm = Math.min(ALARM_MAX, state.alarm + rise * dt);
      if (!wasSeen) events |= EVENT_SPOTTED;
    } else {
      state.alarm = Math.max(0, state.alarm - ALARM_DECAY * dt);
    }
    if (state.alarm >= ALARM_MAX && !state.alarmed) {
      state.alarmed = true;
      state.alarmTimer = ALARM_DURATION;
      events |= EVENT_ALARM;
    }
    if (state.alarmed) {
      state.alarmTimer -= dt;
      if (state.alarmTimer <= 0) {
        state.alarmed = false;
        state.alarm = 55; // The alarm ends, but the room stays on edge.
      }
    }

    // The golden idol: step close and it is yours.
    if (!state.lootTaken && Math.hypot(state.thief.x - LOOT.x, state.thief.y - LOOT.y) <= LOOT_RADIUS) {
      state.lootTaken = true;
      events |= EVENT_LOOT | EVENT_PICKUP;
    }
    state.lootGlow += dt;

    // Caught: a guard close enough to grab you ends the night.
    for (const g of state.guards) {
      if (Math.hypot(state.thief.x - g.x, state.thief.y - g.y) < CATCH_RADIUS + 4) {
        state.status = 'lost';
        state.endReason = 'caught';
        return events | EVENT_LOST;
      }
    }

    // Out: loot in hand and through the green service door.
    if (
      state.lootTaken &&
      state.thief.x > EXIT.x - 6 &&
      state.thief.x < EXIT.x + EXIT.w + 6 &&
      state.thief.y > EXIT.y &&
      state.thief.y < EXIT.y + EXIT.h
    ) {
      state.status = 'won';
      state.endReason = 'escaped';
      return events | EVENT_WIN;
    }
    return events;
  }

  reset();
  return { state, reset, step };
}
