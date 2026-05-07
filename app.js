const STORAGE_KEY = "bingo75-state-v3";

const columns = [
  { letter: "B", start: 1, end: 15 },
  { letter: "I", start: 16, end: 30 },
  { letter: "N", start: 31, end: 45 },
  { letter: "G", start: 46, end: 60 },
  { letter: "O", start: 61, end: 75 }
];

const defaultLayout = { board: 55, draw: 35, history: 10 };

const state = {
  history: [],
  soundEnabled: true,
  historyVisible: false,
  controlsVisible: true,
  manualMode: false,
  layout: { ...defaultLayout }
};

let wakeLock = null;
let activeResize = null;

const screenGridEl = document.getElementById("screen-grid");
const boardEl = document.getElementById("bingo-board");
const manualBannerEl = document.getElementById("manual-banner");
const lastNumberEl = document.getElementById("last-number");
const recentHistoryEl = document.getElementById("recent-history");
const fullHistoryEl = document.getElementById("full-history");
const counterEl = document.getElementById("counter");
const progressFillEl = document.getElementById("progress-fill");
const statusPillEl = document.getElementById("status-pill");
const endMessageEl = document.getElementById("end-message");
const controlsEl = document.getElementById("controls");
const showControlsHotspotEl = document.getElementById("show-controls-hotspot");
const conferenceModal = document.getElementById("conference-modal");

function setAppHeight() {
  const height = window.visualViewport?.height || window.innerHeight;
  document.documentElement.style.setProperty("--app-height", `${height}px`);
  setTimeout(fitBoardToPanel, 50);
}

window.visualViewport?.addEventListener("resize", setAppHeight);
window.addEventListener("resize", setAppHeight);
window.addEventListener("orientationchange", () => setTimeout(setAppHeight, 140));
setAppHeight();

function padNumber(number) { return String(number).padStart(2, "0"); }
function getLetter(number) { return columns.find(item => number >= item.start && number <= item.end)?.letter || ""; }
function formatCall(number) { return number ? `${getLetter(number)} ${padNumber(number)}` : "BINGO"; }
function formatOrdinal(index) { return `${index + 1}ª`; }
function getDrawnSet() { return new Set(state.history); }
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function migrateOldStateIfNeeded() {
  if (localStorage.getItem(STORAGE_KEY)) return;

  const oldRaw = localStorage.getItem("bingo75-state-v2") || localStorage.getItem("bingo75-state-v1");
  if (!oldRaw) return;

  try {
    const old = JSON.parse(oldRaw);
    if (Array.isArray(old.history)) {
      state.history = [...new Set(old.history.filter(number => Number.isInteger(number) && number >= 1 && number <= 75))];
    }
    if (typeof old.soundEnabled === "boolean") state.soundEnabled = old.soundEnabled;
    if (old.layout && typeof old.layout === "object") {
      state.layout = {
        board: clamp(Number(old.layout.board) || defaultLayout.board, 35, 70),
        draw: clamp(Number(old.layout.draw) || defaultLayout.draw, 24, 60),
        history: clamp(Number(old.layout.history) || defaultLayout.history, 8, 22)
      };
      normalizeLayout();
    }
    state.historyVisible = state.history.length > 0;
  } catch {}
}

function loadState() {
  migrateOldStateIfNeeded();

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return;

    state.history = Array.isArray(saved.history)
      ? [...new Set(saved.history.filter(number => Number.isInteger(number) && number >= 1 && number <= 75))]
      : [];

    if (typeof saved.soundEnabled === "boolean") state.soundEnabled = saved.soundEnabled;
    if (typeof saved.historyVisible === "boolean") state.historyVisible = saved.historyVisible;
    if (typeof saved.controlsVisible === "boolean") state.controlsVisible = saved.controlsVisible;
    if (typeof saved.manualMode === "boolean") state.manualMode = saved.manualMode;

    if (saved.layout && typeof saved.layout === "object") {
      state.layout = {
        board: clamp(Number(saved.layout.board) || defaultLayout.board, 35, 70),
        draw: clamp(Number(saved.layout.draw) || defaultLayout.draw, 24, 60),
        history: clamp(Number(saved.layout.history) || defaultLayout.history, 8, 22)
      };
      normalizeLayout();
    }

    if (state.history.length === 0) {
      state.historyVisible = false;
      state.manualMode = false;
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function normalizeLayout() {
  const sum = state.layout.board + state.layout.draw + state.layout.history;
  if (!sum) { state.layout = { ...defaultLayout }; return; }
  state.layout.board = (state.layout.board / sum) * 100;
  state.layout.draw = (state.layout.draw / sum) * 100;
  state.layout.history = (state.layout.history / sum) * 100;
}

function applyLayoutVars() {
  document.documentElement.style.setProperty("--board-fr", `${state.layout.board}fr`);
  document.documentElement.style.setProperty("--draw-fr", `${state.layout.draw}fr`);
  document.documentElement.style.setProperty("--history-fr", `${state.layout.history}fr`);
}

function fitBoardToPanel() {
  const rect = boardEl.getBoundingClientRect();
  if (!rect.height || !rect.width) return;

  const rows = 16.3; // 15 números + duas legendas menores.
  const gap = rect.height < 260 ? 1 : rect.height < 380 ? 2 : 4;
  const usableHeight = rect.height - gap * 16;
  const cellH = usableHeight / rows;
  const cellW = rect.width / 5;
  const font = clamp(Math.min(cellH * 0.58, cellW * 0.45), 7, 30);
  const letterFont = clamp(font * 0.86, 7, 24);
  const radius = clamp(Math.min(cellH, cellW) * 0.16, 3, 8);

  document.documentElement.style.setProperty("--board-font", `${font}px`);
  document.documentElement.style.setProperty("--letter-font", `${letterFont}px`);
  document.documentElement.style.setProperty("--cell-gap", `${gap}px`);
  document.documentElement.style.setProperty("--cell-radius", `${radius}px`);
}

function buildBoard() {
  boardEl.innerHTML = "";

  columns.forEach(col => {
    const letterCell = document.createElement("div");
    letterCell.className = "cell letter";
    letterCell.textContent = col.letter;
    boardEl.appendChild(letterCell);
  });

  for (let row = 0; row < 15; row++) {
    columns.forEach(col => {
      const number = col.start + row;
      const cell = document.createElement("div");
      cell.className = "cell number-cell";
      cell.dataset.number = number;
      cell.textContent = padNumber(number);
      cell.addEventListener("click", () => {
        if (!state.manualMode) return;
        toggleManualNumber(number);
      });
      boardEl.appendChild(cell);
    });
  }

  columns.forEach(col => {
    const letterCell = document.createElement("div");
    letterCell.className = "cell letter";
    letterCell.textContent = col.letter;
    boardEl.appendChild(letterCell);
  });
}

function render() {
  const drawnSet = getDrawnSet();
  const last = state.history.at(-1);

  document.querySelectorAll(".number-cell").forEach(cell => {
    const number = Number(cell.dataset.number);
    cell.classList.toggle("drawn", drawnSet.has(number));
  });

  lastNumberEl.textContent = formatCall(last);
  lastNumberEl.classList.toggle("bingo-title", !last);

  const count = state.history.length;
  counterEl.textContent = `${count} / 75`;
  progressFillEl.style.width = `${(count / 75) * 100}%`;

  endMessageEl.classList.toggle("hidden", count < 75);
  statusPillEl.textContent = state.manualMode ? "Manual" : count >= 75 ? "Finalizado" : "Pronto";

  renderRecentHistory();
  renderFullHistory();

  document.body.classList.toggle("history-hidden", !state.historyVisible);
  document.body.classList.toggle("manual-mode", state.manualMode);
  manualBannerEl.classList.toggle("hidden", !state.manualMode);

  document.getElementById("history-toggle-btn").textContent = state.historyVisible ? "Ocultar histórico" : "Mostrar histórico";
  document.getElementById("sound-toggle-btn").textContent = state.soundEnabled ? "Som: ligado" : "Som: desligado";
  document.getElementById("manual-btn").textContent = state.manualMode ? "Sair do manual" : "Manual";

  controlsEl.classList.toggle("hidden-controls", !state.controlsVisible);
  showControlsHotspotEl.classList.toggle("hidden", state.controlsVisible);

  applyLayoutVars();
  saveState();
  requestAnimationFrame(fitBoardToPanel);
}

function renderRecentHistory() {
  recentHistoryEl.innerHTML = "";
  const recent = state.history.slice(-10).reverse();

  if (recent.length === 0) {
    const item = document.createElement("li");
    item.textContent = "—";
    recentHistoryEl.appendChild(item);
    return;
  }

  recent.forEach(number => {
    const item = document.createElement("li");
    item.textContent = formatCall(number);
    recentHistoryEl.appendChild(item);
  });
}

function renderFullHistory() {
  fullHistoryEl.innerHTML = "";

  if (state.history.length === 0) {
    const chip = document.createElement("div");
    chip.className = "history-chip";
    chip.innerHTML = `<span class="draw-order">—</span><span class="draw-call">Nenhum</span>`;
    fullHistoryEl.appendChild(chip);
    return;
  }

  state.history.forEach((number, index) => {
    const chip = document.createElement("div");
    chip.className = "history-chip";

    const order = document.createElement("span");
    order.className = "draw-order";
    order.textContent = formatOrdinal(index);

    const call = document.createElement("span");
    call.className = "draw-call";
    call.textContent = formatCall(number);

    chip.appendChild(order);
    chip.appendChild(call);
    fullHistoryEl.appendChild(chip);
  });
}

function drawNumber() {
  if (state.history.length >= 75) { render(); return; }

  const drawnSet = getDrawnSet();
  const available = [];
  for (let number = 1; number <= 75; number++) if (!drawnSet.has(number)) available.push(number);

  const chosen = available[Math.floor(Math.random() * available.length)];
  state.history.push(chosen);
  if (state.history.length === 1) state.historyVisible = true;

  pulseLastNumber();
  playDrawSound();
  render();
}

function recallLastNumber() {
  if (state.history.length === 0) return;
  pulseLastNumber();
  playDrawSound();
}

function undoLast() {
  if (state.history.length === 0) return;
  state.history.pop();
  if (state.history.length === 0) state.historyVisible = false;
  pulseLastNumber();
  render();
}

function resetGame() {
  const confirmed = confirm("Tem certeza que deseja reiniciar o jogo? Todos os números sorteados serão apagados.");
  if (!confirmed) return;

  state.history = [];
  state.historyVisible = false;
  state.manualMode = false;
  state.layout = { ...defaultLayout };
  controlsEl.classList.remove("more-open");
  localStorage.removeItem(STORAGE_KEY);
  pulseLastNumber();
  render();
}

function toggleManualNumber(number) {
  const index = state.history.indexOf(number);
  if (index >= 0) state.history.splice(index, 1);
  else state.history.push(number);

  if (state.history.length > 0 && !state.historyVisible) state.historyVisible = true;
  if (state.history.length === 0) state.historyVisible = false;

  pulseLastNumber();
  render();
}

function pulseLastNumber() {
  lastNumberEl.classList.remove("pulse");
  void lastNumberEl.offsetWidth;
  lastNumberEl.classList.add("pulse");
}

function playDrawSound() {
  if (!state.soundEnabled) return;

  // Som provisório gerado por JavaScript.
  // Para trocar no futuro por arquivo externo, substitua por:
  // const audio = new Audio("sounds/sorteio.mp3"); audio.play();
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(660, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(990, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.2);
  } catch {}
}

async function requestFullscreen() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
  } catch {
    statusPillEl.textContent = "Tela cheia indisponível";
  }
}

function toggleHistory() { state.historyVisible = !state.historyVisible; render(); }
function toggleSound() { state.soundEnabled = !state.soundEnabled; render(); }
function toggleControls() { state.controlsVisible = !state.controlsVisible; render(); }
function toggleManualMode() { state.manualMode = !state.manualMode; render(); }
function showConference() { renderFullHistory(); conferenceModal.showModal(); }
function closeOpenModal() { document.querySelector("dialog[open]")?.close(); }
function resetLayout() { state.layout = { ...defaultLayout }; render(); }
function toggleMoreControls() {
  controlsEl.classList.toggle("more-open");
  setTimeout(fitBoardToPanel, 50);
}

function showLessControls() {
  controlsEl.classList.remove("more-open");
  setTimeout(fitBoardToPanel, 50);
}

async function requestWakeLock() {
  if (!("wakeLock" in navigator)) return;
  try { wakeLock = await navigator.wakeLock.request("screen"); }
  catch { wakeLock = null; }
}

function setupResizeHandles() {
  const leftHandle = document.getElementById("resize-handle-left");
  const rightHandle = document.getElementById("resize-handle-right");

  function startResize(type, event) {
    event.preventDefault();
    activeResize = { type, startX: event.clientX, startLayout: { ...state.layout } };
    event.currentTarget.classList.add("active");
    document.body.style.cursor = "col-resize";
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function moveResize(event) {
    if (!activeResize) return;

    const rect = screenGridEl.getBoundingClientRect();
    const deltaPercent = ((event.clientX - activeResize.startX) / rect.width) * 100;
    const layout = { ...activeResize.startLayout };

    if (activeResize.type === "left") {
      const board = clamp(layout.board + deltaPercent, 35, 70);
      const diff = board - layout.board;
      const draw = clamp(layout.draw - diff, 24, 60);
      state.layout.board = board;
      state.layout.draw = draw;
      state.layout.history = layout.history;
    }

    if (activeResize.type === "right") {
      const draw = clamp(layout.draw + deltaPercent, 24, 60);
      const diff = draw - layout.draw;
      const history = clamp(layout.history - diff, 8, 22);
      state.layout.board = layout.board;
      state.layout.draw = draw;
      state.layout.history = history;
    }

    normalizeLayout();
    applyLayoutVars();
    fitBoardToPanel();
  }

  function endResize() {
    if (!activeResize) return;
    activeResize = null;
    leftHandle.classList.remove("active");
    rightHandle.classList.remove("active");
    document.body.style.cursor = "";
    saveState();
    fitBoardToPanel();
  }

  leftHandle.addEventListener("pointerdown", event => startResize("left", event));
  rightHandle.addEventListener("pointerdown", event => startResize("right", event));
  window.addEventListener("pointermove", moveResize);
  window.addEventListener("pointerup", endResize);
  window.addEventListener("pointercancel", endResize);
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    requestWakeLock();
    setAppHeight();
  }
});

document.getElementById("draw-btn").addEventListener("click", drawNumber);
document.getElementById("recall-btn").addEventListener("click", recallLastNumber);
document.getElementById("undo-btn").addEventListener("click", undoLast);
document.getElementById("reset-btn").addEventListener("click", resetGame);
document.getElementById("conference-btn").addEventListener("click", showConference);
document.getElementById("manual-btn").addEventListener("click", toggleManualMode);
document.getElementById("reset-layout-btn").addEventListener("click", resetLayout);
document.getElementById("history-toggle-btn").addEventListener("click", toggleHistory);
document.getElementById("sound-toggle-btn").addEventListener("click", toggleSound);
document.getElementById("fullscreen-btn").addEventListener("click", requestFullscreen);
document.getElementById("hide-controls-btn").addEventListener("click", toggleControls);
document.getElementById("more-btn").addEventListener("click", toggleMoreControls);
document.getElementById("less-btn").addEventListener("click", showLessControls);
showControlsHotspotEl.addEventListener("click", toggleControls);

document.querySelectorAll("[data-close-modal]").forEach(btn => btn.addEventListener("click", closeOpenModal));

document.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();
  if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") return;

  if (key === " ") { event.preventDefault(); drawNumber(); }
  if (key === "backspace") { event.preventDefault(); undoLast(); }
  if (key === "f") requestFullscreen();
  if (key === "r") recallLastNumber();
  if (key === "h") toggleHistory();
  if (key === "c") showConference();
  if (key === "m") toggleManualMode();
  if (key === "escape") {
    closeOpenModal();
    controlsEl.classList.remove("more-open");
    if (state.manualMode) { state.manualMode = false; render(); }
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js"));
}

loadState();
buildBoard();
setupResizeHandles();
render();
requestWakeLock();
setTimeout(fitBoardToPanel, 100);
