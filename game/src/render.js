// GILDED — drawing only: the room's state and the current screen in, pixels out. The
// 960x640 gallery is scaled to fit the window and centred. Safe cover, danger and loot are
// obvious at a glance: gold glows for the idol, green for the exit, yellow cones for the
// guards, red cones for the cameras. Flat shapes and canvas text, no images.

import { CASES, EXIT, FIELD, LOOT, WALL } from './world.js';
import { CAMERA_RANGE, CAMERA_HALF_ANGLE } from './cameras.js';
import { GUARD_HALF_ANGLE, GUARD_RANGE } from './guards.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WIN = 'win';
export const SCREEN_LOST = 'lost';

const PALETTE = {
  backdrop: '#0a0d12',
  floor: '#16222c',
  floorTile: '#1a2833',
  carpet: '#5a1f2b',
  carpetEdge: '#8a6d3b',
  wall: '#2c3a48',
  wallTrim: '#8a6d3b',
  caseGlass: '#3d6b7a',
  caseFrame: '#6b5a2e',
  caseLabel: '#c9b478',
  gold: '#f2c14e',
  goldGlow: '#ffd76a',
  exit: '#2fbf71',
  exitDark: '#1d7a48',
  thief: '#23232e',
  thiefTrim: '#f2c14e',
  guard: '#2b3a67',
  guardCap: '#1c2745',
  camera: '#8b98a5',
  cameraOff: '#4a545e',
  coneGuard: 'rgba(242, 193, 78, 0.20)',
  coneGuardEdge: 'rgba(242, 193, 78, 0.55)',
  coneCamera: 'rgba(224, 62, 62, 0.20)',
  coneCameraEdge: 'rgba(224, 62, 62, 0.55)',
  coneSeen: 'rgba(224, 62, 62, 0.38)',
  text: '#f4ead2',
  muted: '#a8b2bd',
  panel: 'rgba(8, 12, 18, 0.88)',
  alarmLow: '#2fbf71',
  alarmMid: '#f2c14e',
  alarmHigh: '#e03e3e',
  hudChip: 'rgba(8, 12, 18, 0.72)',
};

const PANEL = { width: 620, line: 32, bottom: 64 };

function conePath(context, x, y, angle, range, halfAngle) {
  context.beginPath();
  context.moveTo(x, y);
  context.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  context.closePath();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0, ratio: 1 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    view.ratio = ratio;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    view.scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    view.x = (canvas.width - FIELD.width * view.scale) / 2;
    view.y = (canvas.height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align = 'left', baseline = 'alphabetic') {
    if (!fonts.has(size)) fonts.set(size, `${size}px Georgia, 'Times New Roman', serif`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = baseline;
    context.fillText(value, x, y);
  }

  function drawFloor() {
    context.fillStyle = PALETTE.floor;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    // Marble tiles, faint enough to read as floor and no more.
    context.fillStyle = PALETTE.floorTile;
    for (let ty = WALL; ty < FIELD.height - WALL; ty += 80) {
      for (let tx = WALL; tx < FIELD.width - WALL; tx += 80) {
        if (((tx + ty) / 80) % 2 === 0) context.fillRect(tx, ty, 80, 80);
      }
    }
    // A short burgundy carpet runner leading in from the entrance door.
    context.fillStyle = PALETTE.carpet;
    context.fillRect(70, 500, 60, FIELD.height - WALL - 500);
    context.fillStyle = PALETTE.carpetEdge;
    context.fillRect(70, 500, 4, FIELD.height - WALL - 500);
    context.fillRect(126, 500, 4, FIELD.height - WALL - 500);
    // Walls and their gold trim.
    context.fillStyle = PALETTE.wall;
    context.fillRect(0, 0, FIELD.width, WALL);
    context.fillRect(0, FIELD.height - WALL, FIELD.width, WALL);
    context.fillRect(0, 0, WALL, FIELD.height);
    context.fillRect(FIELD.width - WALL, 0, WALL, FIELD.height);
    context.fillStyle = PALETTE.wallTrim;
    context.fillRect(0, WALL, FIELD.width, 2);
    context.fillRect(0, FIELD.height - WALL - 2, FIELD.width, 2);
    context.fillRect(WALL, 0, 2, FIELD.height);
    context.fillRect(FIELD.width - WALL - 2, 0, 2, FIELD.height);
  }

  function drawExit(state) {
    const lit = state.lootTaken;
    context.fillStyle = lit ? PALETTE.exit : PALETTE.exitDark;
    context.fillRect(EXIT.x, EXIT.y, EXIT.w, EXIT.h);
    context.fillStyle = '#0a0d12';
    context.fillRect(EXIT.x + 6, EXIT.y + 8, EXIT.w - 12, EXIT.h - 16);
    context.fillStyle = lit ? PALETTE.exit : PALETTE.muted;
    text('EXIT', EXIT.x + EXIT.w / 2, EXIT.y + EXIT.h / 2 + 5, 13, lit ? PALETTE.exit : PALETTE.muted, 'center');
    if (lit) {
      context.strokeStyle = 'rgba(47, 191, 113, 0.8)';
      context.lineWidth = 2;
      context.strokeRect(EXIT.x - 4, EXIT.y - 4, EXIT.w + 8, EXIT.h + 8);
    }
  }

  function drawEntrance() {
    context.fillStyle = '#3a2c1c';
    context.fillRect(60, FIELD.height - WALL, 80, WALL);
    text('IN', 100, FIELD.height - 4, 11, PALETTE.muted, 'center');
  }

  function drawCases() {
    for (const c of CASES) {
      context.fillStyle = PALETTE.caseFrame;
      context.fillRect(c.x - 4, c.y - 4, c.w + 8, c.h + 8);
      context.fillStyle = PALETTE.caseGlass;
      context.fillRect(c.x, c.y, c.w, c.h);
      context.fillStyle = 'rgba(255, 255, 255, 0.10)';
      context.fillRect(c.x, c.y, c.w, 10);
      text(c.label, c.x + c.w / 2, c.y + c.h / 2 + 5, 13, PALETTE.caseLabel, 'center');
    }
  }

  function drawLoot(state) {
    const pulse = 0.6 + 0.4 * Math.sin(state.lootGlow * 3);
    if (!state.lootTaken) {
      const glow = context.createRadialGradient(LOOT.x, LOOT.y, 4, LOOT.x, LOOT.y, 70);
      glow.addColorStop(0, `rgba(255, 215, 106, ${0.55 * pulse})`);
      glow.addColorStop(1, 'rgba(255, 215, 106, 0)');
      context.fillStyle = glow;
      context.beginPath();
      context.arc(LOOT.x, LOOT.y, 70, 0, Math.PI * 2);
      context.fill();
    }
    // The pedestal.
    context.fillStyle = '#4a4238';
    context.fillRect(LOOT.x - 22, LOOT.y - 4, 44, 34);
    context.fillStyle = '#6b5a2e';
    context.fillRect(LOOT.x - 26, LOOT.y - 10, 52, 8);
    if (!state.lootTaken) {
      // The golden idol: a small faceted gem.
      context.fillStyle = PALETTE.goldGlow;
      context.beginPath();
      context.moveTo(LOOT.x, LOOT.y - 34);
      context.lineTo(LOOT.x + 13, LOOT.y - 16);
      context.lineTo(LOOT.x, LOOT.y - 6);
      context.lineTo(LOOT.x - 13, LOOT.y - 16);
      context.closePath();
      context.fill();
      context.fillStyle = '#fff3c4';
      context.beginPath();
      context.moveTo(LOOT.x, LOOT.y - 34);
      context.lineTo(LOOT.x + 6, LOOT.y - 16);
      context.lineTo(LOOT.x, LOOT.y - 12);
      context.lineTo(LOOT.x - 6, LOOT.y - 16);
      context.closePath();
      context.fill();
      text('THE GILDED IDOL', LOOT.x, LOOT.y - 44, 12, PALETTE.gold, 'center');
    }
  }

  function drawCones(state) {
    for (const g of state.guards) {
      const seen = state.seen && state.seenBy === g.name;
      context.fillStyle = seen ? PALETTE.coneSeen : PALETTE.coneGuard;
      conePath(context, g.x, g.y, g.angle, GUARD_RANGE, GUARD_HALF_ANGLE);
      context.fill();
      context.strokeStyle = PALETTE.coneGuardEdge;
      context.lineWidth = 1.5;
      context.stroke();
    }
    for (const c of state.cameras) {
      if (c.disabled > 0) continue;
      const seen = state.seen && state.seenBy === c.name;
      context.fillStyle = seen ? PALETTE.coneSeen : PALETTE.coneCamera;
      conePath(context, c.x, c.y, c.angle, CAMERA_RANGE, CAMERA_HALF_ANGLE);
      context.fill();
      context.strokeStyle = PALETTE.coneCameraEdge;
      context.lineWidth = 1.5;
      context.stroke();
    }
  }

  function drawGuards(state) {
    for (const g of state.guards) {
      context.fillStyle = PALETTE.guard;
      context.beginPath();
      context.arc(g.x, g.y, g.r, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.guardCap;
      context.beginPath();
      context.arc(g.x, g.y - 2, g.r - 3, Math.PI, 0);
      context.fill();
      context.fillRect(g.x - (g.r - 3), g.y - 4, (g.r - 3) * 2, 3);
      // The direction he faces, so the cone never surprises.
      context.strokeStyle = '#dfe6ee';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(g.x, g.y);
      context.lineTo(g.x + Math.cos(g.angle) * (g.r + 6), g.y + Math.sin(g.angle) * (g.r + 6));
      context.stroke();
      text(g.name.toUpperCase(), g.x, g.y + g.r + 14, 10, PALETTE.muted, 'center');
    }
  }

  function drawCameras(state) {
    for (const c of state.cameras) {
      const off = c.disabled > 0;
      context.fillStyle = off ? PALETTE.cameraOff : PALETTE.camera;
      context.beginPath();
      context.arc(c.x, c.y, 9, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = off ? '#222' : '#e03e3e';
      context.beginPath();
      context.arc(c.x + Math.cos(c.angle) * 4, c.y + Math.sin(c.angle) * 4, 3.5, 0, Math.PI * 2);
      context.fill();
      if (off) {
        text(`OFF ${Math.ceil(c.disabled)}s`, c.x, c.y - 16, 11, PALETTE.muted, 'center');
      } else {
        text(c.name, c.x, c.y - 16, 10, PALETTE.muted, 'center');
      }
    }
  }

  function drawThief(state) {
    const t = state.thief;
    const blink = state.status === 'playing' && t.sneaking ? 0.9 : 1;
    context.globalAlpha = blink;
    // Cloak.
    context.fillStyle = PALETTE.thief;
    context.beginPath();
    context.moveTo(t.x, t.y - t.r - 2);
    context.lineTo(t.x + t.r, t.y + t.r);
    context.lineTo(t.x - t.r, t.y + t.r);
    context.closePath();
    context.fill();
    context.strokeStyle = PALETTE.thiefTrim;
    context.lineWidth = 1.5;
    context.stroke();
    // Hood.
    context.fillStyle = '#101018';
    context.beginPath();
    context.arc(t.x, t.y - 4, 7, 0, Math.PI * 2);
    context.fill();
    // The gold mask glint.
    context.fillStyle = PALETTE.gold;
    context.fillRect(t.x - 4, t.y - 6, 8, 2);
    context.globalAlpha = 1;
    if (state.lootTaken) {
      text('LOOT!', t.x, t.y - t.r - 12, 11, PALETTE.gold, 'center');
    }
  }

  function drawHud(state, screen) {
    // Alarm meter, top left.
    const chipX = 28;
    const chipY = 26;
    const meterW = 220;
    const meterH = 16;
    context.fillStyle = PALETTE.hudChip;
    context.fillRect(chipX - 10, chipY - 8, meterW + 150, 44);
    text('ALARM', chipX, chipY + 12, 14, PALETTE.text);
    context.fillStyle = '#0a0d12';
    context.fillRect(chipX + 62, chipY, meterW, meterH);
    const frac = state.alarm / 100;
    context.fillStyle = frac < 0.5 ? PALETTE.alarmLow : frac < 0.8 ? PALETTE.alarmMid : PALETTE.alarmHigh;
    context.fillRect(chipX + 62, chipY, meterW * frac, meterH);
    context.strokeStyle = PALETTE.text;
    context.lineWidth = 1;
    context.strokeRect(chipX + 62, chipY, meterW, meterH);
    // EMP charges.
    text('EMP', chipX + 300, chipY + 12, 14, PALETTE.text);
    for (let i = 0; i < 2; i += 1) {
      context.fillStyle = i < state.emp ? '#7fd4ff' : '#33414f';
      context.beginPath();
      context.arc(chipX + 340 + i * 22, chipY + 8, 7, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#dfe6ee';
      context.lineWidth = 1;
      context.stroke();
    }
    // Loot status and timer, top right.
    const rightX = FIELD.width - 28;
    text(state.lootTaken ? 'IDOL: TAKEN' : 'IDOL: NOT YET', rightX, chipY + 12, 14, state.lootTaken ? PALETTE.gold : PALETTE.muted, 'right');
    const total = Math.floor(state.time);
    const clock = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    text(clock, rightX, chipY + 32, 14, PALETTE.text, 'right');
    if (state.seen && screen === SCREEN_PLAY) {
      text('SPOTTED!', FIELD.width / 2, 64, 26, PALETTE.alarmHigh, 'center');
    }
    if (state.alarmed && screen === SCREEN_PLAY) {
      context.strokeStyle = `rgba(224, 62, 62, ${0.5 + 0.4 * Math.sin(state.time * 8)})`;
      context.lineWidth = 6;
      context.strokeRect(3, 3, FIELD.width - 6, FIELD.height - 6);
      text('ALARM — THEY ARE COMING FOR YOU', FIELD.width / 2, 92, 22, PALETTE.alarmHigh, 'center');
    }
  }

  function drawPanel(title, lines, prompt, accent) {
    const height = 120 + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = accent;
    context.lineWidth = 2;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 72, 46, accent, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + 122 + index * PANEL.line, 20, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 34, 22, PALETTE.gold, 'center');
  }

  /** Paint one frame: the room, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, extra) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawFloor();
    drawExit(state);
    drawEntrance();
    drawCases();
    drawLoot(state);
    drawCones(state);
    drawGuards(state);
    drawCameras(state);
    drawThief(state);
    if (screen === SCREEN_TITLE) {
      drawPanel(
        'GILDED',
        [
          'One gallery. One golden idol. Two guards, two cameras.',
          'Slip past the cones, take the idol, leave by the green door.',
          'WASD / arrows to move · Shift to sneak · Click a camera to EMP it (2 charges)',
          'R to restart · M to mute',
        ],
        'Press Space or click to begin the heist',
        PALETTE.gold,
      );
      return;
    }
    drawHud(state, screen);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The guards will wait for you.'], 'Press P to keep stealing', PALETTE.text);
    } else if (screen === SCREEN_WIN) {
      drawPanel(
        'CLEAN GETAWAY',
        [`The Gilded Idol is yours — out in ${extra.timeText}.`, 'The gallery never saw you coming.'],
        'Press R to steal again',
        PALETTE.exit,
      );
    } else if (screen === SCREEN_LOST) {
      drawPanel(
        'CAUGHT!',
        ['A guard laid a hand on your shoulder.', 'The idol stays in its case tonight.'],
        'Press R to try again',
        PALETTE.alarmHigh,
      );
    }
  }

  /** Canvas CSS pixels in, room coordinates out (for EMP clicks). */
  function toField(cssX, cssY) {
    return {
      x: (cssX * view.ratio - view.x) / view.scale,
      y: (cssY * view.ratio - view.y) / view.scale,
    };
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, toField };
}
