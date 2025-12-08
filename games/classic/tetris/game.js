const GAME_ID = "neon-tetris";

let hasUnsavedChanges = false;
let LAST_SAVE_DATA = null;

// Statystyki "meta"
let bestScore = 0;
let totalGames = 0;
let hasSavedGame = false;

// DOM – statystyki
let scoreEl;
let levelEl;
let linesEl;
let bestScoreEl;
let totalGamesEl;
let gamesPlayedInfoEl;

// DOM – overlay i przyciski
let overlayEl;
let overlayNewGameBtn;
let pauseBtn;

// Sterowanie dotykowe
let btnLeft, btnRight, btnRotate, btnSoftDrop, btnHardDrop;

// Canvas
let canvas;
let ctx;

// Grid
const cols = 10;
const rows = 20;
const tileSize = 24;

// Prędkość / poziom
let baseSpeed = 800; // ms
const minSpeed = 120;
const speedStep = 70;
const linesPerLevel = 10;

// Stan gry
let board;
let currentPiece;
let nextPiece;
let fallTimer = 0;
let fallSpeed = baseSpeed;
let lastTime = 0;
let score = 0;
let linesCleared = 0;
let level = 1;
let isGameOver = false;
let isPaused = false;
let animationId;

// Tetromina
const TETROMINOS = [
  {
    name: "I",
    color: "#38bdf8",
    rotations: [
      [
        { x: -1, y: 0 },
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 }
      ],
      [
        { x: 1, y: -1 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 1, y: 2 }
      ],
      [
        { x: -1, y: 1 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 }
      ],
      [
        { x: 0, y: -1 },
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: 2 }
      ]
    ]
  },
  {
    name: "O",
    color: "#facc15",
    rotations: [
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 }
      ],
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 }
      ],
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 }
      ],
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 }
      ]
    ]
  },
  {
    name: "T",
    color: "#a855f7",
    rotations: [
      [
        { x: -1, y: 0 },
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 }
      ],
      [
        { x: 0, y: -1 },
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 0 }
      ],
      [
        { x: -1, y: 0 },
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: -1 }
      ],
      [
        { x: 0, y: -1 },
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: -1, y: 0 }
      ]
    ]
  },
  {
    name: "L",
    color: "#f97316",
    rotations: [
      [
        { x: -1, y: 0 },
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: -1, y: 1 }
      ],
      [
        { x: 0, y: -1 },
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 }
      ],
      [
        { x: -1, y: 0 },
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: -1 }
      ],
      [
        { x: 0, y: -1 },
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: -1, y: -1 }
      ]
    ]
  },
  {
    name: "J",
    color: "#3b82f6",
    rotations: [
      [
        { x: -1, y: 0 },
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 }
      ],
      [
        { x: 0, y: -1 },
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: -1 }
      ],
      [
        { x: -1, y: 0 },
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: -1, y: -1 }
      ],
      [
        { x: 0, y: -1 },
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: -1, y: 1 }
      ]
    ]
  },
  {
    name: "S",
    color: "#22c55e",
    rotations: [
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: -1, y: 1 },
        { x: 0, y: 1 }
      ],
      [
        { x: 0, y: -1 },
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 }
      ],
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: -1, y: 1 },
        { x: 0, y: 1 }
      ],
      [
        { x: 0, y: -1 },
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 }
      ]
    ]
  },
  {
    name: "Z",
    color: "#ef4444",
    rotations: [
      [
        { x: -1, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 }
      ],
      [
        { x: 1, y: -1 },
        { x: 1, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 1 }
      ],
      [
        { x: -1, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 }
      ],
      [
        { x: 1, y: -1 },
        { x: 1, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 1 }
      ]
    ]
  }
];

function createEmptyBoard() {
  const b = [];
  for (let y = 0; y < rows; y++) {
    const row = new Array(cols).fill(null);
    b.push(row);
  }
  return b;
}

function randomTetromino() {
  const t = TETROMINOS[Math.floor(Math.random() * TETROMINOS.length)];
  return {
    type: t,
    rotation: 0,
    x: Math.floor(cols / 2) - 1,
    y: 0
  };
}

function getBlocks(piece) {
  return piece.type.rotations[piece.rotation].map(o => ({
    x: piece.x + o.x,
    y: piece.y + o.y
  }));
}

function collides(piece, offsetX = 0, offsetY = 0, rotationOffset = 0) {
  const newRotation = (piece.rotation + rotationOffset + 4) % 4;
  const shape = piece.type.rotations[newRotation];
  for (let i = 0; i < shape.length; i++) {
    const bx = piece.x + shape[i].x + offsetX;
    const by = piece.y + shape[i].y + offsetY;

    if (bx < 0 || bx >= cols || by >= rows) {
      return true;
    }
    if (by >= 0 && board[by][bx]) {
      return true;
    }
  }
  return false;
}

function lockPiece() {
  const blocks = getBlocks(currentPiece);
  const color = currentPiece.type.color;
  for (const b of blocks) {
    if (b.y >= 0 && b.y < rows && b.x >= 0 && b.x < cols) {
      board[b.y][b.x] = color;
    }
  }
  clearLines();
  spawnPiece();
  hasUnsavedChanges = true;
}

function clearLines() {
  let lines = 0;
  for (let y = rows - 1; y >= 0; y--) {
    if (board[y].every(cell => cell !== null)) {
      board.splice(y, 1);
      board.unshift(new Array(cols).fill(null));
      lines++;
      y++;
    }
  }

  if (lines > 0) {
    linesCleared += lines;
    const lineScore = [0, 40, 100, 300, 1200][lines] || 0;
    score += lineScore * level;

    const newLevel = Math.floor(linesCleared / linesPerLevel) + 1;
    if (newLevel > level) {
      level = newLevel;
      fallSpeed = Math.max(minSpeed, baseSpeed - (level - 1) * speedStep);
    }

    updateUI();
    hasUnsavedChanges = true;
  }
}

function spawnPiece() {
  currentPiece = nextPiece || randomTetromino();
  currentPiece.x = Math.floor(cols / 2) - 1;
  currentPiece.y = 0;
  nextPiece = randomTetromino();

  if (collides(currentPiece)) {
    gameOver();
  }
}

function gameOver() {
  isGameOver = true;
  cancelAnimationFrame(animationId);
  draw();

  if (score > bestScore) {
    bestScore = score;
  }
  totalGames += 1;
  updateMetaUI();
  hasUnsavedChanges = true;

  if (overlayEl) {
    overlayEl.classList.remove("overlay--hidden");
  }
}

function updateUI() {
  if (scoreEl) scoreEl.textContent = score;
  if (levelEl) levelEl.textContent = level;
  if (linesEl) linesEl.textContent = linesCleared;
}

function updateMetaUI() {
  if (bestScoreEl) bestScoreEl.textContent = bestScore;
  if (totalGamesEl) totalGamesEl.textContent = totalGames;
  if (gamesPlayedInfoEl) gamesPlayedInfoEl.textContent = totalGames;
}

function updatePauseButtonLabel() {
  if (!pauseBtn) return;
  pauseBtn.textContent = isPaused ? "Wznów" : "Pauza";
}

function pauseGame() {
  if (isPaused || isGameOver) return;
  isPaused = true;
  cancelAnimationFrame(animationId);
  updatePauseButtonLabel();
}

function resumeGame() {
  if (!isPaused || isGameOver) return;
  isPaused = false;
  lastTime = 0;
  updatePauseButtonLabel();
  animationId = requestAnimationFrame(loop);
}

function resetGame() {
  board = createEmptyBoard();
  score = 0;
  linesCleared = 0;
  level = 1;
  baseSpeed = 800;
  fallSpeed = baseSpeed;
  fallTimer = 0;
  lastTime = 0;
  isGameOver = false;
  isPaused = false;
  hasSavedGame = false;

  updateUI();
  updatePauseButtonLabel();

  if (overlayEl) {
    overlayEl.classList.add("overlay--hidden");
  }

  cancelAnimationFrame(animationId);
  currentPiece = null;
  nextPiece = randomTetromino();
  spawnPiece();
  animationId = requestAnimationFrame(loop);
  hasUnsavedChanges = true;
}

function movePiece(dx, dy) {
  if (!currentPiece || isGameOver || isPaused) return;
  if (!collides(currentPiece, dx, dy, 0)) {
    currentPiece.x += dx;
    currentPiece.y += dy;
    hasUnsavedChanges = true;
  } else if (dy === 1) {
    lockPiece();
  }
}

function rotatePiece() {
  if (!currentPiece || isGameOver || isPaused) return;
  const kicks = [0, -1, 1, -2, 2];
  for (const k of kicks) {
    if (!collides(currentPiece, k, 0, 1)) {
      currentPiece.x += k;
      currentPiece.rotation = (currentPiece.rotation + 1) % 4;
      hasUnsavedChanges = true;
      return;
    }
  }
}

function hardDrop() {
  if (!currentPiece || isGameOver || isPaused) return;
  while (!collides(currentPiece, 0, 1, 0)) {
    currentPiece.y += 1;
  }
  lockPiece();
}

function getGhostY() {
  if (!currentPiece) return 0;
  let ghostY = currentPiece.y;
  while (!collides(currentPiece, 0, ghostY - currentPiece.y + 1, 0)) {
    ghostY++;
  }
  return ghostY;
}

// Rysowanie

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, "#020617");
  grad.addColorStop(1, "#020617");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(148,163,184,0.08)";
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

function drawRoundedBlock(px, py, color, alpha = 1) {
  const x = px * tileSize;
  const y = py * tileSize;
  const r = 5;

  ctx.globalAlpha = alpha;

  const blockGrad = ctx.createLinearGradient(x, y, x, y + tileSize);
  blockGrad.addColorStop(0, lightenColor(color, 0.2));
  blockGrad.addColorStop(1, color);

  ctx.fillStyle = blockGrad;
  ctx.strokeStyle = "rgba(15,23,42,0.8)";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + tileSize - r, y);
  ctx.quadraticCurveTo(x + tileSize, y, x + tileSize, y + r);
  ctx.lineTo(x + tileSize, y + tileSize - r);
  ctx.quadraticCurveTo(
    x + tileSize,
    y + tileSize,
    x + tileSize - r,
    y + tileSize
  );
  ctx.lineTo(x + r, y + tileSize);
  ctx.quadraticCurveTo(x, y + tileSize, x, y + tileSize - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.globalAlpha = alpha * 0.5;
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.moveTo(x + r, y + 2);
  ctx.lineTo(x + tileSize - r, y + 2);
  ctx.quadraticCurveTo(
    x + tileSize - 2,
    y + 4,
    x + tileSize - r,
    y + 6
  );
  ctx.lineTo(x + r, y + 6);
  ctx.quadraticCurveTo(x + 2, y + 4, x + r, y + 2);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 1;
}

function lightenColor(hex, factor) {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const nr = Math.min(255, Math.floor(r + (255 - r) * factor));
  const ng = Math.min(255, Math.floor(g + (255 - g) * factor));
  const nb = Math.min(255, Math.floor(b + (255 - b) * factor));
  return (
    "#" +
    nr.toString(16).padStart(2, "0") +
    ng.toString(16).padStart(2, "0") +
    nb.toString(16).padStart(2, "0")
  );
}

function drawBoard() {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const color = board[y][x];
      if (color) {
        drawRoundedBlock(x, y, color, 1);
      }
    }
  }
}

function drawCurrentPiece() {
  if (!currentPiece) return;

  const ghostY = getGhostY();
  const ghostPiece = { ...currentPiece, y: ghostY };
  const ghostBlocks = getBlocks(ghostPiece);
  const color = currentPiece.type.color;
  for (const b of ghostBlocks) {
    if (b.y >= 0) {
      drawRoundedBlock(b.x, b.y, color, 0.18);
    }
  }

  const blocks = getBlocks(currentPiece);
  for (const b of blocks) {
    if (b.y >= 0) {
      drawRoundedBlock(b.x, b.y, currentPiece.type.color, 1);
    }
  }
}

function draw() {
  drawBackground();
  drawBoard();
  drawCurrentPiece();
}

// Pętla gry

function loop(timestamp) {
  if (isGameOver || isPaused) return;

  if (!lastTime) {
    lastTime = timestamp;
  }
  const delta = timestamp - lastTime;
  lastTime = timestamp;

  fallTimer += delta;
  if (fallTimer >= fallSpeed) {
    fallTimer = 0;
    if (!collides(currentPiece, 0, 1, 0)) {
      currentPiece.y += 1;
      hasUnsavedChanges = true;
    } else {
      lockPiece();
    }
  }

  draw();
  animationId = requestAnimationFrame(loop);
}

// Zapis pełnego stanu przez ArcadeProgress

function buildSavePayload() {
  return {
    bestScore,
    totalGames,
    gameState: {
      score,
      level,
      linesCleared,
      board,
      currentPiece: currentPiece
        ? {
            name: currentPiece.type.name,
            rotation: currentPiece.rotation,
            x: currentPiece.x,
            y: currentPiece.y
          }
        : null,
      nextPiece: nextPiece
        ? {
            name: nextPiece.type.name,
            rotation: nextPiece.rotation,
            x: nextPiece.x,
            y: nextPiece.y
          }
        : null,
      baseSpeed,
      fallSpeed,
      isGameOver,
      isPaused: true // zapis = pauza
    }
  };
}

function saveCurrentSession() {
  if (!window.ArcadeProgress || !ArcadeProgress.save) {
    console.warn("[GAME]", GAME_ID, "Brak ArcadeProgress.save");
    return Promise.resolve();
  }

  // Zapis zawsze pauzuje grę
  pauseGame();

  const payload = buildSavePayload();

  return ArcadeProgress.save(GAME_ID, payload)
    .then(function () {
      LAST_SAVE_DATA = payload;
      hasUnsavedChanges = false;
      hasSavedGame = true;
      console.log("[GAME]", GAME_ID, "zapisano:", payload);
    })
    .catch(function (err) {
      console.error("[GAME]", GAME_ID, "Błąd save:", err);
    });
}

function loadProgress() {
  if (!window.ArcadeProgress || !ArcadeProgress.load) {
    console.warn("[GAME]", GAME_ID, "Brak ArcadeProgress.load");
    board = createEmptyBoard();
    return Promise.resolve();
  }

  return ArcadeProgress.load(GAME_ID)
    .then(function (data) {
      if (!data) {
        board = createEmptyBoard();
        return;
      }

      if (typeof data.bestScore === "number") bestScore = data.bestScore;
      if (typeof data.totalGames === "number") totalGames = data.totalGames;

      LAST_SAVE_DATA = data;
      hasUnsavedChanges = false;

      const gs = data.gameState;
      if (gs) {
        hasSavedGame = true;

        board = gs.board || createEmptyBoard();
        score = typeof gs.score === "number" ? gs.score : 0;
        level = typeof gs.level === "number" ? gs.level : 1;
        linesCleared =
          typeof gs.linesCleared === "number" ? gs.linesCleared : 0;
        baseSpeed =
          typeof gs.baseSpeed === "number" ? gs.baseSpeed : baseSpeed;
        fallSpeed =
          typeof gs.fallSpeed === "number" ? gs.fallSpeed : baseSpeed;
        isGameOver = !!gs.isGameOver;
        isPaused = gs.isPaused !== undefined ? gs.isPaused : true;

        function pieceFromSaved(saved) {
          if (!saved) return null;
          const type = TETROMINOS.find(t => t.name === saved.name);
          if (!type) return null;
          return {
            type,
            rotation: saved.rotation || 0,
            x: saved.x || 0,
            y: saved.y || 0
          };
        }

        currentPiece =
          pieceFromSaved(gs.currentPiece) || randomTetromino();
        nextPiece = pieceFromSaved(gs.nextPiece) || randomTetromino();
      } else {
        board = createEmptyBoard();
      }
    })
    .catch(function (err) {
      console.error("[GAME]", GAME_ID, "Błąd load:", err);
      board = createEmptyBoard();
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
      hasUnsavedChanges = false;
      hasSavedGame = false;
      bestScore = 0;
      totalGames = 0;
      updateMetaUI();
      console.log("[GAME]", GAME_ID, "progress wyczyszczony");
    })
    .catch(function (err) {
      console.error("[GAME]", GAME_ID, "Błąd clear:", err);
    });
}

// Guardy na niezapisane zmiany

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
        "Masz niezapisany postęp (rekord/statystyki/stanu gry). Wyjść bez zapisywania?"
      );
      if (!ok) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  });
}

// Inicjalizacja zdarzeń

function attachEvents() {
  const newGameBtn = document.getElementById("new-game-btn");
  const saveGameBtn = document.getElementById("save-game-btn");
  const resetRecordBtn = document.getElementById("reset-record-btn");
  pauseBtn = document.getElementById("pause-btn");
  overlayNewGameBtn = document.getElementById("overlay-new-game-btn");

  // Sterowanie dotykowe
  btnLeft = document.getElementById("btn-left");
  btnRight = document.getElementById("btn-right");
  btnRotate = document.getElementById("btn-rotate");
  btnSoftDrop = document.getElementById("btn-soft");
  btnHardDrop = document.getElementById("btn-hard");

  if (newGameBtn) {
    newGameBtn.addEventListener("click", function () {
      const ok =
        !hasUnsavedChanges ||
        window.confirm(
          "Rozpocząć nową grę? Aktualny postęp tej rozgrywki nie zostanie zapisany."
        );
      if (!ok) return;
      resetGame();
    });
  }

  if (overlayNewGameBtn) {
    overlayNewGameBtn.addEventListener("click", function () {
      resetGame();
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
      updateMetaUI();
      clearProgress();
    });
  }

  if (pauseBtn) {
    pauseBtn.addEventListener("click", function () {
      if (isGameOver) return;
      if (!isPaused) {
        pauseGame();
      } else {
        resumeGame();
      }
    });
  }

  // Sterowanie dotykowe – click działa też jako tap na mobile
  if (btnLeft) {
    btnLeft.addEventListener("click", function () {
      if (isGameOver || isPaused) return;
      movePiece(-1, 0);
    });
  }
  if (btnRight) {
    btnRight.addEventListener("click", function () {
      if (isGameOver || isPaused) return;
      movePiece(1, 0);
    });
  }
  if (btnRotate) {
    btnRotate.addEventListener("click", function () {
      if (isGameOver || isPaused) return;
      rotatePiece();
    });
  }
  if (btnSoftDrop) {
    btnSoftDrop.addEventListener("click", function () {
      if (isGameOver || isPaused) return;
      movePiece(0, 1);
      fallTimer = 0;
    });
  }
  if (btnHardDrop) {
    btnHardDrop.addEventListener("click", function () {
      if (isGameOver || isPaused) return;
      hardDrop();
    });
  }

  // Klawiatura
  document.addEventListener("keydown", e => {
    if (isGameOver || isPaused) return;

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      movePiece(-1, 0);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      movePiece(1, 0);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      movePiece(0, 1);
      fallTimer = 0;
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      rotatePiece();
    } else if (e.key === " ") {
      e.preventDefault();
      hardDrop();
    }
  });
}

function initGame() {
  canvas = document.getElementById("game");
  ctx = canvas.getContext("2d");

  scoreEl = document.getElementById("score");
  levelEl = document.getElementById("level");
  linesEl = document.getElementById("lines");
  bestScoreEl = document.getElementById("best-score");
  totalGamesEl = document.getElementById("total-games");
  gamesPlayedInfoEl = document.getElementById("games-played-info");
  overlayEl = document.getElementById("game-over-overlay");

  attachEvents();
  updatePauseButtonLabel();

  loadProgress().then(function () {
    updateMetaUI();

    setupBeforeUnloadGuard();
    setupClickGuard();

    if (window.ArcadeUI && ArcadeUI.addBackToArcadeButton) {
      ArcadeUI.addBackToArcadeButton({
        backUrl: "../../../arcade.html"
      });
    }

    if (hasSavedGame && !isGameOver) {
      // Mamy zapis – rysujemy ten stan, gra startuje w pauzie
      isPaused = true;
      updatePauseButtonLabel();
      draw();
    } else {
      // Brak zapisu – świeża gra
      resetGame();
    }
  });
}

document.addEventListener("DOMContentLoaded", initGame);
