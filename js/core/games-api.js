// js/core/game-api.js
(async function () {
  async function fetchJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status + " przy pobieraniu " + url);
    return await res.json();
  }

  async function loadGamesConfig() {
    try {
      return await fetchJSON("games.json"); // albo "games-api/games.json"
    } catch (e) {
      console.error("[ArcadeGameAPI] Problem z games.json:", e);
      // zamiast wywalać wszystko → pusta lista kategorii
      return { categories: [] };
    }
  }

  // ...reszta (loadGameMeta, loadCategoriesWithGames) bez zmian...
})();
