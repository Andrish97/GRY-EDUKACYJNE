# NEON ARCADE – Kompletny przewodnik (2025)

Ten plik opisuje **aktualny** układ Neon Arcade w repo `GRY-EDUKACYJNE/` (GitHub Pages) i zasady tworzenia gier **zgodne z najnowszymi wytycznymi**:
- pasek logowania **zawsze** jest wstrzykiwany przez `auth-bar.js`,
- **powrót do Arcade jest w auth-barze** (nie ma już „pływającego” przycisku),
- na małym ekranie auth-bar jest **kompaktowy** (pokazuje tylko **Login** / **Gość**, a formularz rozwija się jako drawer),
- monety 💎 są globalne i widoczne w auth-barze,
- progres zapisujesz przez `ArcadeProgress`,
- gry ładujesz z `games.json`,
- (opcjonalnie) gry mogą odblokowywać nagrody w „Pokoju” przez `room-api.js`.

---

## 1. Co to jest Neon Arcade?

Neon Arcade to modularna platforma webowa do uruchamiania mini‑gier HTML/JS/CSS. Zapewnia:

- **globalne logowanie** (Supabase),
- **tryb gościa** (localStorage),
- **monety 💎** (Supabase dla zalogowanego),
- **zapis progresu** (Supabase lub localStorage),
- **pasek logowania** w każdej stronie poprzez `data-arcade-auth-bar`,
- **responsywny UI** (desktop + mobile),
- **automatyczne ładowanie listy gier** z `games.json`,
- **spójny motyw** (`css/theme.css`),
- **layout gier** (jeśli używasz osobnego `css/game-layout.css`).

Każda gra to osobny mini‑projekt w `games/<kategoria>/<gra>/`.

---

## 2. Struktura projektu

> Uwaga: poniżej jest **zalecana** struktura i nazwy plików. Najważniejsze jest, żeby ścieżki w HTML były poprawne.

```
GRY-EDUKACYJNE/
│
├── css/
│    ├── theme.css          # GLOBAL: tło, typografia, auth-bar (w tym powrót + mobile)
│    ├── arcade.css         # TYLKO launcher (kafelki gier itp.)
│    ├── login.css          # (opcjonalnie) osobny styl dla strony logowania
│    └── game-layout.css    # (opcjonalnie) layout gier: header/stats/stage/footer
│
├── js/
│    ├── core/
│    │     ├── auth.js          # Supabase auth + ArcadeAuthUI
│    │     ├── auth-bar.js      # Pasek logowania + 💎 + powrót do Arcade
│    │     ├── coins.js         # Monety 💎 (Supabase)
│    │     ├── progress.js      # Progres (Supabase lub localStorage)
│    │     ├── game-api.js      # Loader gier z games.json + meta.json
│    │     ├── ui.js            # Lekkie helpery UI (bez przycisku powrotu)
│    │     └── room-api.js      # (opcjonalnie) odblokowywanie nagród do Pokoju
│    │
│    ├── pages/
│    │     ├── arcade.js        # Logika strony arcade.html
│    │     └── index.js         # Logika strony index.html (landing)
│    │
│    └── arcade.js / index.js   # (jeśli nie używasz folderu pages/)
│
├── games/
│    └── <kategoria>/<gra>/
│           ├── index.html
│           ├── game.js
│           ├── game.css
│           └── meta.json
│
├── arcade.html
├── index.html
├── confirm.html
├── reset.html
├── games.json
└── favicon.ico
```

---

## 3. `games.json` – rejestr kategorii i gier

`games.json` jest **jedynym** źródłem prawdy o kategoriach i listach gier. Format:

```json
{
  "categories": [
    {
      "id": "classic",
      "name": "Gry Klasyczne",
      "icon": "🕹️",
      "folder": "games/classic",
      "games": ["2048", "snake"]
    }
  ]
}
```

Zasady:
- `folder` wskazuje katalog kategorii (bez końcowego `/`),
- `games` to lista folderów gier w tej kategorii,
- `id` powinno być unikalne i małe (bez spacji).

---

## 4. `meta.json` – opis gry

Każda gra ma `meta.json` w swoim folderze:

```json
{
  "id": "2048",
  "name": "Neon 2048",
  "description": "Połącz kafelki do 2048.",
  "icon": "🔢",
  "thumb": null,
  "entry": "index.html"
}
```

Zasady:
- `id` = identyfikator do progresu i monet (używaj w `ArcadeProgress.save/load`, `ArcadeCoins.addForGame`),
- `entry` zwykle `index.html`,
- `thumb` może być `null` (wtedy launcher użyje ikony emoji).

---

## 5. `arcade.html` – launcher gier

Minimalny układ:

```html
<body class="arcade-body">
  <div data-arcade-auth-bar></div>

  <div class="shell">
    <div class="card">
      <div class="header">
        <div class="title">NEON ARCADE</div>
        <div class="subtitle">Wybierz grę</div>
      </div>

      <div class="categories-row" id="categories"></div>
      <div id="games"></div>

      <div data-arcade-error style="display:none"></div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" defer></script>
  <script src="js/core/auth.js" defer></script>
  <script src="js/core/coins.js" defer></script>
  <script src="js/core/auth-bar.js" defer></script>
  <script src="js/core/ui.js" defer></script>

  <script src="js/core/game-api.js" defer></script>
  <script src="js/pages/arcade.js" defer></script>
</body>
```

Najczęstszy błąd: **złe ścieżki** (`/js/...` vs `js/...`, albo `games/js/...`).

---

## 6. `index.html` (landing / logowanie)

Jeśli masz stronę startową, trzymaj ją prosto:
- możesz mieć tam auth‑bar,
- albo własny panel logowania (jeśli chcesz oddzielnie).

Ważne: jeśli użytkownik jest zalogowany, możesz przekierowywać na `arcade.html`.

---

## 7. `index.html` gry – minimalny szablon (AKTUALNE WYTYCZNE)

Każda gra:
- ładuje **globalny motyw** `theme.css`,
- **opcjonalnie** ładuje `game-layout.css` (zalecane, jeśli chcesz wspólny layout gier),
- ładuje swój `game.css`,
- wstawia `data-arcade-auth-bar` (z `data-back-url`!),  
- (opcjonalnie) wstawia layout gry (header/stats/stage/footer).

### 7.1 Minimalna wersja (bez layoutu)

```html
<link rel="stylesheet" href="../../../css/theme.css">
<link rel="stylesheet" href="game.css">

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" defer></script>
<script src="../../../js/core/auth.js" defer></script>
<script src="../../../js/core/progress.js" defer></script>
<script src="../../../js/core/coins.js" defer></script>
<script src="../../../js/core/auth-bar.js" defer></script>
<script src="../../../js/core/ui.js" defer></script>

<script src="game.js" defer></script>

<body class="arcade-body arcade-game">
  <div data-arcade-auth-bar data-back-url="../../../arcade.html"></div>
  <div id="game-mount"></div>
</body>
```

### 7.2 Zalecana wersja (z `game-layout.css`)

```html
<link rel="stylesheet" href="../../../css/theme.css">
<link rel="stylesheet" href="../../../css/game-layout.css">
<link rel="stylesheet" href="game.css">
```

> `game.css` jest tylko dla „wnętrza” gry (plansza, kafelki, canvas, itp.).  
> Layout nagłówka/przycisków/statów robi `game-layout.css`.

### 7.3 Favicon (wymagane)

Każda gra ma używać favicon z root:

```html
<link rel="icon" href="../../../favicon.ico">
<link rel="shortcut icon" href="../../../favicon.ico">
```

---

## 8. Pasek logowania (auth-bar) – jak działa teraz

Wstawiasz w HTML:

```html
<div data-arcade-auth-bar data-back-url="../../../arcade.html"></div>
```

Co zawiera:
- powrót do Arcade (desktop: `← Arcade`, mobile: `←`),
- status użytkownika,
- licznik 💎,
- logowanie / rejestracja / reset hasła / wylogowanie / gość,
- tryb **kompaktowy na mobile**:
  - domyślnie widzisz tylko **Login** i **Gość**,
  - kliknięcie **Login** rozwija drawer z polami.

> **Nie używamy już pływającego przycisku powrotu.**  
> Powrót jest częścią auth‑bara (spójny UI i brak zasłaniania).

---

## 9. System monet 💎 (`coins.js`)

Najważniejsze funkcje:

```js
await ArcadeCoins.load();
const coins = await ArcadeCoins.getBalance();
await ArcadeCoins.addForGame(gameId, amount, meta);
```

Przykład w grze (nagroda po zakończeniu):

```js
await ArcadeCoins.addForGame("2048", 5, { reason: "game_over", score });
await ArcadeAuthUI.refreshCoins(); // odśwież licznik w barze
```

Zasady:
- monety są **tylko dla zalogowanych** (gość nie dostaje monet),
- zapis jest w Supabase,
- UI licznika jest globalnie w auth‑barze.

---

## 10. System progresu (`progress.js`)

API:

```js
const save = await ArcadeProgress.load("2048");
await ArcadeProgress.save("2048", { bestScore, totalGames, ... });
```

Zasady:
- **zalogowany** → zapis do Supabase,
- **gość** → zapis do localStorage,
- gra nie używa Supabase bezpośrednio.

---

## 11. UI helpery (`ui.js`) – odchudzony

`ui.js` jest tylko do drobnych rzeczy (loading/error/render/animacje liczników).  
**Nie ma tam przycisku powrotu** (bo powrót jest w auth‑barze).

Przykłady:

```js
ArcadeUI.setError("Nie udało się wczytać listy gier.");
ArcadeUI.clearError();
ArcadeUI.showLoading();
ArcadeUI.hideLoading();
ArcadeUI.renderHTML("#games", html);
ArcadeUI.animateNumber(el, 1234);
```

---

## 12. Tworzenie nowej gry (checklista)

1) Tworzysz folder:

```
games/<kategoria>/<nowagra>/
```

2) Dodajesz pliki:
- `index.html`
- `game.js`
- `game.css`
- `meta.json`

3) Dopisujesz grę do `games.json` w odpowiedniej kategorii.

4) W `game.js`:
- ustaw `GAME_ID`,
- wczytaj progres (`ArcadeProgress.load`),
- zapisuj progres (`ArcadeProgress.save`),
- jeśli nagradzasz: `ArcadeCoins.addForGame` + `ArcadeAuthUI.refreshCoins`.

---

## 13. Template nowej gry (kopiuj‑wklej)

### 13.1 `meta.json`

```json
{
  "id": "nowagra",
  "name": "Nowa Gra",
  "description": "Opis gry.",
  "icon": "🎮",
  "thumb": null,
  "entry": "index.html"
}
```

### 13.2 `index.html`

```html
<!doctype html>
<html lang="pl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Nowa Gra</title>

    <link rel="icon" href="../../../favicon.ico">
    <link rel="shortcut icon" href="../../../favicon.ico">

    <link rel="stylesheet" href="../../../css/theme.css">
    <link rel="stylesheet" href="../../../css/game-layout.css">
    <link rel="stylesheet" href="game.css">

    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" defer></script>
    <script src="../../../js/core/auth.js" defer></script>
    <script src="../../../js/core/progress.js" defer></script>
    <script src="../../../js/core/coins.js" defer></script>
    <script src="../../../js/core/auth-bar.js" defer></script>
    <script src="../../../js/core/ui.js" defer></script>

    <!-- (opcjonalnie) Room API -->
    <!-- <script src="../../../js/core/room-api.js" defer></script> -->

    <script src="game.js" defer></script>
  </head>

  <body class="arcade-body arcade-game">
    <div data-arcade-auth-bar data-back-url="../../../arcade.html"></div>

    <!-- jeśli używasz game-layout.css: -->
    <div class="ga-shell">
      <section class="ga-card">
        <div class="ga-topbar">
          <h1 class="ga-title" id="ga-title">Nowa Gra</h1>
          <div class="ga-actions">
            <button class="ga-btn ga-btn-primary" id="btn-new"><span class="ico">🔁</span>Nowa</button>
            <button class="ga-btn ga-btn-secondary" id="btn-save" hidden><span class="ico">💾</span>Zapisz</button>
            <button class="ga-btn ga-btn-ghost" id="btn-pause" hidden>
              <span class="ico" id="pause-ico">▶</span><span id="pause-txt">Wznów</span>
            </button>
            <button class="ga-btn-mini" id="btn-stats"><span class="ico">📊</span>Staty</button>
          </div>
        </div>

        <section class="ga-stats-panel" id="stats-panel">
          <div class="ga-stats">
            <div class="ga-stat c1"><span class="k">Stat 1</span><span class="v" id="v-s1">0</span></div>
            <div class="ga-stat c2"><span class="k">Stat 2</span><span class="v" id="v-s2">0</span></div>
          </div>
          <div class="ga-stats-actions">
            <button class="ga-record-reset" id="btn-reset-best">resetuj rekord</button>
            <button class="ga-btn-mini" id="btn-stats-close">Zamknij</button>
          </div>
        </section>

        <div class="ga-stage">
          <div id="game-mount"></div>
        </div>

        <footer class="ga-footer">
          <div class="ga-controls-slot" id="controls-slot" style="--controls-h:auto">
            <!-- gra może tu dodać przyciski dotykowe -->
          </div>
          <div class="ga-hints" id="hints-slot">
            <!-- opcjonalne hinty za 💎 -->
          </div>
        </footer>
      </section>
    </div>

    <script>
      document.addEventListener("DOMContentLoaded", () => {
        const panel = document.getElementById("stats-panel");
        document.getElementById("btn-stats")?.addEventListener("click", () => panel?.classList.toggle("open"));
        document.getElementById("btn-stats-close")?.addEventListener("click", () => panel?.classList.remove("open"));
      });
    </script>
  </body>
</html>
```

### 13.3 `game.js` (szkielet)

```js
const GAME_ID = "nowagra";

document.addEventListener("DOMContentLoaded", async () => {
  // wczytaj zapis
  const save = await ArcadeProgress.load(GAME_ID);

  // TODO: zainicjalizuj stan gry na podstawie save
  // np. bestScore = save?.bestScore ?? 0

  // przykładowy zapis na klik:
  const btnSave = document.getElementById("btn-save");
  btnSave?.addEventListener("click", async () => {
    await ArcadeProgress.save(GAME_ID, { /* ... */ });
  });
});
```

---

## 14. RWD – dopasowanie gier

Zasady:
- nie rób „pudełka” większego niż viewport,
- jeśli masz duży obszar gry (np. canvas), dopasuj go do `ga-stage`,
- przy sterowaniu dotykowym używaj slotu `#controls-slot` i ustawiaj `--controls-h`.

Jeśli nie używasz `game-layout.css`, nadal pilnuj:

```css
#game-mount { min-height: calc(100vh - 64px); }
```

---

## 15. Reset hasła i aktywacja konta

- `confirm.html` — strona po kliknięciu linku aktywacyjnego
- `reset.html` — strona po kliknięciu linku resetu hasła

Supabase przekierowuje użytkownika automatycznie na ustawione URL w `auth.js` (np. `ARCADE_BASE_URL + "/confirm.html"`).

---

## 16. Troubleshooting (najczęstsze)

- **404 na plikach core** → zła ścieżka (`../../../js/core/...` vs `../../...`),
- **brak listy gier** → sprawdź `games.json` i ścieżkę do `game-api.js`,
- **monety nie rosną** → sprawdź, czy nagradzasz po warunku (np. koniec gry) i czy user jest zalogowany,
- **AuthSessionMissingError** → normalne przy braku sesji (traktuj jako niezalogowany),
- **Failed to fetch / ERR_NAME_NOT_RESOLVED** → problem DNS/Wi‑Fi (kawiarnie potrafią blokować domeny).

---

# 🏠 Neon Arcade — API Pokoju (Room API)

Dokumentacja dla twórców gier  
**Wersja API: 2.0**

Neon Room to wirtualny pokój gracza, w którym można umieszczać meble,
dekoracje, trofea oraz przedmioty odblokowywane przez gry. Silnik pokoju jest
wspólny dla całej platformy — każda gra może przyznawać nagrody wizualne, które
gracz zobaczy później w swoim pokoju.

## 1. Integracja gry z API pokoju

W grze dodaj:

```html
<script src="../../../js/core/room-api.js" defer></script>
```

Po załadowaniu możesz używać globalnego obiektu:

```js
ArcadeRoom
```

## 2. Odblokowywanie przedmiotu z poziomu gry

Przykład:

```js
ArcadeRoom.unlockItemType("trophy_gold", {
  fromGameId: "moja_gra",
  meta: { reason: "score_1000" }
});
```

## 3. Struktura danych zapisywana do pokoju

Przykładowo:

```json
{
  "version": 2,
  "unlockedItemTypes": {
    "trophy_gold": {
      "unlocked": true,
      "fromGameId": "moja_gra",
      "meta": { "reason": "score_1000" }
    }
  },
  "instances": []
}
```

## 4. Jak tworzyć trofea i przedmioty dla pokoju

Każdy przedmiot jest opisany w:

```
data/room-items.json
```

## 5. Połączenie: monety + nagrody wizualne

```js
await ArcadeCoins.addForGame("moja_gra", 10, { reason: "win" });
await ArcadeAuthUI.refreshCoins();

ArcadeRoom.unlockItemType("trophy_gold", {
  fromGameId: "moja_gra",
  meta: { difficulty: "hard" }
});
```

## 6. Testowanie

1) Uruchom grę.  
2) Wywołaj sytuację nagrody.  
3) Sprawdź konsolę (np. log w room-api).  
4) Wejdź do `room.html`.

## 7. Czego gra nie powinna robić

- nie tworzy instancji przedmiotów,
- nie zmienia pozycji,
- nie modyfikuje `room-items.json`.

## 8. Ściągawka API

```js
ArcadeRoom.unlockItemType("item_id", { fromGameId: "gra_id", meta: {} });
```

## 9. Przykład integracji

```js
if (finalScore >= 5000) {
  await ArcadeCoins.addForGame("space_shooter", 12, { reason: "big_win" });
  await ArcadeAuthUI.refreshCoins();

  ArcadeRoom.unlockItemType("trophy_space_crystal", {
    fromGameId: "space_shooter",
    meta: { score: finalScore }
  });
}
```

---
**Koniec pliku.**
