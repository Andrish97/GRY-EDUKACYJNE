
// js/core/game-api.js
// Proste API do ładowania listy gier z games.json + meta.json każdej gry.

(async function () {
  async function fetchJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status + " przy pobieraniu " + url);
    return await res.json();
  }

  /**
   * Ładuje surowy config z games.json
   * Zwraca obiekt { categories: [...] }
   */
  async function loadGamesConfig() {
    try {
      return await fetchJSON("games.json"); // albo "games-api/games.json"
    } catch (e) {
      console.error("[ArcadeGameAPI] Problem z games.json:", e);
      // zamiast wywalać wszystko → pusta lista kategorii
      return { categories: [] };
    }
  }

  /**
   * Ładuje meta.json dla konkretnej gry.
   * @param {string} folder - np. "games/classic"
   * @param {string} gameId - np. "2048"
   *
   * OCZEKIWANY meta.json:
   * {
   *   id: "2048",
   *   name: "Neon 2048",
   *   description: "...",
   *   icon: "🔢",
   *   thumb: null,
   *   entry: "index.html"
   * }
   */
  async function loadGameMeta(folder, gameId) {
    const base = folder.replace(/\/$/, "");      // bez końcowego /
    const path = `${base}/${gameId}/meta.json`;
    try {
      const meta = await fetchJSON(path);

      const entry = meta.entry || "index.html";
      const url = `${base}/${gameId}/${entry}`;

      return {
        id: meta.id || gameId,
        name: meta.name || gameId,
        description: meta.description || "",
        icon: meta.icon || "🎮",
        thumb: meta.thumb || null,
        url
      };
    } catch (e) {
      console.error("[ArcadeGameAPI] Brak lub błąd meta dla gry:", folder, gameId, e);
      return null;
    }
  }

  /**
   * Główna funkcja używana przez arcade.html:
   *
   * Zwraca tablicę kategorii:
   * [
   *   {
   *     id, name, icon,
   *     games: [
   *       { id, name, description, icon, thumb, url }
   *     ]
   *   }
   * ]
   */
  async function loadCategoriesWithGames() {
    const cfg = await loadGamesConfig();
    const result = [];

    const categories = cfg.categories || [];
    for (const cat of categories) {
      const folder = cat.folder;
      const ids = cat.games || [];
      const games = [];

      for (const gameId of ids) {
        const meta = await loadGameMeta(folder, gameId);
        if (meta) games.push(meta);
      }

      // sortowanie po nazwie
      games.sort((a, b) => a.name.localeCompare(b.name, "pl"));

      result.push({
        id: cat.id,
        name: cat.name,
        icon: cat.icon || "🎮",
        games
      });
    }

    return result;
  }

  window.ArcadeGameAPI = {
    loadGamesConfig,
    loadGameMeta,
    loadCategoriesWithGames
  };
})();
