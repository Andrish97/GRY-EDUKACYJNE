const GAME_ID = "neon-pong";

const MODE_WALL = "wall"; // Ściana
const MODE_AI = "ai";     // Pojedynek z AI

let currentMode = MODE_WALL;

let canvas, ctx;

// Paletki
let bottomPaddle, topPaddle;

// Piłka
let ball;

// Wyniki bieżącej rozgrywki (aktualnego meczu)
let playerScore = 0;
let enemyScore = 0;

// Paletka: klasyczna – szeroka i niska
const paddleWidth = 140;
const paddleHeight = 14;
const paddleMargin = 40;
const ballRadius = 10;

// Statystyki per tryb (rekord + licznik gier)
const stats = {
  [MODE_WALL]: {
    bestScore: 0,
    gamesPlayed: 0
  },
  [MODE_AI]: {
    bestScore: 0,
    gamesPlayed: 0
  }
};

// Klawisze
const keys = {
  a: false,
  d: false,
  w: false,
  s: false,
  ArrowLeft: false,
  ArrowRight: false,
  ArrowUp: false,
  ArrowDown: false
};

// Progres / guardy / pauza
let hasUnsavedChanges = false;
let LAST_SAVE_DATA = null;
let isPaused = false;

// Wczytana sesja (stan gry) — używamy po resize canvas
let loadedSession = null;

/* ============================
   Helpery
============================ */

function W() {
  return canvas.width;
}
function H() {
  return canvas.height;
}

function getEl(id) {
  return document.getElementById(id);
}

/* ============================
   ArcadeProgress – LOAD / SAVE
============================ */

function loadProgress() {
  if (!window.ArcadeProgress || !ArcadeProgress.load) {
    console.warn("[GAME]", GAME_ID, "Brak ArcadeProgress.load");
    return Promise.resolve();
  }

  return ArcadeProgress.load(GAME_ID)
    .then(raw => {
      let data = raw;

      // Jeśli coś zwróci string (np. JSON w tekście) – spróbuj sparsować
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch (e) {
          console.warn("[GAME]", GAME_ID, "Nieudany JSON w progresie:", e);
          data = null;
        }
      }

      if (data && typeof data === "object") {
        // Statystyki
        if (data.wall && typeof data.wall === "object") {
          stats[MODE_WALL].bestScore = Number(data.wall.bestScore || 0);
          stats[MODE_WALL].gamesPlayed = Number(data.wall.gamesPlayed || 0);
        }
        if (data.ai && typeof data.ai === "object") {
          stats[MODE_AI].bestScore = Number(data.ai.bestScore || 0);
          stats[MODE_AI].gamesPlayed = Number(data.ai.gamesPlayed || 0);
        }

        // Stan gry (sesja)
        if (data.session && typeof data.session === "object") {
          loadedSession = data.session;
        } else {
          loadedSession = null;
        }
      } else {
        loadedSession = null;
      }

      LAST_SAVE_DATA = data || null;
      hasUnsavedChanges = false;

      // uaktualnij UI statystyk (na razie bez trybu – ustawimy tryb później)
      updateStatsUI();
    })
    .catch(err => {
      console.error("[GAME]", GAME_ID, "Błąd load:", err);
    });
}

function buildSavePayload() {
  // Zapisujemy statystyki + aktualny stan gry (sesję)
  const payload = {
    wall: {
      bestScore: stats[MODE_WALL].bestScore,
      gamesPlayed: stats[MODE_WALL].gamesPlayed
    },
    ai: {
      bestScore: stats[MODE_AI].bestScore,
      gamesPlayed: stats[MODE_AI].gamesPlayed
    },
    session: null
  };

  // Jeśli gra już jest zainicjalizowana, zapisujemy stan
  if (canvas && bottomPaddle && ball) {
    payload.session = {
      mode: currentMode,
      playerScore,
      enemyScore,
      // przechowujemy współczynniki zamiast surowych pikseli,
      // dzięki czemu dopasujemy się do innego rozmiaru okna
      ball: {
        xRatio: ball.x / W(),
        yRatio: ball.y / H(),
        dx: ball.dx,
        dy: ball.dy
      },
      paddles: {
        bottomXRatio: bottomPaddle.x / W()
        // top: dla AI możemy odtworzyć sensownie z piłki,
        // ale jak chcemy – możemy też zapisać:
        // topXRatio: topPaddle ? topPaddle.x / W() : 0.5
      },
      isPaused: true
    };
  }

  return payload;
}

function saveCurrentSession() {
  const payload = buildSavePayload();

  // Po kliknięciu ZAPISZ — zawsze pauza
  isPaused = true;
  updatePauseButton();

  if (!window.ArcadeProgress || !ArcadeProgress.save) {
    console.warn("[GAME]", GAME_ID, "Brak ArcadeProgress.save – zapis tylko w RAM");
    LAST_SAVE_DATA = payload;
    hasUnsavedChanges = false;
    return Promise.resolve();
  }

  return ArcadeProgress.save(GAME_ID, payload)
    .then(() => {
      LAST_SAVE_DATA = payload;
      hasUnsavedChanges = false;
      console.log("[GAME]", GAME_ID, "zapisano:", payload);
    })
    .catch(err => {
      console.error("[GAME]", GAME_ID, "Błąd save:", err);
    });
}

function clearRecordForCurrentMode() {
  const s = stats[currentMode];
  s.bestScore = 0;
  hasUnsavedChanges = true;
  updateStatsUI();
}

/* ============================
   Guardy wychodzenia
============================ */

function setupBeforeUnloadGuard() {
  window.addEventListener("beforeunload", e => {
    if (!hasUnsavedChanges) return;
    e.preventDefault();
    e.returnValue = "";
  });
}

function setupClickGuard() {
  document.addEventListener("click", e => {
    if (!hasUnsavedChanges) return;

    const target = e.target.closest("a,button");
    if (!target) return;

    const href = target.getAttribute("href");
    const isBack =
      (href && href.indexOf("arcade.html") !== -1) ||
      target.classList.contains("arcade-back-btn");

    if (isBack) {
      const ok = window.confirm(
        "Masz niezapisane statystyki / stan gry. Wyjść bez zapisywania?"
      );
      if (!ok) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  });
}

/* ============================
   Canvas i obiekty
============================ */

function resizeCanvas() {
  const container = canvas.parentElement;
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
}

function setupPaddles() {
  bottomPaddle = {
    x: W() / 2 - paddleWidth / 2,
    y: H() - paddleMargin,
    width: paddleWidth,
    height: paddleHeight
  };

  topPaddle = {
    x: W() / 2 - paddleWidth / 2,
    y: paddleMargin - paddleHeight,
    width: paddleWidth,
    height: paddleHeight
  };
}

function resetBall(startDown = true) {
  ball = {
    x: W() / 2,
    y: H() / 2,
    r: ballRadius,
    dx: (Math.random() > 0.5 ? 1 : -1) * 5,
    dy: (startDown ? 1 : -1) * (4 + Math.random() * 2)
  };
}

/* ============================
   Przywracanie zapisanej sesji
============================ */

function restoreSessionIfAvailable() {
  if (!loadedSession) return;

  // Przywracamy tryb, ale NIE resetujemy wyniku / piłki
  setMode(loadedSession.mode || MODE_WALL, { skipReset: true });

  // Wyniki meczu
  playerScore = Number(loadedSession.playerScore || 0);
  enemyScore = Number(loadedSession.enemyScore || 0);

  // Piłka
  if (loadedSession.ball) {
    const b = loadedSession.ball;
    ball.x = (b.xRatio || 0.5) * W();
    ball.y = (b.yRatio || 0.5) * H();
    ball.dx = typeof b.dx === "number" ? b.dx : ball.dx;
    ball.dy = typeof b.dy === "number" ? b.dy : ball.dy;
  }

  // Paletka gracza
  if (loadedSession.paddles && typeof loadedSession.paddles.bottomXRatio === "number") {
    bottomPaddle.x =
      loadedSession.paddles.bottomXRatio * W() - 0; // używamy lewego brzegu
    bottomPaddle.x = Math.max(
      0,
      Math.min(W() - bottomPaddle.width, bottomPaddle.x)
    );
  }

  // Pauza – zawsze true, dopóki gracz nie kliknie Wznów
  isPaused =
    typeof loadedSession.isPaused === "boolean"
      ? loadedSession.isPaused
      : true;

  updatePauseButton();
  updateScoreUI();
  updateStatsUI();

  // Po jednym przywróceniu nie potrzebujemy tego drugi raz
  loadedSession = null;
}

/* ============================
   Tryby gry
============================ */

function setMode(newMode, options = {}) {
  if (newMode !== MODE_WALL && newMode !== MODE_AI) return;
  currentMode = newMode;

  // slider – przesunięcie
  const slider = getEl("mode-toggle-slider");
  if (slider) {
    slider.style.transform =
      currentMode === MODE_WALL ? "translateX(0%)" : "translateX(100%)";
  }

  // aktywne przyciski
  document
    .querySelectorAll(".mode-toggle__option")
    .forEach(btn => {
      const mode = btn.getAttribute("data-mode");
      btn.classList.toggle("mode-toggle__option--active", mode === currentMode);
    });

  // etykieta rekordu
  const recordLabel = getEl("record-label");
  if (recordLabel) {
    recordLabel.textContent =
      currentMode === MODE_WALL
        ? "Rekord – Ściana"
        : "Rekord – Pojedynek z AI";
  }

  // Normalnie resetujemy wynik i piłkę, ale jeśli np. przywracamy sesję,
  // to możemy to wyłączyć przez options.skipReset
  if (!options.skipReset) {
    playerScore = 0;
    enemyScore = 0;
    resetBall(true);
  }

  // UI aktualizujemy zawsze, chyba że ktoś chce to pominąć
  if (!options.skipUI) {
    updateScoreUI();
    updateStatsUI();
  }
}

/* ============================
   UI – wyniki, statystyki, pauza
============================ */

function updateScoreUI() {
  const scoreOverlay = getEl("score");
  if (scoreOverlay) {
    scoreOverlay.textContent = `${playerScore} : ${enemyScore}`;
  }

  const currentScoreEl = getEl("current-score");
  if (currentScoreEl) {
    currentScoreEl.textContent = String(playerScore);
  }
}

function updateStatsUI() {
  const currentStats = stats[currentMode];
  const bestScoreEl = getEl("best-score");
  const gamesPlayedEl = getEl("games-played");

  if (bestScoreEl) bestScoreEl.textContent = String(currentStats.bestScore);
  if (gamesPlayedEl) gamesPlayedEl.textContent = String(currentStats.gamesPlayed);
}

function updatePauseButton() {
  const pauseBtn = getEl("pause-btn");
  if (!pauseBtn) return;
  pauseBtn.textContent = isPaused ? "Wznów" : "Pauza";
}

/* ============================
   Sterowanie klawiszami
============================ */

function setupKeyboard() {
  document.addEventListener("keydown", e => {
    if (e.key in keys) keys[e.key] = true;
  });
  document.addEventListener("keyup", e => {
    if (e.key in keys) keys[e.key] = false;
  });
}

function movePlayerKeyboard() {
  const speed = 10;
  const left = keys.a || keys.ArrowLeft || keys.w || keys.ArrowUp;
  const right = keys.d || keys.ArrowRight || keys.s || keys.ArrowDown;

  if (left) bottomPaddle.x -= speed;
  if (right) bottomPaddle.x += speed;

  bottomPaddle.x = Math.max(
    0,
    Math.min(W() - bottomPaddle.width, bottomPaddle.x)
  );
}

/* ============================
   Sterowanie: złap i przeciągnij
============================ */

function setupGrabControls() {
  let isDragging = false;
  let grabOffsetX = 0;

  function beginGrab(x, y) {
    if (
      y > bottomPaddle.y &&
      y < bottomPaddle.y + bottomPaddle.height &&
      x > bottomPaddle.x &&
      x < bottomPaddle.x + bottomPaddle.width
    ) {
      isDragging = true;
      grabOffsetX = x - bottomPaddle.x;
    }
  }

  function dragTo(x) {
    if (!isDragging) return;
    bottomPaddle.x = x - grabOffsetX;

    bottomPaddle.x = Math.max(
      0,
      Math.min(W() - bottomPaddle.width, bottomPaddle.x)
    );
  }

  function endDrag() {
    isDragging = false;
  }

  // Mysz
  canvas.addEventListener("mousedown", e => {
    const rect = canvas.getBoundingClientRect();
    beginGrab(e.clientX - rect.left, e.clientY - rect.top);
  });

  canvas.addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();
    dragTo(e.clientX - rect.left);
  });

  document.addEventListener("mouseup", endDrag);

  // Dotyk
  canvas.addEventListener("touchstart", e => {
    const t = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    beginGrab(t.clientX - rect.left, t.clientY - rect.top);
  });

  canvas.addEventListener("touchmove", e => {
    e.preventDefault();
    const t = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    dragTo(t.clientX - rect.left);
  });

  canvas.addEventListener("touchend", endDrag);
}

/* ============================
   AI
============================ */

function moveAI() {
  if (currentMode !== MODE_AI) return;

  const targetX = ball.x - topPaddle.width / 2;
  const factor = 0.08;
  topPaddle.x += (targetX - topPaddle.x) * factor;

  topPaddle.x = Math.max(
    0,
    Math.min(W() - topPaddle.width, topPaddle.x)
  );
}

/* ============================
   Logika kolizji i punktacja
============================ */

function handlePhysicsAndScoring() {
  // ruch piłki
  ball.x += ball.dx;
  ball.y += ball.dy;

  // Odbicia od boków
  if (ball.x < ball.r) {
    ball.x = ball.r;
    ball.dx *= -1;
  }
  if (ball.x > W() - ball.r) {
    ball.x = W() - ball.r;
    ball.dx *= -1;
  }

  // Dolna paletka (gracz)
  if (
    ball.y + ball.r > bottomPaddle.y &&
    ball.y - ball.r < bottomPaddle.y + bottomPaddle.height &&
    ball.x > bottomPaddle.x &&
    ball.x < bottomPaddle.x + bottomPaddle.width &&
    ball.dy > 0
  ) {
    ball.dy *= -1;
    ball.y = bottomPaddle.y - ball.r;
    ball.dx += (Math.random() - 0.5) * 2;

    if (currentMode === MODE_WALL) {
      playerScore++;
      if (playerScore > stats[MODE_WALL].bestScore) {
        stats[MODE_WALL].bestScore = playerScore;
        hasUnsavedChanges = true;
      }
      updateScoreUI();
      updateStatsUI();
    }
  }

  if (currentMode === MODE_WALL) {
    // Góra to ściana
    if (ball.y < ball.r) {
      ball.y = ball.r;
      ball.dy *= -1;
    }

    // Ucieczka dołem = strata
    if (ball.y - ball.r > H()) {
      enemyScore++;
      updateScoreUI();
      resetBall(true);
    }
  } else {
    // Górna paletka (AI)
    if (
      ball.y - ball.r < topPaddle.y + topPaddle.height &&
      ball.y + ball.r > topPaddle.y &&
      ball.x > topPaddle.x &&
      ball.x < topPaddle.x + topPaddle.width &&
      ball.dy < 0
    ) {
      ball.dy *= -1;
      ball.y = topPaddle.y + topPaddle.height + ball.r;
      ball.dx += (Math.random() - 0.5) * 2;
    }

    // Punkt dla gracza – piłka ucieka górą
    if (ball.y < 0) {
      playerScore++;
      if (playerScore > stats[MODE_AI].bestScore) {
        stats[MODE_AI].bestScore = playerScore;
        hasUnsavedChanges = true;
      }
      updateScoreUI();
      updateStatsUI();
      resetBall(true);
    }

    // Punkt dla AI – piłka ucieka dołem
    if (ball.y > H()) {
      enemyScore++;
      updateScoreUI();
      resetBall(false);
    }
  }
}

/* ============================
   Rysowanie
============================ */

function draw() {
  ctx.clearRect(0, 0, W(), H());

  // linia środkowa (pozioma)
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 4;
  ctx.setLineDash([20, 20]);
  ctx.beginPath();
  ctx.moveTo(0, H() / 2);
  ctx.lineTo(W(), H() / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#22c55e";
  ctx.shadowBlur = 15;
  ctx.shadowColor = "#22c55e";

  // Dolna paletka
  ctx.fillRect(
    bottomPaddle.x,
    bottomPaddle.y,
    bottomPaddle.width,
    bottomPaddle.height
  );

  // Górna – tylko w AI
  if (currentMode === MODE_AI) {
    ctx.fillRect(
      topPaddle.x,
      topPaddle.y,
      topPaddle.width,
      topPaddle.height
    );
  }

  // Piłka
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
}

/* ============================
   Loop
============================ */

function update() {
  if (isPaused) return;
  movePlayerKeyboard();
  moveAI();
  handlePhysicsAndScoring();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

/* ============================
   Kontrolki: nowa gra / zapis / reset / pauza
============================ */

function startNewGame() {
  const currentStats = stats[currentMode];
  currentStats.gamesPlayed++;
  hasUnsavedChanges = true;

  playerScore = 0;
  enemyScore = 0;
  isPaused = false;
  updatePauseButton();
  updateScoreUI();
  updateStatsUI();
  resetBall(true);
}

function setupControlButtons() {
  const newGameBtn = getEl("new-game-btn");
  const saveBtn = getEl("save-game-btn");
  const resetBtn = getEl("reset-record-btn");
  const pauseBtn = getEl("pause-btn");

  if (newGameBtn) {
    newGameBtn.addEventListener("click", () => {
      startNewGame();
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      saveCurrentSession();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      const ok = window.confirm(
        "Wyzerować rekord tylko dla aktualnego trybu?"
      );
      if (!ok) return;
      clearRecordForCurrentMode();
    });
  }

  if (pauseBtn) {
    pauseBtn.addEventListener("click", () => {
      isPaused = !isPaused;
      updatePauseButton();
    });
  }
}

/* ============================
   Przełącznik trybów (slider)
============================ */

function setupModeToggle() {
  const toggle = document.getElementById("mode-toggle");
  if (!toggle) return;

  toggle.addEventListener("click", e => {
    const btn = e.target.closest(".mode-toggle__option");
    if (!btn) return;
    const mode = btn.getAttribute("data-mode");
    if (!mode) return;

    // przy zmianie trybu normalnie resetujemy grę
    setMode(mode);
  });
}

/* ============================
   Init
============================ */

function initGame() {
  canvas = getEl("game");
  if (!canvas) {
    console.error("[GAME]", GAME_ID, "Brak canvas#game");
    return;
  }
  ctx = canvas.getContext("2d");

  setupKeyboard();

  // 1) Wczytaj progres (statystyki + ewentualny stan sesji)
  loadProgress().then(() => {
    // 2) Ustaw canvas + obiekty
    resizeCanvas();
    setupPaddles();
    resetBall(true);

    // 3) Sterowanie myszą/palcem
    setupGrabControls();

    // 4) Guardy, przyciski, tryby
    setupBeforeUnloadGuard();
    setupClickGuard();
    setupControlButtons();
    setupModeToggle();

    // Przycisk powrotu
    if (window.ArcadeUI && ArcadeUI.addBackToArcadeButton) {
      ArcadeUI.addBackToArcadeButton({
        backUrl: "../../../arcade.html"
      });
    }

    // Startowy tryb – jeśli sesja ma tryb, przywrócimy go w restoreSessionIfAvailable
    setMode(MODE_WALL);

    // Jeżeli mamy zapisany stan gry – przywróć go
    restoreSessionIfAvailable();

    // Jeśli nie było sesji – startujemy od pauzy = false
    if (!isPaused) {
      isPaused = false;
      updatePauseButton();
    }

    window.addEventListener("resize", () => {
      resizeCanvas();
      setupPaddles();
      // Nie przywracamy tu sesji – przywracamy tylko raz na starcie
    });

    loop();
  });
}

document.addEventListener("DOMContentLoaded", initGame);
