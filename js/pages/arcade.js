// js/pages/arcade.js
// Lista gier jako kafelki zgodne z css/arcade.css

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

    const allGames = [];
    data.categories.forEach((cat) => {
      (cat.games || []).forEach((game) => {
        allGames.push({
          ...game,
          categoryName: cat.name,
          categoryId: cat.id,
          categoryIcon: cat.icon || "",
        });
      });
    });

    if (!allGames.length) {
      root.textContent = "Brak gier do wyświetlenia.";
      return;
    }

    // #games ma display:grid w css/arcade.css, więc każdy .game-card będzie kafelkiem
    allGames.forEach((game) => {
      const emoji =
        game.icon && String(game.icon).trim().length > 0 ? game.icon : "🎮";

      const card = createEl("article", "game-card");

      // „miniaturka” z emoji
      const thumbWrap = createEl("div", "thumb-wrap");
      const thumb = createEl("div", "thumb-placeholder", [emoji]);
      thumbWrap.appendChild(thumb);

      // nagłówek karty: ikonka + nazwa gry
      const headline = createEl("div", "game-headline");
      const iconSpan = createEl("span", "game-icon", [emoji]);
      const nameSpan = createEl("span", "game-name", [game.name]);
      headline.appendChild(iconSpan);
      headline.appendChild(nameSpan);

      // opis
      const desc = createEl("p", "game-desc", [game.description || ""]);

      // dół karty: kategoria + przycisk „Graj”
      const footer = createEl("div", "game-footer");
      const pillText = (game.categoryName || "").toUpperCase();
      const pill = createEl("span", "pill", [pillText || "GRA"]);

      const playBtn = createEl("button", "play-btn", ["Graj"]);
      playBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        window.location.href = game.playUrl;
      });

      footer.appendChild(pill);
      footer.appendChild(playBtn);

      // kliknięcie w całą kartę też odpala grę
      card.addEventListener("click", () => {
        window.location.href = game.playUrl;
      });

      card.appendChild(thumbWrap);
      card.appendChild(headline);
      card.appendChild(desc);
      card.appendChild(footer);

      // ważne: bez dodatkowych wrapperów – .game-card jest bezpośrednim dzieckiem #games
      root.appendChild(card);
    });
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
