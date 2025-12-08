const GAME_ID = "saper";

// rozmiar kafelka (stały)
const tileSize = 28;

// klasyczne rozmiary plansz
const SIZES = {
  small: { cols: 9, rows: 9 },
  medium: { cols: 16, rows: 16 },
  large: { cols: 30, rows: 16 }
};

// stała gęstość min (proporcjonalnie do wielkości planszy)
const MINE_DENSITY = 0.16; // ok. 16% pól to miny

// stan planszy
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

// statystyki gry
let bestTime = null;   // JEDYNA rzecz zapisywana do ArcadeProgress
let totalGames = 0;    // licznik gier tylko w tej sesji (nie zapisujemy)

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
let resetRecordBtn;

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
   REKORD (persist) + gry (lokalne)
   ======================= */

function updateStatsUI() {
  if (bestTimeEl) {
    bestTimeEl.textContent =
      typeof bestTime === "number" ? bestTime.toString() : "–";
  }
  if (totalGamesEl) {
    totalGamesEl.textContent = totalGames.toString();
  }
}

// zapisujemy TYLKO rekord
function saveBestTime() {
  if (!window.ArcadeProgress || !ArcadeProgress.save) {
    console.warn("[GAME]", GAME_ID, "Brak ArcadeProgress.save");
    return;
  }
  if (bestTime == null) return;

  const payload = { bestTime };

  ArcadeProgress.save(GAME_ID, payload)
    .then(function () {
      console.log("[GAME]", GAME_ID, "rekord zapisany:", payload);
    })
    .catch(function (err) {
      console.error("[GAME]", GAME_ID, "Błąd save:", err);
    });
}

function loadProgress() {
  if (!window.ArcadeProgress || !ArcadeProgress.load) {
    console.warn("[GAME]", GAME_ID, "Brak ArcadeProgress.load");
    updateStatsUI();
    return Promise.resolve();
  }

  return ArcadeProgress.load(GAME_ID)
    .then(function (data) {
      if (data && typeof data.bestTime === "number") {
        bestTime = data.bestTime;
      }
      // totalGames jest tylko sesyjne
      updateStatsUI();
    })
    .catch(function (err) {
      console.error("[GAME]", GAME_ID, "Błąd load:", err);
      updateStatsUI();
    });
}

function clearProgress() {
  // czyścimy rekord w backendzie (jeśli jest), plus lokalnie
  if (!window.ArcadeProgress || !ArcadeProgress.clear) {
    console.warn("[GAME]", GAME_ID, "Brak ArcadeProgress.clear");
    bestTime = null;
    totalGames = 0;
    updateStatsUI();
    return Promise.resolve();
  }

  return ArcadeProgress.clear(GAME_ID)
    .then(function () {
      bestTime = null;
      totalGames = 0;
      updateStatsUI();
      console.log("[GAME]", GAME_ID, "rekord wyczyszczony");
    })
    .catch(function (err) {
      console.error("[GAME]", GAME_ID, "Błąd clear:", err);
    });
}

/* =======================
   LOGIKA PLANSZY
   ======================= */

function applyBoardSizeFromSelect() {
  if (!canvas) return;

  let key = "medium";
  if (sizeSelect && sizeSelect.value) {
    key = sizeSelect.value;
  }

  const cfg = SIZES[key] || SIZES.medium;
  cols = cfg.cols;
  rows = cfg.rows;

  numMines = Math.max(1, Math.round(cols * rows * MINE_DENSITY));
  flagsLeft = numMines;

  canvas.width = cols * tileSize;
  canvas.height = rows * tileSize;

  if (minesEl) minesEl.textContent = numMines;
  if (flagsLeftEl) flagsLeftEl.textContent = flagsLeft;
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

  // policz liczby
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

/* =======================
   TIMER
   ======================= */

function startTimer(startFrom = 0) {
  if (!timeEl) return;

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

/* =======================
   RESET I PRZEBIEG GRY
   ======================= */

function resetGame() {
  stopTimer();
  isGameOver = false;
  isWin = false;
  isFirstClick = true;
  revealedCount = 0;
  seconds = 0;
  if (timeEl) timeEl.textContent = seconds;

  applyBoardSizeFromSelect();
  grid = createEmptyGrid();
  draw();
}

function revealCell(x, y) {
  const cell = grid[y][x];
  if (cell.revealed || cell.flagged) return;

  cell.revealed = true;
  revealedCount++;

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
  if (flagsLeftEl) flagsLeftEl.textContent = flagsLeft;
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

  // licznik gier – tylko lokalnie
  totalGames++;
  updateStatsUI();

  if (win) {
    const previousBest = bestTime;
    if (bestTime == null || seconds < bestTime) {
      bestTime = seconds;
      updateStatsUI();
      // automatyczny zapis nowego rekordu
      saveBestTime();
    } else {
      updateStatsUI();
    }
  }

  drawOverlay();
}

/* =======================
   RYSOWANIE
   ======================= */

function drawBackground() {
  if (!ctx || !canvas) return;

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
  if (!ctx || !canvas) return;

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
  if (!ctx || !canvas) return;

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
   EVENTY
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
  if (!canvas) return;

  canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });

  canvas.addEventListener("mousedown", (e) => {
    if (isGameOver) return;
    const cellPos = getCellFromEvent(e);
    if (!cellPos) return;

    const { x, y } = cellPos;
    const cell = grid[y][x];

    // PPM – flaga
    if (e.button === 2) {
      toggleFlag(x, y);
      draw();
      return;
    }

    // LPM – odkryj
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
      resetGame();
    });
  }

  if (resetRecordBtn) {
    resetRecordBtn.addEventListener("click", function () {
      const ok = window.confirm(
        "Na pewno chcesz zresetować rekord czasu dla tej gry? Licznik gier w tej zakładce też się wyzeruje."
      );
      if (!ok) return;

      clearProgress();
    });
  }

  if (sizeSelect) {
    sizeSelect.addEventListener("change", () => {
      resetGame();
    });
  }
}

/* =======================
   INIT
   ======================= */

function initGame() {
  canvas = document.getElementById("game");
  if (!canvas) {
    console.error("[GAME]", GAME_ID, "Brak elementu <canvas id=\"game\">");
    return;
  }

  ctx = canvas.getContext("2d");
  minesEl = document.getElementById("mines-count");
  flagsLeftEl = document.getElementById("flags-left");
  timeEl = document.getElementById("time");
  sizeSelect = document.getElementById("size-select");
  bestTimeEl = document.getElementById("best-time");
  totalGamesEl = document.getElementById("total-games");

  newGameBtn = document.getElementById("new-game-btn");
  resetRecordBtn = document.getElementById("reset-record-btn");

  if (sizeSelect && !sizeSelect.value) {
    sizeSelect.value = "medium";
  }

  resetGame();
  updateStatsUI();

  setupCanvasEvents();
  setupButtons();

  // wczytujemy tylko rekord
  loadProgress().finally(function () {
    // uniwersalny przycisk „Powrót do Arcade”
    if (window.ArcadeUI && ArcadeUI.addBackToArcadeButton) {
      ArcadeUI.addBackToArcadeButton({
        backUrl: "../../../arcade.html"
      });
    }
  });
}

document.addEventListener("DOMContentLoaded", initGame);
