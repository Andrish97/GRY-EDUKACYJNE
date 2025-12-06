// games/classic/2048/game.js

(function () {
  const GRID_SIZE = 4;
  const STORAGE_ID = "2048";
  var hasUnsavedChanges = false;
  var LAST_SAVE_DATA = null; // opcjonalnie, gdybyś chciał kiedyś sprawdzać różnice
  var GAME_ID = "2048";


  let board = [];
  let score = 0;
  let bestScore = 0;
  let totalGames = 0;
  let hasWon = false;

  let boardEl;
  let scoreEl;
  let bestScoreEl;
  let gamesPlayedEl;
  let messageEl;
  let overlayTitleEl;
  let overlayTextEl;
  let overlayRestartBtn;
  let newGameBtn;

  function initDomRefs() {
    boardEl = document.getElementById("game-board");
    scoreEl = document.getElementById("score-value");
    bestScoreEl = document.getElementById("best-score-value");
    gamesPlayedEl = document.getElementById("games-played-info");
    messageEl = document.getElementById("game-message");
    overlayTitleEl = document.getElementById("overlay-title");
    overlayTextEl = document.getElementById("overlay-text");
    overlayRestartBtn = document.getElementById("overlay-restart-btn");
    newGameBtn = document.getElementById("new-game-btn");
  }

  function createEmptyBoard() {
    board = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      const row = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        row.push(0);
      }
      board.push(row);
    }
  }

  function getEmptyCells() {
    const cells = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (board[r][c] === 0) {
          cells.push({ r, c });
        }
      }
    }
    return cells;
  }

  function addRandomTile() {
    const emptyCells = getEmptyCells();
    if (emptyCells.length === 0) return;

    const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const value = Math.random() < 0.9 ? 2 : 4;
    board[r][c] = value;
  }

  function slideAndCombine(line) {
    // usuń zera
    const filtered = line.filter((v) => v !== 0);

    let combined = [];
    let gainedScore = 0;

    for (let i = 0; i < filtered.length; i++) {
      if (filtered[i] === filtered[i + 1]) {
        const newValue = filtered[i] * 2;
        combined.push(newValue);
        gainedScore += newValue;
        i++; // przeskocz scalony kafelek
      } else {
        combined.push(filtered[i]);
      }
    }

    // dopełnij zerami
    while (combined.length < GRID_SIZE) {
      combined.push(0);
    }

    return { line: combined, gainedScore };
  }

  function moveLeft() {
    let moved = false;
    let totalGained = 0;

    for (let r = 0; r < GRID_SIZE; r++) {
      const row = board[r];
      const { line, gainedScore } = slideAndCombine(row);
      if (!arraysEqual(line, row)) {
        moved = true;
        board[r] = line;
      }
      totalGained += gainedScore;
    }

    if (totalGained > 0) {
      score += totalGained;
      if (score > bestScore) bestScore = score;
    }

    return moved;
  }

  function moveRight() {
    let moved = false;
    let totalGained = 0;

    for (let r = 0; r < GRID_SIZE; r++) {
      const reversed = [...board[r]].reverse();
      const { line, gainedScore } = slideAndCombine(reversed);
      const restored = line.reverse();

      if (!arraysEqual(restored, board[r])) {
        moved = true;
        board[r] = restored;
      }
      totalGained += gainedScore;
    }

    if (totalGained > 0) {
      score += totalGained;
      if (score > bestScore) bestScore = score;
    }

    return moved;
  }

  function moveUp() {
    let moved = false;
    let totalGained = 0;

    for (let c = 0; c < GRID_SIZE; c++) {
      const column = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        column.push(board[r][c]);
      }

      const { line, gainedScore } = slideAndCombine(column);

      for (let r = 0; r < GRID_SIZE; r++) {
        if (board[r][c] !== line[r]) {
          moved = true;
          board[r][c] = line[r];
        }
      }

      totalGained += gainedScore;
    }

    if (totalGained > 0) {
      score += totalGained;
      if (score > bestScore) bestScore = score;
    }

    return moved;
  }

  function moveDown() {
    let moved = false;
    let totalGained = 0;

    for (let c = 0; c < GRID_SIZE; c++) {
      const column = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        column.push(board[r][c]);
      }

      const reversed = column.reverse();
      const { line, gainedScore } = slideAndCombine(reversed);
      const restored = line.reverse();

      for (let r = 0; r < GRID_SIZE; r++) {
        if (board[r][c] !== restored[r]) {
          moved = true;
          board[r][c] = restored[r];
        }
      }

      totalGained += gainedScore;
    }

    if (totalGained > 0) {
      score += totalGained;
      if (score > bestScore) bestScore = score;
    }

    return moved;
  }

  function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  function isBoardFull() {
    return getEmptyCells().length === 0;
  }

  function hasMovesAvailable() {
    if (!isBoardFull()) return true;

    // sprawdź poziomo
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE - 1; c++) {
        if (board[r][c] === board[r][c + 1]) return true;
      }
    }

    // sprawdź pionowo
    for (let c = 0; c < GRID_SIZE; c++) {
      for (let r = 0; r < GRID_SIZE - 1; r++) {
        if (board[r][c] === board[r + 1][c]) return true;
      }
    }

    return false;
  }

  function checkWin() {
    if (hasWon) return;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (board[r][c] >= 2048) {
          hasWon = true;
          showOverlay("Gratulacje!", "Osiągnąłeś 2048! Możesz grać dalej dla lepszego wyniku.");
          return;
        }
      }
    }
  }

  function checkGameOver() {
    if (!hasMovesAvailable()) {
      showOverlay("Koniec gry", "Brak możliwych ruchów. Spróbuj jeszcze raz!");
      totalGames++;
      updateGamesPlayedInfo();
      saveProgress();
    }
  }

  function renderBoardGrid() {
    boardEl.innerHTML = "";

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const tile = document.createElement("div");
        tile.classList.add("tile");
        tile.dataset.pos = `${r}-${c}`;
        boardEl.appendChild(tile);
      }
    }
  }

  function updateBoardView() {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const tile = boardEl.querySelector(`[data-pos="${r}-${c}"]`);
        const value = board[r][c];

        tile.textContent = value === 0 ? "" : value;
        tile.className = "tile"; // reset klas

        if (value > 0) {
          tile.classList.add("tile--filled");
          tile.classList.add("tile--" + value);
        }
      }
    }

    scoreEl.textContent = score;
    bestScoreEl.textContent = bestScore;
  }

  function updateGamesPlayedInfo() {
    if (!gamesPlayedEl) return;
    gamesPlayedEl.textContent =
      totalGames > 0
        ? `Rozegrane partie: ${totalGames}`
        : "Rozegraj swoją pierwszą partię!";
  }

  function resetGame() {
    hideOverlay();
    score = 0;
    hasWon = false;

    createEmptyBoard();
    addRandomTile();
    addRandomTile();
    updateBoardView();
    saveProgress(); // od razu zapisujemy, żeby odświeżyć np. rekord po resecie
  }

  function showOverlay(title, text) {
    overlayTitleEl.textContent = title;
    overlayTextEl.textContent = text;
    messageEl.classList.remove("overlay--hidden");
  }

  function hideOverlay() {
    messageEl.classList.add("overlay--hidden");
  }

  function handleMove(direction) {
    let moved = false;

    switch (direction) {
      case "left":
        moved = moveLeft();
        break;
      case "right":
        moved = moveRight();
        break;
      case "up":
        moved = moveUp();
        break;
      case "down":
        moved = moveDown();
        break;
    }

    if (!moved) return;

    addRandomTile();
    updateBoardView();
    checkWin();
    checkGameOver();
    saveProgress();
  }

  function setupKeyboardControls() {
    window.addEventListener("keydown", (e) => {
      let handled = true;

      switch (e.key) {
        case "ArrowLeft":
          handleMove("left");
          break;
        case "ArrowRight":
          handleMove("right");
          break;
        case "ArrowUp":
          handleMove("up");
          break;
        case "ArrowDown":
          handleMove("down");
          break;
        default:
          handled = false;
      }

      if (handled) {
        e.preventDefault();
      }
    });
  }

  function setupTouchControls() {
    let startX = 0;
    let startY = 0;
    let isTouching = false;

    const threshold = 30; // minimalna odległość w px

    boardEl.addEventListener("touchstart", (e) => {
      if (e.touches.length !== 1) return;
      isTouching = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    });

    boardEl.addEventListener("touchmove", (e) => {
      if (!isTouching) return;
      e.preventDefault(); // żeby nie przewijać strony
    });

    boardEl.addEventListener("touchend", (e) => {
      if (!isTouching) return;
      isTouching = false;

      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;

      const dx = endX - startX;
      const dy = endY - startY;

      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

      if (Math.abs(dx) > Math.abs(dy)) {
        // poziomo
        if (dx > 0) {
          handleMove("right");
        } else {
          handleMove("left");
        }
      } else {
        // pionowo
        if (dy > 0) {
          handleMove("down");
        } else {
          handleMove("up");
        }
      }
    });
  }

  async function loadProgress() {
    try {
      const save = await ArcadeProgress.load(STORAGE_ID);
      if (save) {
        if (typeof save.bestScore === "number") {
          bestScore = save.bestScore;
        }
        if (typeof save.totalGames === "number") {
          totalGames = save.totalGames;
        }
      }
    } catch (err) {
      console.error("Nie udało się wczytać progresu 2048:", err);
    }
  }

  async function saveProgress() {
    try {
      await ArcadeProgress.save(STORAGE_ID, {
        bestScore,
        totalGames,
      });
    } catch (err) {
      console.error("Nie udało się zapisać progresu 2048:", err);
    }
  }

  async function initGame() {
    initDomRefs();

    // wczytaj progres użytkownika
    await loadProgress();
    updateGamesPlayedInfo();

    renderBoardGrid();
    resetGame();
    setupKeyboardControls();
    setupTouchControls();

    newGameBtn.addEventListener("click", () => {
      totalGames++;
      updateGamesPlayedInfo();
      resetGame();
    });

    overlayRestartBtn.addEventListener("click", () => {
      totalGames++;
      updateGamesPlayedInfo();
      resetGame();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initGame().catch((err) => {
      console.error("Błąd inicjalizacji 2048:", err);
    });
  });
})();
