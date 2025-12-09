// ===== KONFIGURACJA GRY =====
const GAME_ID = "neon-wordl-pl";
const DICT_URL =
  "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/pl/pl_full.txt";
const MAX_ROWS = 6;

let allWords = [];
let validWords = [];
let usedWords = new Set();
let secret = "";
let wordLength = 5;

// Stan planszy
let board = []; // 2D: [row][col] -> tile element
let row = 0;
let col = 0;

// Statystyki (z ArcadeProgress)
let gamesPlayed = 0;
let wins = 0;
let currentStreak = 0;
let maxStreak = 0;

// Zapis / guardy
let hasUnsavedChanges = false;
let LAST_SAVE_DATA = null;

// Klawiatura
let keyboardEl;
let keyboardInnerEl;
const keyboardState = {}; // litera -> "absent" | "present" | "correct"

// DOM
let statusEl;
let boardEl;
let wordLenSel;
let newGameBtn;
let saveGameBtn;
let resetRecordBtn;
let statGamesEl;
let statWinsEl;
let statStreakEl;
let statMaxStreakEl;

// ===== POMOCNICZE =====

function normalizeWord(w) {
  return w
    .toLowerCase()
    .replace(/[^a-ząćęłńóśżź]/g, ""); // tylko litery PL
}

// ===== SŁOWNIK =====

async function loadDictionary() {
  statusEl.textContent = "Pobieram słownik...";
  try {
    const resp = await fetch(DICT_URL);
    const text = await resp.text();
    const lines = text.split("\n").map((x) => normalizeWord(x.split(" ")[0]));
    allWords = [...new Set(lines)].filter(
      (w) => w.length >= 4 && w.length <= 7
    );
    statusEl.textContent = "Słownik gotowy. Zgaduj!";
  } catch (err) {
    console.error("[WORDL] Błąd przy pobieraniu słownika:", err);
    statusEl.textContent =
      "Błąd ładowania słownika. Sprawdź połączenie z internetem.";
  }
}

function chooseSecret() {
  validWords = allWords.filter((w) => w.length === wordLength);
  if (!validWords.length) return "";

  let w;
  let safety = 0;
  do {
    w = validWords[Math.floor(Math.random() * validWords.length)];
    safety++;
  } while (usedWords.has(w) && safety < 1000);

  usedWords.add(w);
  return w;
}

// ===== PLANSZA =====

function initBoardStructure() {
  boardEl.innerHTML = "";
  boardEl.style.gridTemplateColumns = `repeat(${wordLength}, 42px)`;
  board = [];

  for (let r = 0; r < MAX_ROWS; r++) {
    const rowArr = [];
    for (let c = 0; c < wordLength; c++) {
      const div = document.createElement("div");
      div.className = "tile";
      boardEl.appendChild(div);
      rowArr.push(div);
    }
    board.push(rowArr);
  }
}

function resetBoard() {
  row = 0;
  col = 0;
  for (let r = 0; r < MAX_ROWS; r++) {
    for (let c = 0; c < wordLength; c++) {
      const tile = board[r][c];
      tile.textContent = "";
      tile.className = "tile";
    }
  }
}

// ===== KLAWIATURA DOTYKOWA =====
// Bez Q, V, X. Backspace wyżej, Enter niżej po prawej.
const KEYBOARD_LAYOUT = [
  // rząd 1 – główne spółgłoski
  ["w", "e", "r", "t", "y", "u", "i", "o", "p"],
  // rząd 2
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  // rząd 3 – część łacińska + Backspace (po prawej)
  ["z", "c", "b", "n", "m", "backspace"],
  // rząd 4 – polskie ogonki + Enter na końcu
  ["ą", "ć", "ę", "ł", "ń", "ó", "ś", "ż", "ź", "enter"],
];

function buildKeyboard() {
  keyboardEl.innerHTML = "";
  keyboardInnerEl = document.createElement("div");
  keyboardInnerEl.className = "keyboard-inner";
  keyboardEl.appendChild(keyboardInnerEl);

  KEYBOARD_LAYOUT.forEach((rowKeys) => {
    const rowDiv = document.createElement("div");
    rowDiv.className = "keyboard-row";

    rowKeys.forEach((key) => {
      const btn = document.createElement("button");
      btn.className = "key-btn";
      btn.dataset.key = key;

      if (key === "enter") {
        btn.textContent = "Enter";
        btn.classList.add("key-wide");
      } else if (key === "backspace") {
        btn.textContent = "⌫";
        btn.classList.add("key-wide");
      } else {
        btn.textContent = key;
      }

      btn.addEventListener("click", () => handleVirtualKey(key));
      rowDiv.appendChild(btn);
    });

    keyboardInnerEl.appendChild(rowDiv);
  });

  // czyścimy stan kolorów
  Object.keys(keyboardState).forEach((k) => delete keyboardState[k]);
}

function handleVirtualKey(k) {
  statusEl.textContent = "";

  if (k === "enter") {
    submitRow();
    return;
  }
  if (k === "backspace") {
    erase();
    return;
  }
  pressLetter(k);
}

// ===== LOGIKA STATYSTYK =====

function updateStatsUI() {
  if (statGamesEl) statGamesEl.textContent = gamesPlayed.toString();
  if (statWinsEl) statWinsEl.textContent = wins.toString();
  if (statStreakEl) statStreakEl.textContent = currentStreak.toString();
  if (statMaxStreakEl) statMaxStreakEl.textContent = maxStreak.toString();
}

function registerGameFinished(win) {
  gamesPlayed++;
  if (win) {
    wins++;
    currentStreak++;
    if (currentStreak > maxStreak) {
      maxStreak = currentStreak;
    }
  } else {
    currentStreak = 0;
  }
  hasUnsavedChanges = true;
  updateStatsUI();
}

// ===== ArcadeProgress – load/save/clear =====

function loadProgress() {
  if (!window.ArcadeProgress || !ArcadeProgress.load) {
    console.warn("[GAME]", GAME_ID, "Brak ArcadeProgress.load");
    return Promise.resolve();
  }

  return ArcadeProgress.load(GAME_ID)
    .then(function (data) {
      if (!data) return;

      if (typeof data.gamesPlayed === "number") gamesPlayed = data.gamesPlayed;
      if (typeof data.wins === "number") wins = data.wins;
      if (typeof data.currentStreak === "number")
        currentStreak = data.currentStreak;
      if (typeof data.maxStreak === "number") maxStreak = data.maxStreak;

      LAST_SAVE_DATA = data;
      hasUnsavedChanges = false;
      updateStatsUI();
    })
    .catch(function (err) {
      console.error("[GAME]", GAME_ID, "Błąd load:", err);
    });
}

function buildSavePayload() {
  return {
    gamesPlayed,
    wins,
    currentStreak,
    maxStreak,
  };
}

function saveCurrentSession() {
  if (!window.ArcadeProgress || !ArcadeProgress.save) {
    console.warn("[GAME]", GAME_ID, "Brak ArcadeProgress.save");
    return Promise.resolve();
  }

  const payload = buildSavePayload();

  return ArcadeProgress.save(GAME_ID, payload)
    .then(function () {
      LAST_SAVE_DATA = payload;
      hasUnsavedChanges = false;
      console.log("[GAME]", GAME_ID, "zapisano:", payload);
      statusEl.textContent = "Zapisano postęp gry.";
    })
    .catch(function (err) {
      console.error("[GAME]", GAME_ID, "Błąd save:", err);
      statusEl.textContent = "Błąd zapisu postępu.";
    });
}

function clearProgress() {
  if (!window.ArcadeProgress || !ArcadeProgress.clear) {
    console.warn("[GAME]", GAME_ID, "Brak ArcadeProgress.clear");
    return Promise.resolve();
  }

  return ArcadeProgress.clear(GAME_ID)
    .then(function () {
      LAST_SAVE_DATA = null;
      hasUnsavedChanges = false;

      gamesPlayed = 0;
      wins = 0;
      currentStreak = 0;
      maxStreak = 0;
      updateStatsUI();

      console.log("[GAME]", GAME_ID, "progress wyczyszczony");
      statusEl.textContent = "Rekordy wyczyszczone.";
    })
    .catch(function (err) {
      console.error("[GAME]", GAME_ID, "Błąd clear:", err);
      statusEl.textContent = "Błąd czyszczenia rekordów.";
    });
}

// ===== GUARD NA NIEZAPISANE ZMIANY =====

function setupBeforeUnloadGuard() {
  window.addEventListener("beforeunload", function (e) {
    if (!hasUnsavedChanges) return;
    e.preventDefault();
    e.returnValue = "";
    return "";
  });
}

function setupClickGuard() {
  document.addEventListener("click", function (e) {
    if (!hasUnsavedChanges) return;

    const target = e.target.closest("a,button");
    if (!target) return;

    const href = target.getAttribute("href");
    const isReturnToArcade =
      (href && href.indexOf("arcade.html") !== -1) ||
      target.classList.contains("arcade-back-btn");

    if (isReturnToArcade) {
      const ok = window.confirm(
        "Masz niezapisany postęp (statystyki). Wyjść bez zapisywania?"
      );
      if (!ok) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  });
}

// ===== OBSŁUGA PRZYCISKÓW =====

function attachButtonEvents() {
  if (newGameBtn) {
    newGameBtn.addEventListener("click", function () {
      const ok =
        row === 0 ||
        row >= MAX_ROWS ||
        window.confirm(
          "Rozpocząć nowe słowo? Aktualna próba zostanie przerwana."
        );
      if (!ok) return;
      startNewGame();
    });
  }

  if (saveGameBtn) {
    saveGameBtn.addEventListener("click", function () {
      saveCurrentSession();
    });
  }

  if (resetRecordBtn) {
    resetRecordBtn.addEventListener("click", function () {
      const ok = window.confirm(
        "Na pewno chcesz zresetować rekordy i statystyki dla tej gry?"
      );
      if (!ok) return;
      clearProgress();
    });
  }

  if (wordLenSel) {
    wordLenSel.addEventListener("change", function () {
      wordLength = parseInt(wordLenSel.value, 10) || 5;
      startNewGame();
    });
  }
}

// ===== MECHANIKA WORDLE =====

function pressLetter(ch) {
  if (row >= MAX_ROWS) return;
  if (col >= wordLength) return;
  const tile = board[row][col];
  tile.textContent = ch.toUpperCase();
  tile.classList.add("filled");
  col++;
}

function erase() {
  if (col > 0) {
    col--;
    const tile = board[row][col];
    tile.textContent = "";
    tile.classList.remove("filled");
  }
}

// Priorytety kolorów klawiatury (nie psujemy zielonego)
const KEY_STATE_PRIORITY = {
  absent: 0,
  present: 1,
  correct: 2,
};

function updateKeyColor(letter, newState) {
  const current = keyboardState[letter];
  if (
    current &&
    KEY_STATE_PRIORITY[newState] <= KEY_STATE_PRIORITY[current]
  ) {
    return;
  }

  keyboardState[letter] = newState;

  const buttons = keyboardEl.querySelectorAll(".key-btn");
  buttons.forEach((btn) => {
    const k = btn.dataset.key;
    if (k !== letter) return;

    btn.classList.remove("key-correct", "key-present", "key-absent");
    if (newState === "correct") btn.classList.add("key-correct");
    if (newState === "present") btn.classList.add("key-present");
    if (newState === "absent") btn.classList.add("key-absent");
  });
}

function colorRow(r) {
  const guess = [];
  for (let c = 0; c < wordLength; c++) {
    guess[c] = board[r][c].textContent.toLowerCase();
  }

  const secretArr = secret.split("");

  // Mapa: litera -> ile razy występuje w tajnym słowie
  const counts = {};
  for (let i = 0; i < wordLength; i++) {
    const ch = secretArr[i];
    counts[ch] = (counts[ch] || 0) + 1;
  }

  // 1. Zielone (dokładne trafienia) – zmniejszamy licznik tej litery
  for (let c = 0; c < wordLength; c++) {
    const tile = board[r][c];
    const ch = guess[c];

    if (ch === secretArr[c]) {
      tile.classList.add("correct");
      counts[ch]--;
      updateKeyColor(ch, "correct");
    }
  }

  // 2. Żółte / szare – używamy pozostałych liczników
  for (let c = 0; c < wordLength; c++) {
    const tile = board[r][c];
    if (tile.classList.contains("correct")) continue;

    const ch = guess[c];

    if (counts[ch] > 0) {
      tile.classList.add("present");
      counts[ch]--;
      updateKeyColor(ch, "present");
    } else {
      tile.classList.add("absent");
      updateKeyColor(ch, "absent");
    }
  }
}

function submitRow() {
  if (row >= MAX_ROWS) return;
  if (col < wordLength) {
    statusEl.textContent = "Wpisz pełne słowo.";
    return;
  }

  let guess = "";
  for (let c = 0; c < wordLength; c++) {
    guess += board[row][c].textContent.toLowerCase();
  }

  if (!validWords.includes(guess)) {
    statusEl.textContent = "Nie ma takiego słowa!";
    return;
  }

  colorRow(row);

  if (guess === secret) {
    statusEl.textContent = "Brawo! Trafione!";
    registerGameFinished(true);
    row = MAX_ROWS; // blokada dalszej gry
    return;
  }

  row++;
  col = 0;

  if (row >= MAX_ROWS) {
    statusEl.textContent = "Koniec! Słowo: " + secret.toUpperCase();
    registerGameFinished(false);
  } else {
    statusEl.textContent = "";
  }
}

// ===== NOWA GRA =====

function startNewGame() {
  secret = chooseSecret();
  if (!secret) {
    statusEl.textContent =
      "Brak słów o tej długości w słowniku. Zmień długość słowa.";
    return;
  }

  initBoardStructure();
  resetBoard();
  buildKeyboard();
  statusEl.textContent = "Zgadnij słowo!";
}

// ===== KLAWIATURA FIZYCZNA =====

function setupKeyboardListener() {
  document.addEventListener("keydown", (e) => {
    statusEl.textContent = "";

    if (e.key === "Enter") {
      e.preventDefault();
      submitRow();
      return;
    }
    if (e.key === "Backspace") {
      e.preventDefault();
      erase();
      return;
    }
    if (/^[a-ząćęłńóśżź]$/i.test(e.key)) {
      e.preventDefault();
      pressLetter(e.key.toLowerCase());
    }
  });
}

// ===== INICJALIZACJA =====

function cacheDom() {
  statusEl = document.getElementById("status");
  boardEl = document.getElementById("board");
  wordLenSel = document.getElementById("word-len");
  keyboardEl = document.getElementById("keyboard");

  newGameBtn = document.getElementById("new-game-btn");
  saveGameBtn = document.getElementById("save-game-btn");
  resetRecordBtn = document.getElementById("reset-record-btn");

  statGamesEl = document.getElementById("stat-games");
  statWinsEl = document.getElementById("stat-wins");
  statStreakEl = document.getElementById("stat-streak");
  statMaxStreakEl = document.getElementById("stat-max-streak");
}

function initGame() {
  cacheDom();
  updateStatsUI();

  setupBeforeUnloadGuard();
  setupClickGuard();
  setupKeyboardListener();
  attachButtonEvents();

  if (window.ArcadeUI && ArcadeUI.addBackToArcadeButton) {
    ArcadeUI.addBackToArcadeButton({
      backUrl: "../../../arcade.html",
    });
  }

  // Ładujemy progres i słownik równolegle
  Promise.all([loadProgress(), loadDictionary()]).then(() => {
    wordLength = parseInt(wordLenSel.value, 10) || 5;
    startNewGame();
  });
}

document.addEventListener("DOMContentLoaded", initGame);
