// games/classic/2048/game.js
// Neon 2048 – pełna logika gry + zapis progresu przez ArcadeProgress

// ----- Konfiguracja gry -----
const GRID_SIZE = 4;
const GAME_ID = "2048";

let board = [];
let score = 0;
let bestScore = 0;
let totalGames = 0;

// śledzenie zapisu
let hasUnsavedChanges = false;
let LAST_SAVE_DATA = null;

// referencje do elementów DOM
let boardEl;
let scoreEl;
let bestScoreEl;
let totalGamesEl;

// ----- Pomocnicze -----
function createEmptyBoard() {
  const grid = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const row = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      row.push(0);
    }
    grid.push(row);
  }
  return grid;
}

function copyBoard(src) {
  return src.map((row) => row.slice());
}

function boardsEqual(a, b) {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (a[r][c] !== b[r][c]) return false;
    }
  }
  return true;
}

// ----- UI planszy -----
function initBoardDOM() {
  boardEl.innerHTML = "";
  const frag = document.createDocumentFragment();

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const cell = document.createElement("div");
      cell.className = "tile";
      cell.dataset.row = String(r);
      cell.dataset.col = String(c);
      frag.appendChild(cell);
    }
  }

  boardEl.appendChild(frag);
}

function updateBoardUI() {
  const cells = boardEl.querySelectorAll(".tile");
  cells.forEach((cell) => {
    const r = parseInt(cell.dataset.row, 10);
    const c = parseInt(cell.dataset.col, 10);
    const value = board[r][c];

    cell.textContent = value > 0 ? String(value) : "";
    cell.className = "tile"; // reset klas

    if (value > 0) {
      cell.classList.add("tile--filled");
      cell.classList.add("tile--" + value);
    }
  });

  if (scoreEl) scoreEl.textContent = String(score);
  if (bestScoreEl) bestScoreEl.textContent = String(bestScore);
  if (totalGamesEl) totalGamesEl.textContent = String(totalGames);
}

// ----- Logika ruchów -----
function getEmptyCells() {
  const empties = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (board[r][c] === 0) {
        empties.push({ r, c });
      }
    }
  }
  return empties;
}

function addRandomTile() {
  const empties = getEmptyCells();
  if (!empties.length) return;

  const idx = Math.floor(Math.random() * empties.length);
  const { r, c } = empties[idx];
  // 90% szans na 2, 10% na 4
  board[r][c] = Math.random() < 0.9 ? 2 : 4;
}

function compressRow(row) {
  // przesuwamy wartości w lewo, usuwając zera
  const filtered = row.filter((v) => v !== 0);
  while (filtered.length < GRID_SIZE) {
    filtered.push(0);
  }
  return filtered;
}

function mergeRow(row) {
  // zakładamy, że row jest już skompresowany
  for (let i = 0; i < GRID_SIZE - 1; i++) {
    if (row[i] !== 0 && row[i] === row[i + 1]) {
      row[i] *= 2;
      score += row[i];
      row[i + 1] = 0;
    }
  }
  return row;
}

function operateRowLeft(row) {
  row = compressRow(row);
  row = mergeRow(row);
  row = compressRow(row);
  return row;
}

function rotateBoardClockwise(b) {
  const res = createEmptyBoard();
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      res[c][GRID_SIZE - 1 - r] = b[r][c];
    }
  }
  return res;
}

function moveLeft() {
  const oldBoard = copyBoard(board);
  for (let r = 0; r < GRID_SIZE; r++) {
    board[r] = operateRowLeft(board[r]);
  }
  if (!boardsEqual(oldBoard, board)) {
    addRandomTile();
    afterSuccessfulMove();
  }
}

function moveRight() {
  const oldBoard = copyBoard(board);
  for (let r = 0; r < GRID_SIZE; r++) {
    board[r].reverse();
    board[r] = operateRowLeft(board[r]);
    board[r].reverse();
  }
  if (!boardsEqual(oldBoard, board)) {
    addRandomTile();
    afterSuccessfulMove();
  }
}

function moveUp() {
  let oldBoard = copyBoard(board);
  // obróć w prawo, rusz w lewo, obróć w lewo
  board = rotateBoardClockwise(board);
  for (let r = 0; r < GRID_SIZE; r++) {
    board[r] = operateRowLeft(board[r]);
  }
  // 3x obrót w prawo = 1x w lewo
  board = rotateBoardClockwise(board);
  board = rotateBoardClockwise(board);
  board = rotateBoardClockwise(board);

  if (!boardsEqual(oldBoard, board)) {
    addRandomTile();
    afterSuccessfulMove();
  }
}

function moveDown() {
  let oldBoard = copyBoard(board);
  // obróć w prawo 3x, rusz w lewo, obróć w prawo
  board = rotateBoardClockwise(board);
  board = rotateBoardClockwise(board);
  board = rotateBoardClockwise(board);

  for (let r = 0; r < GRID_SIZE; r++) {
    board[r] = operateRowLeft(board[r]);
  }

  board = rotateBoardClockwise(board);

  if (!boardsEqual(oldBoard, board)) {
    addRandomTile();
    afterSuccessfulMove();
  }
}

function afterSuccessfulMove() {
  if (score > bestScore) {
    bestScore = score;
  }
  hasUnsavedChanges = true;
  updateBoardUI();

  if (isGameOver()) {
    handleGameOver();
  }
}

function isGameOver() {
  if (getEmptyCells().length > 0) return false;

  // sprawdź sąsiadów
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const v = board[r][c];
      if (r < GRID_SIZE - 1 && v === board[r + 1][c]) return false;
      if (c < GRID_SIZE - 1 && v === board[r][c + 1]) return false;
    }
  }
  return true;
}

function handleGameOver() {
  const overlay = document.getElementById("overlay");
  if (overlay) {
    overlay.classList.remove("overlay--hidden");
  } else {
    alert(
      "Koniec gry!\nWynik: " +
        score +
        (score === 2048 ? "\nGratulacje, osiągnąłeś 2048!" : "")
    );
  }
}

// ----- Zapis progresu (per użytkownik/gość) -----
function buildSavePayload() {
  return {
    score,
    bestScore,
    totalGames,
    board,
  };
}

function saveCurrentSession() {
  if (!window.ArcadeProgress || !ArcadeProgress.save) {
    console.warn("[2048] Brak ArcadeProgress – zapis nieaktywny.");
    return Promise.resolve();
  }

  const payload = buildSavePayload();
  return ArcadeProgress.save(GAME_ID, payload)
    .then(function () {
      LAST_SAVE_DATA = payload;
      hasUnsavedChanges = false;
      console.log("[2048] Progres zapisany:", payload);
    })
    .catch(function (err) {
      console.error("[2048] Nie udało się zapisać progresu:", err);
    });
}

function loadProgress() {
  if (!window.ArcadeProgress || !ArcadeProgress.load) {
    console.warn("[2048] Brak ArcadeProgress – wczytywanie pominięte.");
    return Promise.resolve();
  }

  return ArcadeProgress.load(GAME_ID)
    .then(function (data) {
      if (!data) {
        console.log("[2048] Brak zapisanego progresu – start od zera.");
        return;
      }

      if (typeof data.bestScore === "number") {
        bestScore = data.bestScore;
      }
      if (typeof data.totalGames === "number") {
        totalGames = data.totalGames;
      }
      if (Array.isArray(data.board)) {
        board = data.board.map((row) => row.slice());
      }
      if (typeof data.score === "number") {
        score = data.score;
      }

      LAST_SAVE_DATA = data;
      hasUnsavedChanges = false;
      console.log("[2048] Wczytano progres:", data);
    })
    .catch(function (err) {
      console.error("[2048] Błąd wczytywania progresu:", err);
    });
}

function clearProgress() {
  if (!window.ArcadeProgress || !ArcadeProgress.clear) {
    console.warn("[2048] Brak ArcadeProgress.clear – czyszczenie pominięte.");
    return Promise.resolve();
  }

  return ArcadeProgress.clear(GAME_ID).catch(function (err) {
    console.error("[2048] Błąd czyszczenia progresu:", err);
  });
}

// ----- Sterowanie grą -----
function resetGame() {
  const overlay = document.getElementById("overlay");
  if (overlay) overlay.classList.add("overlay--hidden");

  board = createEmptyBoard();
  score = 0;
  totalGames += 1;
  addRandomTile();
  addRandomTile();
  hasUnsavedChanges = true;
  updateBoardUI();

  const gamesPlayedInfo = document.getElementById("games-played-info");
  if (gamesPlayedInfo) {
    gamesPlayedInfo.textContent = String(totalGames);
  }
}


function handleKeyDown(e) {
  const key = e.key;

  switch (key) {
    case "ArrowLeft":
    case "a":
    case "A":
      e.preventDefault();
      moveLeft();
      break;
    case "ArrowRight":
    case "d":
    case "D":
      e.preventDefault();
      moveRight();
      break;
    case "ArrowUp":
    case "w":
    case "W":
      e.preventDefault();
      moveUp();
      break;
    case "ArrowDown":
    case "s":
    case "S":
      e.preventDefault();
      moveDown();
      break;
    default:
      break;
  }
}

// ostrzeżenie przy zamknięciu / przeładowaniu
function setupBeforeUnloadGuard() {
  window.addEventListener("beforeunload", function (e) {
    if (!hasUnsavedChanges) return;

    e.preventDefault();
    e.returnValue = "";
    return "";
  });
}

// ostrzeżenie przy klikaniu linków do arcade.html
function setupClickGuard() {
  document.addEventListener("click", function (e) {
    if (!hasUnsavedChanges) return;

    const target = e.target.closest("a,button");
    if (!target) return;

    const href = target.getAttribute("href");
    const isBackToArcade =
      (href && href.indexOf("arcade.html") !== -1) ||
      target.dataset.arcadeBack === "1";

    if (isBackToArcade) {
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
// ----- Inicjalizacja gry -----
function initGame2048() {
  boardEl = document.getElementById("board");
  scoreEl = document.getElementById("score");
  bestScoreEl = document.getElementById("best-score");
  totalGamesEl = document.getElementById("total-games");

  if (!boardEl) {
    console.error("[2048] Brak elementu #board – sprawdź index.html gry.");
    return;
  }

  initBoardDOM();

  // wczytaj zapis, potem uruchom nową grę jeśli nie było zapisanej planszy
  loadProgress().then(function () {
    if (!board || !board.length) {
      board = createEmptyBoard();
      addRandomTile();
      addRandomTile();
    }
    updateBoardUI();
  });

  const newGameBtn = document.getElementById("new-game-btn");
  if (newGameBtn) {
    newGameBtn.addEventListener("click", function () {
      const shouldReset =
        !hasUnsavedChanges ||
        window.confirm(
          "Rozpocząć nową grę? Aktualny postęp tej rozgrywki nie zostanie zapisany."
        );
      if (!shouldReset) return;
      resetGame();
    });
  }

  const playAgainBtn = document.getElementById("play-again-btn");
  if (playAgainBtn) {
    playAgainBtn.addEventListener("click", function () {
      const overlay = document.getElementById("overlay");
      if (overlay) overlay.classList.add("overlay--hidden");
      resetGame();
    });
  }

  const saveBtn = document.getElementById("save-game-btn");
  if (saveBtn) {
    saveBtn.addEventListener("click", function () {
      saveCurrentSession();
    });
  }

  const resetRecordBtn = document.getElementById("reset-record-btn");
  if (resetRecordBtn) {
    resetRecordBtn.addEventListener("click", function () {
      const ok = window.confirm(
        "Na pewno chcesz zresetować rekord i statystyki dla tej gry?"
      );
      if (!ok) return;

      bestScore = 0;
      totalGames = 0;
      score = 0;
      board = createEmptyBoard();
      addRandomTile();
      addRandomTile();
      hasUnsavedChanges = true;
      updateBoardUI();

      clearProgress().then(function () {
        LAST_SAVE_DATA = null;
      });
    });
  }

  document.addEventListener("keydown", handleKeyDown);

  setupBeforeUnloadGuard();
  setupClickGuard();
  setupBeforeUnloadGuard();
  setupClickGuard();

  if (window.ArcadeUI && ArcadeUI.addBackToArcadeButton) {
    ArcadeUI.addBackToArcadeButton({
      backUrl: "../../../arcade.html",
    });
  }
}

}

document.addEventListener("DOMContentLoaded", function () {
  try {
    initGame2048();
  } catch (e) {
    console.error("[2048] Krytyczny błąd inicjalizacji gry:", e);
  }
});
