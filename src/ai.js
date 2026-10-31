// CPU opponent. It presses buttons on a Controller like a player would.

const AI_LEVELS = {
  easy:   { think: 20, guard: 0.15, attack: 0.35, special: 0.15, jump: 0.05 },
  normal: { think: 11, guard: 0.45, attack: 0.6,  special: 0.35, jump: 0.1 },
  hard:   { think: 5,  guard: 0.75, attack: 0.85, special: 0.6,  jump: 0.15 },
};

class CpuBrain {
  constructor(controller, level) {
    this.c = controller;
    this.level = AI_LEVELS[level] || AI_LEVELS.normal;
    this.wait = 0;
    this.plan = {};
    this.tap = null;
  }

  release() {
    this.c.clearSource('ai');
    this.plan = {};
    this.tap = null;
  }

  update(me, opp, projectiles) {
    // A tapped button is held for one frame, then let go.
    if (this.tap) { this.c.set(this.tap, 'ai', false); this.tap = null; }
    if (--this.wait > 0) return;
    this.wait = this.level.think + ((Math.random() * 4) | 0);

    const L = this.level;
    const dist = Math.abs(opp.x - me.x);
    const toward = opp.x > me.x ? 'right' : 'left';
    const away = toward === 'right' ? 'left' : 'right';
    const plan = {};

    const incoming = projectiles.some((p) => p.owner !== me &&
      Math.sign(me.x - p.x) === Math.sign(p.vx) && Math.abs(me.x - p.x) < 260);
    const oppThreat = opp.state === 'attack' && dist < 170;

    if (me.state === 'ko' || opp.state === 'ko') {
      // stand still
    } else if ((incoming || oppThreat) && Math.random() < L.guard) {
      if (incoming && Math.random() < L.jump * 3) { plan.up = true; plan[toward] = true; }
      else plan.down = true;
    } else if (dist > 140) {
      if (me.meter >= SPECIAL_COST && dist > 230 && Math.random() < L.special) {
        this.press('special');
      } else if (Math.random() < L.jump) {
        plan.up = true; plan[toward] = true;
      } else {
        plan[toward] = true;
      }
    } else if (Math.random() < L.attack) {
      this.press(dist < 105 && Math.random() < 0.6 ? 'punch' : 'kick');
      this.wait = Math.max(this.wait, 8);
    } else if (Math.random() < 0.4) {
      plan[away] = true;
    } else if (Math.random() < L.guard) {
      plan.down = true;
    }

    for (const b of ['left', 'right', 'up', 'down']) this.c.set(b, 'ai', !!plan[b]);
    this.plan = plan;
  }

  press(button) {
    this.c.set(button, 'ai', true);
    this.tap = button;
  }
}
