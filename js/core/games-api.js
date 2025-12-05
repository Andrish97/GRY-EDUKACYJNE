// js/core/games-api.js
window.ArcadeGames = (() => {
  let configCache = null;
  const metaCache = {};

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
        console.error("Niepoprawny format games.json");
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

  async function loadGameMeta(category, gameEntry) {
    const key = `${category.id}:${gameEntry.id}`;
    if (metaCache[key]) return metaCache[key];

    const base = category.folder.replace(/\/+$/, "");
    const folder = `${base}/${gameEntry.id}`;
    const metaUrl = `${folder}/meta.json`;

    try {
      const res = await fetch(metaUrl, { cache: "no-store" });
      if (!res.ok) {
        console.warn("Brak meta.json dla gry:", metaUrl);
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
        id: gameEntry.id,
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

  async function getAllCategories() {
    const cfg = await loadConfig();
    return cfg.categories || [];
  }

  async function getGamesForCategory(catId) {
    const cfg = await loadConfig();
    const category = (cfg.categories || []).find(c => c.id === catId);
    if (!category) return [];

    const items = category.games || [];
    const metas = await Promise.all(items.map(g => loadGameMeta(category, g)));
    return metas;
  }

  async function getGamesGroupedByCategory() {
    const cfg = await loadConfig();
    const grouped = {};
    for (const cat of cfg.categories || []) {
      grouped[cat.id] = await getGamesForCategory(cat.id);
    }
    return { config: cfg, grouped };
  }

  return {
    getAllCategories,
    getGamesForCategory,
    getGamesGroupedByCategory
  };
})();
