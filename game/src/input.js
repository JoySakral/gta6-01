// Keyboard and mouse input: held keys, one-frame pressed edges, and the pointer.
// The game reads this every frame; pressed edges are cleared by main.js after each frame.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_INTERACT = 4;
export const ACTION_PUNCH = 8;
export const ACTION_MISSIONS = 16;
export const ACTION_TAXI = 32;
export const ACTION_DELIVERY = 64;

const CONFIRM_KEYS = new Set(['Enter', ' ']);
const PAUSE_KEYS = new Set(['p', 'P', 'Escape']);
const INTERACT_KEYS = new Set(['e', 'E']);
const PUNCH_KEYS = new Set([' ']);
const MISSION_KEYS = new Set(['m', 'M']);
const TAXI_KEYS = new Set(['t', 'T']);
const DELIVERY_KEYS = new Set(['g', 'G']);

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, clicked: false, down: false };

  function onKeyDown(event) {
    if (event.repeat) return;
    keys.add(event.key);
    pressed.add(event.key);
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
    }
  }
  function onKeyUp(event) {
    keys.delete(event.key);
  }
  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  }
  function onMouseDown(event) {
    onMouseMove(event);
    mouse.down = true;
    mouse.clicked = true;
  }
  function onMouseUp() {
    mouse.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  function hasAny(set, keysSet) {
    for (const key of set) if (keysSet.has(key)) return true;
    return false;
  }

  return {
    keys,
    mouse,
    /** Held movement: -1/0/1 on each axis (WASD or arrows). Shift means run. */
    move() {
      const x = (keys.has('d') || keys.has('D') || keys.has('ArrowRight') ? 1 : 0)
        - (keys.has('a') || keys.has('A') || keys.has('ArrowLeft') ? 1 : 0);
      const y = (keys.has('s') || keys.has('S') || keys.has('ArrowDown') ? 1 : 0)
        - (keys.has('w') || keys.has('W') || keys.has('ArrowUp') ? 1 : 0);
      return { x, y, run: keys.has('Shift') };
    },
    /** Driving: throttle -1..1, steer -1..1, handbrake. */
    drive() {
      const up = keys.has('w') || keys.has('W') || keys.has('ArrowUp');
      const down = keys.has('s') || keys.has('S') || keys.has('ArrowDown');
      const left = keys.has('a') || keys.has('A') || keys.has('ArrowLeft');
      const right = keys.has('d') || keys.has('D') || keys.has('ArrowRight');
      return {
        throttle: (up ? 1 : 0) - (down ? 1 : 0),
        steer: (right ? 1 : 0) - (left ? 1 : 0),
        brake: keys.has(' '),
      };
    },
    /** One-frame action edges, consumed by the caller. */
    takeActions() {
      let actions = 0;
      if (hasAny(CONFIRM_KEYS, pressed)) actions |= ACTION_CONFIRM;
      if (hasAny(PAUSE_KEYS, pressed)) actions |= ACTION_PAUSE;
      if (hasAny(INTERACT_KEYS, pressed)) actions |= ACTION_INTERACT;
      if (hasAny(PUNCH_KEYS, pressed)) actions |= ACTION_PUNCH;
      if (hasAny(MISSION_KEYS, pressed)) actions |= ACTION_MISSIONS;
      if (hasAny(TAXI_KEYS, pressed)) actions |= ACTION_TAXI;
      if (hasAny(DELIVERY_KEYS, pressed)) actions |= ACTION_DELIVERY;
      return actions;
    },
    /** Clear the pressed edges and the click flag at the end of a frame. */
    endFrame() {
      pressed.clear();
      mouse.clicked = false;
    },
  };
}
