// pages/arcade.js
// Lista gier jako kafelki w gridzie

(function () {
  function createEl(tag, className, children) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (children) {
      for (const child of children) {
        if (typeof child === "string") {
          el.appendChild(document.createTextNode(child));
        } else if (child instanceof Node) {
          el.appendChild(child);
        }
      }
    }
    return el;
  }

  function renderGames(root, data) {
    root.innerHTML = "";

    // zbierz wszystkie gry z wszystkich kategorii do jednej listy
    const allGames = [];
    data.categories.forEach((cat) => {
      (cat.games || []).forEach((game) => {
        allGames.push({
          ...game,
          categoryName: cat.name,
          categoryIcon: cat.icon || "",
        });
      });
    });

    if (!allGames.length) {
      root.textContent = "Brak gier do wyświetlenia.";
      return;
    }

    // główny grid kafelków
    const grid = createEl("div", "arcade-games-grid");

    allGames.forEach((game) => {
      const card = createEl("article", "arcade-game-card");

      // górna linia: nazwa + (opcjonalnie) ikonka
      const titleRow = createEl("div", "arcade-game-card-header");
      const title = createEl("h3", "arcade-game-title", [
        (game.icon ? game.icon + " " : "") + game.name,
      ]);
      titleRow.appendChild(title);

      // kategoria jako "badge"
      if (game.categoryName) {
        const badge = createEl(
          "span",
          "arcade-game-category",
          [
            (game.categoryIcon ? game.categoryIcon + " " : "") +
              game.categoryName,
          ]
        );
        titleRow.appendChild(badge);
      }

      const desc = createEl("p", "arcade-game-desc", [
        game.description || "",
      ]);

      const footer = createEl("div", "arcade-game-footer");
      const playBtn = createEl(
        "a",
        "arcade-game-play-btn arcade-btn",
        ["Graj"]
      );
      playBtn.href = game.playUrl;

      footer.appendChild(playBtn);

      card.appendChild(titleRow);
      card.appendChild(desc);
      card.appendChild(footer);

      grid.appendChild(card);
    });

    root.appendChild(grid);
  }

  async function initArcade() {
    const root = document.getElementById("games");
    if (!root) {
      console.error("Brak elementu #games w arcade.html");
      return;
    }

    root.textContent = "Ładowanie gier...";

    try {
      const data = await ArcadeGamesAPI.loadAllGames();
      renderGames(root, data);
    } catch (err) {
      console.error("Błąd podczas ładowania listy gier:", err);
      root.textContent =
        "Nie udało się załadować listy gier. Sprawdź konsolę przeglądarki.";
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    initArcade().catch((err) => {
      console.error("Krytyczny błąd inicjalizacji arcade:", err);
    });
  });
})();
