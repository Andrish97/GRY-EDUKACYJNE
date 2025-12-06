const GAME_ID = "neon-pong";

let hasUnsavedChanges = false;
let LAST_SAVE_DATA = null;

// Stan gry z oryginału
let canvas, ctx;
let left, right, ball;
let scoreL = 0;
let scoreR = 0;

const paddleHeight = 120;
const paddleWidth = 14;

const keys = { w: false, s: false, ArrowUp: false, ArrowDown: false };

function W() {
  return canvas.width;
}

function H() {
  return canvas.height;
}

function resize() {
  // Dopasowujemy canvas do rozmiaru kontenera .pong-layout
  const container = canvas.parentElement;
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
}

function resetBall() {
  ball.x = W() / 2;
  ball.y = H() / 2;
  ball.dx = (Math.random() > 0.5 ? 1 : -1) * 6;
  ball.dy = (Math.random() - 0.5) * 6;
}

function setupGameObjects() {
  left = { x: 40, y: H() / 2 - paddleHeight / 2, dy: 0 };
  right = { x: W() - 40 - paddleWidth, y: H() / 2 - paddleHeight / 2 };

  ball = {
    x: W() / 2,
    y: H() / 2,
    r: 10,
    dx: 6,
    dy: 4
  };

  resetBall();
}

/* ===== ArcadeProgress – MINIMALNY SZKIELET ===== */

function loadProgress() {
  if (!window.ArcadeProgress || !ArcadeProgress.load) {
    console.warn("[GAME]", GAME_ID, "Brak ArcadeProgress.load");
    return Promise.resolve();
  }

  return ArcadeProgress.load(GAME_ID)
    .then(function (data) {
      // Na razie nie używamy żadnych danych – gra jest „sesyjna”
      LAST_SAVE_DATA = data || null;
      hasUnsavedChanges = false;
    })
    .catch(function (err) {
      console.error("[GAME]", GAME_ID, "Błąd load:", err);
    });
}

function buildSavePayload() {
  // Możesz później dodać np. najlepszy wynik
  return {};
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

/* ===== Guardy – na przyszłość (tu raczej nie będą przeszkadzać) ===== */

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

/* ===== LOGIKA PONGA – 1:1 z Twojego oryginału ===== */

function update() {
  // ruch gracza
  if (keys.w || keys.ArrowUp) left.y -= 8;
  if (keys.s || keys.ArrowDown) left.y += 8;

  left.y = Math.max(0, Math.min(H() - paddleHeight, left.y));

  // AI paddle
  const target = ball.y - paddleHeight / 2;
  right.y += (target - right.y) * 0.08;
  right.y = Math.max(0, Math.min(H() - paddleHeight, right.y));

  // ruch piłki
  ball.x += ball.dx;
  ball.y += ball.dy;

  // odbicia góra/dół
  if (ball.y < ball.r || ball.y > H() - ball.r) ball.dy *= -1;

  // lewy paddle
  if (
    ball.x - ball.r < left.x + paddleWidth &&
    ball.y > left.y &&
    ball.y < left.y + paddleHeight
  ) {
    ball.dx *= -1;
    ball.x = left.x + paddleWidth + ball.r;
    ball.dy += (Math.random() - 0.5) * 3;
  }

  // prawy paddle
  if (
    ball.x + ball.r > right.x &&
    ball.y > right.y &&
    ball.y < right.y + paddleHeight
  ) {
    ball.dx *= -1;
    ball.x = right.x - ball.r;
    ball.dy += (Math.random() - 0.5) * 3;
  }

  // Punktacja
  const scoreEl = document.getElementById("score");

  if (ball.x < 0) {
    scoreR++;
    if (scoreEl) scoreEl.innerText = `${scoreL} : ${scoreR}`;
    resetBall();
  }
  if (ball.x > W()) {
    scoreL++;
    if (scoreEl) scoreEl.innerText = `${scoreL} : ${scoreR}`;
    resetBall();
  }
}

function draw() {
  ctx.clearRect(0, 0, W(), H());

  // środek – kreskowana linia
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 4;
  ctx.setLineDash([20, 20]);
  ctx.beginPath();
  ctx.moveTo(W() / 2, 0);
  ctx.lineTo(W() / 2, H());
  ctx.stroke();
  ctx.setLineDash([]);

  // paddles
  ctx.fillStyle = "#22c55e";
  ctx.shadowBlur = 15;
  ctx.shadowColor = "#22c55e";

  ctx.fillRect(left.x, left.y, paddleWidth, paddleHeight);
  ctx.fillRect(right.x, right.y, paddleWidth, paddleHeight);

  // piłka
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

/* ===== Inicjalizacja gry ===== */

function initGame() {
  canvas = document.getElementById("game");
  if (!canvas) {
    console.error("[GAME]", GAME_ID, "Brak elementu canvas#game");
    return;
  }
  ctx = canvas.getContext("2d");

  // Klawisze
  document.addEventListener("keydown", function (e) {
    if (e.key in keys) keys[e.key] = true;
  });
  document.addEventListener("keyup", function (e) {
    if (e.key in keys) keys[e.key] = false;
  });

  // Resize reaguje na okno – ale bazuje na rozmiarze kontenera gry
  function handleResize() {
    resize();
  }

  window.addEventListener("resize", handleResize);

  // Najpierw wczytaj progres (jeśli kiedykolwiek będziesz go używać)
  loadProgress().then(function () {
    resize();
    setupGameObjects();

    setupBeforeUnloadGuard();
    setupClickGuard();

    // Przycisk powrotu dodawany uniwersalnie
    if (window.ArcadeUI && ArcadeUI.addBackToArcadeButton) {
      ArcadeUI.addBackToArcadeButton({
        backUrl: "../../../arcade.html"
      });
    }

    loop();
  });
}

document.addEventListener("DOMContentLoaded", initGame);

