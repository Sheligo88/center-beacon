
const PHI = (1 + Math.sqrt(5)) / 2;
const TAU = Math.PI * 2;

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const cursor = document.getElementById('cursor');

let W, H, cx, cy;
let mouse = { x: null, y: null };
let t = 0;
let particles = [];
let seeds = [];
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const pauseButton = document.getElementById('pause');
let paused = reduced.matches;
let frame = null;
function updateControl() {
  pauseButton.textContent = paused ? '▷' : 'Ⅱ';
  pauseButton.setAttribute('aria-label', paused ? 'Reanudar / Resume' : 'Pausar / Pause');
  pauseButton.setAttribute('aria-pressed', String(paused));
}
function schedule() {
  if (!paused && !document.hidden && frame === null) frame = requestAnimationFrame(draw);
}
function setPaused(value) {
  paused=value;
  if(frame !== null) cancelAnimationFrame(frame);
  frame=null;
  updateControl();
  schedule();
}
pauseButton.addEventListener('click', () => setPaused(!paused));
reduced.addEventListener('change', e => setPaused(e.matches));
document.addEventListener('visibilitychange', () => {
  if(document.hidden && frame !== null) { cancelAnimationFrame(frame); frame=null; }
  else schedule();
});
updateControl();

function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
  cx = W / 2;
  cy = H / 2;
}

resize();
window.addEventListener('resize', () => { resize(); if(paused) draw(); });

window.addEventListener('mousemove', e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  cursor.style.left = e.clientX + 'px';
  cursor.style.top = e.clientY + 'px';
});

window.addEventListener('touchmove', e => {
  e.preventDefault();
  mouse.x = e.touches[0].clientX;
  mouse.y = e.touches[0].clientY;
}, { passive: false });

// Fibonacci spiral points
function fibPoint(n, scale) {
  const angle = n * TAU / (PHI * PHI);
  const r = scale * Math.sqrt(n);
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle)
  };
}

// Seed — a breathing ring with phi ratio
class Seed {
  constructor(x, y, born) {
    this.x = x;
    this.y = y;
    this.born = born;
    this.life = 0;
    this.maxLife = 200 + Math.random() * 200;
  }

  update() {
    this.life++;
  }

  draw() {
    const progress = this.life / this.maxLife;
    const alpha = Math.sin(progress * Math.PI) * 0.4;
    const r = progress * 80 * PHI;

    // Phi rings — each at phi ratio distance
    for (let i = 1; i <= 5; i++) {
      const ri = r / Math.pow(PHI, i - 1);
      const a = alpha / i;
      ctx.beginPath();
      ctx.arc(this.x, this.y, ri, 0, TAU);
      ctx.strokeStyle = `rgba(200,220,240,${a})`;
      ctx.lineWidth = 0.4;
      ctx.stroke();
    }
  }

  isDead() { return this.life >= this.maxLife; }
}

// Particle riding fibonacci spiral
class Particle {
  constructor() {
    this.reset();
  }

  reset() {
    this.n = Math.random() * 300;
    this.speed = 0.2 + Math.random() * 0.3;
    this.scale = 3 + Math.random() * 4;
    this.alpha = 0.1 + Math.random() * 0.3;
    this.size = 0.8 + Math.random() * 1.2;
    this.trail = [];
    this.trailMax = Math.floor(8 + Math.random() * 12);
  }

  update() {
    this.n += this.speed;
    if (this.n > 400) this.reset();

    const p = fibPoint(this.n, this.scale);
    this.trail.push({ x: p.x, y: p.y });
    if (this.trail.length > this.trailMax) this.trail.shift();
  }

  draw() {
    if (this.trail.length < 2) return;

    for (let i = 1; i < this.trail.length; i++) {
      const a = (i / this.trail.length) * this.alpha;
      const p0 = this.trail[i - 1];
      const p1 = this.trail[i];
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.strokeStyle = `rgba(180,210,240,${a})`;
      ctx.lineWidth = this.size * (i / this.trail.length);
      ctx.stroke();
    }

    // Point
    const last = this.trail[this.trail.length - 1];
    ctx.beginPath();
    ctx.arc(last.x, last.y, this.size, 0, TAU);
    ctx.fillStyle = `rgba(220,235,250,${this.alpha * 1.5})`;
    ctx.fill();
  }
}

// Center — the quiet point
function drawCenter() {
  const pulse = Math.sin(t * 0.02) * 0.5 + 0.5;
  const pulse2 = Math.sin(t * 0.02 / PHI) * 0.5 + 0.5;

  // Phi rings from center
  for (let i = 1; i <= 8; i++) {
    const r = Math.pow(PHI, i) * 8;
    const a = (0.06 / i) * (0.5 + pulse2 * 0.5);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.strokeStyle = `rgba(180,210,240,${a})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // Core
  const coreR = 2 + pulse * 2;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 4);
  grad.addColorStop(0, `rgba(240,250,255,${0.7 + pulse * 0.3})`);
  grad.addColorStop(0.4, `rgba(200,225,245,${0.2 + pulse * 0.1})`);
  grad.addColorStop(1, 'rgba(180,210,240,0)');

  ctx.beginPath();
  ctx.arc(cx, cy, coreR * 4, 0, TAU);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, coreR, 0, TAU);
  ctx.fillStyle = `rgba(245,252,255,${0.8 + pulse * 0.2})`;
  ctx.fill();
}

// Mouse response — seeds
function drawMousePresence() {
  if (mouse.x === null) return;

  const dx = mouse.x - cx;
  const dy = mouse.y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const maxDist = Math.min(W, H) * 0.6;
  const proximity = 1 - Math.min(dist / maxDist, 1);

  // Subtle line from center to mouse
  const alpha = proximity * 0.06;
  if (alpha > 0.005) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(mouse.x, mouse.y);
    ctx.strokeStyle = `rgba(200,220,240,${alpha})`;
    ctx.lineWidth = 0.4;
    ctx.stroke();
  }

  // Point at mouse
  if (proximity > 0.1) {
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, 1.5, 0, TAU);
    ctx.fillStyle = `rgba(220,235,250,${proximity * 0.5})`;
    ctx.fill();
  }

  // Spawn seed occasionally
  if (Math.random() < 0.015 * proximity) {
    seeds.push(new Seed(mouse.x, mouse.y, t));
  }
}

// Init
for (let i = 0; i < 80; i++) {
  const p = new Particle();
  p.n = Math.random() * 300;
  for (let j = 0; j < 50; j++) p.update();
  particles.push(p);
}

function draw() {
  frame = null;
  if (seeds.length > 120) seeds = seeds.slice(-120);
  // Fade — slow trail
  ctx.fillStyle = 'rgba(0,0,0,0.04)';
  ctx.fillRect(0, 0, W, H);

  // Seeds
  seeds = seeds.filter(s => !s.isDead());
  seeds.forEach(s => { s.update(); s.draw(); });

  // Particles
  particles.forEach(p => { p.update(); p.draw(); });

  // Center
  drawCenter();

  // Mouse
  drawMousePresence();

  t++;
  schedule();
}

draw();

// Click — seed burst at click
canvas.addEventListener('click', e => {
  for (let i = 0; i < 3; i++) {
    seeds.push(new Seed(e.clientX, e.clientY, t));
  }
});

canvas.addEventListener('touchstart', e => {
  for (let i = 0; i < 3; i++) {
    seeds.push(new Seed(e.touches[0].clientX, e.touches[0].clientY, t));
  }
});
