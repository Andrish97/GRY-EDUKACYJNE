# 🕹️ Neon Arcade — przewodnik tworzenia gier (z monetami)

Ten dokument opisuje, **jak tworzyć nowe gry** w projekcie `GRY-EDUKACYJNE`, tak aby:

- pasowały do istniejącej architektury,
- korzystały z logowania (Supabase),
- korzystały z paska (`auth-bar`),
- używały systemu progresu (`ArcadeProgress`),
- używały systemu monet (`ArcadeCoins`),
- miały **uniwersalny przycisk powrotu**,
- były dopasowane do **wysokości okna** (bez przewijania w typowych warunkach),
- korzystały z motywu (`theme.css`).

Przewodnik jest przeznaczony:
- dla programisty,
- dla ChatGPT (instrukcja, co generować).

---

## 0. Struktura projektu

Docelowa struktura:

```text
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
      coins.js
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
```

Gry nie modyfikują plików w `core/` ani `theme.css`.

---

## 1. Kategorie i lista gier — `games.json`

```json
{
  "categories": [
    {
      "id": "classic",
      "name": "Gry klasyczne",
      "icon": "🎮",
      "folder": "games/classic",
      "games": ["2048", "snake"]
    },
    {
      "id": "language",
      "name": "Języki obce",
      "icon": "🈵",
      "folder": "games/language",
      "games": ["hangul-basics"]
    }
  ]
}
```

Zasady:

- `id` – krótka nazwa kategorii,
- `folder` – ścieżka do gier,
- `games` – nazwy folderów.

Aby dodać nową grę — dopisz ją do `games.json`.

---

## 2. Folder gry i `meta.json`

```
games/<kategoria>/<gra>/
  index.html
  game.js
  game.css
  meta.json
```

Przykład `meta.json`:

```json
{
  "id": "2048",
  "name": "Neon 2048",
  "description": "Łącz kafelki.",
  "icon": "🔢",
  "thumb": null,
  "entry": "index.html"
}
```

---

## 3. Layout gier

### 3.1. `body`

```html
<body class="arcade-body arcade-game-page">
  <div
    data-arcade-auth-bar
    data-after-login="../../../arcade.html"
    data-after-guest="../../../arcade.html"></div>

  <div class="shell">
    <div class="card game-root">
      <!-- gra -->
    </div>
  </div>
</body>
```

### 3.2. Wysokość gry (`theme.css`)

```css
.arcade-game-page {
  min-height: 100vh;
  max-height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.arcade-game-page .shell {
  flex: 1 1 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1.5rem 1rem;
}

.arcade-game-page .card.game-root {
  width: 100%;
  max-width: 720px;
}

@media (max-height: 720px) {
  .arcade-game-page .shell {
    padding-block: 0.75rem;
  }
  .arcade-game-page .card.game-root {
    padding: 1rem 1.2rem;
  }
}
```

---

## 4. Przyciski powrotu

### 4.1. CSS

```css
.arcade-back-btn {
  position: fixed;
  top: 3.8rem;
  left: 1.2rem;
  z-index: 9999;
  padding: 0.45rem 1rem;
  border-radius: 999px;
  background: rgba(15,23,42,0.9);
  color: #e5e7eb;
  border: 1px solid rgba(148,163,184,0.4);
  box-shadow: 0 6px 22px rgba(0,0,0,0.8);
  backdrop-filter: blur(8px);
  cursor: pointer;
  transition: 0.15s ease;
}
```

### 4.2. `ui.js`

```js
ArcadeUI.addBackToArcadeButton = function ({ backUrl }) {
  backUrl = backUrl || "arcade.html";
  if (document.querySelector(".arcade-back-btn")) return;

  const btn = document.createElement("button");
  btn.className = "arcade-btn arcade-back-btn";
  btn.textContent = "← Powrót";
  btn.onclick = () => (window.location.href = backUrl);
  document.body.appendChild(btn);
};
```

---

## 5. Skrypty wymagane w grze

### W head:

```html
<link rel="stylesheet" href="../../../css/theme.css">
<link rel="stylesheet" href="game.css">

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" defer></script>

<script src="../../../js/core/auth.js" defer></script>
<script src="../../../js/core/auth-bar.js" defer></script>
<script src="../../../js/core/progress.js" defer></script>
<script src="../../../js/core/coins.js" defer></script>
<script src="../../../js/core/ui.js" defer></script>

<script src="game.js" defer></script>
```

---

## 6. Przykład pełnego `index.html` gry

*(tu znajduje się pełny przykład z sekcją tytułu, planszą, panelami wyników i przyciskami — pominięto dla skrótu, plik zawiera wszystko)*

---

## 7. Styl gry — `game.css`

Zasady:

- stylujemy tylko wnętrze `.game-root`,
- RWD dla szerokości i wysokości,
- każda gra ma swoje klasy.

---

## 8. Logika gry (`game.js`)

### 8.1. Szkielet

```js
const GAME_ID = "2048";
let hasUnsavedChanges = false;
let LAST_SAVE_DATA = null;

let score = 0;
let bestScore = 0;
let totalGames = 0;
let sessionCoins = 0;

function initGame() {
  loadProgress().then(() => {
    initBoard();
    attachEvents();
    setupBeforeUnloadGuard();
    setupClickGuard();
    ArcadeUI.addBackToArcadeButton({ backUrl: "../../../arcade.html" });
  });
}
```

---

## 9. System monet — **ArcadeCoins**

Monety:

- przypisane do użytkownika,
- zapisywane w tabeli `arcade_wallets`,
- gry mogą przyznawać je dynamicznie.

### 9.1. Tabela

```sql
create table arcade_wallets (
  user_id uuid primary key references auth.users(id),
  coins integer not null default 0,
  updated_at timestamptz not null default now()
);
```

### 9.2. API w `coins.js`

```js
ArcadeCoins.load()
ArcadeCoins.getBalance()
ArcadeCoins.addForGame(GAME_ID, amount, meta?)
```

### 9.3. Przyznawanie monet

```js
function awardCoins(amount, reason) {
  const n = Math.floor(amount);
  if (n <= 0) return;

  sessionCoins += n;
  ArcadeCoins.addForGame(GAME_ID, n, { reason });
}
```

---

## 10. Wyświetlanie monet w arcade

### HTML

```html
<div class="arcade-wallet">
  <span class="arcade-wallet-label">Monety:</span>
  <span id="arcade-wallet-balance">–</span>
  <span id="arcade-wallet-guest-hint" hidden>
    Zaloguj się, aby zdobywać monety
  </span>
</div>
```

### JS (`arcade.js`)

```js
supabase.auth.getUser().then(({ data }) => {
  if (!data || !data.user) {
    document.getElementById("arcade-wallet-balance").style.display = "none";
    document.getElementById("arcade-wallet-guest-hint").hidden = false;
    return;
  }

  ArcadeCoins.load().then(balance => {
    document.getElementById("arcade-wallet-balance").textContent = balance;
  });
});
```

---

## 11. Checklista nowej gry

- `[ ]` Utwórz folder `games/<kat>/<id>/`
- `[ ]` Dodaj `meta.json`
- `[ ]` Dopisz grę do `games.json`
- `[ ]` Dodaj `index.html` z poprawnymi skryptami
- `[ ]` Dodaj `game.js` zgodny z przewodnikiem
- `[ ]` Dodaj `game.css`
- `[ ]` Użyj `ArcadeProgress`
- `[ ]` Użyj `ArcadeCoins`
- `[ ]` Dodaj przycisk powrotu
- `[ ]` Przetestuj wczytywanie progresu
- `[ ]` Przetestuj zapis progresu
- `[ ]` Przetestuj przyznawanie monet

