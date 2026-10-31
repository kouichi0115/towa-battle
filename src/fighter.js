// A fighter: state machine, moves, hit boxes and drawing.

const STAGE = { width: 960, height: 540, ground: 470, left: 50, right: 910 };
const GRAVITY = 0.8;
const DRAW_SCALE = 1.1;
const SPECIAL_COST = 50;

// Frame data. Hitbox x is measured forward from the fighter's center,
// y upward from the feet (negative = above the ground).
const MOVES = {
  punch: {
    startup: 5, active: 4, recovery: 10,
    damage: 6, hitstun: 14, blockstun: 8, knockback: 4,
    box: { x1: 30, x2: 108, y1: -120, y2: -60 },
  },
  kick: {
    startup: 10, active: 5, recovery: 18,
    damage: 11, hitstun: 20, blockstun: 11, knockback: 8,
    box: { x1: 25, x2: 118, y1: -70, y2: -5 },
  },
  special: {
    startup: 14, active: 1, recovery: 20, // the apple comes out on the startup frame
    damage: 14, hitstun: 22, blockstun: 12, knockback: 7,
    box: null,
  },
};

class Fighter {
  constructor({ char, x, facing }) {
    this.char = char;
    this.name = char.name;
    this.startX = x;
    this.startFacing = facing;
    this.reset();
  }

  reset() {
    this.x = this.startX;
    this.y = STAGE.ground;
    this.vx = 0;
    this.vy = 0;
    this.facing = this.startFacing;
    this.hp = 100;
    this.shownHp = 100;
    this.meter = this.meter === undefined ? 0 : this.meter; // meter carries between rounds
    this.state = 'idle';
    this.t = 0; // frames in current state
    this.timer = 0; // stun frames left
    this.move = null;
    this.moveHit = false;
    this.buffer = null;
    this.flashFrames = 0;
    this.anim = 0;
    this.pose = { ...DEFAULT_POSE };
  }

  get grounded() { return this.y >= STAGE.ground; }

  setState(s) {
    if (this.state !== s) { this.state = s; this.t = 0; }
  }

  canAct() {
    return ['idle', 'walk', 'jump', 'guard'].includes(this.state);
  }

  // c: controller ({held, pressed}); game: callbacks (spawnProjectile, sound)
  update(c, opp, game) {
    this.anim++;
    this.t++;
    if (this.flashFrames > 0) this.flashFrames--;

    for (const m of ['special', 'kick', 'punch']) {
      if (c.pressed[m]) { this.buffer = { move: m, frames: 6 }; break; }
    }
    if (this.buffer && --this.buffer.frames <= 0) this.buffer = null;

    switch (this.state) {
      case 'ko':
        this.vx *= 0.92;
        break;
      case 'win':
        this.vx = 0;
        if (this.grounded && this.t % 40 === 1) this.vy = -9;
        break;
      case 'hitstun':
      case 'blockstun':
        this.vx *= 0.88;
        if (--this.timer <= 0 && this.grounded) this.setState('idle');
        break;
      case 'attack': {
        const mv = MOVES[this.move];
        if (this.grounded) this.vx *= 0.7;
        if (this.move === 'special' && this.t === mv.startup) {
          game.spawnProjectile(this);
        }
        if (this.t >= mv.startup + mv.active + mv.recovery) this.setState('idle');
        break;
      }
      default:
        this.control(c, opp, game);
    }

    // physics
    if (!this.grounded || this.vy < 0) this.vy += GRAVITY;
    this.x += this.vx;
    this.y += this.vy;
    if (this.y >= STAGE.ground) {
      this.y = STAGE.ground;
      if (this.vy > 0) {
        this.vy = 0;
        if (this.state === 'jump') this.setState('idle');
        if (this.state === 'attack' && this.t > 2) this.setState('idle');
      }
    }
    this.x = Math.max(STAGE.left, Math.min(STAGE.right, this.x));

    this.shownHp += (this.hp - this.shownHp) * 0.08;
    this.updatePose();
  }

  updatePose() {
    const [target, k] = targetPose(this);
    lerpPose(this.pose, target, k);
  }

  control(c, opp, game) {
    if (this.grounded) this.facing = opp.x >= this.x ? 1 : -1;

    if (this.buffer) {
      const m = this.buffer.move;
      if (m !== 'special' || this.meter >= SPECIAL_COST) {
        if (m === 'special') this.meter -= SPECIAL_COST;
        this.buffer = null;
        this.move = m;
        this.moveHit = false;
        this.setState('attack');
        game.sound(m === 'special' ? 'throw' : 'swing');
        return;
      }
      if (this.buffer.frames === 5) game.sound('empty');
    }

    if (!this.grounded) { this.setState('jump'); return; }

    if (c.held.down) {
      this.vx = 0;
      this.setState('guard');
    } else if (c.held.up) {
      const dir = (c.held.right ? 1 : 0) - (c.held.left ? 1 : 0);
      this.vy = -15.5;
      this.vx = dir * 4.5;
      this.setState('jump');
      game.sound('jump');
    } else if (c.held.left || c.held.right) {
      const dir = c.held.right ? 1 : -1;
      this.vx = dir * (dir === this.facing ? 4.2 : 3.2);
      this.setState('walk');
    } else {
      this.vx = 0;
      this.setState('idle');
    }
  }

  // Active hitbox in world space, or null.
  hitbox() {
    if (this.state !== 'attack' || this.moveHit) return null;
    const mv = MOVES[this.move];
    if (!mv.box || this.t < mv.startup || this.t >= mv.startup + mv.active) return null;
    const b = mv.box;
    const x1 = this.facing === 1 ? this.x + b.x1 : this.x - b.x2;
    const x2 = this.facing === 1 ? this.x + b.x2 : this.x - b.x1;
    return { x1, x2, y1: this.y + b.y1, y2: this.y + b.y2 };
  }

  hurtbox() {
    const h = this.state === 'guard' ? 170 : 195;
    return { x1: this.x - 42, x2: this.x + 42, y1: this.y - h, y2: this.y };
  }

  // Returns 'hit' | 'block'.
  takeHit(mv, fromDir, game) {
    const blocking = this.state === 'guard' ||
      (this.state === 'blockstun' && this.grounded);
    if (blocking) {
      const chip = Math.floor(mv.damage * 0.15);
      this.hp = Math.max(1, this.hp - chip);
      this.timer = mv.blockstun;
      this.vx = fromDir * mv.knockback * 0.8;
      this.meter = Math.min(100, this.meter + 4);
      this.setState('blockstun');
      return 'block';
    }
    this.hp = Math.max(0, this.hp - mv.damage);
    this.meter = Math.min(100, this.meter + 6);
    this.flashFrames = 6;
    this.timer = mv.hitstun;
    this.vx = fromDir * mv.knockback;
    if (!this.grounded || this.hp === 0) this.vy = -7;
    this.setState(this.hp === 0 ? 'ko' : 'hitstun');
    return 'hit';
  }

  // ---------- drawing ----------
  draw(ctx) {
    // shadow
    const air = STAGE.ground - this.y;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(this.x, STAGE.ground + 4, Math.max(20, 58 - air * 0.15), 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const shake = this.state === 'hitstun' && this.timer > 6 ? (Math.random() - 0.5) * 6 : 0;
    ctx.save();
    ctx.translate(this.x + shake, this.y);
    ctx.scale(this.facing * DRAW_SCALE, DRAW_SCALE);
    const flash = this.flashFrames > 0 && this.flashFrames % 2 === 0;
    drawCharacter(ctx, this.char, this.pose, flash);
    ctx.restore();

    this.drawMoveEffects(ctx);
  }

  drawMoveEffects(ctx) {
    if (this.state === 'guard' || this.state === 'blockstun') {
      ctx.save();
      ctx.strokeStyle = 'rgba(140, 220, 255, 0.75)';
      ctx.fillStyle = 'rgba(140, 220, 255, 0.18)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      const cx = this.x + this.facing * 55;
      ctx.ellipse(cx, this.y - 90, 22, 85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    if (this.state !== 'attack') return;
    const mv = MOVES[this.move];
    if (!mv.box) return;
    const end = mv.startup + mv.active + 3;
    if (this.t < mv.startup || this.t > end) return;
    const k = (this.t - mv.startup) / (end - mv.startup);
    const b = mv.box;
    const cx = this.x + this.facing * (b.x1 + b.x2) / 2;
    const cy = this.y + (b.y1 + b.y2) / 2;
    ctx.save();
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = this.move === 'kick' ? '#ffe9a8' : '#ffffff';
    ctx.lineWidth = this.move === 'kick' ? 10 : 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const r = this.move === 'kick' ? 60 : 45;
    const start = this.facing === 1 ? -1.2 : Math.PI + 1.2;
    const sweep = 2.4 * this.facing * (0.4 + k * 0.6);
    ctx.arc(cx - this.facing * 20, cy, r, start, start + sweep, this.facing === -1);
    ctx.stroke();
    ctx.restore();
  }
}

function rectsOverlap(a, b) {
  return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
}
