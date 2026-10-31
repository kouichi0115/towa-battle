// Game loop, rounds, background, HUD and menus.

const ROUND_TIME = 60;
const WINS_NEEDED = 2;
const FONT = '"Hiragino Maru Gothic ProN", "Rounded Mplus 1c", "Arial Rounded MT Bold", sans-serif';

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');

const Game = {
  scene: 'title', // title | fight
  phase: 'intro', // intro | play | roundEnd | matchEnd
  phaseT: 0,
  mode: 'cpu',
  level: 'normal',
  round: 1,
  wins: [0, 0],
  frames: 0,
  hitstop: 0,
  paused: false,
  fighters: [],
  brain: null,
  images: {},
  bg: null,
  clouds: [],
  banner: null,

  start(mode, level) {
    this.mode = mode;
    this.level = level || 'normal';
    Input.twoPlayer = mode === 'versus';
    Input.p1.clearSource('ai');
    Input.p2.clearSource('ai');
    const p2name = 'ダークTOWA様';
    this.fighters = [
      new Fighter({ name: 'TOWA様', image: this.images.towa, x: 280, facing: 1, color: '#7cc576' }),
      new Fighter({ name: p2name, image: this.images.dark, x: 680, facing: -1, color: '#9575cd' }),
    ];
    this.brain = mode === 'cpu' ? new CpuBrain(Input.p2, this.level) : null;
    this.wins = [0, 0];
    this.round = 1;
    this.scene = 'fight';
    UI.show(null);
    this.startRound();
  },

  startRound() {
    this.fighters.forEach((f) => f.reset());
    Effects.clear();
    if (this.brain) this.brain.release();
    this.frames = ROUND_TIME * 60;
    this.setPhase('intro');
  },

  setPhase(p) {
    this.phase = p;
    this.phaseT = 0;
  },

  sound(name) { Sound.play(name); },

  spawnProjectile(owner) { Effects.spawnApple(owner); },

  update() {
    if (this.scene !== 'fight' || this.paused) return;
    this.phaseT++;
    const [a, b] = this.fighters;

    if (this.hitstop > 0) { this.hitstop--; Effects.update(); return; }

    if (this.brain && this.phase === 'play') this.brain.update(b, a, Effects.projectiles);
    Input.update();

    const live = this.phase === 'play';
    const idle = { held: {}, pressed: {} };
    a.update(live ? Input.p1 : idle, b, this);
    b.update(live ? Input.p2 : idle, a, this);

    this.pushApart(a, b);
    if (live) this.checkHits(a, b);
    Effects.update();

    if (this.phase === 'intro') {
      if (this.phaseT === 1) this.banner = { text: 'ROUND ' + this.round, t: 0 };
      if (this.phaseT === 70) { this.banner = { text: 'FIGHT!', t: 0 }; this.sound('fight'); }
      if (this.phaseT >= 95) this.setPhase('play');
    } else if (this.phase === 'play') {
      this.frames--;
      if (a.hp <= 0 || b.hp <= 0 || this.frames <= 0) this.endRound();
    } else if (this.phase === 'roundEnd') {
      if (this.phaseT === 60) {
        const w = this.roundWinner;
        if (w >= 0) this.fighters[w].setState('win');
      }
      if (this.phaseT >= 170) {
        if (this.wins[0] >= WINS_NEEDED || this.wins[1] >= WINS_NEEDED) {
          this.setPhase('matchEnd');
          UI.showResult(this.wins[0] >= WINS_NEEDED ? 0 : 1);
        } else {
          this.round++;
          this.startRound();
        }
      }
    }
    if (this.banner) this.banner.t++;
  },

  endRound() {
    const [a, b] = this.fighters;
    let w = -1;
    if (a.hp <= 0 && b.hp > 0) w = 1;
    else if (b.hp <= 0 && a.hp > 0) w = 0;
    else if (a.hp !== b.hp) w = a.hp > b.hp ? 0 : 1;
    this.roundWinner = w;
    if (w >= 0) this.wins[w]++;
    const ko = a.hp <= 0 || b.hp <= 0;
    this.banner = { text: ko ? 'K.O.!' : (w < 0 ? 'DRAW' : 'TIME UP'), t: 0 };
    if (ko) { this.sound('ko'); this.hitstop = 30; Effects.shake = 14; }
    if (this.brain) this.brain.release();
    this.setPhase('roundEnd');
  },

  pushApart(a, b) {
    const dx = b.x - a.x;
    const overlap = 70 - Math.abs(dx);
    if (overlap > 0 && Math.abs(a.y - b.y) < 150 && a.state !== 'ko' && b.state !== 'ko') {
      const dir = dx === 0 ? (a.facing === 1 ? 1 : -1) : Math.sign(dx);
      a.x -= (dir * overlap) / 2;
      b.x += (dir * overlap) / 2;
      a.x = Math.max(STAGE.left, Math.min(STAGE.right, a.x));
      b.x = Math.max(STAGE.left, Math.min(STAGE.right, b.x));
    }
  },

  checkHits(a, b) {
    for (const [att, def] of [[a, b], [b, a]]) {
      const hb = att.hitbox();
      if (hb && def.state !== 'ko' && rectsOverlap(hb, def.hurtbox())) {
        att.moveHit = true;
        const mv = MOVES[att.move];
        this.applyHit(att, def, mv, (hb.x1 + hb.x2) / 2, (hb.y1 + hb.y2) / 2, att.move === 'kick');
      }
    }
    // apples
    for (const p of Effects.projectiles) {
      const target = p.owner === a ? b : a;
      const box = { x1: p.x - p.r, x2: p.x + p.r, y1: p.y - p.r, y2: p.y + p.r };
      if (target.state !== 'ko' && rectsOverlap(box, target.hurtbox())) {
        p.alive = false;
        Effects.appleSplash(p.x, p.y);
        this.sound('splat');
        this.applyHit(p.owner, target, MOVES.special, p.x, p.y, true, Math.sign(p.vx));
      }
    }
    // two apples cancel each other
    const ps = Effects.projectiles;
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        if (ps[i].owner !== ps[j].owner && Math.hypot(ps[i].x - ps[j].x, ps[i].y - ps[j].y) < 30) {
          ps[i].alive = ps[j].alive = false;
          Effects.appleSplash((ps[i].x + ps[j].x) / 2, (ps[i].y + ps[j].y) / 2);
          this.sound('splat');
        }
      }
    }
  },

  applyHit(att, def, mv, x, y, big, dir) {
    const result = def.takeHit(mv, dir || att.facing, this);
    if (result === 'hit') {
      att.meter = Math.min(100, att.meter + 10);
      Effects.hitSpark(x, y, big);
      Effects.addText(String(mv.damage), def.x, def.y - 215, '#fff59d');
      Effects.shake = big ? 9 : 5;
      this.hitstop = big ? 8 : 5;
      this.sound(big ? 'bighit' : 'hit');
    } else {
      att.meter = Math.min(100, att.meter + 3);
      Effects.blockSpark(x, y);
      this.hitstop = 3;
      this.sound('block');
    }
  },

  // ---------- drawing ----------
  draw() {
    ctx.save();
    if (Effects.shake) {
      ctx.translate((Math.random() - 0.5) * Effects.shake, (Math.random() - 0.5) * Effects.shake);
    }
    this.drawBackground();
    if (this.scene === 'fight') {
      // the attacker is drawn on top
      const fs = [...this.fighters].sort((p, q) => (p.state === 'attack') - (q.state === 'attack'));
      fs.forEach((f) => f.draw(ctx));
      Effects.draw(ctx);
    }
    ctx.restore();
    if (this.scene === 'fight') {
      this.drawHud();
      this.drawBanner();
      if (this.paused) this.drawCenterText('PAUSE', 70, '#fff');
    }
  },

  makeBackground() {
    const c = document.createElement('canvas');
    c.width = STAGE.width;
    c.height = STAGE.height;
    const g = c.getContext('2d');
    const sky = g.createLinearGradient(0, 0, 0, STAGE.ground);
    sky.addColorStop(0, '#7ec8f2');
    sky.addColorStop(1, '#d9f1ff');
    g.fillStyle = sky;
    g.fillRect(0, 0, c.width, c.height);
    // sun
    g.fillStyle = 'rgba(255, 244, 179, 0.9)';
    g.beginPath(); g.arc(820, 90, 48, 0, Math.PI * 2); g.fill();
    // far hills
    g.fillStyle = '#a5d6a7';
    g.beginPath();
    g.moveTo(0, 380);
    for (let x = 0; x <= c.width; x += 20) g.lineTo(x, 360 - Math.sin(x / 140) * 40 - Math.sin(x / 57) * 10);
    g.lineTo(c.width, STAGE.ground); g.lineTo(0, STAGE.ground); g.fill();
    // apple trees
    for (const [tx, s] of [[110, 1], [470, 0.8], [860, 1.1]]) {
      g.fillStyle = '#8d6e63';
      g.fillRect(tx - 8 * s, 330 - 20 * s, 16 * s, 150);
      g.fillStyle = '#66bb6a';
      for (const [dx, dy, r] of [[0, -70, 55], [-40, -40, 42], [40, -40, 42]]) {
        g.beginPath(); g.arc(tx + dx * s, 330 + dy * s, r * s, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = '#e53935';
      for (const [dx, dy] of [[-30, -50], [20, -85], [35, -30], [-10, -20], [-45, -15]]) {
        g.beginPath(); g.arc(tx + dx * s, 330 + dy * s, 7 * s, 0, Math.PI * 2); g.fill();
      }
    }
    // near hill / ground
    g.fillStyle = '#81c784';
    g.beginPath();
    g.moveTo(0, 430);
    for (let x = 0; x <= c.width; x += 20) g.lineTo(x, 425 - Math.sin(x / 200 + 1) * 18);
    g.lineTo(c.width, STAGE.ground); g.lineTo(0, STAGE.ground); g.fill();
    const ground = g.createLinearGradient(0, STAGE.ground, 0, c.height);
    ground.addColorStop(0, '#7cb342');
    ground.addColorStop(1, '#558b2f');
    g.fillStyle = ground;
    g.fillRect(0, STAGE.ground, c.width, c.height - STAGE.ground);
    g.strokeStyle = '#9ccc65';
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, STAGE.ground); g.lineTo(c.width, STAGE.ground); g.stroke();
    // grass tufts
    g.strokeStyle = '#689f38';
    g.lineWidth = 2;
    for (let i = 0; i < 70; i++) {
      const x = (i * 137) % c.width;
      const y = STAGE.ground + 12 + ((i * 53) % 55);
      g.beginPath();
      g.moveTo(x - 4, y); g.lineTo(x - 6, y - 8);
      g.moveTo(x, y); g.lineTo(x, y - 10);
      g.moveTo(x + 4, y); g.lineTo(x + 6, y - 8);
      g.stroke();
    }
    this.bg = c;
    this.clouds = [[120, 80, 1], [430, 50, 0.8], [700, 120, 1.2], [950, 70, 0.9]];
  },

  drawBackground() {
    ctx.drawImage(this.bg, 0, 0);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (const cl of this.clouds) {
      cl[0] += 0.15 * cl[2];
      if (cl[0] > STAGE.width + 100) cl[0] = -100;
      const [x, y, s] = cl;
      ctx.beginPath();
      ctx.arc(x, y, 26 * s, 0, Math.PI * 2);
      ctx.arc(x + 28 * s, y - 12 * s, 30 * s, 0, Math.PI * 2);
      ctx.arc(x + 58 * s, y, 24 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  drawHud() {
    const W = STAGE.width;
    const barW = 370, barH = 26, top = 22;
    this.fighters.forEach((f, i) => {
      const left = i === 0;
      const x = left ? 30 : W - 30 - barW;
      // HP bar (drains toward the center)
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      roundRect(ctx, x - 3, top - 3, barW + 6, barH + 6, 8); ctx.fill();
      const lag = (f.shownHp / 100) * barW;
      const hp = (f.hp / 100) * barW;
      ctx.fillStyle = '#ff7043';
      ctx.fillRect(left ? x + barW - lag : x, top, lag, barH);
      const grad = ctx.createLinearGradient(0, top, 0, top + barH);
      const low = f.hp <= 30;
      grad.addColorStop(0, low ? '#ffcc80' : '#fff59d');
      grad.addColorStop(1, low ? '#fb8c00' : '#fbc02d');
      ctx.fillStyle = grad;
      ctx.fillRect(left ? x + barW - hp : x, top, hp, barH);
      // name
      ctx.font = 'bold 20px ' + FONT;
      ctx.textAlign = left ? 'left' : 'right';
      outlinedText(f.name, left ? x : x + barW, top + barH + 24, '#fff');
      // round wins as apples
      for (let k = 0; k < WINS_NEEDED; k++) {
        const ax = left ? x + barW - 14 - k * 30 : x + 14 + k * 30;
        if (k < this.wins[i]) drawApple(ctx, ax, top + barH + 20, 10, 0);
        else {
          ctx.strokeStyle = 'rgba(255,255,255,0.7)';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(ax, top + barH + 20, 9, 0, Math.PI * 2); ctx.stroke();
        }
      }
      // apple meter
      const mw = 200, mh = 12, my = top + barH + 54;
      const mx = left ? 30 : W - 30 - mw;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      roundRect(ctx, mx - 2, my - 2, mw + 4, mh + 4, 6); ctx.fill();
      const full = f.meter >= SPECIAL_COST;
      ctx.fillStyle = full ? (this.frames % 20 < 10 ? '#ff5252' : '#ff8a80') : '#e57373';
      const mwid = (f.meter / 100) * mw;
      ctx.fillRect(left ? mx : mx + mw - mwid, my, mwid, mh);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillRect(mx + mw / 2 - 1, my, 2, mh);
      ctx.font = 'bold 14px ' + FONT;
      ctx.textAlign = left ? 'left' : 'right';
      outlinedText(full ? 'りんごOK!' : 'りんごゲージ', left ? mx + mw + 8 : mx - 8, my + mh, full ? '#ffcdd2' : '#fff');
    });
    // timer
    const secs = Math.ceil(Math.max(0, this.frames) / 60);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    roundRect(ctx, W / 2 - 36, 12, 72, 52, 10); ctx.fill();
    ctx.font = 'bold 38px ' + FONT;
    ctx.textAlign = 'center';
    outlinedText(String(secs), W / 2, 52, secs <= 10 ? '#ff8a80' : '#fff');
  },

  drawBanner() {
    const b = this.banner;
    if (!b || b.t > 80) return;
    const k = Math.min(1, b.t / 8);
    const scale = 1.6 - 0.6 * k;
    ctx.save();
    ctx.globalAlpha = b.t > 60 ? (80 - b.t) / 20 : 1;
    ctx.translate(STAGE.width / 2, STAGE.height / 2 - 40);
    ctx.scale(scale, scale);
    ctx.font = 'bold 78px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#3e2723';
    ctx.strokeText(b.text, 0, 0);
    const g = ctx.createLinearGradient(0, -40, 0, 40);
    g.addColorStop(0, '#fff59d');
    g.addColorStop(1, '#ff7043');
    ctx.fillStyle = g;
    ctx.fillText(b.text, 0, 0);
    ctx.restore();
  },

  drawCenterText(text, size, color) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, STAGE.width, STAGE.height);
    ctx.font = 'bold ' + size + 'px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    outlinedText(text, STAGE.width / 2, STAGE.height / 2, color);
    ctx.restore();
  },
};

function outlinedText(text, x, y, color) {
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0,0,0,0.75)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// ---------- menus (HTML overlays) ----------
const UI = {
  show(id) {
    document.querySelectorAll('.overlay').forEach((el) => el.classList.toggle('hidden', el.id !== id));
    document.body.classList.toggle('in-fight', id === null);
  },

  showResult(winner) {
    const f = Game.fighters[winner];
    let msg = f.name + ' の勝ち！';
    if (Game.mode === 'cpu') msg = winner === 0 ? 'TOWA様 の勝利！' : 'まけちゃった…';
    document.getElementById('result-text').textContent = msg;
    const img = document.getElementById('result-img');
    img.src = winner === 0 ? 'assets/towa.png' : 'assets/towa-dark.png';
    this.show('result');
  },

  init() {
    document.querySelectorAll('[data-action]').forEach((el) => {
      el.addEventListener('click', () => {
        Sound.unlock();
        Sound.play('select');
        const act = el.dataset.action;
        if (act === 'cpu') this.show('difficulty');
        else if (act === 'versus') Game.start('versus');
        else if (act === 'level') Game.start('cpu', el.dataset.level);
        else if (act === 'help') this.show('help');
        else if (act === 'title') { Game.scene = 'title'; this.show('title'); }
        else if (act === 'again') Game.start(Game.mode, Game.level);
        else if (act === 'pause') togglePause();
      });
    });
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
    });
  },
};

function togglePause() {
  if (Game.scene !== 'fight' || Game.phase === 'matchEnd') return;
  Game.paused = !Game.paused;
}

// ---------- boot ----------
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

(async function boot() {
  canvas.width = STAGE.width;
  canvas.height = STAGE.height;
  Game.images.towa = await loadImage('assets/towa.png');
  Game.images.dark = await loadImage('assets/towa-dark.png');
  Game.makeBackground();
  Input.init();
  UI.init();
  UI.show('title');

  // fixed 60 fps update, draw every animation frame
  let last = performance.now();
  let acc = 0;
  const step = 1000 / 60;
  function frame(now) {
    acc += Math.min(100, now - last);
    last = now;
    while (acc >= step) { Game.update(); acc -= step; }
    Game.draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.Game = Game; // handy for debugging
})();
