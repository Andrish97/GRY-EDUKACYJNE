🕹️ Neon Arcade – Kompletny Przewodnik Tworzenia Gier

1. Struktura projektu Neon Arcade

Projekt ma jasno określoną strukturę katalogów:

    GRY-EDUKACYJNE/
      index.html
      arcade.html
      confirm.html
      reset.html
      games.json

      css/
        theme.css
        arcade.css
        login.css

      js/
        core/
          auth.js
          auth-bar.js
          progress.js
          ui.js
          game-api.js
        pages/
          index.js
          arcade.js

      games/
        <kategoria>/
          <gra>/
            index.html
            game.js
            game.css
            meta.json

Gry znajdują się wyłącznie w folderze games/.
Core logika aplikacji nie jest modyfikowana przez gry.

------------------------------------------------------------------------

2. Kategorie i spis gier – games.json

Plik games.json steruje listą kategorii oraz gier wyświetlanych w
arcade.html.

Format:

    {
      "categories": [
        {
          "id": "classic",
          "name": "Gry klasyczne",
          "icon": "🎮",
          "folder": "games/classic",
          "games": ["2048", "snake"]
        }
      ]
    }

Zasady dodawania nowych gier:

1.  Jeśli gra pasuje do kategorii – dopisz jej ID do "games".
2.  Jeśli to nowa tematyka – dodaj nową kategorię.
3.  "folder" musi prowadzić do katalogu kategorii.
4.  "games" zawiera nazwy folderów gier z tej kategorii.

------------------------------------------------------------------------

3. Folder gry i pliki w środku

Przykład nowej gry:

    games/logic/memory/
      index.html
      game.js
      game.css
      meta.json

------------------------------------------------------------------------

4. meta.json – opis gry

Każda gra ma własny metadokument:

    {
      "id": "memory",
      "name": "Neon Memory",
      "description": "Znajdź wszystkie pary kart.",
      "icon": "🧠",
      "thumb": null,
      "entry": "index.html"
    }

UWAGA: - id = nazwa folderu gry - entry zawsze "index.html"

arcade.html używa game-api.js, które automatycznie pobiera ten plik.

------------------------------------------------------------------------

5. index.html gry – szablon obowiązkowy

Każda gra musi ładować motyw, core, paska auth i własne pliki.
Szablon do skopiowania:

    <!DOCTYPE html>
    <html lang="pl">
      <head>
        <meta charset="UTF-8" />
        <title>NAZWA GRY – Neon Arcade</title>

        <!-- Motyw globalny -->
        <link rel="stylesheet" href="../../../css/theme.css" />

        <!-- Styl gry -->
        <link rel="stylesheet" href="game.css" />

        <!-- Core logika -->
        <script src="../../../js/core/auth.js" defer></script>
        <script src="../../../js/core/auth-bar.js" defer></script>
        <script src="../../../js/core/progress.js" defer></script>
        <script src="../../../js/core/ui.js" defer></script>

        <!-- Logika gry -->
        <script src="game.js" defer></script>
      </head>

      <body class="arcade-body">
        <!-- Pasek logowania -->
        <div
          data-arcade-auth-bar
          data-after-login="../../../arcade.html"
          data-after-guest="../../../arcade.html"
        ></div>

        <!-- Karta gry -->
        <div class="shell">
          <div class="card">
            <header class="header">
              <div>
                <div class="title">NAZWA GRY</div>
                <div class="subtitle">Krótki opis gry.</div>
              </div>
            </header>

            <div id="game-root">
              <!-- miejsce na całą grę -->
            </div>
          </div>
        </div>
      </body>
    </html>

Nie ładujemy Supabase-js z CDN w grach.
Jest ładowany globalnie na stronach głównych.

------------------------------------------------------------------------

6. game.css – styl gry

Reguły:

-   Styluj tylko elementy wewnątrz gry (#game-root, .game-*).
-   Nie nadpisuj globalnych elementów takich jak .card, .shell, .header.
-   Korzystaj z klas motywu:
    -   arcade-btn
    -   arcade-input
    -   danger, ghost, itp.

------------------------------------------------------------------------

7. game.js – logika gry

Każda gra powinna mieć:

    const GAME_ID = "memory";  // identyczne z meta.json i folderem
    let hasUnsavedChanges = false;
    let LAST_SAVE_DATA = null;

Standard funkcji progresu

Wczytanie progresu:

    function loadProgress() {
      return ArcadeProgress.load(GAME_ID).then(data => {
        if (!data) return;
        // przepisz pola z data -> lokalny stan gry
        LAST_SAVE_DATA = data;
        hasUnsavedChanges = false;
      });
    }

Zapis:

    function saveCurrentSession() {
      const payload = {
        // struktura zależna od gry
      };

      return ArcadeProgress.save(GAME_ID, payload).then(() => {
        LAST_SAVE_DATA = payload;
        hasUnsavedChanges = false;
      });
    }

Reset:

    function clearProgress() {
      return ArcadeProgress.clear(GAME_ID).then(() => {
        LAST_SAVE_DATA = null;
        hasUnsavedChanges = false;
      });
    }

------------------------------------------------------------------------

8. Przyciski gry

Każda gra powinna mieć standardowy zestaw:

    <button id="new-game-btn" class="arcade-btn">Nowa gra</button>
    <button id="save-game-btn" class="arcade-btn">Zapisz</button>
    <button id="reset-record-btn" class="arcade-btn danger">Resetuj rekord</button>

------------------------------------------------------------------------

9. Ostrzeżenia o niezapisanym stanie

W każdej grze:

    window.addEventListener("beforeunload", (e) => {
      if (!hasUnsavedChanges) return;
      e.preventDefault();
      e.returnValue = "";
    });

I guard przy powrocie do Arcade:

    ArcadeUI.addBackToArcadeButton({ backUrl: "../../../arcade.html" });

------------------------------------------------------------------------

10. Checklista tworzenia nowej gry (dla ChatGPT)

Zawsze wykonaj te kroki:

1.  Wybierz ID gry → np. "memory".

2.  Wybierz kategorię lub utwórz nową.

3.  Dopisz grę do games.json.

4.  Utwórz folder:

        games/<kategoria>/<id>/

5.  Dodaj:

    -   meta.json
    -   index.html (z użyciem szablonu)
    -   game.js (z integracją ArcadeProgress i BACK button)
    -   game.css

6.  Nie dotykaj plików core.

7.  Używaj motywu (theme.css).

8.  Używaj ArcadeProgress.load/save/clear.

------------------------------------------------------------------------

11. Przykład minimalnego game.js

    const GAME_ID = "memory";
    let hasUnsavedChanges = false;
    let LAST_SAVE_DATA = null;

    function initGame() {
      ArcadeUI.addBackToArcadeButton({ backUrl: "../../../arcade.html" });

      loadProgress().then(() => {
        setupButtons();
      });
    }

    function setupButtons() {
      document.getElementById("save-game-btn").onclick = () => saveCurrentSession();
      document.getElementById("reset-record-btn").onclick = () => clearProgress();
      document.getElementById("new-game-btn").onclick = () => startNewGame();
    }

    function startNewGame() {
      // gameplay logic
      hasUnsavedChanges = true;
    }

    document.addEventListener("DOMContentLoaded", initGame);

------------------------------------------------------------------------

12. Wersja TL;DR (skrót)

-   Gry dodajesz do games/.
-   Muszą mieć: index.html, game.js, game.css, meta.json.
-   Dodajesz wpis do games.json.
-   Ładujesz motyw i core scripts.
-   W game.js używasz:
    -   ArcadeProgress
    -   ArcadeUI.addBackToArcadeButton
    -   hasUnsavedChanges
-   W index.html gry używasz:
    -   <div data-arcade-auth-bar></div>
    -   .shell, .card, .arcade-btn
-   Nie zmieniasz plików core.

------------------------------------------------------------------------

Koniec przewodnika

Ten dokument jest kompletny i nadaje się jako oficjalny manual tworzenia
gier w Twoim projekcie Neon Arcade.
