const ROOMS = [
  { name: "Прихожая", icon: "🪞", color: "#7ecbff", bg: ["#2a1d28", "#0d0a12"] },
  { name: "Коридор", icon: "🧹", color: "#9ad0ff", bg: ["#1c2430", "#0a1016"] },
  { name: "Ванная", icon: "🧺", color: "#8ee0ff", bg: ["#163038", "#081216"] },
  { name: "Кухня", icon: "🫖", color: "#ffb46a", bg: ["#2c2214", "#100c08"] },
  { name: "Холодильник", icon: "🧊", color: "#9be7ff", bg: ["#143044", "#071018"] },
  { name: "Гостиная", icon: "📺", color: "#c5b0ff", bg: ["#241848", "#0c0818"] },
  { name: "Дверь", icon: "📦", color: "#ffd27a", bg: ["#2a1c12", "#100c08"] },
  { name: "Выхрик", icon: "🦊", color: "#ff9a4a", bg: ["#2a1810", "#120c08"] },
  { name: "Чулан", icon: "🐱", color: "#ffe08a", bg: ["#261820", "#100810"] },
  { name: "Вся квартира", icon: "⚡", color: "#ff6b8a", bg: ["#30101c", "#12060c"] }
];

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const hud = document.getElementById("hud");
const menu = document.getElementById("menu");
const pauseUI = document.getElementById("pause");
const endUI = document.getElementById("end");
const pauseBtn = document.getElementById("pauseBtn");

const G = {
  w: 390, h: 844,
  running: false,
  paused: false,
  room: 0,
  score: 0,
  best: Number(localStorage.getItem("bip_best") || 0),
  hp: 3,
  shield: 0,
  combo: 0,
  comboTime: 0,
  cleared: 0,
  need: 12,
  spawn: 0,
  banner: "",
  bannerT: 0,
  shake: 0,
  t: 0,
  last: 0,
  bip: { x: 195, y: 690, hurt: 0 },
  ents: [],
  bits: [],
  flashes: []
};

document.getElementById("best").textContent = G.best;

function fit() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  G.w = window.innerWidth;
  G.h = window.innerHeight;
  canvas.width = G.w * dpr;
  canvas.height = G.h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  G.bip.x = G.w / 2;
  G.bip.y = G.h * 0.78;
}
window.addEventListener("resize", fit);
fit();

function beep(f, len, type, vol) {
  try {
    const a = beep.ctx || (beep.ctx = new (window.AudioContext || window.webkitAudioContext)());
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type || "square";
    o.frequency.value = f;
    g.gain.value = vol || 0.04;
    o.connect(g); g.connect(a.destination);
    o.start();
    o.stop(a.currentTime + (len || 0.07));
  } catch (e) {}
}

function hudSync() {
  document.getElementById("roomHud").textContent = ROOMS[G.room].name;
  document.getElementById("waveHud").textContent = `${G.room + 1}/10`;
  document.getElementById("scoreHud").textContent = G.score;
  document.getElementById("hpHud").textContent = "❤".repeat(Math.max(0, G.hp)) || "✕";
}

function burst(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 1.2 + Math.random() * 4;
    G.bits.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1,
      life: 1, color, size: 2 + Math.random() * 4
    });
  }
  G.flashes.push({ x, y, r: 8, life: 1, color });
}

function spawn() {
  const room = ROOMS[G.room];
  const side = Math.floor(Math.random() * 3);
  let x, y;
  if (side === 0) { x = 40 + Math.random() * (G.w - 80); y = -40; }
  else if (side === 1) { x = -40; y = 80 + Math.random() * G.h * 0.4; }
  else { x = G.w + 40; y = 80 + Math.random() * G.h * 0.4; }
  const roll = Math.random();
  let kind = "normal", hp = 1, r = 34, worth = 20;
  if (roll > 0.86) { kind = "tank"; hp = 2; r = 42; worth = 40; }
  else if (roll > 0.74) { kind = "gem"; hp = 1; r = 30; worth = 80; }
  const dx = G.bip.x - x, dy = G.bip.y - y;
  const d = Math.hypot(dx, dy) || 1;
  const spd = (1.55 + G.room * 0.18) * (kind === "tank" ? 0.75 : 1);
  G.ents.push({
    x, y, r, hp, kind, worth, icon: room.icon, color: room.color,
    vx: dx / d * spd, vy: dy / d * spd, rot: 0, wob: Math.random() * 10
  });
}

function startRun() {
  G.running = true; G.paused = false;
  G.room = 0; G.score = 0; G.hp = 3; G.shield = 0;
  G.combo = 0; G.comboTime = 0; G.cleared = 0;
  G.need = 10; G.ents = []; G.bits = []; G.flashes = [];
  G.banner = ROOMS[0].name.toUpperCase();
  G.bannerT = 1.2;
  G.spawn = 0;
  menu.classList.add("hidden");
  endUI.classList.add("hidden");
  pauseUI.classList.add("hidden");
  hud.classList.remove("hidden");
  pauseBtn.classList.remove("hidden");
  hudSync();
  beep(520, 0.08, "triangle", 0.05);
}

function nextRoom() {
  if (G.room >= 9) { finish(true); return; }
  G.room += 1;
  G.cleared = 0;
  G.need = 10 + G.room;
  G.ents = [];
  G.banner = ROOMS[G.room].name.toUpperCase();
  G.bannerT = 1.15;
  G.spawn = 0;
  hudSync();
  beep(660, 0.1, "triangle", 0.05);
}

function finish(win) {
  G.running = false;
  G.best = Math.max(G.best, G.score);
  localStorage.setItem("bip_best", G.best);
  document.getElementById("best").textContent = G.best;
  document.getElementById("endTitle").textContent = win ? "Квартира сдалась" : "Бипа накрыло";
  document.getElementById("endText").textContent = win
    ? `Все 10 комнат. Счёт ${G.score}`
    : `${ROOMS[G.room].name}. Счёт ${G.score}`;
  hud.classList.add("hidden");
  pauseBtn.classList.add("hidden");
  endUI.classList.remove("hidden");
}

function hitEnt(e) {
  e.hp -= 1;
  G.shake = 6;
  if (e.hp > 0) {
    burst(e.x, e.y, "#fff", 8);
    beep(180, 0.05, "sawtooth", 0.04);
    return;
  }
  G.cleared += 1;
  G.combo += 1;
  G.comboTime = 1.35;
  const bonus = Math.min(80, G.combo * 8);
  G.score += e.worth + bonus;
  if (e.kind === "gem") G.shield = 2.6;
  burst(e.x, e.y, e.color, 22);
  beep(e.kind === "gem" ? 880 : 420 + G.combo * 18, 0.07, "square", 0.05);
  hudSync();
  if (G.cleared >= G.need) {
    G.banner = "КОМНАТА ЧИСТА";
    G.bannerT = 0.9;
    setTimeout(nextRoom, 700);
  }
}

function tap(x, y) {
  if (!G.running || G.paused) return;
  let best = null, bestD = 9999;
  for (const e of G.ents) {
    const d = Math.hypot(e.x - x, e.y - y);
    if (d < e.r + 18 && d < bestD) { best = e; bestD = d; }
  }
  if (best) {
    hitEnt(best);
    G.ents = G.ents.filter(e => e.hp > 0);
  } else {
    burst(x, y, "rgba(255,255,255,.4)", 5);
  }
}

canvas.addEventListener("pointerdown", ev => {
  const r = canvas.getBoundingClientRect();
  tap(ev.clientX - r.left, ev.clientY - r.top);
});

function loop(ts) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.033, (ts - (G.last || ts)) / 1000);
  G.last = ts;
  draw(dt);
  if (!G.running || G.paused) return;
  G.t += dt;
  G.comboTime -= dt;
  if (G.comboTime <= 0) G.combo = 0;
  G.shield = Math.max(0, G.shield - dt);
  G.bannerT = Math.max(0, G.bannerT - dt);
  G.shake *= 0.86;
  G.bip.hurt = Math.max(0, G.bip.hurt - dt);
  G.spawn += dt;
  const rate = Math.max(0.38, 1.05 - G.room * 0.06);
  if (G.spawn > rate && G.ents.length < 8 && G.cleared < G.need && G.bannerT < 0.4) {
    G.spawn = 0;
    spawn();
  }
  for (const e of G.ents) {
    e.x += e.vx * 60 * dt;
    e.y += e.vy * 60 * dt;
    e.rot += dt * 2;
    e.wob += dt * 6;
    if (Math.hypot(e.x - G.bip.x, e.y - G.bip.y) < 52 + e.r * 0.15) {
      e.hp = 0;
      if (G.shield > 0) {
        G.shield = 0;
        burst(G.bip.x, G.bip.y, "#6cffb2", 16);
        beep(200, 0.08);
      } else {
        G.hp -= 1;
        G.combo = 0;
        G.bip.hurt = 0.35;
        G.shake = 14;
        beep(90, 0.16, "sawtooth", 0.06);
        hudSync();
        if (G.hp <= 0) finish(false);
      }
    }
  }
  G.ents = G.ents.filter(e => e.hp > 0 && e.y < G.h + 80);
  for (const p of G.bits) {
    p.x += p.vx * 60 * dt; p.y += p.vy * 60 * dt; p.vy += 8 * dt; p.life -= dt * 1.8;
  }
  G.bits = G.bits.filter(p => p.life > 0);
  for (const f of G.flashes) { f.r += 180 * dt; f.life -= dt * 3; }
  G.flashes = G.flashes.filter(f => f.life > 0);
}

function drawBip(x, y) {
  const bob = Math.sin(G.t * 4) * 5;
  ctx.save();
  ctx.translate(x + (G.bip.hurt ? Math.sin(G.t * 40) * 6 : 0), y + bob);
  ctx.fillStyle = "#7dffb0";
  ctx.beginPath(); ctx.arc(0, -46, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#9ad7ff";
  ctx.fillRect(-2, -42, 4, 10);
  ctx.fillStyle = "#eef7ff";
  round( -28, -32, 56, 42, 16); ctx.fill();
  ctx.fillStyle = G.bip.hurt ? "#ff4d6d" : "#19c8ff";
  ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 12;
  ctx.beginPath(); ctx.arc(-12, -14, 6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(12, -14, 6, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#6ec6ff";
  round(-22, 12, 44, 28, 10); ctx.fill();
  ctx.fillStyle = "#08314a";
  ctx.font = "900 12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("БИП", 0, 30);
  if (G.shield > 0) {
    ctx.strokeStyle = "rgba(108,255,178,.8)";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, -6, 58, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function round(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function draw(dt) {
  const room = ROOMS[G.room];
  const sx = G.shake ? (Math.random() - 0.5) * G.shake : 0;
  const sy = G.shake ? (Math.random() - 0.5) * G.shake : 0;
  ctx.save();
  ctx.translate(sx, sy);
  const g = ctx.createLinearGradient(0, 0, 0, G.h);
  g.addColorStop(0, room.bg[0]);
  g.addColorStop(1, room.bg[1]);
  ctx.fillStyle = g;
  ctx.fillRect(-20, -20, G.w + 40, G.h + 40);
  ctx.fillStyle = "rgba(255,255,255,.03)";
  for (let i = 0; i < 18; i++) {
    ctx.beginPath();
    ctx.arc((i * 97) % G.w, (i * 53 + G.t * 12) % G.h, 18, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(0,0,0,.22)";
  ctx.fillRect(0, G.h * 0.72, G.w, G.h * 0.28);

  drawBip(G.bip.x, G.bip.y);

  for (const f of G.flashes) {
    ctx.globalAlpha = f.life;
    ctx.strokeStyle = f.color;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (const e of G.ents) {
    const pulse = 1 + Math.sin(e.wob) * 0.06;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(Math.sin(e.rot) * 0.25);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = e.kind === "gem" ? "#7dffb0" : e.color;
    ctx.shadowBlur = 18;
    const grd = ctx.createRadialGradient(-8, -8, 6, 0, 0, e.r);
    grd.addColorStop(0, "#fff8");
    grd.addColorStop(0.3, e.kind === "tank" ? "#ff6b8a" : e.kind === "gem" ? "#6cffb2" : e.color);
    grd.addColorStop(1, "#141018");
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(0, 0, e.r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.font = `${e.r}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(e.icon, 0, 2);
    if (e.kind === "tank") {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, e.r - 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * e.hp);
      ctx.stroke();
    }
    ctx.restore();
  }
  for (const p of G.bits) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (G.combo > 1) {
    ctx.fillStyle = "#ffd45a";
    ctx.font = "900 28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`КОМБО ×${G.combo}`, G.w / 2, G.h * 0.18);
  }
  if (G.bannerT > 0) {
    ctx.globalAlpha = Math.min(1, G.bannerT * 2);
    ctx.fillStyle = "#fff";
    ctx.font = "900 36px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(G.banner, G.w / 2, G.h * 0.28);
    ctx.globalAlpha = 1;
  }
  const p = Math.min(1, G.cleared / G.need);
  ctx.fillStyle = "rgba(0,0,0,.35)";
  ctx.fillRect(24, G.h - 28, G.w - 48, 8);
  ctx.fillStyle = "#ffd45a";
  ctx.fillRect(24, G.h - 28, (G.w - 48) * p, 8);
  ctx.restore();
}

document.getElementById("playBtn").onclick = startRun;
document.getElementById("againBtn").onclick = startRun;
document.getElementById("groupBtn").onclick = () => VKGame.openGroup();
document.getElementById("shareBtn").onclick = () => VKGame.openGroup();
pauseBtn.onclick = () => {
  if (!G.running) return;
  G.paused = true;
  pauseUI.classList.remove("hidden");
};
document.getElementById("resumeBtn").onclick = () => {
  G.paused = false;
  pauseUI.classList.add("hidden");
};
document.getElementById("menuBtn").onclick = () => {
  G.running = false; G.paused = false;
  pauseUI.classList.add("hidden");
  hud.classList.add("hidden");
  pauseBtn.classList.add("hidden");
  menu.classList.remove("hidden");
};

if (window.VKGame) VKGame.init();
requestAnimationFrame(loop);
