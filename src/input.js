// Keyboard + touch input, turned into one simple button state per player.

const BUTTONS = ['left', 'right', 'up', 'down', 'punch', 'kick', 'special'];

const KEYMAP_P1 = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  KeyJ: 'punch', KeyK: 'kick', KeyL: 'special',
};
const KEYMAP_P2 = {
  KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down',
  KeyF: 'punch', KeyG: 'kick', KeyH: 'special',
};

class Controller {
  constructor() {
    this.sources = {}; // button -> Set of things holding it (keys, touches, ai)
    this.held = {};
    this.pressed = {};
    this.prev = {};
    this.latched = {};
  }
  set(button, source, on) {
    const s = this.sources[button] || (this.sources[button] = new Set());
    if (on) {
      s.add(source);
      this.latched[button] = true; // so a very quick tap is not lost between frames
    } else {
      s.delete(source);
    }
  }
  clearSource(source) {
    for (const b in this.sources) this.sources[b].delete(source);
  }
  // Call once per game frame.
  update() {
    for (const b of BUTTONS) {
      const down = !!(this.sources[b] && this.sources[b].size);
      const now = down || !!this.latched[b];
      this.pressed[b] = (now && !this.prev[b]) || (!!this.latched[b] && !down);
      this.held[b] = now;
      this.prev[b] = down;
    }
    this.latched = {};
  }
}

const Input = {
  p1: new Controller(),
  p2: new Controller(),
  twoPlayer: false,
  anyKeyHandlers: [],

  init() {
    window.addEventListener('keydown', (e) => {
      if (this.handleKey(e.code, true)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      if (this.handleKey(e.code, false)) e.preventDefault();
    });
    window.addEventListener('blur', () => {
      this.p1.clearSource('key'); this.p2.clearSource('key');
    });
    this.initTouch();
  },

  handleKey(code, on) {
    let used = false;
    if (KEYMAP_P1[code]) { this.p1.set(KEYMAP_P1[code], 'key:' + code, on); used = true; }
    if (KEYMAP_P2[code]) {
      // In CPU mode, WASD also drives player 1.
      const target = this.twoPlayer ? this.p2 : this.p1;
      target.set(KEYMAP_P2[code], 'key:' + code, on);
      used = true;
    }
    return used;
  },

  initTouch() {
    const controls = document.getElementById('controls');
    if (!controls) return;
    const press = (el, id, on) => {
      const b = el.dataset.btn;
      b.split(',').forEach((name) => this.p1.set(name, 'touch:' + id, on));
      el.classList.toggle('active', on);
    };
    controls.querySelectorAll('[data-btn]').forEach((el) => {
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        document.body.classList.add('touch');
        try { el.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
        press(el, e.pointerId, true);
      });
      const up = (e) => press(el, e.pointerId, false);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('lostpointercapture', up);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    });
    window.addEventListener('touchstart', () => document.body.classList.add('touch'), { passive: true });
  },

  update() {
    this.p1.update();
    this.p2.update();
  },
};
