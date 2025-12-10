// js/pages/arcade.js

(function () {
  const CATEGORIES_CONTAINER_SELECTOR = "#categories";
  const GAMES_SECTION_SELECTOR = "#games-section";
  const GAMES_CONTAINER_SELECTOR = "#games";
  const GAMES_SECTION_TITLE_SELECTOR = "#games-section-title";
  const BACK_BTN_SELECTOR = "#back-to-categories";

  let categories = [];
  const gameMetaCache = new Map();

  function $(sel) {
    return document.querySelector(sel);
  }

  function showLoading() {
    const loader = document.querySelector("[data-arcade-wait]");
    if (loader) loader.style.display = "block";
  }

  function hideLoading() {
    const loader = document.querySelector("[data-arcade-wait]");
    if (loader) loader.style.display = "none";
  }

  function setError(msg) {
    const el = document.querySelector("[data-arcade-error]");
    if (!el) return;
    el.textContent = msg;
    el.style.display = "block";
  }

  function clearError() {
    const el = document.querySelector("[data-arcade-error]");
    if (!el) return;
    el.textContent = "";
    el.style.display = "none";
  }

  // ------------------------------
  // Ładowanie games.json
  // ------------------------------

  function loadCategories() {
    showLoading();
    clearError();

    return fetch("games.json", {
      headers: { "Cache-Control": "no-cache" },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Nie udało się wczytać games.json");
        }
        return res.json();
      })
      .then((data) => {
        categories = (data && data.categories) || [];
        renderCategoryTabs();
      })
      .catch((err) => {
        console.error("[arcade] Błąd ładowania kategorii:", err);
        setError("Nie udało się wczytać listy kategorii.");
      })
      .finally(() => {
        hideLoading();
      });
  }

  // ------------------------------
  // Render zakładek kategorii
  // ------------------------------

  function renderCategoryTabs() {
    const container = $(CATEGORIES_CONTAINER_SELECTOR);
    const gamesSection = $(GAMES_SECTION_SELECTOR);

    if (!container) return;

    container.innerHTML = "";
    if (gamesSection) gamesSection.hidden = true;

    if (!categories.length) {
      container.innerHTML =
        '<p class="arcade-empty">Brak kategorii w games.json.</p>';
      return;
    }

    categories.forEach((cat) => {
      const icon = cat.icon || "";
      const name = cat.name || cat.id;

      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = "category-tab";

      tab.innerHTML = `
        ${icon ? `<span class="icon">${icon}</span>` : ""}
        <span>${name}</span>
      `;

      tab.addEventListener("click", () => onCategoryClick(cat, tab));

      container.appendChild(tab);
    });
  }

  // ------------------------------
  // Kliknięcie kategorii
  // ------------------------------

  function onCategoryClick(category, clickedTab) {
    const tabs = document.querySelectorAll(".category-tab");
    tabs.forEach((t) => t.classList.remove("active"));
    if (clickedTab) clickedTab.classList.add("active");

    const gamesSection = $(GAMES_SECTION_SELECTOR);
    const gamesContainer = $(GAMES_CONTAINER_SELECTOR);
    const titleEl = $(GAMES_SECTION_TITLE_SELECTOR);

    if (!gamesSection || !gamesContainer || !titleEl) return;

    gamesSection.hidden = false;
    gamesContainer.innerHTML = "";
    titleEl.textContent = category.name || category.id;

    showLoading();
    clearError();

    const folder = category.folder;
    const gameIds = category.games || [];

    if (!folder || !gameIds.length) {
      gamesContainer.innerHTML =
        '<p class="arcade-empty">Ta kategoria nie ma jeszcze gier.</p>';
      hideLoading();
      return;
    }

    const promises = gameIds.map((id) => loadGameMeta(folder, id));

    Promise.all(promises)
      .then((allMeta) => {
        const valid = allMeta.filter(Boolean);
        renderGameCards(valid, gamesContainer, category);
      })
      .catch((err) => {
        console.error("[arcade] Błąd ładowania gier kategorii:", err);
        setError("Nie udało się wczytać gier dla tej kategorii.");
      })
      .finally(() => {
        hideLoading();
      });
  }

  function loadGameMeta(folder, gameId) {
    const cacheKey = folder + "/" + gameId;
    if (gameMetaCache.has(cacheKey)) {
      return Promise.resolve(gameMetaCache.get(cacheKey));
    }

    const url = `${folder}/${gameId}/meta.json`;

    return fetch(url, { headers: { "Cache-Control": "no-cache" } })
      .then((res) => {
        if (!res.ok) {
          console.warn("[arcade] meta.json nie wczytane dla", gameId);
          return null;
        }
        return res.json();
      })
      .then((meta) => {
        if (!meta) return null;
        const full = { ...meta, _folder: folder, _id: gameId };
        gameMetaCache.set(cacheKey, full);
        return full;
      })
      .catch((err) => {
        console.error("[arcade] Błąd meta.json dla", gameId, err);
        return null;
      });
  }

  // ------------------------------
  // Render kafelków gier + statystyki
  // ------------------------------

  function renderGameCards(metas, container, category) {
    if (!metas.length) {
      container.innerHTML =
        '<p class="arcade-empty">Ta kategoria ma 0 gier do wyświetlenia.</p>';
      return;
    }

    const frag = document.createDocumentFragment();

    metas.forEach((meta) => {
      const entry = meta.entry || "index.html";
      const href = `${meta._folder}/${meta._id}/${entry}`;
      const icon = meta.icon || category.icon || "🎮";
      const desc = meta.description || "";
      const gameId = meta.id || meta._id;

      const card = document.createElement("a");
      card.href = href;
      card.className = "game-card";

      card.innerHTML = `
        <div class="thumb-wrap">
          <div class="thumb-placeholder">${icon}</div>
        </div>
        <div class="game-headline">
          <span class="game-icon">${icon}</span>
          <span class="game-name">${meta.name || meta.id}</span>
        </div>
        <div class="game-desc">${desc}</div>
        <div class="game-stats" data-game-stats="${gameId}">
          Statystyki: ładowanie…
        </div>
        <div class="game-footer">
          <span class="pill">${category.name || category.id}</span>
          <button class="play-btn" type="button">Graj</button>
        </div>
      `;

      const playBtn = card.querySelector(".play-btn");
      if (playBtn) {
        playBtn.addEventListener("click", function (e) {
          e.preventDefault();
          card.click();
        });
      }

      frag.appendChild(card);

      // asynchroniczne wczytanie statystyk z ArcadeProgress
      loadGameStats(gameId);
    });

    container.innerHTML = "";
    container.appendChild(frag);
  }

  // ------------------------------
  // Statystyki gry z ArcadeProgress
  // ------------------------------

  function loadGameStats(gameId) {
    if (!window.ArcadeProgress || !ArcadeProgress.load) {
      // Brak systemu progresu — ukrywamy tekst
      const statEls = document.querySelectorAll(
        `.game-stats[data-game-stats="${gameId}"]`
      );
      statEls.forEach((el) => {
        el.textContent = "Statystyki niedostępne.";
      });
      return;
    }

    ArcadeProgress.load(gameId)
      .then((data) => {
        const statEls = document.querySelectorAll(
          `.game-stats[data-game-stats="${gameId}"]`
        );

        if (!statEls.length) return;

        if (!data) {
          statEls.forEach((el) => {
            el.textContent = "Brak zapisanych wyników.";
          });
          return;
        }

        const best = typeof data.bestScore === "number" ? data.bestScore : null;
        const total =
          typeof data.totalGames === "number" ? data.totalGames : null;

        let text = "";

        if (best != null && total != null) {
          text = `Rekord: ${best} • Rozegrane: ${total}`;
        } else if (best != null) {
          text = `Rekord: ${best}`;
        } else if (total != null) {
          text = `Rozegrane: ${total}`;
        } else {
          text = "Brak zapisanych wyników.";
        }

        statEls.forEach((el) => {
          el.textContent = text;
        });
      })
      .catch((err) => {
        console.error("[arcade] Błąd ładowania statystyk dla", gameId, err);
        const statEls = document.querySelectorAll(
          `.game-stats[data-game-stats="${gameId}"]`
        );
        statEls.forEach((el) => {
          el.textContent = "Statystyki chwilowo niedostępne.";
        });
      });
  }

  // ------------------------------
  // Powrót do listy kategorii
  // ------------------------------

  function setupBackButton() {
    const backBtn = $(BACK_BTN_SELECTOR);
    const gamesSection = $(GAMES_SECTION_SELECTOR);

    if (!backBtn || !gamesSection) return;

    backBtn.addEventListener("click", function () {
      gamesSection.hidden = true;
      clearError();

      const tabs = document.querySelectorAll(".category-tab");
      tabs.forEach((t) => t.classList.remove("active"));
    });
  }

  // ------------------------------
  // Inicjalizacja
  // ------------------------------

  document.addEventListener("DOMContentLoaded", function () {
    setupBackButton();
    loadCategories();
    
  if (window.ArcadeCoins && ArcadeCoins.load) {
    ArcadeCoins.load().then(function (balance) {
      const el = document.getElementById("arcade-wallet-balance");
      if (el) {
        el.textContent = balance.toString();
      }
    });
  }
});
