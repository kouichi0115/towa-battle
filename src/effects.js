// Apples (projectiles), particles, screen shake and sound.

function drawApple(ctx, x, y, r, spin) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin || 0);
  const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
  grad.addColorStop(0, '#ff8a80');
  grad.addColorStop(0.5, '#e53935');
  grad.addColorStop(1, '#a31515');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(-r * 0.32, 0, r * 0.78, 0, Math.PI * 2);
  ctx.arc(r * 0.32, 0, r * 0.78, 0, Math.PI * 2);
  ctx.arc(0, r * 0.1, r * 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5d4037';
  ctx.lineWidth = Math.max(2, r * 0.14);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.6);
  ctx.lineTo(r * 0.1, -r * 1.05);
  ctx.stroke();
  ctx.fillStyle = '#66bb6a';
  ctx.beginPath();
  ctx.ellipse(r * 0.35, -r * 0.95, r * 0.32, r * 0.16, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.4, -r * 0.3, r * 0.16, r * 0.26, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const Effects = {
  projectiles: [],
  particles: [],
  texts: [],
  shake: 0,

  clear() {
    this.projectiles = [];
    this.particles = [];
    this.texts = [];
    this.shake = 0;
  },

  spawnApple(owner) {
    this.projectiles.push({
      owner,
      x: owner.x + owner.facing * 50,
      y: owner.y - 175,
      vx: owner.facing * 9.5,
      vy: -6.5,
      r: 17,
      spin: 0,
      alive: true,
    });
  },

  burst(x, y, colors, count, speed) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 1.5,
        life: 20 + Math.random() * 15,
        max: 35,
        size: 3 + Math.random() * 5,
        color: colors[(Math.random() * colors.length) | 0],
        gravity: 0.25,
      });
    }
  },

  hitSpark(x, y, big) {
    this.burst(x, y, ['#ffffff', '#fff59d', '#ffd54f'], big ? 22 : 14, big ? 9 : 7);
    this.particles.push({ ring: true, x, y, life: 12, max: 12, size: big ? 60 : 42 });
  },

  blockSpark(x, y) {
    this.burst(x, y, ['#b3e5fc', '#ffffff'], 10, 6);
  },

  appleSplash(x, y) {
    this.burst(x, y, ['#e53935', '#ff8a80', '#fff176', '#ffffff'], 26, 8);
  },

  addText(text, x, y, color) {
    this.texts.push({ text, x, y, color, life: 50 });
  },

  update() {
    for (const p of this.projectiles) {
      p.vy += 0.32;
      p.x += p.vx;
      p.y += p.vy;
      p.spin += 0.3 * Math.sign(p.vx);
      if (p.y > STAGE.ground - p.r) {
        // bounce once, then splat
        if (p.bounced) { p.alive = false; this.appleSplash(p.x, p.y); }
        else { p.bounced = true; p.y = STAGE.ground - p.r; p.vy = -5; p.vx *= 0.8; }
      }
      if (p.x < -40 || p.x > STAGE.width + 40) p.alive = false;
    }
    this.projectiles = this.projectiles.filter((p) => p.alive);

    for (const p of this.particles) {
      p.life--;
      if (!p.ring) {
        p.x += p.vx; p.y += p.vy; p.vy += p.gravity;
      }
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    for (const t of this.texts) { t.life--; t.y -= 0.8; }
    this.texts = this.texts.filter((t) => t.life > 0);

    if (this.shake > 0) this.shake *= 0.85;
    if (this.shake < 0.3) this.shake = 0;
  },

  draw(ctx) {
    for (const p of this.projectiles) drawApple(ctx, p.x, p.y, p.r, p.spin);
    for (const p of this.particles) {
      const k = p.life / p.max;
      ctx.save();
      if (p.ring) {
        ctx.globalAlpha = k;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 5 * k + 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1.2 - k), 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.globalAlpha = Math.min(1, k * 1.5);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * k + 1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    for (const t of this.texts) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, t.life / 20);
      ctx.font = 'bold 26px "Hiragino Maru Gothic ProN", "Rounded Mplus 1c", sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#333';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }
  },
};

// Tiny synth sounds with Web Audio; no audio files needed.
const Sound = {
  ctx: null,
  muted: false,

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },

  tone(freq, endFreq, dur, type, vol) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur);
  },

  noise(dur, vol, freq) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(this.ctx.destination);
    src.start(t);
  },

  play(name) {
    switch (name) {
      case 'swing': this.noise(0.08, 0.25, 2500); break;
      case 'throw': this.tone(300, 900, 0.15, 'triangle', 0.2); break;
      case 'jump': this.tone(250, 500, 0.1, 'sine', 0.15); break;
      case 'hit': this.noise(0.12, 0.6, 900); this.tone(180, 60, 0.12, 'square', 0.15); break;
      case 'bighit': this.noise(0.2, 0.7, 600); this.tone(150, 40, 0.2, 'square', 0.2); break;
      case 'block': this.tone(1200, 900, 0.06, 'square', 0.08); break;
      case 'splat': this.noise(0.15, 0.5, 400); break;
      case 'empty': this.tone(200, 150, 0.08, 'sine', 0.1); break;
      case 'ko': this.tone(400, 50, 0.8, 'sawtooth', 0.2); break;
      case 'fight': this.tone(500, 1000, 0.25, 'square', 0.12); break;
      case 'select': this.tone(700, 1000, 0.08, 'sine', 0.15); break;
    }
  },
};
