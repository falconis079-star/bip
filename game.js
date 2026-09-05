const LEVELS = [
  { name: "Прихожая", enemy: "🪞", need: 6, speed: 3.2, spawn: 1100, title: "Бип против зеркала" },
  { name: "Коридор", enemy: "🧹", need: 7, speed: 3.4, spawn: 1000, title: "Пылесос очнулся" },
  { name: "Ванная", enemy: "🧺", need: 8, speed: 3.6, spawn: 920, title: "Стиралка орёт" },
  { name: "Кухня", enemy: "🫖", need: 8, speed: 3.8, spawn: 860, title: "Чайник запел" },
  { name: "Холодильник", enemy: "🧊", need: 9, speed: 4.0, spawn: 820, title: "Холодная лавина" },
  { name: "Гостиная", enemy: "📺", need: 9, speed: 4.2, spawn: 780, title: "Море на экране" },
  { name: "Дверь", enemy: "📦", need: 10, speed: 4.4, spawn: 740, title: "Коробка дышит" },
  { name: "Лисий визит", enemy: "🦊", need: 10, speed: 4.6, spawn: 700, title: "Выхрик вылез" },
  { name: "Чулан", enemy: "🐱", need: 11, speed: 4.8, spawn: 660, title: "Кот-король" },
  { name: "Вся квартира", enemy: "⚡", need: 12, speed: 5.1, spawn: 600, title: "Финальный хаос" }
];

const state = {
  running: false,
  paused: false,
  level: 0,
  score: 0,
  lives: 3,
  tapped: 0,
  enemies: [],
  spawnTimer: 0,
  last: 0,
  combo: 0
};

const arena = document.getElementById("arena");
const bip = document.getElementById("bip");
const fx = document.getElementById("fx");
const toast = document.getElementById("toast");
const countdown = document.getElementById("countdown");
const screen = document.getElementById("screen");
const clipScreen = document.getElementById("clipScreen");
const overScreen = document.getElementById("overScreen");
const playerBox = document.getElementById("playerBox");
const nextBtn = document.getElementById("nextBtn");
const pauseBtn = document.getElementById("pauseBtn");

document.getElementById("bestScore").textContent = localStorage.getItem("bip_best") || 0;

function show(el) { el.classList.add("show"); }
function hide(el) { el.classList.remove("show"); }

function livesText() {
  return "❤".repeat(Math.max(0, state.lives)) || "—";
}

function hud() {
  const lv = LEVELS[state.level] || LEVELS[0];
  document.getElementById("levelLabel").textContent = String(state.level + 1);
  document.getElementById("scoreLabel").textContent = state.score;
  document.getElementById("livesLabel").textContent = livesText();
  document.getElementById("roomName").textContent = lv.name;
  document.getElementById("needLabel").textContent = `${state.tapped} / ${lv.need}`;
  document.getElementById("progressFill").style.width = `${Math.min(100, (state.tapped / lv.need) * 100)}%`;
  arena.className = `arena room-${state.level}`;
}

function say(text) {
  toast.textContent = text;
  toast.style.opacity = "1";
  clearTimeout(say._t);
  say._t = setTimeout(() => { toast.style.opacity = "0"; }, 1200);
}

function bipRect() {
  const r = bip.getBoundingClientRect();
  const a = arena.getBoundingClientRect();
  return {
    x: r.left - a.left + r.width / 2,
    y: r.top - a.top + r.height / 2
  };
}

function clearEnemies() {
  state.enemies.forEach(e => e.el.remove());
  state.enemies = [];
}

function spawnEnemy() {
  const lv = LEVELS[state.level];
  const a = arena.getBoundingClientRect();
  const target = bipRect();
  const side = Math.floor(Math.random() * 3);
  let x, y;
  if (side === 0) { x = 20 + Math.random() * (a.width - 40); y = -30; }
  else if (side === 1) { x = -30; y = 40 + Math.random() * (a.height * 0.45); }
  else { x = a.width + 30; y = 40 + Math.random() * (a.height * 0.45); }

  const el = document.createElement("button");
  el.className = "enemy";
  el.type = "button";
  el.textContent = lv.enemy;
  el.style.left = `${x - 39}px`;
  el.style.top = `${y - 39}px`;
  el.addEventListener("pointerdown", (ev) => {
    ev.preventDefault();
    tapEnemy(obj);
  });
  arena.appendChild(el);

  const dx = target.x - x;
  const dy = target.y - y;
  const dist = Math.max(1, Math.hypot(dx, dy));
  const obj = {
    el, x, y,
    vx: (dx / dist) * lv.speed,
    vy: (dy / dist) * lv.speed,
    dead: false
  };
  state.enemies.push(obj);
}

function tapEnemy(obj) {
  if (!state.running || state.paused || obj.dead) return;
  obj.dead = true;
  obj.el.classList.add("hit");
  state.tapped += 1;
  state.combo += 1;
  const add = 10 + state.level * 2 + Math.min(20, state.combo * 2);
  state.score += add;
  floatText(obj.x, obj.y, `+${add}`);
  hud();
  setTimeout(() => obj.el.remove(), 200);
  state.enemies = state.enemies.filter(e => e !== obj);
  if (state.tapped >= LEVELS[state.level].need) winLevel();
}

function floatText(x, y, text) {
  const n = document.createElement("div");
  n.className = "float";
  n.textContent = text;
  n.style.left = `${x}px`;
  n.style.top = `${y}px`;
  fx.appendChild(n);
  setTimeout(() => n.remove(), 700);
}

function miss(obj) {
  obj.dead = true;
  obj.el.remove();
  state.enemies = state.enemies.filter(e => e !== obj);
  state.lives -= 1;
  state.combo = 0;
  bip.classList.remove("hurt");
  void bip.offsetWidth;
  bip.classList.add("hurt");
  say("Не успел!");
  hud();
  if (state.lives <= 0) gameOver(false);
}

function tick(ts) {
  if (!state.running) return;
  requestAnimationFrame(tick);
  if (state.paused) { state.last = ts; return; }
  const dt = Math.min(32, ts - (state.last || ts));
  state.last = ts;
  state.spawnTimer += dt;
  const lv = LEVELS[state.level];
  if (state.spawnTimer >= lv.spawn) {
    state.spawnTimer = 0;
    if (state.enemies.length < 6) spawnEnemy();
  }
  const target = bipRect();
  state.enemies.forEach(e => {
    e.x += e.vx * (dt / 16);
    e.y += e.vy * (dt / 16);
    e.el.style.left = `${e.x - 39}px`;
    e.el.style.top = `${e.y - 39}px`;
    const d = Math.hypot(e.x - target.x, e.y - target.y);
    if (d < 110) e.el.classList.add("warn");
    if (d < 42) miss(e);
  });
}

function startCountdown(done) {
  let n = 3;
  countdown.textContent = "3";
  const t = setInterval(() => {
    n -= 1;
    if (n <= 0) {
      countdown.textContent = "ЖМИ!";
      setTimeout(() => { countdown.textContent = ""; done(); }, 350);
      clearInterval(t);
    } else countdown.textContent = String(n);
  }, 500);
}

function startLevel() {
  hide(screen); hide(clipScreen); hide(overScreen);
  state.running = false;
  state.paused = false;
  state.tapped = 0;
  state.combo = 0;
  state.spawnTimer = 0;
  clearEnemies();
  pauseBtn.textContent = "❚❚";
  hud();
  say(LEVELS[state.level].title);
  startCountdown(() => {
    state.running = true;
    state.last = performance.now();
    requestAnimationFrame(tick);
  });
}

function winLevel() {
  state.running = false;
  clearEnemies();
  bip.classList.add("win");
  setTimeout(() => bip.classList.remove("win"), 500);
  openClip();
}

function openClip() {
  const lv = LEVELS[state.level];
  const clip = VKGame.currentClip();
  document.getElementById("clipTitle").textContent = `${lv.name} зачищена`;
  document.getElementById("clipSub").textContent = clip.title || lv.title;
  document.getElementById("clipWait").textContent = "Кнопка откроется через 5 сек";
  playerBox.innerHTML = "";
  if (clip.id) {
    const iframe = document.createElement("iframe");
    iframe.allow = "autoplay; encrypted-media; fullscreen";
    iframe.src = VKGame.embedUrl(clip);
    playerBox.appendChild(iframe);
  } else {
    playerBox.innerHTML = `<div style="padding:16px;line-height:1.45">Комната пройдена.<br>Открой свежий выпуск в группе Бипа и жми «Дальше».</div>`;
  }
  nextBtn.disabled = true;
  show(clipScreen);
  let left = 5;
  const timer = setInterval(() => {
    left -= 1;
    document.getElementById("clipWait").textContent = left > 0
      ? `Кнопка откроется через ${left} сек`
      : "Можно идти дальше";
    if (left <= 0) {
      nextBtn.disabled = false;
      clearInterval(timer);
    }
  }, 1000);
}

function nextAfterClip() {
  hide(clipScreen);
  if (state.level >= LEVELS.length - 1) {
    gameOver(true);
    return;
  }
  state.level += 1;
  startLevel();
}

function gameOver(win) {
  state.running = false;
  clearEnemies();
  const best = Math.max(Number(localStorage.getItem("bip_best") || 0), state.score);
  localStorage.setItem("bip_best", best);
  document.getElementById("bestScore").textContent = best;
  document.getElementById("overTitle").textContent = win ? "Квартира сдалась" : "Квартира победила";
  document.getElementById("overText").textContent = win
    ? `Бип прошёл все 10 комнат. Счёт: ${state.score}`
    : `Остановлен в комнате «${LEVELS[state.level].name}». Счёт: ${state.score}`;
  show(overScreen);
}

function resetGame() {
  state.level = 0;
  state.score = 0;
  state.lives = window.BIP_CONFIG.startLives;
  startLevel();
}

document.getElementById("startBtn").onclick = resetGame;
document.getElementById("retryBtn").onclick = resetGame;
document.getElementById("groupBtn").onclick = () => VKGame.openGroup();
document.getElementById("nextBtn").onclick = nextAfterClip;
document.getElementById("shareBtn").onclick = () => VKGame.share(state.score, state.level + 1);
document.getElementById("rewardBtn").onclick = async () => {
  const ok = await VKGame.rewarded();
  if (ok) {
    state.lives += 1;
    hide(overScreen);
    startLevel();
  } else {
    say("Реклама ВК заработает после публикации");
  }
};
pauseBtn.onclick = () => {
  if (!state.running && !state.paused) return;
  if (clipScreen.classList.contains("show") || overScreen.classList.contains("show") || screen.classList.contains("show")) return;
  state.paused = !state.paused;
  pauseBtn.textContent = state.paused ? "▶" : "❚❚";
  say(state.paused ? "Пауза" : "Дальше");
};

VKGame.init();
