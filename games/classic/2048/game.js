// Neon 2048 – wersja z integracją z Neon Arcade / ArcadeProgress

const GAME_ID = "2048";

const boardSize = 4;
const cellSize = 64;
const gap = 8;
const padding = 8;

// DOM
let boardEl;
let gridBgEl;
let tilesLayerEl;
let scoreEl;
let bestEl;
let gamesPlayedEl;
let statusEl;
let infoEl;
let restartBtn;
let saveBtn;
let resetRecordBtn;

// stan gry
let board = []; // 2D: tile object lub null
let score = 0;
let best = 0;
let totalGames = 0;
let gameOver = false;

// zapis
let hasUnsavedChanges = false;
let LAST_SAVE_DATA = null;

// pomocnicze – pozycja kafelka
function tilePosition(row, col) {
  const x = padding + col * (cellSize + gap);
  const y = padding + row * (cellSize + gap);
  return { x, y };
}

function setupBackground() {
  gridBgEl.innerHTML = "";
  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      const bg = document.createElement("div");
      bg.className = "cell-bg";
      gridBgEl.appendChild(bg);
    }
  }
}

function createEmptyBoard() {
  board = [];
  for (let r = 0; r < boardSize; r++) {
    const row = [];
    for (let c = 0; c < boardSize; c++) {
      row.push(null);
    }
    board.push(row);
  }
  if (tilesLayerEl) {
    tilesLayerEl.innerHTML = "";
  }
}

function updateScore(add) {
  score += add;
  if (scoreEl) scoreEl.textContent = String(score);
  if (score > best) {
    best = score;
    if (bestEl) bestEl.textContent = String(best);
  }
  hasUnsavedChanges = true;
}

function newTile(row, col, value) {
  const el = document.createElement("div");
  el.className = "tile new v" + value;
  el.textContent = value;
  const pos = tilePosition(row, col);
  el.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
  tilesLayerEl.appendChild(el);
  return { row, col, value, el };
}

function addRandomTile() {
  const empty = [];
  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      if (!board[r][c]) empty.push({ r, c });
    }
  }
  if (!empty.length) return;
  const { r, c } = empty[Math.floor(Math.random() * empty.length)];
  const value = Math.random() < 0.9 ? 2 : 4;
  const tile = newTile(r, c, value);
  board[r][c] = tile;
}

function updateTilesView() {
  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      const tile = board[r][c];
      if (!tile) continue;
      tile.row = r;
      tile.col = c;
      tile.el.className = "tile v" + tile.value;
      const pos = tilePosition(r, c);
      tile.el.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
      tile.el.textContent = tile.value;
    }
  }
}

// --- serializacja stanu do zapisu / odczytu ---

function serializeBoard() {
  const data = [];
  for (let r = 0; r < boardSize; r++) {
    const row = [];
    for (let c = 0; c < boardSize; c++) {
      const tile = board[r][c];
      row.push(tile ? tile.value : 0);
    }
    data.push(row);
  }
  return data;
}

function restoreBoardFromData(dataBoard, savedScore) {
  createEmptyBoard();
  score = savedScore || 0;
  if (scoreEl) scoreEl.textContent = String(score);

  if (!Array.isArray(dataBoard)) return;

  for (let r = 0; r < Math.min(boardSize, dataBoard.length); r++) {
    for (let c = 0; c < Math.min(boardSize, dataBoard[r].length); c++) {
      const v = dataBoard[r][c] || 0;
      if (v > 0) {
        const tile = newTile(r, c, v);
        board[r][c] = tile;
      }
    }
  }

  updateTilesView();
}

// --- ruchy ---

function moveLeft() {
  let changed = false;
  let gained = 0;

  for (let r = 0; r < boardSize; r++) {
    const currentRow = board[r];
    const tilesLine = currentRow.filter((t) => t !== null);
    if (!tilesLine.length) continue;

    board[r] = new Array(boardSize).fill(null);
    let targetCol = 0;
    let i = 0;

    while (i < tilesLine.length) {
      let tile = tilesLine[i];

      if (i + 1 < tilesLine.length && tilesLine[i + 1].value === tile.value) {
        let tile2 = tilesLine[i + 1];
        tile.value *= 2;
        gained += tile.value;

        tile2.el.remove();

        if (tile.col !== targetCol || tile.row !== r) changed = true;

        board[r][targetCol] = tile;
        tile.col = targetCol;
        tile.row = r;
        tile.el.classList.add("merged");

        targetCol++;
        i += 2;
      } else {
        if (tile.col !== targetCol || tile.row !== r) changed = true;
        board[r][targetCol] = tile;
        tile.col = targetCol;
        tile.row = r;
        targetCol++;
        i++;
      }
    }
  }

  if (gained > 0) updateScore(gained);
  return changed;
}

function moveRight() {
  let changed = false;
  let gained = 0;

  for (let r = 0; r < boardSize; r++) {
    const currentRow = board[r];
    const tilesLine = [];
    for (let c = boardSize - 1; c >= 0; c--) {
      if (currentRow[c]) tilesLine.push(currentRow[c]);
    }
    if (!tilesLine.length) continue;

    board[r] = new Array(boardSize).fill(null);
    let targetCol = boardSize - 1;
    let i = 0;

    while (i < tilesLine.length) {
      let tile = tilesLine[i];

      if (i + 1 < tilesLine.length && tilesLine[i + 1].value === tile.value) {
        let tile2 = tilesLine[i + 1];
        tile.value *= 2;
        gained += tile.value;

        tile2.el.remove();

        if (tile.col !== targetCol || tile.row !== r) changed = true;

        board[r][targetCol] = tile;
        tile.col = targetCol;
        tile.row = r;
        tile.el.classList.add("merged");

        targetCol--;
        i += 2;
      } else {
        if (tile.col !== targetCol || tile.row !== r) changed = true;
        board[r][targetCol] = tile;
        tile.col = targetCol;
        tile.row = r;
        targetCol--;
        i++;
      }
    }
  }

  if (gained > 0) updateScore(gained);
  return changed;
}

function moveUp() {
  let changed = false;
  let gained = 0;

  for (let c = 0; c < boardSize; c++) {
    const colTiles = [];
    for (let r = 0; r < boardSize; r++) {
      if (board[r][c]) colTiles.push(board[r][c]);
    }
    if (!colTiles.length) continue;

    let targetRow = 0;
    let i = 0;
    const newCol = new Array(boardSize).fill(null);

    while (i < colTiles.length) {
      let tile = colTiles[i];

      if (i + 1 < colTiles.length && colTiles[i + 1].value === tile.value) {
        let tile2 = colTiles[i + 1];
        tile.value *= 2;
        gained += tile.value;

        tile2.el.remove();

        if (tile.row !== targetRow || tile.col !== c) changed = true;

        newCol[targetRow] = tile;
        tile.row = targetRow;
        tile.col = c;
        tile.el.classList.add("merged");

        targetRow++;
        i += 2;
      } else {
        if (tile.row !== targetRow || tile.col !== c) changed = true;

        newCol[targetRow] = tile;
        tile.row = targetRow;
        tile.col = c;
        targetRow++;
        i++;
      }
    }

    for (let r = 0; r < boardSize; r++) {
      board[r][c] = newCol[r];
    }
  }

  if (gained > 0) updateScore(gained);
  return changed;
}

function moveDown() {
  let changed = false;
  let gained = 0;

  for (let c = 0; c < boardSize; c++) {
    const colTiles = [];
    for (let r = boardSize - 1; r >= 0; r--) {
      if (board[r][c]) colTiles.push(board[r][c]);
    }
    if (!colTiles.length) continue;

    let targetRow = boardSize - 1;
    let i = 0;
    const newCol = new Array(boardSize).fill(null);

    while (i < colTiles.length) {
      let tile = colTiles[i];

      if (i + 1 < colTiles.length && colTiles[i + 1].value === tile.value) {
        let tile2 = colTiles[i + 1];
        tile.value *= 2;
        gained += tile.value;

        tile2.el.remove();

        if (tile.row !== targetRow || tile.col !== c) changed = true;

        newCol[targetRow] = tile;
        tile.row = targetRow;
        tile.col = c;
        tile.el.classList.add("merged");

        targetRow--;
        i += 2;
      } else {
        if (tile.row !== targetRow || tile.col !== c) changed = true;

        newCol[targetRow] = tile;
        tile.row = targetRow;
        tile.col = c;
        targetRow--;
        i++;
      }
    }

    for (let r = 0; r < boardSize; r++) {
      board[r][c] = newCol[r];
    }
  }

  if (gained > 0) updateScore(gained);
  return changed;
}

// --- logika końca gry i ruchów ---

function hasMoves() {
  // wolne pola
  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      if (!board[r][c]) return true;
    }
  }
  // możliwe łączenia
  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      const tile = board[r][c];
      if (!tile) continue;
      const v = tile.value;
      if (r + 1 < boardSize && board[r + 1][c] && board[r + 1][c].value === v)
        return true;
      if (c + 1 < boardSize && board[r][c + 1] && board[r][c + 1].value === v)
        return true;
    }
  }
  return false;
}

function checkWinTile() {
  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      const tile = board[r][c];
      if (tile && tile.value === 2048) return true;
    }
  }
  return false;
}

function onGameOver2048() {
  gameOver = true;
  totalGames++;
  if (gamesPlayedEl) gamesPlayedEl.textContent = String(totalGames);
  hasUnsavedChanges = true;
}

function handleMove(dir) {
  if (gameOver) return;

  document.querySelectorAll(".tile.merged").forEach((el) =>
    el.classList.remove("merged")
  );

  let changed = false;
  if (dir === "left") changed = moveLeft();
  else if (dir === "right") changed = moveRight();
  else if (dir === "up") changed = moveUp();
  else if (dir === "down") changed = moveDown();

  if (changed) {
    updateTilesView();
    setTimeout(() => {
      addRandomTile();
      updateTilesView();

      if (checkWinTile()) {
        statusEl.textContent = "Masz 2048! Możesz grać dalej 🙂";
      }
      if (!hasMoves()) {
        statusEl.textContent = "Koniec gry! Brak możliwych ruchów.";
        onGameOver2048();
      }
    }, 130);
  }
}

// --- progres: load/save/clear przez ArcadeProgress ---

async function loadProgress2048() {
  if (!window.ArcadeProgress || !ArcadeProgress.load) {
    best = 0;
    totalGames = 0;
    if (bestEl) bestEl.textContent = "0";
    if (gamesPlayedEl) gamesPlayedEl.textContent = "0";
    return;
  }

  try {
    const saved = await ArcadeProgress.load(GAME_ID);
    if (saved) {
      best = saved.bestScore || 0;
      totalGames = saved.totalGames || 0;
      if (bestEl) bestEl.textContent = String(best);
      if (gamesPlayedEl) gamesPlayedEl.textContent = String(totalGames);

      if (saved.board && Array.isArray(saved.board)) {
        restoreBoardFromData(saved.board, saved.score || 0);
        statusEl.textContent = "Wczytano zapis gry.";
        hasUnsavedChanges = false;
        return;
      }
    } else {
      best = 0;
      totalGames = 0;
    }
  } catch (e) {
    console.error("[2048] loadProgress error:", e);
  }

  if (bestEl) bestEl.textContent = String(best);
  if (gamesPlayedEl) gamesPlayedEl.textContent = String(totalGames);
}

async function saveCurrentSession() {
  if (!window.ArcadeProgress || !ArcadeProgress.save) {
    console.warn("[2048] Brak ArcadeProgress – zapis nieaktywny.");
    return;
  }

  const payload = {
    bestScore: best,
    totalGames: totalGames,
    score: score,
    board: serializeBoard(),
  };

  try {
    await ArcadeProgress.save(GAME_ID, payload);
    LAST_SAVE_DATA = payload;
    hasUnsavedChanges = false;
    statusEl.textContent = "Zapisano grę.";
  } catch (e) {
    console.error("[2048] saveCurrentSession error:", e);
    statusEl.textContent = "Nie udało się zapisać gry.";
  }
}

async function clearProgress2048() {
  if (!window.ArcadeProgress || !ArcadeProgress.clear) {
    best = 0;
    totalGames = 0;
    if (bestEl) bestEl.textContent = "0";
    if (gamesPlayedEl) gamesPlayedEl.textContent = "0";
    score = 0;
    if (scoreEl) scoreEl.textContent = "0";
    resetGame();
    return;
  }

  try {
    await ArcadeProgress.clear(GAME_ID);
  } catch (e) {
    console.error("[2048] clearProgress error:", e);
  }

  best = 0;
  totalGames = 0;
  score = 0;

  if (bestEl) bestEl.textContent = "0";
  if (gamesPlayedEl) gamesPlayedEl.textContent = "0";
  if (scoreEl) scoreEl.textContent = "0";

  hasUnsavedChanges = false;
  resetGame();
}

// --- sterowanie i init ---

function resetGame() {
  score = 0;
  if (scoreEl) scoreEl.textContent = "0";
  statusEl.textContent = "Połącz płytki, aby dojść do 2048!";
  gameOver = false;
  createEmptyBoard();
  addRandomTile();
  addRandomTile();
  updateTilesView();
  hasUnsavedChanges = true;
}

function setupKeyboard() {
  document.addEventListener("keydown", (e) => {
    const key = e.key;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) {
      e.preventDefault();
    }
    if (key === "ArrowLeft" || key === "a" || key === "A") handleMove("left");
    else if (key === "ArrowRight" || key === "d" || key === "D")
      handleMove("right");
    else if (key === "ArrowUp" || key === "w" || key === "W")
      handleMove("up");
    else if (key === "ArrowDown" || key === "s" || key === "S")
      handleMove("down");
  });
}

function setupButtons() {
  const newGameBtn = document.getElementById("new-game-btn");
  saveBtn = document.getElementById("save-game-btn");
  resetRecordBtn = document.getElementById("reset-record-btn");

  if (newGameBtn) {
    newGameBtn.addEventListener("click", () => {
      if (
        hasUnsavedChanges &&
        !window.confirm(
          "Masz niezapisany postęp. Rozpocząć nową grę bez zapisywania?"
        )
      ) {
        return;
      }
      resetGame();
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      saveCurrentSession();
    });
  }

  if (resetRecordBtn) {
    resetRecordBtn.addEventListener("click", () => {
      const ok = window.confirm(
        "Na pewno zresetować rekord i statystyki dla tej gry?"
      );
      if (!ok) return;
      clearProgress2048();
    });
  }
}

function setupBeforeUnloadGuard() {
  window.addEventListener("beforeunload", (e) => {
    if (!hasUnsavedChanges) return;
    e.preventDefault();
    e.returnValue = "";
  });
}

function initArcadeBackButton() {
  if (window.ArcadeUI && ArcadeUI.addBackToArcadeButton) {
    ArcadeUI.addBackToArcadeButton({
      backUrl: "../../../arcade.html",
    });
  }
}

async function initGame2048() {
  boardEl = document.getElementById("board");
  gridBgEl = document.getElementById("grid-bg");
  tilesLayerEl = document.getElementById("tiles-layer");
  scoreEl = document.getElementById("score");
  bestEl = document.getElementById("best");
  gamesPlayedEl = document.getElementById("games-played");
  statusEl = document.getElementById("status");
  infoEl = document.getElementById("info");

  if (!boardEl || !gridBgEl || !tilesLayerEl) {
    console.error("[2048] Brak elementów DOM – sprawdź index.html gry.");
    return;
  }

  setupBackground();
  await loadProgress2048();

  // jeśli nie było zapisu, zacznij nową grę
  if (!tilesLayerEl.children.length) {
    resetGame();
  }

  setupKeyboard();
  setupButtons();
  setupBeforeUnloadGuard();
  initArcadeBackButton();
}

document.addEventListener("DOMContentLoaded", () => {
  initGame2048();
});
