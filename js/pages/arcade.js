// js/pages/arcade.js
(function () {
  const CATEGORIES_CONTAINER_SELECTOR = "#categories";
  const GAMES_CONTAINER_SELECTOR = "#games";

  let categories = [];
  const gameMetaCache = new Map();
  let activeCategoryId = null;

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
  // Pokój nagród: tylko dla zalogowanego
  // ------------------------------

  async function updateRoomButtonVisibility() {
    const btn = $("#room-btn");
    if (!btn) return;

    try {
      const user = await window.ArcadeAuth?.getUser?.();
      btn.hidden = !user;
    } catch {
      btn.hidden = true;
    }
  }

  // ------------------------------
  // Ładowanie games.json
  // ------------------------------

  function loadCategories() {
    showLoading();
    clearError();

    return fetch("games.json", { headers: { "Cache-Control": "no-cache" } })
      .then((res) => {
        if (!res.ok) throw new Error("Nie udało się wczytać games.json");
        return res.json();
      })
      .then((data) => {
        categories = (data && data.categories) || [];
        renderCategoryTabs();

        // Domyślnie otwieramy pierwszą kategorię
        if (categories.length) {
          selectCategory(categories[0].id);
        } else {
          const gamesContainer = $(GAMES_CONTAINER_SELECTOR);
          if (gamesContainer) gamesContainer.innerHTML = "";
        }
      })
      .catch((err) => {
        console.error("[arcade] Błąd ładowania kategorii:", err);
        setError("Nie udało się wczytać listy kategorii.");
      })
      .finally(() => hideLoading());
  }

  // ------------------------------
  // Render zakładek kategorii
  // ------------------------------

  function renderCategoryTabs() {
    const container = $(CATEGORIES_CONTAINER_SELECTOR);
    if (!container) return;

    container.innerHTML = "";

    if (!categories.length) {
      container.innerHTML = '<p class="arcade-empty">Brak kategorii w games.json.</p>';
      return;
    }

    categories.forEach((cat) => {
      const icon = cat.icon || "📁";
      const name = cat.name || cat.id;

      const tab = document.createElement("div");
      tab.className = "category-tab";
      tab.setAttribute("role", "tab");
      tab.setAttribute("tabindex", "0");
      tab.dataset.catId = cat.id;

      tab.innerHTML = `
        <span class="icon">${icon}</span>
        <span class="label">${name}</span>
      `;

      tab.addEventListener("click", () => selectCategory(cat.id));
      tab.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectCategory(cat.id);
        }
      });

      container.appendChild(tab);
    });
  }

  // ------------------------------
  // Wybór kategorii
  // ------------------------------

  function selectCategory(catId) {
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return;

    activeCategoryId = catId;

    // active tab
    document.querySelectorAll(".category-tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.catId === catId);
    });

    // render gier
    loadGamesForCategory(cat);
  }

  function loadGamesForCategory(category) {
    const gamesContainer = $(GAMES_CONTAINER_SELECTOR);
    if (!gamesContainer) return;

    gamesContainer.innerHTML = "";
    showLoading();
    clearError();

    const folder = category.folder;
    const gameIds = category.games || [];

    if (!folder || !gameIds.length) {
      gamesContainer.innerHTML = '<p class="arcade-empty">Brak gier w tej kategorii.</p>';
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
      .finally(() => hideLoading());
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
  // Render kafelków gier (odchudzony)
  // - miniatura (emoji)
  // - nazwa
  // - statystyki (rekord / rozegrane)
  // ------------------------------

  function renderGameCards(metas, container, category) {
    if (!metas.length) {
      container.innerHTML = '<p class="arcade-empty">Ta kategoria ma 0 gier.</p>';
      return;
    }

    const frag = document.createDocumentFragment();

    metas.forEach((meta) => {
      const entry = meta.entry || "index.html";
      const href = `${meta._folder}/${meta._id}/${entry}`;
      const icon = meta.icon || category.icon || "🎮";
      const gameId = meta.id || meta._id;

      const card = document.createElement("a");
      card.href = href;
      card.className = "game-card";

      card.innerHTML = `
        <div class="thumb-wrap">
          <div class="thumb-placeholder">${icon}</div>
        </div>

        <div class="game-headline">
          <span class="game-name">${meta.name || meta.id}</span>
        </div>

        <div class="game-stats" data-game-stats="${gameId}">
          Rekord: – • Rozegrane: –
        </div>
      `;

      frag.appendChild(card);

      // wczytanie statów async
      loadGameStats(gameId);
    });

    container.innerHTML = "";
    container.appendChild(frag);
  }

  // ------------------------------
  // Statystyki gry z ArcadeProgress
  // ------------------------------

  function loadGameStats(gameId) {
    const statEls = document.querySelectorAll(`.game-stats[data-game-stats="${gameId}"]`);
    if (!statEls.length) return;

    if (!window.ArcadeProgress || !ArcadeProgress.load) {
      statEls.forEach((el) => (el.textContent = "Statystyki niedostępne."));
      return;
    }

    ArcadeProgress.load(gameId)
      .then((data) => {
        if (!data) {
          statEls.forEach((el) => (el.textContent = "Rekord: – • Rozegrane: –"));
          return;
        }

        const best = typeof data.bestScore === "number" ? data.bestScore : null;
        const total = typeof data.totalGames === "number" ? data.totalGames : null;

        const bestTxt = best != null ? String(best) : "–";
        const totalTxt = total != null ? String(total) : "–";

        statEls.forEach((el) => {
          el.textContent = `Rekord: ${bestTxt} • Rozegrane: ${totalTxt}`;
        });
      })
      .catch((err) => {
        console.error("[arcade] Błąd ładowania statystyk dla", gameId, err);
        statEls.forEach((el) => (el.textContent = "Rekord: – • Rozegrane: –"));
      });
  }

  // ------------------------------
  // Inicjalizacja
  // ------------------------------

  document.addEventListener("DOMContentLoaded", function () {
    updateRoomButtonVisibility();

    // jeśli auth się zmieni (login/logout) -> odśwież widoczność room
    if (window.ArcadeAuth?.onAuthStateChange) {
      window.ArcadeAuth.onAuthStateChange(() => updateRoomButtonVisibility());
    }

    loadCategories();
  });
})();
