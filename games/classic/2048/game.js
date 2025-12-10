// games/classic/2048/game.js

// ------------------------------------------------------
// Konfiguracja gry 2048
// ------------------------------------------------------
const GAME_ID = "2048";
const GRID_SIZE = 4;

let grid = [];
let score = 0;
let bestScore = 0;
let totalGames = 0;
let sessionCoins = 0;

let hasUnsavedChanges = false;
let LAST_SAVE_DATA = null;

// DOM elementy
let boardEl;
let scoreEl;
let bestScoreEl;
let totalGamesEl;
let gamesPlayedInfoEl;
let overlayEl;
let playAgainBtn;
let newGameBtn;
let saveGameBtn;
let resetRecordBtn;

// ------------------------------------------------------
// Inicjalizacja
// ------------------------------------------------------

document.addEventListener("DOMContentLoaded", initGame2048);

function initGame2048() {
  // Pobierz referencje DOM
  boardEl = document.getElementById("board");
  scoreEl = document.getElementById("score");
  bestScoreEl = document.getElementById("best-score");
  totalGamesEl = document.getElementById("total-games");
  gamesPlayedInfoEl = document.getElementById("games-played-info");
  overlayEl = document.getElementById("overlay");
  playAgainBtn = document.getElementById("play-again-btn");
  newGameBtn = document.getElementById("new-game-btn");
  saveGameBtn = document.getElementById("save-game-btn");
  resetRecordBtn = document.getElementById("reset-record-btn");

  if (!boardEl) {
    console.error("[2048] Brak elementu #board – sprawdź index.html gry.");
    return;
  }

  // Zainicjuj pustą siatkę
  initEmptyGrid();

  // Ładujemy progres (bestScore, totalGames, ewentualnie ostatnią sesję)
  loadProgress().then(() => {
    // Jeśli nie było zapisanej aktywnej sesji – startujemy nową
    if (!restoreLastRunIfAvailable()) {
      startNewGame(false); // false = nie liczymy tego jako rozegraną grę
    }

    updateUI();

    // Eventy
    attachEvents();

    // Klawiatura
    document.addEventListener("keydown", handleKeyDown);

    // Sterowanie dotykiem
    setupTouchControls();

    // Guardy przed utratą postępu
    setupBeforeUnloadGuard();
    setupClickGuard();

    // Przycisk powrotu do Arcade
    if (window.ArcadeUI && ArcadeUI.addBackToArcadeButton) {
      ArcadeUI.addBackToArcadeButton({
        backUrl: "../../../arcade.html",
      });
    }
  });
}

// ------------------------------------------------------
// Siatka i logika 2048
// ------------------------------------------------------

function initEmptyGrid() {
  grid = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      row.push(0);
    }
    grid.push(row);
  }
}

function startNewGame(countAsPlayed = true) {
  score = 0;
  initEmptyGrid();
  hideOverlay();
  spawnRandomTile();
  spawnRandomTile();
  updateBoardView();
  updateUI();

  if (countAsPlayed) {
    totalGames += 1;
    hasUnsavedChanges = true;
    updateUI();
  }
}

function spawnRandomTile() {
  const empty = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (grid[y][x] === 0) {
        empty.push({ x, y });
      }
    }
  }
  if (!empty.length) return;

  const { x, y } = empty[Math.floor(Math.random() * empty.length)];
  // 10% szans na 4
  grid[y][x] = Math.random() < 0.1 ? 4 : 2;
}

function cloneGrid(src) {
  return src.map((row) => row.slice());
}

// Ruch dla pojedynczego wiersza w lewo
function slideRowLeft(row) {
  const filtered = row.filter((v) => v !== 0);
  const result = [];
  let gained = 0;

  for (let i = 0; i < filtered.length; i++) {
    if (filtered[i] === filtered[i + 1]) {
      const merged = filtered[i] * 2;
      result.push(merged);
      gained += merged;
      i++; // pomijamy scaleną parę
    } else {
      result.push(filtered[i]);
    }
  }

  while (result.length < GRID_SIZE) {
    result.push(0);
  }

  return { row: result, gained };
}

// Przekształcenia siatki dla ruchów
function moveLeft() {
  let moved = false;
  let gainedTotal = 0;
  const newGrid = [];

  for (let y = 0; y < GRID_SIZE; y++) {
    const { row, gained } = slideRowLeft(grid[y]);
    newGrid.push(row);
    if (gained > 0 || rowSomeDiff(grid[y], row)) {
      moved = true;
    }
    gainedTotal += gained;
  }

  if (!moved) return false;

  grid = newGrid;
  score += gainedTotal;
  updateAfterMove();
  return true;
}

function moveRight() {
  let moved = false;
  let gainedTotal = 0;
  const newGrid = [];

  for (let y = 0; y < GRID_SIZE; y++) {
    const reversed = grid[y].slice().reverse();
    const { row, gained } = slideRowLeft(reversed);
    const restored = row.slice().reverse();
    newGrid.push(restored);
    if (gained > 0 || rowSomeDiff(grid[y], restored)) {
      moved = true;
    }
    gainedTotal += gained;
  }

  if (!moved) return false;

  grid = newGrid;
  score += gainedTotal;
  updateAfterMove();
  return true;
}

function moveUp() {
  let moved = false;
  let gainedTotal = 0;
  const newGrid = cloneGrid(grid);

  for (let x = 0; x < GRID_SIZE; x++) {
    const col = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      col.push(grid[y][x]);
    }
    const { row, gained } = slideRowLeft(col);
    for (let y = 0; y < GRID_SIZE; y++) {
      newGrid[y][x] = row[y];
    }
    if (gained > 0 || colSomeDiff(col, row)) {
      moved = true;
    }
    gainedTotal += gained;
  }

  if (!moved) return false;

  grid = newGrid;
  score += gainedTotal;
  updateAfterMove();
  return true;
}

function moveDown() {
  let moved = false;
  let gainedTotal = 0;
  const newGrid = cloneGrid(grid);

  for (let x = 0; x < GRID_SIZE; x++) {
    const col = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      col.push(grid[y][x]);
    }
    const reversed = col.slice().reverse();
    const { row, gained } = slideRowLeft(reversed);
    const restored = row.slice().reverse();
    for (let y = 0; y < GRID_SIZE; y++) {
      newGrid[y][x] = restored[y];
    }
    if (gained > 0 || colSomeDiff(col, restored)) {
      moved = true;
    }
    gainedTotal += gained;
  }

  if (!moved) return false;

  grid = newGrid;
  score += gainedTotal;
  updateAfterMove();
  return true;
}

function rowSomeDiff(a, b) {
  for (let i = 0; i < GRID_SIZE; i++) {
    if (a[i] !== b[i]) return true;
  }
  return false;
}

function colSomeDiff(a, b) {
  // a i b mają długość GRID_SIZE
  for (let i = 0; i < GRID_SIZE; i++) {
    if (a[i] !== b[i]) return true;
  }
  return false;
}

function updateAfterMove() {
  // aktualizacja bestScore
  if (score > bestScore) {
    bestScore = score;
  }
  hasUnsavedChanges = true;
  spawnRandomTile();
  updateBoardView();
  updateUI();
  checkGameOver();
}

function canMove() {
  // wolne pola?
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (grid[y][x] === 0) return true;
    }
  }

  // sąsiedzi tacy sami?
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const v = grid[y][x];
      if (x + 1 < GRID_SIZE && grid[y][x + 1] === v) return true;
      if (y + 1 < GRID_SIZE && grid[y + 1][x] === v) return true;
    }
  }

  return false;
}

function checkGameOver() {
  if (!canMove()) {
    // koniec gry
    totalGames += 1;
    hasUnsavedChanges = true;

    // prosty przelicznik: 1 moneta za ukończoną grę + bonus za wysoki wynik
    const base = 1;
    const bonus = Math.floor(score / 256); // np. 1 moneta co 256 punktów
    const coinsToAdd = base + bonus;
    awardCoins(coinsToAdd, "game_over");

    showOverlay();
    updateUI();
  }
}


// ------------------------------------------------------
// Widok planszy
// ------------------------------------------------------

function updateBoardView() {
  // prosto: budujemy siatkę od zera
  boardEl.innerHTML = "";

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const v = grid[y][x];
      const tile = document.createElement("div");
      tile.classList.add("tile");
      if (v > 0) {
        tile.classList.add("tile--filled");
        tile.classList.add("tile--" + v);
        tile.textContent = String(v);
      }
      boardEl.appendChild(tile);
    }
  }
}

function showOverlay() {
  if (!overlayEl) return;
  overlayEl.classList.remove("overlay--hidden");
}

function hideOverlay() {
  if (!overlayEl) return;
  overlayEl.classList.add("overlay--hidden");
}

// ------------------------------------------------------
// UI i statystyki
// ------------------------------------------------------

function updateUI() {
  if (scoreEl) scoreEl.textContent = String(score);
  if (bestScoreEl) bestScoreEl.textContent = String(bestScore);
  if (totalGamesEl) totalGamesEl.textContent = String(totalGames);
  if (gamesPlayedInfoEl) {
    gamesPlayedInfoEl.textContent = String(totalGames);
  }
}

// ------------------------------------------------------
// Sterowanie: klawiatura i dotyk
// ------------------------------------------------------

function handleDirection(direction) {
  switch (direction) {
    case "left":
      moveLeft();
      break;
    case "right":
      moveRight();
      break;
    case "up":
      moveUp();
      break;
    case "down":
      moveDown();
      break;
  }
}

function handleKeyDown(e) {
  const key = e.key;
  let direction = null;

  switch (key) {
    case "ArrowUp":
    case "w":
    case "W":
      direction = "up";
      break;
    case "ArrowDown":
    case "s":
    case "S":
      direction = "down";
      break;
    case "ArrowLeft":
    case "a":
    case "A":
      direction = "left";
      break;
    case "ArrowRight":
    case "d":
    case "D":
      direction = "right";
      break;
    default:
      return;
  }

  e.preventDefault();
  handleDirection(direction);
}

// Sterowanie dotykiem (swipe tylko na planszy)

let touchStartX = null;
let touchStartY = null;
let touchStartTime = 0;

const SWIPE_THRESHOLD = 30; // minimalny ruch w px
const SWIPE_MAX_TIME = 500; // maksymalny czas gestu w ms

function setupTouchControls() {
  if (!boardEl) return;

  boardEl.addEventListener(
    "touchstart",
    function (e) {
      if (!e.touches || e.touches.length === 0) return;
      const t = e.touches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      touchStartTime = Date.now();
    },
    { passive: true }
  );

  boardEl.addEventListener("touchend", function (e) {
    if (touchStartX === null || touchStartY === null) return;
    if (!e.changedTouches || e.changedTouches.length === 0) return;

    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    const dt = Date.now() - touchStartTime;

    touchStartX = null;
    touchStartY = null;

    if (dt > SWIPE_MAX_TIME) return;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;

    let direction = null;
    if (Math.abs(dx) > Math.abs(dy)) {
      direction = dx > 0 ? "right" : "left";
    } else {
      direction = dy > 0 ? "down" : "up";
    }

    if (direction) {
      e.preventDefault();
      handleDirection(direction);
    }
  });
}

// ------------------------------------------------------
// Przyciski: nowa gra, zapis, reset rekordu
// ------------------------------------------------------

function attachEvents() {
  if (playAgainBtn) {
    playAgainBtn.addEventListener("click", function () {
      // Overlay już oznacza zakończoną grę → nowa rozgrywka
      hideOverlay();
      startNewGame(true);
    });
  }

  if (newGameBtn) {
    newGameBtn.addEventListener("click", function () {
      const ok =
        !hasUnsavedChanges ||
        window.confirm(
          "Rozpocząć nową grę? Aktualny postęp tej rozgrywki może nie być zapisany."
        );
      if (!ok) return;
      hideOverlay();
      startNewGame(true);
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
        "Na pewno chcesz zresetować rekord i statystyki dla tej gry?"
      );
      if (!ok) return;

      bestScore = 0;
      totalGames = 0;
      score = 0;
      initEmptyGrid();
      hideOverlay();
      spawnRandomTile();
      spawnRandomTile();
      updateBoardView();
      updateUI();

      clearProgress();
    });
  }
}

// ------------------------------------------------------
// Progres – ArcadeProgress
// ------------------------------------------------------

function buildSavePayload(hasEnded) {
  return {
    bestScore: bestScore,
    totalGames: totalGames,
    lastRun: {
      grid: grid,
      score: score,
      hasEnded: !!hasEnded,
    },
  };
}

function saveCurrentSession() {
  if (!window.ArcadeProgress || !ArcadeProgress.save) {
    console.warn("[2048] Brak ArcadeProgress.save – zapis pominięty.");
    return Promise.resolve();
  }

  const isEnded = overlayEl && !overlayEl.classList.contains("overlay--hidden");
  const payload = buildSavePayload(isEnded);

  return ArcadeProgress.save(GAME_ID, payload)
    .then(() => {
      LAST_SAVE_DATA = payload;
      hasUnsavedChanges = false;
      console.log("[2048] Zapisano progres:", payload);
    })
    .catch((err) => {
      console.error("[2048] Błąd zapisu progresu:", err);
    });
}

function loadProgress() {
  if (!window.ArcadeProgress || !ArcadeProgress.load) {
    console.warn("[2048] Brak ArcadeProgress.load – wczytywanie pominięte.");
    return Promise.resolve();
  }

  return ArcadeProgress.load(GAME_ID)
    .then((data) => {
      if (!data) return;

      if (typeof data.bestScore === "number") bestScore = data.bestScore;
      if (typeof data.totalGames === "number") totalGames = data.totalGames;

      LAST_SAVE_DATA = data;
      hasUnsavedChanges = false;
      console.log("[2048] Wczytano progres:", data);
    })
    .catch((err) => {
      console.error("[2048] Błąd wczytywania progresu:", err);
    });
}

function clearProgress() {
  if (!window.ArcadeProgress || !ArcadeProgress.clear) {
    console.warn("[2048] Brak ArcadeProgress.clear – czyszczenie pominięte.");
    return Promise.resolve();
  }

  return ArcadeProgress.clear(GAME_ID)
    .then(() => {
      LAST_SAVE_DATA = null;
      hasUnsavedChanges = false;
      console.log("[2048] Progres wyczyszczony.");
    })
    .catch((err) => {
      console.error("[2048] Błąd czyszczenia progresu:", err);
    });
}

function restoreLastRunIfAvailable() {
  if (!LAST_SAVE_DATA || !LAST_SAVE_DATA.lastRun) return false;

  const last = LAST_SAVE_DATA.lastRun;
  if (!Array.isArray(last.grid) || typeof last.score !== "number") {
    return false;
  }

  grid = last.grid.map((row) => row.slice());
  score = last.score;

  if (last.hasEnded) {
    showOverlay();
  } else {
    hideOverlay();
  }

  hasUnsavedChanges = false;
  updateBoardView();
  return true;
}

function awardCoins(amount, reason) {
  const n = Math.floor(Number(amount) || 0);
  if (n <= 0) return;

  sessionCoins += n;

  if (!window.ArcadeCoins || !ArcadeCoins.addForGame) {
    console.warn(
      "[2048] ArcadeCoins niedostępne – przyznano tylko lokalnie:",
      n
    );
    return;
  }

  ArcadeCoins.addForGame(GAME_ID, n, {
    reason: reason || "game_event",
    score,
    timestamp: Date.now(),
  })
    .then((newBalance) => {
      console.log(
        "[2048] Przyznano monety:",
        n,
        "Nowe saldo w portfelu:",
        newBalance
      );

      // odśwież pasek, jeśli jest
      if (
        window.ArcadeAuthUI &&
        typeof ArcadeAuthUI.refreshCoins === "function"
      ) {
        ArcadeAuthUI.refreshCoins();
      }
    })
    .catch((err) => {
      console.error("[2048] Błąd przyznawania monet:", err);
    });
}


// ------------------------------------------------------
// Guardy: niezapisany postęp
// ------------------------------------------------------

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

    const target = e.target.closest("a, button");
    if (!target) return;

    const href = target.getAttribute("href");
    const isBackToArcade =
      (href && href.indexOf("arcade.html") !== -1) ||
      target.classList.contains("arcade-back-btn");

    if (!isBackToArcade) return;

    const ok = window.confirm(
      "Masz niezapisany postęp w tej grze. Wyjść bez zapisywania?"
    );
    if (!ok) {
      e.preventDefault();
      e.stopPropagation();
    }
  });
}
