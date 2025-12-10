// ===== KONFIGURACJA GRY =====
const GAME_ID = "neon-wordl-pl";
const DICT_URL =
  "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/pl/pl_full.txt";
const MAX_ROWS = 6;
const HINT_COST = 5; // koszt jednej podpowiedzi w 💎

let allWords = [];
let validWords = [];
let usedWords = new Set();
let secret = "";
let wordLength = 5;

// Stan planszy
let board = []; // 2D: [row][col] -> tile element
let row = 0;
let col = 0;

// Stan podpowiedzi
let usedHintPositions = new Set();

// Statystyki (ArcadeProgress)
let gamesPlayed = 0;
let wins = 0;
let currentStreak = 0;
let maxStreak = 0;
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
let resetRecordBtn;
let statGamesEl;
let statWinsEl;
let statStreakEl;
let statMaxStreakEl;

// Podpowiedzi / monety
let hintBtn;
let hintTextEl;
let coinsBalanceEl;
let coinsLoaded = false;

// ===== POMOCNICZE =====

function normalizeWord(w) {
  return w
    .toLowerCase()
    .replace(/[^a-ząćęłńóśżź]/g, ""); // tylko litery PL
}

function canUseCoins() {
  return (
    typeof window !== "undefined" &&
    window.ArcadeCoins &&
    typeof ArcadeCoins.load === "function" &&
    typeof ArcadeCoins.getBalance === "function" &&
    typeof ArcadeCoins.addForGame === "function"
  );
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
// Twój układ: bez Q/V/X, backspace w 3 rzędzie, enter na końcu.
const KEYBOARD_LAYOUT = [
  // rząd 1 – główne spółgłoski
  ["w", "e", "r", "t", "y", "u", "i", "o", "p"],
  // rząd 2
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  // rząd 3 – z ogonkami i Backspace po prawej
  ["z", "ź", "ż", "c", "b", "n", "m", "backspace"],
  // rząd 4 – ogonki + Enter na końcu
  ["ą", "ć", "ę", "ł", "ń", "ó", "ś", "enter"],
];

function buildKeyboard() {
  keyboardEl.innerHTML = "";
  keyboardInnerEl = document.createElement("div");
  keyboardInnerEl.className = "keyboard-inner";
  keyboardEl.appendChild(keyboardInnerEl);

  KEYBOARD_LAYOUT.forEach((rowKeys) => {
    const rowDiv = document.createElement("div");
    rowDiv.className = "keyboard-row";
    rowDiv.style.setProperty("--keys", rowKeys.length);

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

// ===== STATYSTYKI + AUTO-SAVE =====

function updateStatsUI() {
  if (statGamesEl) statGamesEl.textContent = gamesPlayed.toString();
  if (statWinsEl) statWinsEl.textContent = wins.toString();
  if (statStreakEl) statStreakEl.textContent = currentStreak.toString();
  if (statMaxStreakEl) statMaxStreakEl.textContent = maxStreak.toString();
}

function autoSave() {
  if (!window.ArcadeProgress || !ArcadeProgress.save) return;

  const payload = {
    gamesPlayed,
    wins,
    currentStreak,
    maxStreak,
  };

  ArcadeProgress.save(GAME_ID, payload)
    .then(() => {
      LAST_SAVE_DATA = payload;
      console.log("[WORDL] auto-zapis:", payload);
    })
    .catch((err) => {
      console.error("[WORDL] błąd zapisu:", err);
    });
}

// nagroda za grę + odświeżenie monet
function rewardCoinsForGame(win) {
  if (!canUseCoins()) return;

  // prosta ekonomia: wygrana = 5💎, przegrana = 1💎
  const amount = win ? 5 : 1;

  ArcadeCoins.addForGame(GAME_ID, amount, {
    reason: win ? "win" : "loss",
    wordLength,
    secret,
  })
    .then(() => {
      if (window.ArcadeAuthUI && ArcadeAuthUI.refreshCoins) {
        ArcadeAuthUI.refreshCoins();
      }
      refreshCoinsBalance();
      console.log("[WORDL] przyznano monety:", amount);
    })
    .catch((err) => {
      console.warn("[WORDL] błąd przyznawania monet:", err);
    });
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
  updateStatsUI();
  autoSave();
  rewardCoinsForGame(win);
}

// ===== ArcadeProgress – load / clear =====

function loadProgress() {
  if (!window.ArcadeProgress || !ArcadeProgress.load) {
    console.warn("[WORDL]", GAME_ID, "Brak ArcadeProgress.load");
    return Promise.resolve();
  }

  return ArcadeProgress.load(GAME_ID)
    .then(function (data) {
      if (!data) {
        updateStatsUI();
        return;
      }

      if (typeof data.gamesPlayed === "number") gamesPlayed = data.gamesPlayed;
      if (typeof data.wins === "number") wins = data.wins;
      if (typeof data.currentStreak === "number")
        currentStreak = data.currentStreak;
      if (typeof data.maxStreak === "number") maxStreak = data.maxStreak;

      LAST_SAVE_DATA = data;
      updateStatsUI();
    })
    .catch(function (err) {
      console.error("[WORDL]", GAME_ID, "Błąd load:", err);
    });
}

function clearProgress() {
  if (!window.ArcadeProgress || !ArcadeProgress.clear) {
    console.warn("[WORDL]", GAME_ID, "Brak ArcadeProgress.clear");
    return Promise.resolve();
  }

  return ArcadeProgress.clear(GAME_ID)
    .then(function () {
      LAST_SAVE_DATA = null;

      gamesPlayed = 0;
      wins = 0;
      currentStreak = 0;
      maxStreak = 0;
      updateStatsUI();

      console.log("[WORDL]", GAME_ID, "progress wyczyszczony");
      statusEl.textContent = "Rekordy wyczyszczone.";
    })
    .catch(function (err) {
      console.error("[WORDL]", GAME_ID, "Błąd clear:", err);
      statusEl.textContent = "Błąd czyszczenia rekordów.";
    });
}

// ===== MONETY / PODPOWIEDZI =====

function refreshCoinsBalance() {
  if (!canUseCoins() || !coinsBalanceEl) return;

  ArcadeCoins.getBalance()
    .then((bal) => {
      coinsLoaded = true;
      if (typeof bal === "number") {
        coinsBalanceEl.textContent = bal.toString();
      } else {
        coinsBalanceEl.textContent = "0";
      }
    })
    .catch((err) => {
      console.warn("[WORDL] błąd pobierania balansu monet:", err);
      coinsBalanceEl.textContent = "–";
    });
}

function initCoins() {
  if (!canUseCoins()) {
    if (coinsBalanceEl) coinsBalanceEl.textContent = "–";
    return;
  }

  ArcadeCoins.load()
    .then(() => {
      coinsLoaded = true;
      refreshCoinsBalance();
    })
    .catch((err) => {
      console.warn("[WORDL] błąd ArcadeCoins.load:", err);
      if (coinsBalanceEl) coinsBalanceEl.textContent = "–";
    });
}

async function useHint() {
  if (!hintBtn) return;

  if (row >= MAX_ROWS || !secret) {
    statusEl.textContent = "Najpierw rozpocznij nową grę.";
    return;
  }

  if (!canUseCoins()) {
    statusEl.textContent =
      "Podpowiedzi za diamenty są dostępne tylko dla zalogowanych.";
    return;
  }

  hintBtn.disabled = true;
  statusEl.textContent = "";

  try {
    const balance = await ArcadeCoins.getBalance();
    if (typeof balance !== "number" || balance < HINT_COST) {
      statusEl.textContent =
        "Za mało diamentów na podpowiedź. Zdobądź je, wygrywając gry.";
      hintBtn.disabled = false;
      return;
    }

    // znajdź pozycję, której jeszcze nie podpowiadaliśmy
    const candidates = [];
    for (let i = 0; i < wordLength; i++) {
      if (!usedHintPositions.has(i)) {
        candidates.push(i);
      }
    }

    if (!candidates.length) {
      statusEl.textContent =
        "Wykorzystałeś wszystkie podpowiedzi dla tego słowa.";
      hintBtn.disabled = false;
      return;
    }

    const pos =
      candidates[Math.floor(Math.random() * candidates.length)];
    usedHintPositions.add(pos);

    const letter = secret[pos].toUpperCase();

    // pobierz diamenty
    await ArcadeCoins.addForGame(GAME_ID, -HINT_COST, {
      reason: "hint",
      position: pos,
      letter: secret[pos],
    });

    if (window.ArcadeAuthUI && ArcadeAuthUI.refreshCoins) {
      ArcadeAuthUI.refreshCoins();
    }
    refreshCoinsBalance();

    if (hintTextEl) {
      hintTextEl.textContent = `Podpowiedź: na pozycji ${
        pos + 1
      } jest litera ${letter}. (-${HINT_COST}💎)`;
    }
  } catch (err) {
    console.error("[WORDL] błąd podpowiedzi:", err);
    statusEl.textContent =
      "Nie udało się użyć podpowiedzi. Sprawdź połączenie lub stan konta.";
  } finally {
    hintBtn.disabled = false;
  }
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

  if (hintBtn) {
    hintBtn.addEventListener("click", () => {
      useHint();
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

// pełna logika Wordle dla duplikatów
function colorRow(r) {
  const guess = [];
  for (let c = 0; c < wordLength; c++) {
    guess[c] = board[r][c].textContent.toLowerCase();
  }

  const secretArr = secret.split("");

  // LICZNIK LITER w sekrecie
  const counts = {};
  for (let i = 0; i < wordLength; i++) {
    const ch = secretArr[i];
    counts[ch] = (counts[ch] || 0) + 1;
  }

  // KROK 1 — zielone
  for (let c = 0; c < wordLength; c++) {
    const tile = board[r][c];
    const ch = guess[c];

    if (ch === secretArr[c]) {
      tile.classList.add("correct");
      counts[ch]--;
      updateKeyColor(ch, "correct");
    }
  }

  // KROK 2 — żółte / szare
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
  usedHintPositions = new Set();
  if (hintTextEl) hintTextEl.textContent = "";

  if (!secret) {
    statusEl.textContent =
      "Brak słów o tej długości w słowniku. Zmień długość słowa.";
    return;
  }

  initBoardStructure();
  resetBoard();
  buildKeyboard();
  statusEl.textContent = "Zgadnij słowo!";

  if (hintBtn) {
    // na wszelki wypadek włączamy, jeśli monety działają
    hintBtn.disabled = !canUseCoins();
  }
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
  resetRecordBtn = document.getElementById("reset-record-btn");

  statGamesEl = document.getElementById("stat-games");
  statWinsEl = document.getElementById("stat-wins");
  statStreakEl = document.getElementById("stat-streak");
  statMaxStreakEl = document.getElementById("stat-max-streak");

  hintBtn = document.getElementById("hint-btn");
  hintTextEl = document.getElementById("hint-text");
  coinsBalanceEl = document.getElementById("coins-balance");
}

function initGame() {
  cacheDom();
  updateStatsUI();

  setupKeyboardListener();
  attachButtonEvents();

  if (window.ArcadeUI && ArcadeUI.addBackToArcadeButton) {
    ArcadeUI.addBackToArcadeButton({
      backUrl: "../../../arcade.html",
    });
  }

  // Ładujemy progres i słownik równolegle, potem start gry
  Promise.all([loadProgress(), loadDictionary()]).then(() => {
    wordLength = parseInt(wordLenSel.value, 10) || 5;
    startNewGame();
  });

  // monety / diamenty
  initCoins();
}

document.addEventListener("DOMContentLoaded", initGame);
