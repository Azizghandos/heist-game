// GILDED — every sound is a WebAudio oscillator, made up on the spot. No audio files, no
// network: footsteps, the camera's warning beep, the alarm's two-tone wail and the win and
// caught jingles are all short synth phrases. The context is created on the first gesture, so
// a quiet page load stays quiet.

let context = null;
let muted = false;
let alarmNodes = null;

function ensureContext() {
  if (context !== null) return context;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  context = new AudioContextClass();
  return context;
}

/** Call from the first key or click so the browser lets sound play. */
export function unlockAudio() {
  const ctx = ensureContext();
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  if (muted) stopAlarm();
  return muted;
}

function tone(freq, duration, type, volume, when = 0, slideTo = 0) {
  if (muted) return;
  const ctx = ensureContext();
  if (!ctx) return;
  const start = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo > 0) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

/** A soft thud under each step; quieter and higher while sneaking. */
export function playFootstep(sneaking) {
  tone(sneaking ? 150 : 110, 0.07, 'triangle', sneaking ? 0.05 : 0.11);
}

/** The camera's short warning beep while it watches the thief. */
export function playCameraBeep() {
  tone(880, 0.09, 'square', 0.045);
}

/** The pickup chime when the golden idol leaves its pedestal. */
export function playPickup() {
  tone(523, 0.12, 'sine', 0.16);
  tone(784, 0.16, 'sine', 0.16, 0.09);
  tone(1047, 0.22, 'sine', 0.14, 0.18);
}

/** The EMP's electric zap when a camera goes dark. */
export function playEmp() {
  tone(1400, 0.25, 'sawtooth', 0.09, 0, 180);
}

/** The alarm's two-tone wail, looping until stopAlarm() is called. */
export function startAlarm() {
  if (muted) return;
  const ctx = ensureContext();
  if (!ctx || alarmNodes) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = 620;
  lfo.type = 'square';
  lfo.frequency.value = 1.6;
  lfoGain.gain.value = 140;
  gain.gain.value = 0.05;
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  lfo.start();
  alarmNodes = { osc, lfo, gain };
}

export function stopAlarm() {
  if (!alarmNodes) return;
  try {
    alarmNodes.osc.stop();
    alarmNodes.lfo.stop();
  } catch {
    // Already stopped.
  }
  alarmNodes = null;
}

/** The getaway fanfare: a rising major arpeggio. */
export function playWin() {
  const notes = [523, 659, 784, 1047, 1319];
  notes.forEach((freq, i) => tone(freq, 0.28, 'triangle', 0.16, i * 0.11));
}

/** The caught sting: two low notes falling. */
export function playCaught() {
  tone(220, 0.3, 'sawtooth', 0.14, 0, 110);
  tone(165, 0.5, 'sawtooth', 0.14, 0.22, 82);
}
