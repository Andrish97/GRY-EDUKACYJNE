// ======================================================================
//  ArcadeUI — wspólne funkcje interfejsu Neon Arcade
// ======================================================================

window.ArcadeUI = window.ArcadeUI || {};

/**
 * Uniwersalny przycisk „Powrót do Arcade”
 * Każda gra może wywołać:
 *
 * ArcadeUI.addBackToArcadeButton({ backUrl: "../../../arcade.html" });
 */
ArcadeUI.addBackToArcadeButton = function ({ backUrl }) {
  // Nie dodawaj drugiego przycisku, jeśli już istnieje
  if (document.querySelector(".arcade-back-btn")) return;

  const btn = document.createElement("button");
  btn.className = "arcade-btn arcade-back-btn";
  btn.textContent = "← Powrót";

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = backUrl;
  });

  document.body.appendChild(btn);
};

/**
 * Prosty loader — elementy z data-arcade-wait="loading"
 * pojawiają się przy ładowaniu i znikają po zakończeniu.
 */
ArcadeUI.showLoading = function () {
  document.querySelectorAll("[data-arcade-wait]").forEach((el) => {
    el.style.display = "block";
  });
};

ArcadeUI.hideLoading = function () {
  document.querySelectorAll("[data-arcade-wait]").forEach((el) => {
    el.style.display = "none";
  });
};

/**
 * Render komunikatu błędu (np. przy ładowaniu gier, progressu itd.)
 */
ArcadeUI.setError = function (msg) {
  const el = document.querySelector("[data-arcade-error]");
  if (el) {
    el.textContent = msg;
    el.style.display = "block";
  }
};

/**
 * Ukrycie błędu
 */
ArcadeUI.clearError = function () {
  const el = document.querySelector("[data-arcade-error]");
  if (el) el.style.display = "none";
};

/**
 * Wstrzyknięcie HTML kafelków gry
 */
ArcadeUI.renderHTML = function (selector, html) {
  const node = document.querySelector(selector);
  if (!node) return null;
  node.innerHTML = html;
  return node;
};

/**
 * Tworzenie elementu z template string
 */
ArcadeUI.createElement = function (html) {
  const container = document.createElement("div");
  container.innerHTML = html.trim();
  return container.firstElementChild;
};

/**
 * Przewiń do góry
 */
ArcadeUI.scrollTop = function () {
  window.scrollTo({ top: 0, behavior: "smooth" });
};

/**
 * Animowana zmiana tekstu (np. licznik)
 */
ArcadeUI.animateNumber = function (el, to, duration = 350) {
  const from = Number(el.textContent || 0);
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const value = Math.floor(from + (to - from) * progress);
    el.textContent = value;
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
};

// ======================================================================
//  Koniec pliku ui.js
// ======================================================================
