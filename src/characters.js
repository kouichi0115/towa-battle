// Characters drawn from parts (body, arms, legs, face, leaf/cap) so the
// limbs can move. Local coordinates: origin at the feet, +x is the way the
// character faces, negative y is up. Limb angles: 0 = straight down,
// +PI/2 = straight forward, PI = straight up.

const DEFAULT_POSE = {
  rot: 0,        // whole body, around the feet (used for KO)
  liftY: 0,      // raise the whole body before rotating (so a KO body lies on the ground)
  lean: 0,       // upper body, around the hips
  bodyY: 0,      // bob up/down
  sx: 1, sy: 1,  // squash & stretch
  armF: 0.25, armFExt: 1,
  armB: -0.15, armBExt: 1,
  legF: 0.08, legFExt: 1,
  legB: -0.08, legBExt: 1,
  leaf: 0,       // leaf / cap sway
  face: 'normal', // normal | hurt | ko | happy | angry
  hold: false,   // projectile in the front hand
};

const HIP_Y = -36;

// ---------- shared helpers ----------
function makePainter(ctx, flash) {
  return {
    c: (color) => (flash ? '#ffffff' : color),
    line: flash ? 'rgba(255,255,255,0.9)' : null,
  };
}

function drawLimb(ctx, x, y, angle, len, width, color, outline) {
  const ex = x + Math.sin(angle) * len;
  const ey = y + Math.cos(angle) * len;
  ctx.lineCap = 'round';
  ctx.strokeStyle = outline;
  ctx.lineWidth = width + 5;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
  return { x: ex, y: ey };
}

function ellipsePath(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

// One eye with a shine, or an expression shape.
function drawEye(ctx, p, x, y, r, face, color) {
  ctx.save();
  ctx.strokeStyle = p.c(color);
  ctx.fillStyle = p.c(color);
  ctx.lineWidth = r * 0.55;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (face === 'hurt') {
    ctx.beginPath();
    ctx.moveTo(x - r, y - r); ctx.lineTo(x + r * 0.6, y); ctx.lineTo(x - r, y + r);
    ctx.stroke();
  } else if (face === 'ko') {
    ctx.beginPath();
    ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r);
    ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r);
    ctx.stroke();
  } else if (face === 'happy') {
    ctx.beginPath();
    ctx.arc(x, y + r * 0.4, r, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else {
    ellipsePath(ctx, x, y, r * 0.9, r * 1.05);
    ctx.fill();
    ctx.fillStyle = p.c('#ffffff');
    ellipsePath(ctx, x + r * 0.3, y - r * 0.35, r * 0.3, r * 0.3);
    ctx.fill();
  }
  ctx.restore();
}

// ---------- TOWA様 ----------
const TOWA_COLORS = {
  body: '#fbf6ea', bodyShade: '#e6dcc6', outline: 'rgba(120, 100, 70, 0.6)',
  leaf: '#8cc66b', leafDark: '#5f9b47', vein: '#4f8a3a', cheek: '#f4a3b0', ink: '#1c1c1c',
};

function towaLeaf(ctx, p, len, width, color, dark, vein, veins) {
  const g = ctx.createLinearGradient(0, -width, 0, width);
  g.addColorStop(0, p.c(color));
  g.addColorStop(1, p.c(dark));
  ctx.fillStyle = g;
  ctx.strokeStyle = p.line || dark;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(len * 0.25, -width * 1.15, len * 0.75, -width * 0.8, len, 0);
  ctx.bezierCurveTo(len * 0.7, width * 0.95, len * 0.3, width * 1.05, 0, 0);
  ctx.fill();
  ctx.stroke();
  if (!veins) return;
  ctx.strokeStyle = p.c(vein);
  ctx.lineCap = 'round';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(2, 0); ctx.quadraticCurveTo(len * 0.5, -3, len * 0.94, 0); ctx.stroke();
  ctx.lineWidth = 1.8;
  for (let i = 1; i <= 4; i++) {
    const t = i / 5.2;
    const bx = len * t;
    ctx.beginPath(); ctx.moveTo(bx, -1); ctx.quadraticCurveTo(bx + 10, -width * 0.35, bx + 20, -width * 0.62 * (1 - t * 0.5)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx, 1); ctx.quadraticCurveTo(bx + 10, width * 0.35, bx + 20, width * 0.62 * (1 - t * 0.5)); ctx.stroke();
  }
}

const TOWA = {
  id: 'towa',
  name: 'TOWA様',
  gauge: 'りんご',
  projectile: 'apple',
  shoulderF: { x: 30, y: -80 },
  shoulderB: { x: -26, y: -80 },
  armLen: 24, armW: 20,
  legLen: 26, legW: 23,
  colors: TOWA_COLORS,

  drawBack(ctx, p, pose) {
    // small second leaf peeking out behind the head
    ctx.save();
    ctx.translate(30, -150);
    ctx.rotate(1.05 + pose.leaf * 0.5);
    towaLeaf(ctx, p, 58, 16, '#7cb85c', '#4f8a3a', '#4f8a3a', false);
    ctx.restore();
  },

  drawBody(ctx, p) {
    const C = TOWA_COLORS;
    // outline first, then fill both shapes, so only the outer edge shows
    ctx.lineWidth = 5;
    ctx.strokeStyle = p.line || C.outline;
    ellipsePath(ctx, 0, -66, 44, 40); ctx.stroke();
    ellipsePath(ctx, 2, -122, 50, 48); ctx.stroke();
    const g = ctx.createRadialGradient(14, -132, 8, 0, -95, 105);
    g.addColorStop(0, p.c('#fffdf7'));
    g.addColorStop(0.6, p.c(C.body));
    g.addColorStop(1, p.c(C.bodyShade));
    ctx.fillStyle = g;
    ellipsePath(ctx, 0, -66, 44, 40); ctx.fill();
    ellipsePath(ctx, 2, -122, 50, 48); ctx.fill();
  },

  drawFace(ctx, p, pose) {
    const C = TOWA_COLORS;
    drawEye(ctx, p, 25, -124, 7.5, pose.face, C.ink);
    ctx.fillStyle = p.c(C.cheek);
    ctx.globalAlpha = 0.85;
    ellipsePath(ctx, 40, -109, 7.5, 4.2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = p.c(C.ink);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (pose.face === 'hurt' || pose.face === 'ko') {
      // little open "o" mouth
      ellipsePath(ctx, 6, -108, 4, 5); ctx.stroke();
    } else {
      // the soft smile with a curl at the end
      ctx.moveTo(-10, -114);
      ctx.quadraticCurveTo(-8, -110, -5, -111);
      ctx.moveTo(-5, -111);
      ctx.quadraticCurveTo(4, -103, 13, -110);
      ctx.stroke();
    }
  },

  drawTop(ctx, p, pose) {
    // the big leaf on the head, drooping over the back of the head
    ctx.save();
    ctx.translate(12, -168);
    ctx.rotate(2.32 + pose.leaf);
    // stem sticking up from the base
    ctx.strokeStyle = p.c('#6aa64f');
    ctx.lineCap = 'round';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-16, -3); ctx.stroke();
    towaLeaf(ctx, p, 138, 44, TOWA_COLORS.leaf, TOWA_COLORS.leafDark, TOWA_COLORS.vein, true);
    ctx.restore();
  },

  limbColor: TOWA_COLORS.body,
  limbOutline: TOWA_COLORS.outline,
};

// ---------- ドングリ番長 (rival) ----------
const DONGURI_COLORS = {
  body: '#c8894a', bodyLight: '#e2a868', bodyShade: '#8d5a2b', outline: '#3e2a17',
  cap: '#7a5330', capDark: '#563a20', limb: '#a8703c', ink: '#24160a',
};

const DONGURI = {
  id: 'donguri',
  name: 'ドングリ番長',
  gauge: 'どんぐり',
  projectile: 'acorn',
  shoulderF: { x: 30, y: -84 },
  shoulderB: { x: -28, y: -84 },
  armLen: 25, armW: 18,
  legLen: 26, legW: 20,
  colors: DONGURI_COLORS,

  drawBack() {},

  drawBody(ctx, p) {
    const C = DONGURI_COLORS;
    const shape = () => {
      ctx.beginPath();
      ctx.moveTo(0, -24);
      ctx.bezierCurveTo(44, -24, 54, -70, 50, -112);
      ctx.lineTo(-50, -112);
      ctx.bezierCurveTo(-54, -70, -44, -24, 0, -24);
      ctx.closePath();
    };
    shape();
    ctx.lineWidth = 5;
    ctx.strokeStyle = p.line || C.outline;
    ctx.stroke();
    const g = ctx.createRadialGradient(16, -90, 6, 0, -70, 80);
    g.addColorStop(0, p.c(C.bodyLight));
    g.addColorStop(0.55, p.c(C.body));
    g.addColorStop(1, p.c(C.bodyShade));
    ctx.fillStyle = g;
    shape();
    ctx.fill();
    // shine
    ctx.fillStyle = p.c('rgba(255,255,255,0.25)');
    ctx.beginPath(); ctx.ellipse(28, -88, 7, 16, -0.2, 0, Math.PI * 2); ctx.fill();
  },

  drawFace(ctx, p, pose) {
    const C = DONGURI_COLORS;
    const face = pose.face === 'normal' ? 'angry' : pose.face;
    // eyes
    for (const ex of [14, 36]) {
      if (face === 'angry') {
        ctx.fillStyle = p.c('#ffffff');
        ellipsePath(ctx, ex, -92, 7, 7.5); ctx.fill();
        ctx.fillStyle = p.c(C.ink);
        ellipsePath(ctx, ex + 2, -91, 3.8, 4.5); ctx.fill();
      } else {
        drawEye(ctx, p, ex, -92, 6, face, C.ink);
      }
    }
    // thick angry brows
    ctx.strokeStyle = p.c(C.ink);
    ctx.lineCap = 'round';
    ctx.lineWidth = 5;
    const lift = face === 'hurt' || face === 'ko' ? 6 : 0;
    ctx.beginPath();
    ctx.moveTo(5, -106 - lift); ctx.lineTo(22, -100 + lift * 0.3);
    ctx.moveTo(28, -100 + lift * 0.3); ctx.lineTo(46, -107 - lift);
    ctx.stroke();
    // mouth: a smirk with one tooth
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    if (face === 'hurt' || face === 'ko') {
      ctx.moveTo(14, -70); ctx.quadraticCurveTo(24, -78, 36, -70);
      ctx.stroke();
    } else {
      ctx.moveTo(12, -74); ctx.quadraticCurveTo(26, -66, 40, -78);
      ctx.stroke();
      ctx.fillStyle = p.c('#ffffff');
      ctx.fillRect(30, -74, 5, 5);
    }
    // bandage on the cheek
    ctx.save();
    ctx.translate(-10, -84);
    ctx.rotate(-0.5);
    ctx.fillStyle = p.c('#f5f0e1');
    ctx.fillRect(-11, -4, 22, 8);
    ctx.rotate(Math.PI / 2);
    ctx.fillRect(-11, -4, 22, 8);
    ctx.restore();
  },

  drawTop(ctx, p, pose) {
    const C = DONGURI_COLORS;
    ctx.save();
    ctx.translate(0, -114);
    ctx.rotate(pose.leaf * 0.5 - 0.08);
    const cap = () => {
      ctx.beginPath();
      ctx.moveTo(-58, 4);
      ctx.bezierCurveTo(-60, -50, 60, -50, 58, 4);
      ctx.quadraticCurveTo(0, 16, -58, 4);
      ctx.closePath();
    };
    cap();
    ctx.lineWidth = 5;
    ctx.strokeStyle = p.line || C.outline;
    ctx.stroke();
    ctx.fillStyle = p.c(C.cap);
    cap();
    ctx.fill();
    // scale pattern
    ctx.save();
    cap();
    ctx.clip();
    ctx.strokeStyle = p.c(C.capDark);
    ctx.lineWidth = 2;
    for (let i = -8; i <= 8; i++) {
      ctx.beginPath(); ctx.moveTo(i * 12 - 40, 20); ctx.lineTo(i * 12 + 20, -50); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i * 12 + 40, 20); ctx.lineTo(i * 12 - 20, -50); ctx.stroke();
    }
    ctx.restore();
    // stem
    ctx.strokeStyle = p.c(C.capDark);
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(2, -36); ctx.quadraticCurveTo(4, -48, 12, -52); ctx.stroke();
    ctx.restore();
  },

  limbColor: DONGURI_COLORS.limb,
  limbOutline: DONGURI_COLORS.outline,
};

const CHARACTERS = { towa: TOWA, donguri: DONGURI };

// Draws a character in local space (call after translate/scale/rotate).
function drawCharacter(ctx, ch, pose, flash) {
  const p = makePainter(ctx, flash);
  const limbC = p.c(ch.limbColor);
  const limbO = p.line || ch.limbOutline;
  ctx.save();
  ctx.translate(0, pose.liftY);
  ctx.rotate(pose.rot);
  ctx.translate(0, pose.bodyY);

  // legs (behind the body)
  const legY = -34;
  drawLimb(ctx, -15, legY, pose.legB, ch.legLen * pose.legBExt, ch.legW, limbC, limbO);
  drawLimb(ctx, 15, legY, pose.legF, ch.legLen * pose.legFExt, ch.legW, limbC, limbO);

  // upper body leans around the hips
  ctx.save();
  ctx.translate(0, HIP_Y);
  ctx.rotate(pose.lean);
  ctx.scale(pose.sx, pose.sy);
  ctx.translate(0, -HIP_Y);

  ch.drawBack(ctx, p, pose);
  const sb = ch.shoulderB;
  drawLimb(ctx, sb.x, sb.y, pose.armB, ch.armLen * pose.armBExt, ch.armW, limbC, limbO);
  ch.drawBody(ctx, p, pose);
  ch.drawFace(ctx, p, pose);
  ch.drawTop(ctx, p, pose);
  const sf = ch.shoulderF;
  const hand = drawLimb(ctx, sf.x, sf.y, pose.armF, ch.armLen * pose.armFExt, ch.armW, limbC, limbO);
  if (pose.hold) {
    const hx = hand.x + Math.sin(pose.armF) * 8;
    const hy = hand.y + Math.cos(pose.armF) * 8;
    drawProjectile(ctx, ch.projectile, hx, hy, 15, 0);
  }
  ctx.restore();
  ctx.restore();
}

// ---------- poses ----------
function lerpPose(cur, target, k) {
  for (const key in target) {
    const v = target[key];
    if (typeof v === 'number') cur[key] += (v - cur[key]) * k;
    else cur[key] = v;
  }
}

// Target pose for a fighter's current state. Returns [pose, blend speed].
function targetPose(f) {
  const a = f.anim;
  const P = { ...DEFAULT_POSE };
  let k = 0.35;
  switch (f.state) {
    case 'idle': {
      const s = Math.sin(a * 0.08);
      P.sy = 1 + s * 0.025; P.sx = 1 - s * 0.015;
      P.armF = 0.35 + s * 0.08; P.armB = -0.25 - s * 0.08;
      P.leaf = s * 0.03;
      break;
    }
    case 'walk': {
      const s = Math.sin(a * 0.25);
      P.legF = s * 0.6; P.legB = -s * 0.6;
      P.armF = 0.3 - s * 0.6; P.armB = -0.2 + s * 0.6;
      P.bodyY = -Math.abs(s) * 5;
      P.lean = 0.06 * Math.sign(f.vx * f.facing);
      P.leaf = s * 0.06;
      k = 0.5;
      break;
    }
    case 'jump':
      P.legF = 0.9; P.legFExt = 0.75; P.legB = -0.2; P.legBExt = 0.8;
      P.armF = 2.2; P.armB = -2.0;
      P.leaf = f.vy < 0 ? 0.15 : -0.12;
      P.sy = f.vy < 0 ? 1.05 : 0.98;
      break;
    case 'guard':
      P.armF = 2.0; P.armFExt = 1.05; P.armB = 1.7; P.armBExt = 1.2;
      P.lean = -0.1; P.sy = 0.92; P.sx = 1.04;
      P.legF = 0.35; P.legB = -0.35;
      break;
    case 'blockstun':
      P.armF = 2.0; P.armB = 1.7; P.armBExt = 1.2;
      P.lean = -0.2; P.sy = 0.92;
      P.legF = 0.35; P.legB = -0.35;
      k = 0.6;
      break;
    case 'hitstun':
      P.lean = -0.35; P.armF = -0.9; P.armB = -1.4; P.legF = 0.4; P.legB = -0.2;
      P.face = 'hurt'; P.leaf = -0.15;
      k = 0.6;
      break;
    case 'ko':
      P.rot = -Math.min(1.5, f.t * 0.06);
      P.liftY = (P.rot / 1.5) * 46;
      P.leaf = -1.1;
      P.lean = -0.2; P.armF = 2.4; P.armB = -2.6; P.legF = 0.6; P.legB = 0.2;
      P.face = 'ko';
      k = 0.4;
      break;
    case 'win': {
      const s = Math.sin(a * 0.2);
      P.armF = 2.45 + s * 0.25; P.armFExt = 1.4;
      P.armB = -2.45 + s * 0.25; P.armBExt = 1.4;
      P.legF = 0.2; P.legB = -0.2;
      P.face = 'happy'; P.leaf = s * 0.1;
      break;
    }
    case 'attack': {
      const mv = MOVES[f.move];
      const t = f.t;
      const on = t >= mv.startup && t < mv.startup + mv.active;
      const rec = t >= mv.startup + mv.active;
      if (f.move === 'punch') {
        if (!on && !rec) { P.armF = -0.3; P.lean = -0.08; P.armB = 0.3; }
        else { P.armF = 1.6; P.armFExt = 1.9; P.lean = 0.15; P.armB = -0.6; P.legF = 0.4; P.legB = -0.4; }
        k = on ? 0.8 : rec ? 0.2 : 0.5;
      } else if (f.move === 'kick') {
        if (!on && !rec) { P.legF = -0.3; P.lean = -0.08; P.sy = 0.95; }
        else { P.legF = 1.4; P.legFExt = 2.3; P.lean = -0.28; P.armF = 0.9; P.armB = -1.2; P.legB = -0.1; }
        k = on ? 0.8 : rec ? 0.18 : 0.5;
      } else {
        if (t < mv.startup) {
          P.armF = -2.6; P.armFExt = 1.1; P.lean = -0.22; P.armB = 1.2; P.hold = true;
          P.legF = 0.35; P.legB = -0.3;
          k = 0.4;
        } else {
          P.armF = 1.3; P.armFExt = 1.5; P.lean = 0.22; P.armB = -0.9;
          P.legF = 0.45; P.legB = -0.4;
          k = t < mv.startup + 4 ? 0.8 : 0.15;
        }
      }
      if (!f.grounded) { P.legB = -0.2; P.legBExt = 0.8; }
      break;
    }
  }
  return [P, k];
}
