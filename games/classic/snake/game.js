const GAME_ID = "snake";

let hasUnsavedChanges = false;
let LAST_SAVE_DATA = null;

// Stan gry
let snake;
let direction;
let nextDirection;
let food;
let gameLoop = null;
let score = 0;
let bestScore = 0;
let totalGames = 0;
let isGameOver = false;
let speed;

// Ustawienia planszy
const tileSize = 20;
let tilesX;
let tilesY;

// DOM
let canvas;
let ctx;
let scoreEl;
let bestScoreEl;
let totalGamesEl;
let newGameBtn;
let saveGameBtn;
let resetRecordBtn;

// Prędkość
const initialSpeed = 220; // wolny start
const minSpeed = 60;
const speedStep = 10;

function initGame() {
  canvas = document.getElementById("game-canvas");
  ctx = canvas.getContext("2d");

  tilesX = canvas.width / tileSize;
  tilesY = canvas.height / tileSize;

  scoreEl = document.getElementById("score");
  bestScoreEl = document.getElementById("best-score");
  totalGamesEl = document.getElementById("total-games");

  newGameBtn = document.getElementById("new-game-btn");
  saveGameBtn = document.getElementById("save-game-btn");
  resetRecordBtn = document.getElementById("reset-record-btn");

  attachEvents();

  loadProgress().then(function () {
    updateHud();
    startNewGame();

    setupBeforeUnloadGuard();
    setupClickGuard();

    if (window.ArcadeUI && ArcadeUI.addBackToArcadeButton) {
      ArcadeUI.addBackToArcadeButton({
        backUrl: "../../../arcade.html",
      });
    }
  });
}

/* ======================
   PROGRES – ArcadeProgress
   ====================== */

function loadProgress() {
  if (!window.ArcadeProgress || !ArcadeProgress.load) {
    console.warn("[GAME]", GAME_ID, "Brak ArcadeProgress.load");
    return Promise.resolve();
  }

  return ArcadeProgress.load(GAME_ID)
    .then(function (data) {
      if (!data) return;

      if (typeof data.bestScore === "number") bestScore = data.bestScore;
      if (typeof data.totalGames === "number") totalGames = data.totalGames;

      LAST_SAVE_DATA = data;
      hasUnsavedChanges = false;
      updateHud();
    })
    .catch(function (err) {
      console.error("[GAME]", GAME_ID, "Błąd load:", err);
    });
}

function buildSavePayload() {
  return {
    bestScore: bestScore,
    totalGames: totalGames,
  };
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
      console.log("[GAME]", GAME_ID, "zapisano:", payload);
    })
    .catch(function (err) {
      console.error("[GAME]", GAME_ID, "Błąd save:", err);
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
      console.log("[GAME]", GAME_ID, "progress wyczyszczony");
    })
    .catch(function (err) {
      console.error("[GAME]", GAME_ID, "Błąd clear:", err);
    });
}

/* ======================
   OBSŁUGA UI
   ====================== */

function attachEvents() {
  window.addEventListener("keydown", handleKeyDown);

  if (newGameBtn) {
    newGameBtn.addEventListener("click", function () {
      const ok =
        !hasUnsavedChanges ||
        window.confirm(
          "Rozpocząć nową grę? Aktualny postęp tej rozgrywki nie zostanie zapisany."
        );
      if (!ok) return;
      startNewGame();
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
      updateHud();

      clearProgress();
    });
  }
}

function handleKeyDown(e) {
  const key = e.key;

  if (
    key === "ArrowUp" ||
    key === "ArrowDown" ||
    key === "ArrowLeft" ||
    key === "ArrowRight" ||
    key === " "
  ) {
    e.preventDefault();
  }

  // zmiana kierunku
  if (key === "ArrowUp" && direction.y !== 1) {
    nextDirection = { x: 0, y: -1 };
  } else if (key === "ArrowDown" && direction.y !== -1) {
    nextDirection = { x: 0, y: 1 };
  } else if (key === "ArrowLeft" && direction.x !== 1) {
    nextDirection = { x: -1, y: 0 };
  } else if (key === "ArrowRight" && direction.x !== -1) {
    nextDirection = { x: 1, y: 0 };
  } else if (key === " " && isGameOver) {
    // Spacja po zakończeniu gry = nowa gra
    startNewGame();
  }
}

function updateHud() {
  if (scoreEl) scoreEl.textContent = String(score);
  if (bestScoreEl) bestScoreEl.textContent = String(bestScore);
  if (totalGamesEl) totalGamesEl.textContent = String(totalGames);
}

/* ======================
   GRA – LOGIKA
   ====================== */

function startNewGame() {
  // wyłącz poprzednią pętlę
  if (gameLoop) {
    clearInterval(gameLoop);
    gameLoop = null;
  }

  // startowy wąż
  snake = [
    { x: 8, y: 10 },
    { x: 7, y: 10 },
    { x: 6, y: 10 },
  ];

  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };

  score = 0;
  isGameOver = false;
  speed = initialSpeed;

  updateHud();
  placeFood();
  hasUnsavedChanges = false;

  draw(); // narysuj stan początkowy
  startLoop();
}

function startLoop() {
  if (gameLoop) clearInterval(gameLoop);
  gameLoop = setInterval(tick, speed);
}

function tick() {
  if (isGameOver) return;

  // Po pierwszym ruchu zakładamy, że użytkownik ma "niezapisany" stan
  hasUnsavedChanges = true;

  // Zastosuj zbuforowany kierunek
  direction = nextDirection;

  // Nowa głowa
  let head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y,
  };

  // Wrap-around
  if (head.x < 0) head.x = tilesX - 1;
  if (head.x >= tilesX) head.x = 0;
  if (head.y < 0) head.y = tilesY - 1;
  if (head.y >= tilesY) head.y = 0;

  // Kolizja z samym sobą
  if (snake.some((seg) => seg.x === head.x && seg.y === head.y)) {
    endGame();
    return;
  }

  // Dodaj nową głowę
  snake.unshift(head);

  // Jedzenie
  if (head.x === food.x && head.y === food.y) {
    score++;
    if (score > bestScore) {
      bestScore = score;
    }
    updateHud();

    // Przyśpieszenie
    speed = Math.max(minSpeed, speed - speedStep);
    startLoop();

    placeFood();
  } else {
    // Usuń ogon
    snake.pop();
  }

  draw();
}

function placeFood() {
  let newFood;
  while (true) {
    newFood = {
      x: Math.floor(Math.random() * tilesX),
      y: Math.floor(Math.random() * tilesY),
    };
    if (!snake.some((seg) => seg.x === newFood.x && seg.y === newFood.y)) {
      break;
    }
  }
  food = newFood;
}

/* ======================
   RYSOWANIE
   ====================== */

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, "#020617");
  grad.addColorStop(1, "#111827");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Delikatna siatka
  ctx.strokeStyle = "rgba(148, 163, 184, 0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= tilesX; x++) {
    ctx.moveTo(x * tileSize + 0.5, 0);
    ctx.lineTo(x * tileSize + 0.5, canvas.height);
  }
  for (let y = 0; y <= tilesY; y++) {
    ctx.moveTo(0, y * tileSize + 0.5);
    ctx.lineTo(canvas.width, y * tileSize + 0.5);
  }
  ctx.stroke();
}

function drawFood() {
  const cx = food.x * tileSize + tileSize / 2;
  const cy = food.y * tileSize + tileSize / 2;
  const r = tileSize * 0.35;

  // Czerwone „jabłko”
  ctx.beginPath();
  ctx.fillStyle = "#f97373";
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Mały błysk
  ctx.beginPath();
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.arc(cx - r * 0.4, cy - r * 0.4, r * 0.25, 0, Math.PI * 2);
  ctx.fill();

  // Kontur
  ctx.beginPath();
  ctx.strokeStyle = "rgba(248, 113, 113, 0.9)";
  ctx.lineWidth = 1;
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
}

function drawSnake() {
  for (let i = 0; i < snake.length; i++) {
    const seg = snake[i];
    const x = seg.x * tileSize;
    const y = seg.y * tileSize;

    const t = i / Math.max(1, snake.length - 1);
    const baseHue = 140;
    const lightness = 70 - t * 25;

    ctx.fillStyle = `hsl(${baseHue}, 80%, ${lightness}%)`;
    ctx.strokeStyle = "rgba(15, 23, 42, 0.85)";
    ctx.lineWidth = 2;

    const r = 5;
    const w = tileSize;
    const h = tileSize;

    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // oko
    if (i === 0) {
      const eyeOffsetX = direction.x === -1 ? -3 : direction.x === 1 ? 3 : 0;
      const eyeOffsetY = direction.y === -1 ? -3 : direction.y === 1 ? 3 : 0;
      const eyeX = x + w / 2 + eyeOffsetX;
      const eyeY = y + h / 2 + eyeOffsetY;

      ctx.beginPath();
      ctx.fillStyle = "#022c22";
      ctx.arc(eyeX, eyeY, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function draw() {
  drawBackground();
  drawFood();
  drawSnake();
}

/* ======================
   KONIEC GRY
   ====================== */

function endGame() {
  isGameOver = true;
  if (gameLoop) {
    clearInterval(gameLoop);
    gameLoop = null;
  }

  totalGames++;
  if (score > bestScore) {
    bestScore = score;
  }
  updateHud();
  hasUnsavedChanges = true;

  // Przyciemnienie
  ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // prostokąt pod napisem
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(40, canvas.height / 2 - 40, canvas.width - 80, 80);

  ctx.fillStyle = "#f9fafb";
  ctx.font = "24px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Game Over!", canvas.width / 2, canvas.height / 2 - 4);
  ctx.font = "15px system-ui, sans-serif";
  ctx.fillStyle = "#cbd5f5";
  ctx.fillText(
    "Spacja – nowa gra",
    canvas.width / 2,
    canvas.height / 2 + 22
  );
}

/* ======================
   GUARDA NA WYJŚCIE
   ====================== */

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

/* ======================
   START
   ====================== */

document.addEventListener("DOMContentLoaded", initGame);
