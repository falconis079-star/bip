const ROOMS = [
  { name: "Прихожая", icon: "🪞", color: "#7ecbff", bg: ["#2a1d28", "#0d0a12"], prop: "mirror" },
  { name: "Коридор", icon: "🧹", color: "#9ad0ff", bg: ["#1c2430", "#0a1016"], prop: "vac" },
  { name: "Ванная", icon: "🧺", color: "#8ee0ff", bg: ["#163038", "#081216"], prop: "wash" },
  { name: "Кухня", icon: "🫖", color: "#ffb46a", bg: ["#2c2214", "#100c08"], prop: "kettle" },
  { name: "Холодильник", icon: "🧊", color: "#9be7ff", bg: ["#143044", "#071018"], prop: "fridge" },
  { name: "Гостиная", icon: "📺", color: "#c5b0ff", bg: ["#241848", "#0c0818"], prop: "tv" },
  { name: "Дверь", icon: "📦", color: "#ffd27a", bg: ["#2a1c12", "#100c08"], prop: "box" },
  { name: "Выхрик", icon: "🦊", color: "#ff9a4a", bg: ["#2a1810", "#120c08"], prop: "fox" },
  { name: "Чулан", icon: "🐱", color: "#ffe08a", bg: ["#261820", "#100810"], prop: "cat" },
  { name: "Вся квартира", icon: "⚡", color: "#ff6b8a", bg: ["#30101c", "#12060c"], prop: "chaos" }
];

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const $ = id => document.getElementById(id);

const STORE = "bip_save_v3";
const FX = { BC: 1, USD: 0.6325, RUB: 54.768, EUR: 0.5448, JPY: 98.67 };
const FEE = 0.01;
const APY = 0.385;
function loadSave() {
  try { return JSON.parse(localStorage.getItem(STORE) || "{}"); } catch (e) { return {}; }
}
function writeSave(part) {
  const s = Object.assign(loadSave(), {
    coins: G.coins, room: G.room, best: Math.max(G.best, G.coins),
    wallets: G.wallets, stake: G.stake, stakeDay: G.stakeDay,
    tapsToday: G.tapsToday, tapDay: G.tapDay,
    pid: G.pid, name: G.name, email: G.email, phone: G.phone
  }, part);
  localStorage.setItem(STORE, JSON.stringify(s));
  localStorage.setItem("bip_best", String(s.best || 0));
}
const SAVE = loadSave();
const G = {
  w: 390, h: 844, running: false, paused: false, between: false,
  room: SAVE.room || 0,
  coins: SAVE.coins == null ? 80 : Number(SAVE.coins),
  best: Number(SAVE.best || localStorage.getItem("bip_best") || 0),
  hp: 3, shield: 0, combo: 0, comboTime: 0,
  cleared: 0, need: 24, spawn: 0, banner: "", bannerT: 0,
  shake: 0, t: 0, last: 0, taught: false, roomHit: false, bossOut: false,
  clipPaid: false, tapsToday: SAVE.tapsToday || 0, tapDay: SAVE.tapDay || "",
  wallets: Object.assign({ USD: 0, RUB: 0, EUR: 0, JPY: 0 }, SAVE.wallets || {}),
  stake: Number(SAVE.stake || 0), stakeDay: SAVE.stakeDay || "",
  pid: SAVE.pid || ("b" + Math.random().toString(36).slice(2) + Date.now().toString(36)),
  name: SAVE.name || "", email: SAVE.email || "", phone: SAVE.phone || "",
  bip: { x: 195, y: 690, hurt: 0 },
  ents: [], bits: [], flashes: []
};

function today() {
  return new Date().toISOString().slice(0, 10);
}
function roomCost(i) {
  return i === 0 ? 0 : 15 + i * 10;
}
function roomNeed(i) {
  return 24 + i * 3;
}
function bossHp(i) {
  return 13 + Math.round(i * 23 / 9);
}
function addCoins(n) {
  G.coins = Math.max(0, G.coins + n);
  G.best = Math.max(G.best, G.coins);
  writeSave({ coins: G.coins, room: G.room, best: G.best });
  hudSync();
  refreshMenu();
}
function claimDaily() {
  const s = loadSave();
  if (s.daily === today()) return 0;
  const yest = new Date(); yest.setDate(yest.getDate() - 1);
  const streak = s.daily === yest.toISOString().slice(0, 10) ? (s.streak || 1) + 1 : 1;
  const bonus = Math.min(80, 40 + (streak - 1) * 10);
  writeSave({ daily: today(), streak });
  addCoins(bonus);
  return bonus;
}
function payload() {
  return {
    id: G.pid, name: G.name, email: G.email, phone: G.phone,
    room: G.room, coins: G.coins, best: G.best
  };
}
function syncStats() {
  const url = window.BIP_CONFIG && BIP_CONFIG.statsUrl;
  if (!url) {
    if ($("liveLine")) $("liveLine").textContent = "";
    return;
  }
  fetch(url, { method: "POST", body: JSON.stringify(payload()) })
    .then(r => r.json())
    .then(d => { if ($("liveLine") && d.players) $("liveLine").textContent = "Играют уже " + d.players; })
    .catch(() => {});
}
function openRegIfNeeded() {
  if (G.name) return;
  $("menu").classList.add("hidden");
  $("reg").classList.remove("hidden");
}
function saveProfile() {
  const name = ($("regName").value || "").trim();
  if (name.length < 2) { $("regHint").textContent = "Напиши имя"; return; }
  G.name = name;
  G.email = ($("regMail").value || "").trim();
  G.phone = ($("regPhone").value || "").trim();
  writeSave({ pid: G.pid, name: G.name, email: G.email, phone: G.phone });
  $("reg").classList.add("hidden");
  $("menu").classList.remove("hidden");
  syncStats();
  refreshMenu();
}
function refreshMenu() {
  $("coinHud").textContent = Number(G.coins).toFixed(2);
  $("scoreHud").textContent = Number(G.coins).toFixed(2) + " BC";
  const cost = roomCost(G.room);
  const name = ROOMS[Math.min(G.room, 9)].name;
  $("playBtn").textContent = G.room >= 10
    ? "Кампания пройдена"
    : (cost ? "Войти в «" + name + "» за " + cost + " BC" : "Войти в «" + name + "» бесплатно");
  $("saveLine").textContent = G.room >= 10
    ? "Все комнаты пройдены. Можно сбросить прогресс."
    : "Сохранено: комната " + (G.room + 1) + "/10 — " + name;
  const s = loadSave();
  paintWallet();
}
function bal(code) { return code === "BC" ? G.coins : (G.wallets[code] || 0); }
function setBal(code, v) {
  if (code === "BC") G.coins = v;
  else G.wallets[code] = v;
}
function fmt(n, d) { return Number(n || 0).toFixed(d == null ? 4 : d); }
function toBC(code, amt) { return amt / FX[code]; }
function fromBC(code, amt) { return amt * FX[code]; }
function paintWallet() {
  if ($("farmBal")) $("farmBal").textContent = fmt(G.coins, 4) + " BC";
  if (!$("exMain")) return;
  $("exMain").textContent = fmt(G.coins, 4) + " BC";
  $("exUsd").textContent = "≈ $" + fmt(fromBC("USD", G.coins), 4) + "  ·  " + fmt(fromBC("RUB", G.coins), 2) + " ₽";
  $("exGrid").innerHTML = ["USD","RUB","EUR","JPY"].map(c =>
    "<div class='ex-cell'>" + c + "<b>" + fmt(bal(c), 2) + "</b></div>"
  ).join("");
  if (!$("swapFrom").options.length) {
    ["BC","USD","RUB","EUR","JPY"].forEach(c => {
      $("swapFrom").innerHTML += "<option value='"+c+"'>"+c+"</option>";
      $("swapTo").innerHTML += "<option value='"+c+"'>"+c+"</option>";
    });
    $("swapTo").value = "USD";
  }
  const pay = (G.stake * APY) / 365;
  $("stakeHint").textContent = "В депозите " + fmt(G.stake, 2) + " BC. Завтра +" + fmt(pay, 4) + " (38.5% год.)";
}
function doSwap() {
  const a = $("swapFrom").value, b = $("swapTo").value;
  const amt = Number($("swapAmt").value);
  if (a === b || !(amt > 0)) { $("swapHint").textContent = "Выбери разные валюты и сумму"; return; }
  if (bal(a) < amt) { $("swapHint").textContent = "Не хватает " + a; return; }
  const bc = toBC(a, amt);
  const got = fromBC(b, bc) * (1 - FEE);
  setBal(a, bal(a) - amt);
  setBal(b, bal(b) + got);
  writeSave({});
  $("swapHint").textContent = "Готово: -" + fmt(amt, 4) + " " + a + " → +" + fmt(got, 4) + " " + b + " (−1%)";
  refreshMenu();
}
function accrueStake() {
  if (!(G.stake > 0)) return;
  if (G.stakeDay === today()) return;
  addCoins(G.stake * APY / 365);
  G.stakeDay = today();
  writeSave({ stakeDay: G.stakeDay, stake: G.stake });
}
function doStake() {
  const amt = Number($("stakeAmt").value);
  if (!(amt >= 10) || amt > G.coins) { $("stakeHint").textContent = "От 10 BC и не больше баланса"; return; }
  G.coins -= amt; G.stake += amt;
  writeSave({ stake: G.stake, coins: G.coins });
  refreshMenu();
}
function doUnstake() {
  if (!(G.stake > 0)) return;
  G.coins += G.stake; G.stake = 0;
  writeSave({ stake: 0, coins: G.coins });
  refreshMenu();
}

function fit() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  G.w = innerWidth; G.h = innerHeight;
  canvas.width = G.w * dpr; canvas.height = G.h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  G.bip.x = G.w / 2; G.bip.y = G.h * 0.78;
}
addEventListener("resize", fit); fit();

function beep(f, len, type, vol) {
  try {
    const a = beep.ctx || (beep.ctx = new (window.AudioContext || window.webkitAudioContext)());
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || "square"; o.frequency.value = f; g.gain.value = vol || 0.04;
    o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + (len || 0.07));
  } catch (e) {}
}

function hudSync() {
  const room = ROOMS[Math.min(G.room, 9)];
  $("roomHud").textContent = room.name;
  $("waveHud").textContent = Math.min(G.room + 1, 10) + "/10";
  $("scoreHud").textContent = G.coins + " BC";
  $("hpHud").textContent = "❤".repeat(Math.max(0, G.hp)) || "✕";
  if ($("coinHud")) $("coinHud").textContent = G.coins;
}

function burst(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = 1.2 + Math.random() * 4.2;
    G.bits.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, life: 1, color, size: 2 + Math.random() * 4 });
  }
  G.flashes.push({ x, y, r: 8, life: 1, color });
}

function pickKind() {
  const r = G.room, roll = Math.random();
  if (roll > 0.9) return "gem";
  if (r >= 5 && roll > 0.72) return "quad";
  if (r >= 2 && roll > 0.55) return "triple";
  if (r >= 1 && roll > 0.38) return "tank";
  return "normal";
}

function stats(kind, boss) {
  if (boss) return { hp: bossHp(G.room), r: 62, worth: 80 + G.room * 12, spd: 0.48 };
  if (kind === "quad") return { hp: 4, r: 50, worth: 90, spd: 0.62 };
  if (kind === "triple") return { hp: 3, r: 46, worth: 70, spd: 0.7 };
  if (kind === "tank") return { hp: 2, r: 42, worth: 45, spd: 0.78 };
  if (kind === "gem") return { hp: 1, r: 30, worth: 80, spd: 1.05 };
  return { hp: 1, r: 34, worth: 20, spd: 1 };
}

function spawn(boss) {
  const room = ROOMS[G.room];
  const kind = boss ? "boss" : pickKind();
  const st = stats(kind, boss);
  const side = Math.floor(Math.random() * 3);
  let x, y;
  if (boss) { x = G.w / 2; y = -70; }
  else if (side === 0) { x = 40 + Math.random() * (G.w - 80); y = -50; }
  else if (side === 1) { x = -50; y = 70 + Math.random() * G.h * 0.35; }
  else { x = G.w + 50; y = 70 + Math.random() * G.h * 0.35; }
  const dx = G.bip.x - x, dy = G.bip.y - y, d = Math.hypot(dx, dy) || 1;
  const base = 1.35 + G.room * 0.14;
  const taught = (G.room === 0 && !G.taught);
  const spd = base * st.spd * (taught ? 0.45 : 1);
  G.ents.push({
    x, y, r: st.r, hp: st.hp, max: st.hp, kind, worth: st.worth,
    icon: room.icon, color: room.color, boss,
    vx: dx / d * spd, vy: dy / d * spd, rot: 0, wob: Math.random() * 8
  });
  if (taught) G.taught = true;
}

function startRun() {
  if (G.room >= 10) { refreshMenu(); return; }
  const cost = roomCost(G.room);
  if (G.coins < cost) {
    $("saveLine").textContent = "Не хватает BipCoin. Нужно " + cost + ". Посмотри выпуск или зайди завтра.";
    return;
  }
  addCoins(-cost);
  G.running = true; G.paused = false; G.between = false;
  G.hp = 3; G.shield = 0;
  G.combo = 0; G.comboTime = 0; G.cleared = 0; G.need = roomNeed(G.room);
  G.ents = []; G.bits = []; G.flashes = [];
  G.taught = G.room !== 0; G.roomHit = false; G.bossOut = false; G.clipPaid = false;
  G.banner = ROOMS[G.room].name;
  G.bannerT = 1.4; G.spawn = 0;
  writeSave({ room: G.room, coins: G.coins });
  syncStats();
  $("menu").classList.add("hidden");
  $("end").classList.add("hidden");
  $("pause").classList.add("hidden");
  $("roomOver").classList.add("hidden");
  $("hud").classList.remove("hidden");
  $("pauseBtn").classList.remove("hidden");
  hudSync(); beep(520, 0.08, "triangle", 0.05);
}

function roomClear() {
  G.running = false; G.between = true; G.ents = [];
  const clean = !G.roomHit;
  const prize = 45 + G.room * 10 + (clean ? 30 : 0);
  addCoins(prize);
  G.room = Math.min(10, G.room + 1);
  writeSave({ room: G.room, coins: G.coins });
  const done = G.room >= 10;
  $("roomOverTitle").textContent = done ? "Квартира сдалась" : "Комната зачищена";
  $("roomOverText").textContent = "+" + prize + " BipCoin." +
    (clean ? " Бипа не задели." : "") +
    (done ? " Кампания пройдена." : " Следующая: " + ROOMS[G.room].name + " стоит " + roomCost(G.room) + " BC.");
  $("clipBtn").style.display = "block";
  $("nextRoomBtn").textContent = done ? "В меню" : "Войти дальше за " + roomCost(G.room) + " BC";
  $("playerBox").classList.remove("hidden");
  $("playerBox").innerHTML = "<div style='padding:14px'>Выпуск = +20 BipCoin один раз за эту паузу.</div>";
  $("roomOver").classList.remove("hidden");
  $("pauseBtn").classList.add("hidden");
}

function goNext() {
  $("roomOver").classList.add("hidden");
  $("playerBox").classList.add("hidden");
  if (G.room >= 10) { showMenu(); return; }
  startRun();
}

function finish(win) {
  G.running = false; G.between = false;
  writeSave({ room: G.room, coins: G.coins });
  $("endTitle").textContent = win ? "Квартира сдалась" : "Бипа накрыло";
  $("endText").textContent = win
    ? "Все комнаты. Баланс " + G.coins + " BipCoin"
    : ROOMS[Math.min(G.room, 9)].name + " не сдалась. Прогресс сохранён. Баланс " + G.coins + " BC";
  $("hud").classList.add("hidden");
  $("pauseBtn").classList.add("hidden");
  $("roomOver").classList.add("hidden");
  $("end").classList.remove("hidden");
}
function showMenu() {
  G.running = false; G.paused = false; G.between = false;
  $("pause").classList.add("hidden");
  $("hud").classList.add("hidden");
  $("pauseBtn").classList.add("hidden");
  $("roomOver").classList.add("hidden");
  $("end").classList.add("hidden");
  $("menu").classList.remove("hidden");
  refreshMenu();
}
function rewardClip() {
  const s = loadSave();
  if (G.between) {
    if (G.clipPaid) return;
    G.clipPaid = true;
    addCoins(20);
    return;
  }
  if (s.clipDay === today()) {
    $("saveLine").textContent = "Бонус за выпуск сегодня уже получен.";
    return;
  }
  writeSave({ clipDay: today() });
  addCoins(20);
}

function hitEnt(e) {
  e.hp -= 1; G.shake = 6;
  if (e.hp > 0) { burst(e.x, e.y, "#fff", 8); beep(170, 0.05, "sawtooth", 0.04); return; }
  G.cleared += 1; G.combo += 1; G.comboTime = 1.4;
  addCoins(e.boss ? (20 + G.room) : (e.kind === "gem" ? 4 : 1));
  if (e.kind === "gem") G.shield = 2.8;
  burst(e.x, e.y, e.color, e.boss ? 36 : 20);
  beep(e.boss ? 220 : e.kind === "gem" ? 880 : 400 + G.combo * 16, 0.08, "square", 0.05);
  hudSync();
  if (e.boss) setTimeout(roomClear, 350);
}

function tap(x, y) {
  if (!G.running || G.paused || G.between) return;
  let best = null, bestD = 1e9;
  for (const e of G.ents) {
    const d = Math.hypot(e.x - x, e.y - y);
    if (d < e.r + 20 && d < bestD) { best = e; bestD = d; }
  }
  if (best) { hitEnt(best); G.ents = G.ents.filter(e => e.hp > 0); return; }
  if (Math.hypot(x - G.bip.x, y - G.bip.y) < 56) {
    if (G.tapDay !== today()) { G.tapDay = today(); G.tapsToday = 0; }
    if (G.tapsToday >= 500) return;
    G.tapsToday += 1;
    addCoins(0.001);
    burst(G.bip.x, G.bip.y - 20, "#ffd45a", 6);
    return;
  }
  burst(x, y, "rgba(255,255,255,.35)", 4);
}

canvas.addEventListener("pointerdown", ev => {
  const r = canvas.getBoundingClientRect();
  tap(ev.clientX - r.left, ev.clientY - r.top);
});

function loop(ts) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.033, (ts - (G.last || ts)) / 1000);
  G.last = ts;
  draw();
  if (!G.running || G.paused || G.between) return;
  G.t += dt; G.comboTime -= dt; if (G.comboTime <= 0) G.combo = 0;
  G.shield = Math.max(0, G.shield - dt);
  G.bannerT = Math.max(0, G.bannerT - dt);
  G.shake *= 0.86; G.bip.hurt = Math.max(0, G.bip.hurt - dt);
  G.spawn += dt;
  const rate = Math.max(0.55, 1.35 - G.room * 0.05);
  if (!G.bossOut && G.cleared >= G.need) {
    G.bossOut = true;
    G.ents = G.ents.filter(e => e.boss);
    spawn(true);
    G.banner = ROOMS[G.room].name;
    G.bannerT = 1;
  } else if (!G.bossOut && G.spawn > rate && G.ents.length < 7 && G.bannerT < 0.35) {
    G.spawn = 0; spawn(false);
  }

  for (const e of G.ents) {
    e.x += e.vx * 60 * dt; e.y += e.vy * 60 * dt; e.rot += dt * 1.6; e.wob += dt * 5;
    if (Math.hypot(e.x - G.bip.x, e.y - G.bip.y) < 50 + e.r * 0.12) {
      e.hp = 0;
      if (G.shield > 0) { G.shield = 0; burst(G.bip.x, G.bip.y, "#6cffb2", 16); beep(200, 0.08); }
      else {
        G.hp -= 1; G.combo = 0; G.roomHit = true; G.bip.hurt = 0.35; G.shake = 14;
        beep(90, 0.16, "sawtooth", 0.06); hudSync();
        if (G.hp <= 0) finish(false);
      }
    }
  }
  G.ents = G.ents.filter(e => e.hp > 0 && e.y < G.h + 90);
  for (const p of G.bits) { p.x += p.vx * 60 * dt; p.y += p.vy * 60 * dt; p.vy += 8 * dt; p.life -= dt * 1.8; }
  G.bits = G.bits.filter(p => p.life > 0);
  for (const f of G.flashes) { f.r += 180 * dt; f.life -= dt * 3; }
  G.flashes = G.flashes.filter(f => f.life > 0);
}

function drawProp(kind, w, h) {
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = "#d9ecff";
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 6;
  if (kind === "mirror") {
    ctx.fillRect(w * 0.58, h * 0.14, 110, 220);
    ctx.strokeRect(w * 0.58, h * 0.14, 110, 220);
  } else if (kind === "vac") {
    ctx.beginPath(); ctx.arc(w * 0.2, h * 0.6, 42, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillRect(w * 0.28, h * 0.32, 16, 120);
  } else if (kind === "wash") {
    ctx.fillRect(w * 0.08, h * 0.38, 130, 160);
    ctx.beginPath(); ctx.arc(w * 0.08 + 65, h * 0.38 + 90, 40, 0, Math.PI * 2); ctx.stroke();
  } else if (kind === "kettle") {
    ctx.beginPath(); ctx.ellipse(w * 0.76, h * 0.44, 48, 36, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillRect(w * 0.72, h * 0.28, 18, 28);
  } else if (kind === "fridge") {
    ctx.fillRect(w * 0.66, h * 0.16, 100, 260);
    ctx.strokeRect(w * 0.66, h * 0.16, 100, 260);
    ctx.fillRect(w * 0.66, h * 0.34, 100, 8);
  } else if (kind === "tv") {
    ctx.fillRect(w * 0.12, h * 0.16, 220, 130);
    ctx.fillRect(w * 0.12 + 96, h * 0.16 + 130, 28, 36);
  } else if (kind === "box") {
    ctx.fillRect(w * 0.1, h * 0.48, 140, 100);
    ctx.beginPath(); ctx.moveTo(w * 0.1, h * 0.48); ctx.lineTo(w * 0.1 + 70, h * 0.36); ctx.lineTo(w * 0.1 + 140, h * 0.48); ctx.closePath(); ctx.fill();
  } else if (kind === "fox") {
    ctx.beginPath(); ctx.arc(w * 0.76, h * 0.52, 46, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w * 0.62, h * 0.42); ctx.lineTo(w * 0.72, h * 0.22); ctx.lineTo(w * 0.78, h * 0.42); ctx.fill();
  } else if (kind === "cat") {
    ctx.beginPath(); ctx.arc(w * 0.22, h * 0.5, 40, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w * 0.08, h * 0.42); ctx.lineTo(w * 0.16, h * 0.24); ctx.lineTo(w * 0.24, h * 0.42); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w * 0.2, h * 0.42); ctx.lineTo(w * 0.3, h * 0.24); ctx.lineTo(w * 0.36, h * 0.42); ctx.fill();
  } else {
    ctx.fillRect(w * 0.08, h * 0.18, 80, 100);
    ctx.fillRect(w * 0.66, h * 0.22, 90, 70);
    ctx.beginPath(); ctx.arc(w * 0.5, h * 0.36, 40, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawBip(x, y) {
  const bob = Math.sin(G.t * 4) * 5;
  ctx.save();
  ctx.translate(x + (G.bip.hurt ? Math.sin(G.t * 40) * 6 : 0), y + bob);
  ctx.fillStyle = "rgba(0,0,0,.25)";
  ctx.beginPath(); ctx.ellipse(0, 48, 34, 10, 0, 0, Math.PI * 2); ctx.fill();
  const body = ctx.createRadialGradient(-12, -8, 6, 0, 6, 48);
  body.addColorStop(0, "#f4fbff");
  body.addColorStop(0.45, G.bip.hurt ? "#ff8aa0" : "#7ad4ff");
  body.addColorStop(1, "#1a4e72");
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.arc(0, 4, 40, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#7dffb0";
  ctx.beginPath(); ctx.arc(0, -46, 6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#9ad7ff"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(0, -28); ctx.stroke();
  ctx.fillStyle = G.bip.hurt ? "#ff4d6d" : "#13d0ff";
  ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.arc(-11, -4, 7, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(11, -4, 7, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,.35)";
  ctx.beginPath(); ctx.ellipse(-12, -12, 10, 6, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#08314a"; ctx.font = "900 11px sans-serif"; ctx.textAlign = "center";
  ctx.fillText("БИП", 0, 28);
  if (G.shield > 0) {
    ctx.strokeStyle = "rgba(108,255,178,.85)"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, 52, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function kindColor(e) {
  if (e.kind === "gem") return "#6cffb2";
  if (e.kind === "quad") return "#c5b0ff";
  if (e.kind === "triple") return "#ff6b8a";
  if (e.kind === "tank") return "#ff9a4a";
  if (e.boss) return "#ffd45a";
  return e.color;
}

function draw() {
  const room = ROOMS[G.room];
  const sx = G.shake ? (Math.random() - .5) * G.shake : 0;
  const sy = G.shake ? (Math.random() - .5) * G.shake : 0;
  ctx.save(); ctx.translate(sx, sy);
  const g = ctx.createLinearGradient(0, 0, 0, G.h);
  g.addColorStop(0, room.bg[0]); g.addColorStop(1, room.bg[1]);
  ctx.fillStyle = g; ctx.fillRect(-20, -20, G.w + 40, G.h + 40);
  drawProp(room.prop, G.w, G.h);
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#fff";
  ctx.font = "900 54px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(room.name.toUpperCase(), G.w / 2, G.h * 0.42);
  ctx.restore();
  ctx.fillStyle = "rgba(0,0,0,.22)"; ctx.fillRect(0, G.h * 0.72, G.w, G.h * 0.28);
  drawBip(G.bip.x, G.bip.y);
  for (const f of G.flashes) {
    ctx.globalAlpha = f.life; ctx.strokeStyle = f.color; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
  }
  for (const e of G.ents) {
    const col = kindColor(e);
    ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(Math.sin(e.rot) * 0.2);
    ctx.scale(1 + Math.sin(e.wob) * 0.05, 1 + Math.sin(e.wob) * 0.05);
    ctx.shadowColor = col; ctx.shadowBlur = 16;
    const grd = ctx.createRadialGradient(-8, -8, 6, 0, 0, e.r);
    grd.addColorStop(0, "#fff7"); grd.addColorStop(0.35, col); grd.addColorStop(1, "#141018");
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(0, 0, e.r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.font = e.r + "px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(e.icon, 0, 2);
    if (e.max > 1) {
      ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(0, 0, e.r - 5, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, e.r - 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (e.hp / e.max)); ctx.stroke();
    }
    ctx.restore();
  }
  for (const p of G.bits) {
    ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  }
  if (G.bannerT > 0) {
    ctx.globalAlpha = Math.min(1, G.bannerT);
    ctx.fillStyle = "#d7b56d";
    ctx.font = "600 28px serif"; ctx.textAlign = "center";
    ctx.fillText(G.banner, G.w / 2, G.h * 0.24); ctx.globalAlpha = 1;
  }
  const p = Math.min(1, G.cleared / Math.max(1, G.need));
  ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(24, G.h - 28, G.w - 48, 8);
  ctx.fillStyle = "#ffd45a"; ctx.fillRect(24, G.h - 28, (G.w - 48) * p, 8);
  ctx.restore();
}

function openClipFrom(boxId) {
  const clip = VKGame.currentClip();
  const box = $(boxId);
  if (box) {
    box.classList.remove("hidden");
    if (clip && clip.id) {
      box.innerHTML = '<iframe allow="autoplay; encrypted-media; fullscreen" src="' + VKGame.embedUrl(clip) + '"></iframe>';
    } else {
      VKGame.openGroup();
      box.innerHTML = "<div style='padding:16px'>+20 BipCoin за просмотр. Группа открыта.</div>";
    }
  } else VKGame.openGroup();
  rewardClip();
}
$("farmBtn").onclick = () => { $("menu").classList.add("hidden"); $("farm").classList.remove("hidden"); paintWallet(); };
$("farmBack").onclick = () => { $("farm").classList.add("hidden"); showMenu(); };
const FARM_COLORS = [
  "radial-gradient(circle at 32% 28%, #fff7e6, #c9a45a 48%, #3a2c12)",
  "radial-gradient(circle at 32% 28%, #eaf6ff, #5aa7d6 48%, #123044)",
  "radial-gradient(circle at 32% 28%, #f3e8ff, #9a72d4 48%, #2a1840)",
  "radial-gradient(circle at 32% 28%, #e8fff4, #5dcaa0 48%, #12362a)",
  "radial-gradient(circle at 32% 28%, #ffe8ea, #e07a86 48%, #3a1418)"
];
let farmHue = 0;
$("farmTap").onclick = () => {
  addCoins(0.0001);
  farmHue = (farmHue + 1) % FARM_COLORS.length;
  $("farmTap").style.background = FARM_COLORS[farmHue];
};
$("walletBtn").onclick = () => { $("menu").classList.add("hidden"); $("wallet").classList.remove("hidden"); paintWallet(); };
$("walletBack").onclick = () => { $("wallet").classList.add("hidden"); showMenu(); };
$("swapBtn").onclick = doSwap;
$("stakeBtn").onclick = doStake;
$("unstakeBtn").onclick = doUnstake;
$("topupBtn").onclick = () => { $("swapHint").textContent = "Пополнение извне откроется позже"; };
$("withdrawBtn").onclick = () => { $("swapHint").textContent = "Вывод наружу откроется позже"; };
if ($("regBtn")) $("regBtn").onclick = saveProfile;
$("playBtn").onclick = startRun;
$("againBtn").onclick = showMenu;
$("groupBtn").onclick = () => VKGame.openGroup();
if ($("shareBtn")) $("shareBtn").onclick = () => VKGame.openGroup();
$("nextRoomBtn").onclick = goNext;
$("homeBtn").onclick = showMenu;
$("clipBtn").onclick = () => openClipFrom("playerBox");
if ($("clipMenuBtn")) $("clipMenuBtn").onclick = () => { G.clipPaid = false; openClipFrom("playerBox"); VKGame.openGroup(); };
if ($("buyBtn")) $("buyBtn").onclick = async () => {
  const ok = window.VKGame && await VKGame.buyLife();
  if (ok) addCoins(100);
  else $("saveLine").textContent = "Покупка за голоса ВК включится после публикации приложения.";
};
$("resetBtn").onclick = () => {
  if (!confirm("Сбросить комнаты? BipCoin останутся.")) return;
  G.room = 0;
  writeSave({ room: 0, coins: G.coins });
  refreshMenu();
};
$("pauseBtn").onclick = () => { if (!G.running) return; G.paused = true; $("pause").classList.remove("hidden"); };
$("resumeBtn").onclick = () => { G.paused = false; $("pause").classList.add("hidden"); };
$("menuBtn").onclick = showMenu;
if (window.VKGame) VKGame.init();
const daily = claimDaily();
accrueStake();
writeSave({ pid: G.pid });
refreshMenu();
openRegIfNeeded();
syncStats();
requestAnimationFrame(loop);
