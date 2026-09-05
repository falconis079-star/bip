const LEVELS = [
  { name: "Прихожая", enemy: "🪞", need: 8, speed: 2200, spawn: 900, title: "Бип против зеркала" },
  { name: "Коридор", enemy: "🧹", need: 10, speed: 2000, spawn: 800, title: "Пылесос очнулся" },
  { name: "Ванная", enemy: "🧺", need: 12, speed: 1800, spawn: 750, title: "Стиралка орёт" },
  { name: "Кухня", enemy: "🫖", need: 12, speed: 1700, spawn: 700, title: "Чайник запел" },
  { name: "Холодильник", enemy: "🧊", need: 14, speed: 1600, spawn: 680, title: "Холодная лавина" },
  { name: "Гостиная", enemy: "📺", need: 14, speed: 1500, spawn: 650, title: "Море на экране" },
  { name: "Дверь", enemy: "📦", need: 15, speed: 1400, spawn: 620, title: "Коробка дышит" },
  { name: "Лисий визит", enemy: "🦊", need: 16, speed: 1300, spawn: 600, title: "Выхрик вылез" },
  { name: "Чулан", enemy: "🐱", need: 16, speed: 1200, spawn: 560, title: "Кот-король" },
  { name: "Вся квартира", enemy: "⚡", need: 20, speed: 1050, spawn: 500, title: "Финальный хаос" }
];

const state = {
  running: false,
  level: 0,
  score: 0,
  lives: 3,
  tapped: 0,
  timers: []
};

const arena = document.getElementById("arena");
const levelLabel = document.getElementById("levelLabel");
const scoreLabel = document.getElementById("scoreLabel");
const livesLabel = document.getElementById("livesLabel");
const roomName = document.getElementById("roomName");
const progressFill = document.getElementById("progressFill");
const screen = document.getElementById("screen");
const clipScreen = document.getElementById("clipScreen");
const overScreen = document.getElementById("overScreen");
const playerBox = document.getElementById("playerBox");
const nextBtn = document.getElementById("nextBtn");
const bestScore = document.getElementById("bestScore");

bestScore.textContent = localStorage.getItem("bip_best") || 0;

function show(el) { el.classList.add("show"); }
function hide(el) { el.classList.remove("show"); }

function hud() {
  const lv = LEVELS[state.level];
  levelLabel.textContent = `Ур. ${state.level + 1}`;
  scoreLabel.textContent = state.score;
  livesLabel.textContent = `❤ ${state.lives}`;
  roomName.textContent = lv ? lv.name : "Дом";
  progressFill.style.width = lv ? `${Math.min(100, (state.tapped / lv.need) * 100)}%` : "0%";
}

function clearTimers() {
  state.timers.forEach(clearTimeout);
  state.timers = [];
  [...arena.querySelectorAll(".enemy")].forEach(n => n.remove());
}

function spawnEnemy() {
  if (!state.running) return;
  const lv = LEVELS[state.level];
  const el = document.createElement("button");
  el.className = "enemy";
  el.textContent = lv.enemy;
  const x = 8 + Math.random() * 72;
  const y = 12 + Math.random() * 55;
  el.style.left = x + "%";
  el.style.top = y + "%";
  el.onclick = () => tapEnemy(el);
  arena.appendChild(el);
  const t = setTimeout(() => {
    if (!el.classList.contains("hit") && state.running) miss(el);
  }, lv.speed);
  state.timers.push(t);
}

function tapEnemy(el) {
  if (el.classList.contains("hit") || !state.running) return;
  el.classList.add("hit");
  state.tapped += 1;
  state.score += 10 + state.level * 2;
  hud();
  setTimeout(() => el.remove(), 160);
  if (state.tapped >= LEVELS[state.level].need) winLevel();
}

function miss(el) {
  el.remove();
  state.lives -= 1;
  hud();
  if (state.lives <= 0) gameOver(false);
}

function loopSpawn() {
  if (!state.running) return;
  spawnEnemy();
  const lv = LEVELS[state.level];
  const t = setTimeout(loopSpawn, lv.spawn);
  state.timers.push(t);
}

function startLevel() {
  hide(screen); hide(clipScreen); hide(overScreen);
  state.running = true;
  state.tapped = 0;
  clearTimers();
  hud();
  loopSpawn();
}

function winLevel() {
  state.running = false;
  clearTimers();
  openClip();
}

function openClip() {
  const lv = LEVELS[state.level];
  const clip = VKGame.currentClip();
  document.getElementById("clipTitle").textContent = `Уровень ${state.level + 1} пройден`;
  document.getElementById("clipSub").textContent = clip.title || lv.title;
  playerBox.innerHTML = "";
  if (clip.id) {
    const iframe = document.createElement("iframe");
    iframe.allow = "autoplay; encrypted-media; fullscreen";
    iframe.src = VKGame.embedUrl(clip);
    playerBox.appendChild(iframe);
  } else {
    playerBox.innerHTML = `<div style="padding:18px">Открой свежий выпуск в группе. Через 5 сек можно идти дальше.</div>`;
  }
  nextBtn.disabled = true;
  show(clipScreen);
  setTimeout(() => { nextBtn.disabled = false; }, 5000);
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
  clearTimers();
  const best = Math.max(Number(localStorage.getItem("bip_best") || 0), state.score);
  localStorage.setItem("bip_best", best);
  bestScore.textContent = best;
  document.getElementById("overTitle").textContent = win ? "Квартира сдалась" : "Квартира победила";
  document.getElementById("overText").textContent = win
    ? `Бип прошёл все 10 комнат. Счёт: ${state.score}`
    : `Остановлен на уровне ${state.level + 1}. Счёт: ${state.score}`;
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
    alert("Реклама ВК заработает после публикации приложения.");
  }
};
document.getElementById("pauseBtn").onclick = () => {
  if (state.running) {
    state.running = false;
    clearTimers();
    document.getElementById("pauseBtn").textContent = "Дальше";
  } else if (!overScreen.classList.contains("show") && !clipScreen.classList.contains("show") && !screen.classList.contains("show")) {
    startLevel();
    document.getElementById("pauseBtn").textContent = "Пауза";
  }
};

VKGame.init();
