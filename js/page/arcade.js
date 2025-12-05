// js/pages/arcade.js
document.addEventListener("DOMContentLoaded", async () => {
  ArcadeUI.renderTopBar();

  const categories = await ArcadeGames.getAllCategories();
  const catContainer = document.getElementById("categories");
  const gamesContainer = document.getElementById("games");

  function launchGame(file) {
    window.location.href = file + "?fullscreen=1";
  }

  function createGameCard(game) {
    const card = document.createElement("div");
    card.className = "game-card";

    card.onclick = (e) => {
      if (e.target.closest("button")) return;
      launchGame(game.file);
    };

    const thumbWrap = document.createElement("div");
    thumbWrap.className = "thumb-wrap";
    thumbWrap.innerHTML =
      `<div class="thumb-placeholder">${game.icon || "🎮"}</div>`;

    const headline = document.createElement("div");
    headline.className = "game-headline";
    headline.innerHTML = `
      <span class="game-icon">${game.icon || "🎮"}</span>
      <span class="game-name">${game.name}</span>
    `;

    const desc = document.createElement("div");
    desc.className = "game-desc";
    desc.textContent = game.description || "";

    const footer = document.createElement("div");
    footer.className = "game-footer";
    footer.innerHTML = `<span class="pill">Gra</span>`;

    const play = document.createElement("button");
    play.className = "play-btn";
    play.textContent = "Graj";
    play.onclick = (e) => {
      e.stopPropagation();
      launchGame(game.file);
    };
    footer.appendChild(play);

    card.appendChild(thumbWrap);
    card.appendChild(headline);
    card.appendChild(desc);
    card.appendChild(footer);

    return card;
  }

  async function showCategory(catId) {
    gamesContainer.innerHTML = "";
    const games = await ArcadeGames.getGamesForCategory(catId);
    games
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "pl"))
      .forEach(game => gamesContainer.appendChild(createGameCard(game)));
  }

  categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "cat-btn";
    btn.dataset.catId = cat.id;
    btn.innerHTML = `
      <span class="icon">${cat.icon}</span>
      <span>${cat.name}</span>
    `;
    btn.onclick = () => {
      document.querySelectorAll(".cat-btn").forEach(b =>
        b.classList.toggle("active", b === btn)
      );
      showCategory(cat.id);
    };
    catContainer.appendChild(btn);
  });

  const first = catContainer.querySelector(".cat-btn");
  if (first && categories[0]) {
    first.classList.add("active");
    showCategory(categories[0].id);
  }
});
