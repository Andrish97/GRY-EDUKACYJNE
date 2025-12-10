# NEON ARCADE – Kompletny przewodnik (2025)

## 1. Wprowadzenie
Neon Arcade to modularna platforma webowa do uruchamiania mini-gier HTML/JS/CSS. Zapewnia:
- globalne logowanie,
- monety 💎,
- zapis progresu,
- automatyczny pasek logowania,
- uniwersalny przycisk powrotu,
- responsywny layout,
- automatyczne ładowanie gier z `games.json`.

Każda gra to osobny mini-projekt.

---

## 2. Struktura projektu

```
GRY-EDUKACYJNE/
│
├── css/
│    ├── arcade.css
│    ├── login.css
│    └── theme.css
│
├── js/
│    ├── core/
│    │     ├── auth.js
│    │     ├── auth-bar.js
│    │     ├── coins.js
│    │     ├── progress.js
│    │     ├── game-api.js
│    │     └── ui.js
│    ├── arcade.js
│    └── index.js
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
└── games.json
```

---

## 3. games.json – rejestr kategorii i gier

```json
{
  "categories": [
    {
      "id": "classic",
      "name": "Gry Klasyczne",
      "icon": "🕹️",
      "folder": "games/classic",
      "games": ["2048"]
    }
  ]
}
```

Każda kategoria zawiera listę gier i ich foldery.

---

## 4. meta.json – opis gry

Każda gra ma swój plik:

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

Launcher automatycznie używa tych danych.

---

## 5. index.html gry – minimalny szablon

```html
<link rel="stylesheet" href="../../../css/theme.css">
<link rel="stylesheet" href="game.css">

<script src="../../../js/core/auth.js" defer></script>
<script src="../../../js/core/progress.js" defer></script>
<script src="../../../js/core/coins.js" defer></script>
<script src="../../../js/core/auth-bar.js" defer></script>
<script src="../../../js/core/ui.js" defer></script>

<script src="game.js" defer></script>

<body>
  <div data-arcade-auth-bar></div>
  <div class="game-root"></div>
</body>
```

---

## 6. Pasek logowania (auth-bar)

Dodawany przez:

```
<div data-arcade-auth-bar></div>
```

Zawiera:
- logowanie / rejestrację,
- reset hasła,
- wylogowanie,
- tryb gościa,
- **monety 💎**.

---

## 7. System monet (coins.js)

Najważniejsze funkcje:

```js
await ArcadeCoins.load();
await ArcadeCoins.getBalance();
await ArcadeCoins.addForGame(gameId, amount, meta);
```

Gry nagradzają monety:

```js
ArcadeCoins.addForGame("2048", 5, { reason: "game_over", score });
ArcadeAuthUI.refreshCoins();
```

Monety zapisują się w Supabase.

Gość → brak monet.

---

## 8. System progresu (progress.js)

Zapis stanu gry:

```js
const save = await ArcadeProgress.load("2048");
await ArcadeProgress.save("2048", { bestScore, totalGames });
```

Działa:
- w Supabase (zalogowany),
- w localStorage (gość).

---

## 9. Przycisk powrotu (ui.js)

Dodawany w każdej grze:

```js
ArcadeUI.addBackToArcadeButton({
  backUrl: "../../../arcade.html"
});
```

Wyświetla się automatycznie w prawym górnym rogu.

---

## 10. Tworzenie nowej gry

1. Utwórz folder:

```
games/<kategoria>/<nowagra>/
```

2. Dodaj pliki:
- `index.html`
- `game.js`
- `game.css`
- `meta.json`

3. Dopisz grę do `games.json`.

4. W game.js:

```js
ArcadeUI.addBackToArcadeButton({ backUrl: "../../../arcade.html" });

async function init() {
  const save = await ArcadeProgress.load("nowagra");
  // ... logika gry ...
}
document.addEventListener("DOMContentLoaded", init);
```

---

## 11. Template nowej gry

### **meta.json**
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

### **index.html**
```html
<link rel="stylesheet" href="../../../css/theme.css">
<link rel="stylesheet" href="game.css">

<script src="../../../js/core/auth.js" defer></script>
<script src="../../../js/core/progress.js" defer></script>
<script src="../../../js/core/coins.js" defer></script>
<script src="../../../js/core/auth-bar.js" defer></script>
<script src="../../../js/core/ui.js" defer></script>
<script src="game.js" defer></script>

<body>
  <div data-arcade-auth-bar></div>
  <div class="game-root"></div>
</body>
```

### **game.js**
```js
const GAME_ID = "nowagra";

document.addEventListener("DOMContentLoaded", async () => {
  ArcadeUI.addBackToArcadeButton({ backUrl: "../../../arcade.html" });

  const save = await ArcadeProgress.load(GAME_ID);

  // logika gry …
});
```

---

## 12. RWD – dopasowanie gier
Każda gra powinna zawierać:

```css
.game-root {
  min-height: calc(100vh - 60px);
}
```

Plansza powinna dopasowywać się do dostępnej szerokości.

---

## 13. Reset hasła i aktywacja konta

- `confirm.html` — aktywacja po rejestracji,
- `reset.html` — zmiana hasła po emailu.

Supabase przekierowuje użytkownika automatycznie.

---

## 14. Troubleshooting

- brak monet — sprawdź tabelę `arcade_wallets`,
- brak progresu — sprawdź `ArcadeProgress.save()`,
- gra się nie ładuje — błędna ścieżka `../../../`,
- pasek logowania się nie zmienia — upewnij się, że `auth-bar.js` jest załadowany.

---
