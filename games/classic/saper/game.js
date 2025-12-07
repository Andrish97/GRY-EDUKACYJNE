const GAME_ID = "neon-minesweeper";

let cols = 16;
let rows = 16;
let numMines = 0;

let grid;
let isGameOver = false;
let isWin = false;
let isFirstClick = true;
let flagsLeft = 0;
let revealedCount = 0;

let timerInterval = null;
let seconds = 0;

// Statystyki zapisane w ArcadeProgress
let bestTime = null; // najlepszy czas wygranej w sekundach
let totalGames = 0; // liczba rozegranych gier

let hasUnsavedChanges = false;
let LAST_SAVE_DATA = null;

// DOM
let canvas;
let ctx;
let minesEl;
let flagsLeftEl;
let timeEl;
let sizeSelect;
let bestTimeEl;
let totalGamesEl;
let newGameBtn;
let saveGameBtn;
let resetRecordBtn;

const tileSize = 28;

const SIZES = {
  small: { cols: 9, rows: 9 },
  medium: { cols: 16, rows: 16 },
  large: { cols: 30, rows: 16 }
};

const MINE_DENSITY = 0.16; // ok. 16% pól

const numberColors = {
  1: "#60a5fa",
  2: "#4ade80",
  3: "#f97373",
  4: "#a855f7",
  5: "#facc15",
  6: "#2dd4bf",
  7: "#fb7185",
  8: "#9ca3af"
};

/* =======================
   PROGRES / STATYSTYKI
   ======================= */

function updateStatsUI() {
  if (!bestTimeEl || !totalGamesEl) return;
  bestTimeEl.textContent =
    typeof bestTime === "number" ? bestTime.toString() : "–";
  totalGamesEl.textContent = totalGames.toString();
}

function buildSavePayload() {
  return {
    stats: {
      bestTime,
      totalGames
    },
    lastState: {
      sizeKey: sizeSelect.value,
      cols,
      rows,
      numMines,
      seconds,
      flagsLeft,
      revealedCount,
      isGameOver,
      isWin,
      isFirstClick,
      grid
    }
  };
}

function loadProgress() {
  if (!window.ArcadeProgress || !ArcadeProgress.load) {
    console.warn("[GAME]", GAME_ID, "Brak ArcadeProgress.load");
    return Promise.resolve();
  }

  return ArcadeProgress.load(GAME_ID)
    .then(function (data) {
      if (!data) {
        updateStatsUI();
        return;
      }

      LAST_SAVE_DATA = data;

      if (data.stats) {
        if (typeof data.stats.bestTime === "number") {
          bestTime = data.stats.bestTime;
        }
        if (typeof data.stats.totalGames === "number") {
          totalGames = data.stats.totalGames;
        }
      }

      updateStatsUI();

      if (data.lastState && data.lastState.grid) {
        restoreGameState(data.lastState);
      }

      hasUnsavedChanges = false;
    })
    .catch(function (err) {
      console.error("[GAME]", GAME_ID, "Błąd load:", err);
    });
}

function saveCurrentSession() {
  if (!window.ArcadeProgress || !ArcadeProgress.save) {
    console.warn("[GAME]", GAME_ID, "Brak ArcadeProgress.save");
    return Promise.resolve();
  }

  const payload = buildSavePayload();

  return ArcadeProgress.save(GAME_ID, payload)
    .then(function () {
      LAST_SAVE_DATA = payload;
      hasUnsavedChanges = false;
      console.log("[GAME]", GAME_ID, "zapisano stan:", payload);
      alert("Stan gry zapisany.");
    })
    .catch(function (err) {
      console.error("[GAME]", GAME_ID, "Błąd save:", err);
      alert("Nie udało się zapisać stanu gry.");
    });
}

function clearProgress() {
  if (!window.ArcadeProgress || !ArcadeProgress.clear) {
    console.warn("[GAME]", GAME_ID, "Brak ArcadeProgress.clear");
    return Promise.resolve();
  }

  return ArcadeProgress.clear(GAME_ID)
    .then(function () {
      LAST_SAVE_DATA = null;
      bestTime = null;
      totalGames = 0;
      updateStatsUI();
      hasUnsavedChanges = false;
      console.log("[GAME]", GAME_ID, "progress wyczyszczony");
    })
    .catch(function (err) {
      console.error("[GAME]", GAME_ID, "Błąd clear:", err);
    });
}

/* =======================
   LOGIKA GRY
   ======================= */

function applyBoardSizeFromSelect() {
  const key = sizeSelect.value;
  const cfg = SIZES[key] || SIZES.medium;
  cols = cfg.cols;
  rows = cfg.rows;

  numMines = Math.max(1, Math.round(cols * rows * MINE_DENSITY));
  flagsLeft = numMines;

  canvas.width = cols * tileSize;
  canvas.height = rows * tileSize;

  minesEl.textContent = numMines;
  flagsLeftEl.textContent = flagsLeft;
}

function createEmptyGrid() {
  const g = [];
  for (let y = 0; y < rows; y++) {
    const row = [];
    for (let x = 0; x < cols; x++) {
      row.push({
        mine: false,
        revealed: false,
        flagged: false,
        adjacent: 0
      });
    }
    g.push(row);
  }
  return g;
}

function inBounds(x, y) {
  return x >= 0 && x < cols && y >= 0 && y < rows;
}

function forEachNeighbor(x, y, fn) {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (inBounds(nx, ny)) {
        fn(nx, ny);
      }
    }
  }
}

function placeMines(excludeX, excludeY) {
  let placed = 0;
  while (placed < numMines) {
    const x = Math.floor(Math.random() * cols);
    const y = Math.floor(Math.random() * rows);

    if (x === excludeX && y === excludeY) continue;
    if (grid[y][x].mine) continue;

    grid[y][x].mine = true;
    placed++;
  }

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x].mine) {
        grid[y][x].adjacent = -1;
        continue;
      }
      let count = 0;
      forEachNeighbor(x, y, (nx, ny) => {
        if (grid[ny][nx].mine) count++;
      });
      grid[y][x].adjacent = count;
    }
  }
}

function startTimer(startFrom = 0) {
  if (timerInterval) clearInterval(timerInterval);
  seconds = startFrom;
  timeEl.textContent = seconds;
  timerInterval = setInterval(() => {
    seconds++;
    timeEl.textContent = seconds;
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function resetGame() {
  stopTimer();
  isGameOver = false;
  isWin = false;
  isFirstClick = true;
  revealedCount = 0;
  seconds = 0;
  timeEl.textContent = seconds;

  applyBoardSizeFromSelect();
  grid = createEmptyGrid();
  draw();
}

function revealCell(x, y) {
  const cell = grid[y][x];
  if (cell.revealed || cell.flagged) return;

  cell.revealed = true;
  revealedCount++;
  hasUnsavedChanges = true;

  if (cell.mine) {
    gameOver(false);
    return;
  }

  if (cell.adjacent === 0) {
    forEachNeighbor(x, y, (nx, ny) => {
      if (
        !grid[ny][nx].revealed &&
        !grid[ny][nx].flagged &&
        !grid[ny][nx].mine
      ) {
        revealCell(nx, ny);
      }
    });
  }

  checkWin();
}

function toggleFlag(x, y) {
  const cell = grid[y][x];
  if (cell.revealed) return;

  if (cell.flagged) {
    cell.flagged = false;
    flagsLeft++;
  } else {
    if (flagsLeft <= 0) return;
    cell.flagged = true;
    flagsLeft--;
  }
  flagsLeftEl.textContent = flagsLeft;
  hasUnsavedChanges = true;
}

function checkWin() {
  const totalCells = cols * rows;
  const safeCells = totalCells - numMines;
  if (revealedCount >= safeCells && !isGameOver) {
    gameOver(true);
  }
}

function gameOver(win) {
  isGameOver = true;
  isWin = win;
  stopTimer();

  // aktualizacja statystyk
  totalGames++;
  if (win) {
    if (bestTime == null || seconds < bestTime) {
      bestTime = seconds;
    }
  }
  updateStatsUI();
  hasUnsavedChanges = true;

  drawOverlay();
}

/* =======================
   RYSOWANIE
   ======================= */

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, "#020617");
  grad.addColorStop(1, "#020617");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(148,163,184,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= cols; x++) {
    ctx.moveTo(x * tileSize + 0.5, 0);
    ctx.lineTo(x * tileSize + 0.5, canvas.height);
  }
  for (let y = 0; y <= rows; y++) {
    ctx.moveTo(0, y * tileSize + 0.5);
    ctx.lineTo(canvas.width, y * tileSize + 0.5);
  }
  ctx.stroke();
}

function drawTileBackground(x, y, revealed) {
  const px = x * tileSize;
  const py = y * tileSize;
  const r = 6;

  ctx.beginPath();
  ctx.moveTo(px + r, py);
  ctx.lineTo(px + tileSize - r, py);
  ctx.quadraticCurveTo(px + tileSize, py, px + tileSize, py + r);
  ctx.lineTo(px + tileSize, py + tileSize - r);
  ctx.quadraticCurveTo(
    px + tileSize,
    py + tileSize,
    px + tileSize - r,
    py + tileSize
  );
  ctx.lineTo(px + r, py + tileSize);
  ctx.quadraticCurveTo(px, py + tileSize, px, py + tileSize - r);
  ctx.lineTo(px, py + r);
  ctx.quadraticCurveTo(px, py, px + r, py);
  ctx.closePath();

  if (revealed) {
    const grad = ctx.createLinearGradient(px, py, px, py + tileSize);
    grad.addColorStop(0, "#0b1220");
    grad.addColorStop(1, "#020617");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "rgba(148,163,184,0.35)";
    ctx.lineWidth = 1.3;
    ctx.stroke();
  } else {
    const grad = ctx.createLinearGradient(px, py, px, py + tileSize);
    grad.addColorStop(0, "#111827");
    grad.addColorStop(1, "#020617");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "rgba(15, 23, 42, 0.9)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawMine(x, y, revealed) {
  const px = x * tileSize + tileSize / 2;
  const py = y * tileSize + tileSize / 2;
  const r = tileSize * 0.28;

  ctx.beginPath();
  ctx.fillStyle = "rgba(239, 68, 68, 0.28)";
  ctx.arc(px, py, r * 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.fillStyle = revealed ? "#f97373" : "#ef4444";
  ctx.arc(px, py, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#020617";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px - r * 1.2, py);
  ctx.lineTo(px + r * 1.2, py);
  ctx.moveTo(px, py - r * 1.2);
  ctx.lineTo(px, py + r * 1.2);
  ctx.stroke();

  ctx.beginPath();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.arc(px - r * 0.4, py - r * 0.4, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawFlag(x, y) {
  const px = x * tileSize;
  const py = y * tileSize;

  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px + tileSize * 0.25, py + tileSize * 0.2);
  ctx.lineTo(px + tileSize * 0.25, py + tileSize * 0.8);
  ctx.stroke();

  ctx.beginPath();
  const grad = ctx.createLinearGradient(
    px + tileSize * 0.25,
    py + tileSize * 0.2,
    px + tileSize * 0.8,
    py + tileSize * 0.5
  );
  grad.addColorStop(0, "#f97316");
  grad.addColorStop(1, "#fb7185");
  ctx.fillStyle = grad;
  ctx.moveTo(px + tileSize * 0.25, py + tileSize * 0.2);
  ctx.lineTo(px + tileSize * 0.75, py + tileSize * 0.35);
  ctx.lineTo(px + tileSize * 0.25, py + tileSize * 0.5);
  ctx.closePath();
  ctx.fill();
}

function drawNumber(x, y, n) {
  if (n <= 0) return;
  const px = x * tileSize + tileSize / 2;
  const py = y * tileSize + tileSize / 2 + 1;

  ctx.fillStyle = numberColors[n] || "#e5e7eb";
  ctx.font = "bold 16px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(n, px, py);
}

function draw() {
  drawBackground();

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = grid[y][x];

      drawTileBackground(x, y, cell.revealed);

      if (cell.revealed) {
        if (cell.mine) {
          drawMine(x, y, true);
        } else if (cell.adjacent > 0) {
          drawNumber(x, y, cell.adjacent);
        }
      } else {
        if (cell.flagged) {
          drawFlag(x, y);
        }
        if (isGameOver && cell.mine && !cell.flagged) {
          drawMine(x, y, false);
        }
      }
    }
  }

  if (isGameOver) {
    drawOverlay();
  }
}

function drawOverlay() {
  ctx.fillStyle = "rgba(15,23,42,0.85)";
  ctx.fillRect(20, canvas.height / 2 - 55, canvas.width - 40, 110);

  ctx.textAlign = "center";
  ctx.fillStyle = "#f9fafb";
  ctx.font = "20px system-ui, sans-serif";
  ctx.fillText(
    isWin ? "You cleared the field!" : "Boom! Game Over",
    canvas.width / 2,
    canvas.height / 2 - 8
  );
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillStyle = "#cbd5f5";
  ctx.fillText(
    "Użyj „Nowa gra”, żeby zagrać ponownie",
    canvas.width / 2,
    canvas.height / 2 + 18
  );
}

/* =======================
   RESTORE Z ZAPISU
   ======================= */

function restoreGameState(state) {
  try {
    if (!state || !state.grid) return;

    if (SIZES[state.sizeKey]) {
      sizeSelect.value = state.sizeKey;
    }

    cols = state.cols;
    rows = state.rows;
    numMines = state.numMines;
    seconds = state.seconds || 0;
    flagsLeft = state.flagsLeft;
    revealedCount = state.revealedCount || 0;
    isGameOver = !!state.isGameOver;
    isWin = !!state.isWin;
    isFirstClick = !!state.isFirstClick;

    grid = state.grid;

    canvas.width = cols * tileSize;
    canvas.height = rows * tileSize;

    minesEl.textContent = numMines;
    flagsLeftEl.textContent = flagsLeft;
    timeEl.textContent = seconds;

    if (!isGameOver && !isFirstClick) {
      startTimer(seconds);
    }

    draw();
  } catch (e) {
    console.error("[GAME]", GAME_ID, "Błąd odtwarzania stanu:", e);
    resetGame();
  }
}

/* =======================
   EVENTY I GUARDY
   ======================= */

function getCellFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  const x = Math.floor(mx / tileSize);
  const y = Math.floor(my / tileSize);

  if (!inBounds(x, y)) return null;
  return { x, y };
}

function setupCanvasEvents() {
  canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });

  canvas.addEventListener("mousedown", (e) => {
    if (isGameOver) return;
    const cellPos = getCellFromEvent(e);
    if (!cellPos) return;

    const { x, y } = cellPos;
    const cell = grid[y][x];

    if (e.button === 2) {
      toggleFlag(x, y);
      draw();
      return;
    }

    if (e.button === 0) {
      if (cell.flagged) return;

      if (isFirstClick) {
        isFirstClick = false;
        placeMines(x, y);
        startTimer(0);
      }

      revealCell(x, y);
      draw();
    }
  });
}

function setupButtons() {
  if (newGameBtn) {
    newGameBtn.addEventListener("click", function () {
      const ok =
        !hasUnsavedChanges ||
        window.confirm(
          "Rozpocząć nową grę? Aktualny postęp tej rozgrywki nie zostanie zapisany (chyba że użyjesz „Zapisz”)."
        );
      if (!ok) return;
      resetGame();
      hasUnsavedChanges = true;
    });
  }

  if (saveGameBtn) {
    saveGameBtn.addEventListener("click", function () {
      saveCurrentSession();
    });
  }

  if (resetRecordBtn) {
    resetRecordBtn.addEventListener("click", function () {
      const ok = window.confirm(
        "Na pewno chcesz zresetować rekord czasu i licznik gier dla tej gry?"
      );
      if (!ok) return;

      bestTime = null;
      totalGames = 0;
      updateStatsUI();

      clearProgress();
    });
  }

  sizeSelect.addEventListener("change", () => {
    resetGame();
    hasUnsavedChanges = true;
  });
}

function setupBeforeUnloadGuard() {
  window.addEventListener("beforeunload", function (e) {
    if (!hasUnsavedChanges) return;
    e.preventDefault();
    e.returnValue = "";
    return "";
  });
}

function setupClickGuard() {
  document.addEventListener("click", function (e) {
    if (!hasUnsavedChanges) return;

    const target = e.target.closest("a,button");
    if (!target) return;

    const href = target.getAttribute("href");
    const isReturnToArcade =
      (href && href.indexOf("arcade.html") !== -1) ||
      target.classList.contains("arcade-back-btn");

    if (isReturnToArcade) {
      const ok = window.confirm(
        "Masz niezapisany postęp. Wyjść bez zapisywania?"
      );
      if (!ok) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  });
}

/* =======================
   INIT
   ======================= */

function initGame() {
  canvas = document.getElementById("game");
  ctx = canvas.getContext("2d");
  minesEl = document.getElementById("mines-count");
  flagsLeftEl = document.getElementById("flags-left");
  timeEl = document.getElementById("time");
  sizeSelect = document.getElementById("size-select");
  bestTimeEl = document.getElementById("best-time");
  totalGamesEl = document.getElementById("total-games");

  newGameBtn = document.getElementById("new-game-btn");
  saveGameBtn = document.getElementById("save-game-btn");
  resetRecordBtn = document.getElementById("reset-record-btn");

  sizeSelect.value = "medium";
  applyBoardSizeFromSelect();
  grid = createEmptyGrid();
  draw();
  updateStatsUI();

  setupCanvasEvents();
  setupButtons();
  setupBeforeUnloadGuard();
  setupClickGuard();

  // wczytaj progres z ArcadeProgress
  loadProgress().finally(function () {
    // Dodaj uniwersalny przycisk powrotu
    if (window.ArcadeUI && ArcadeUI.addBackToArcadeButton) {
      ArcadeUI.addBackToArcadeButton({
        backUrl: "../../../arcade.html"
      });
    }
  });
}

document.addEventListener("DOMContentLoaded", initGame);

