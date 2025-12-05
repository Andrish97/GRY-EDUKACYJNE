// js/core/games-api.js
// Ładuje strukturę gier z:
//  - games.json (kategorie, foldery, ID gier)
//  - meta.json w każdym folderze gry (nazwa, opis, ikonka)

window.ArcadeGames = (() => {
  let configCache = null;      // zawartość games.json
  const metaCache = {};        // cache meta dla poszczególnych gier

  // Wczytuje games.json z katalogu głównego
  async function loadConfig() {
    if (configCache) return configCache;

    try {
      const res = await fetch("games.json", { cache: "no-store" });
      if (!res.ok) {
        console.error("Nie mogę wczytać games.json");
        configCache = { categories: [] };
        return configCache;
      }
      const json = await res.json();
      if (!json.categories || !Array.isArray(json.categories)) {
        console.error("Niepoprawny format games.json (brak categories)");
        configCache = { categories: [] };
        return configCache;
      }
      configCache = json;
      return configCache;
    } catch (e) {
      console.error("Błąd pobierania games.json:", e);
      configCache = { categories: [] };
      return configCache;
    }
  }

  // Wczytuje meta.json dla pojedynczej gry danej kategorii
  async function loadGameMeta(category, gameEntry) {
    const key = `${category.id}:${gameEntry.id}`;
    if (metaCache[key]) return metaCache[key];

    const base = category.folder.replace(/\/+$/, ""); // obetnij końcowe /
    const folder = `${base}/${gameEntry.id}`;
    const metaUrl = `${folder}/meta.json`;

    try {
      const res = await fetch(metaUrl, { cache: "no-store" });
      if (!res.ok) {
        console.warn("Brak meta.json dla gry:", metaUrl);
        // fallback: minimalne dane
        const fallback = {
          id: gameEntry.id,
          slug: gameEntry.id,
          name: gameEntry.id,
          icon: "🎮",
          description: "",
          categoryId: category.id,
          file: `${folder}/index.html`
        };
        metaCache[key] = fallback;
        return fallback;
      }

      const meta = await res.json();
      const game = {
        id: gameEntry.id,                         // identyfikator z games.json
        slug: gameEntry.id,
        name: meta.name || gameEntry.id,
        icon: meta.icon || "🎮",
        description: meta.description || "",
        categoryId: category.id,
        file: `${folder}/index.html`
      };
      metaCache[key] = game;
      return game;
    } catch (e) {
      console.error("Błąd pobierania meta.json:", metaUrl, e);
      const fallback = {
        id: gameEntry.id,
        slug: gameEntry.id,
        name: gameEntry.id,
        icon: "🎮",
        description: "",
        categoryId: category.id,
        file: `${folder}/index.html`
      };
      metaCache[key] = fallback;
      return fallback;
    }
  }

  // Wszystkie kategorie z games.json
  async function getAllCategories() {
    const cfg = await loadConfig();
    return cfg.categories || [];
  }

  // Gry w danej kategorii (z meta)
  async function getGamesForCategory(catId) {
    const cfg = await loadConfig();
    const category = (cfg.categories || []).find(c => c.id === catId);
    if (!category) return [];

    const games = category.games || [];
    const metas = await Promise.all(
      games.map(g => loadGameMeta(category, g))
    );
    return metas;
  }

  // Kategorie + pogrupowane gry (dla launchera)
  async function getGamesGroupedByCategory() {
    const cfg = await loadConfig();
    const grouped = {};

    for (const cat of cfg.categories || []) {
      const games = await getGamesForCategory(cat.id);
      grouped[cat.id] = games;
    }

    return { config: cfg, grouped };
  }

  // Pojedyncza gra po kategorii i id
  async function getGame(categoryId, gameId) {
    const cfg = await loadConfig();
    const category = (cfg.categories || []).find(c => c.id === categoryId);
    if (!category) return null;
    const gameEntry = (category.games || []).find(g => g.id === gameId);
    if (!gameEntry) return null;
    return await loadGameMeta(category, gameEntry);
  }

  return {
    getAllCategories,
    getGamesForCategory,
    getGamesGroupedByCategory,
    getGame
  };
})();
