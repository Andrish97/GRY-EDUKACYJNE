// ===============================
// Neon Wordl – game.js
// ===============================

"use strict";

// Publiczny słownik PL (JSON array)
const WORDS_URL =
  "https://raw.githubusercontent.com/harrix/datasets/master/datasets/wordlist/wordlist-polish.json";

// Konfiguracja gry
const ALLOWED_LENGTHS = [4, 5, 6, 7];
const MAX_ROWS = 6;

// Słownik w pamięci (tylko RAM)
let ALL_WORDS = null;
let WORDS_BY_LEN = {};
let WORD_SETS_BY_LEN = {};

// DOM
let boardEl;
let statusEl; // będziemy używać pod komunikaty – jak nie ma, to użyjemy podtytułu
let lenSel; // jeśli dodasz wybór długości – na razie nie używamy
let newGameBtn;
let resetStatsBtn;
let keyboardEl;
let winsEl;
let totalEl;

// Stan gry
let board = [];
let row = 0;
let col = 0;
let wordLength = 5; // domyślnie 5-literowe
let secret = "";
let gameOver = false;

// Statystyki (localStorage)
const STATS_KEY = "neon_wordl_stats";
let stats = {
  wins: 0,
  total: 0,
};

// Klawiatura ekranowa (3 rzędy, z Enter i Backspace)
const KEY_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACK"],
];

// ===============================
//  POMOCNICZE – STATYSTYKI
// ===============================

function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (typeof data.wins === "number") stats.wins = data.wins;
    if (typeof data.total === "number") stats.total = data.total;
  } catch (e) {
    console.warn("[NeonWordl] Nie udało się wczytać statystyk:", e);
  }
}

function saveStats() {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.warn("[NeonWordl] Nie udało się zapisać statystyk:", e);
  }
}

function updateStatsUI() {
  if (winsEl) winsEl.textContent = String(stats.wins);
  if (totalEl) totalEl.textContent = String(stats.total);
}

function registerGameResult(didWin) {
  stats.total += 1;
  if (didWin) stats.wins += 1;
  saveStats();
  updateStatsUI();
}

// ===============================
//  SŁOWNIK Z INTERNETU
// ===============================

async function loadInternetDictionary() {
  if (ALL_WORDS) return ALL_WORDS;

  setStatus("Pobieram słownik z internetu...");

  const resp = await fetch(WORDS_URL);
  if (!resp.ok) {
    throw new Error("Nie udało się pobrać słownika: " + resp.status);
  }
  const data = await resp.json();
  if (!Array.isArray(data)) {
    throw new Error("Niepoprawny format słownika (nie jest tablicą).");
  }

  ALL_WORDS = data;
  prepareWordsByLength();
  return ALL_WORDS;
}

function normalizeWord(w) {
  return (w || "")
    .toLowerCase()
    .replace(/[^a-ząćęłńóśżź]/g, "");
}

function prepareWordsByLength() {
  WORDS_BY_LEN = {};
  WORD_SETS_BY_LEN = {};

  ALLOWED_LENGTHS.forEach((len) => {
    WORDS_BY_LEN[len] = [];
    WORD_SETS_BY_LEN[len] = new Set();
  });

  for (const raw of ALL_WORDS) {
    const w = normalizeWord(raw);
    const l = w.length;
    if (!ALLOWED_LENGTHS.includes(l)) continue;
    // unikamy q, v, x (rzadko używane w takie gry)
    if (/[qvx]/.test(w)) continue;

    WORDS_BY_LEN[l].push(w);
    WORD_SETS_BY_LEN[l].add(w);
  }

  // lekkie przetasowanie, by były bardziej losowe
  for (const len of ALLOWED_LENGTHS) {
    shuffleArray(WORDS_BY_LEN[len]);
  }
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

async function getSecretWord(len) {
  await loadInternetDictionary();
  const list = WORDS_BY_LEN[len] || [];
  if (!list.length) {
    throw new Error("Brak słów o długości " + len);
  }
  const idx = (Math.random() * list.length) | 0;
  return list[idx];
}

function isValidWord(len, word) {
  const set = WORD_SETS_BY_LEN[len];
  if (!set) return false;
  return set.has(word);
}

// ===============================
//  STATUS / KOMUNIKATY
// ===============================

function setStatus(msg) {
  if (statusEl) {
    statusEl.textContent = msg || "";
  } else {
    // jeśli nie ma dedykowanego elementu, można użyć console lub podtytułu
    console.log("[NeonWordl]", msg);
  }
}

// ===============================
//  KLAWIATURA EKRANOWA
// ===============================

function initKeyboard() {
  keyboardEl.innerHTML = "";

  KEY_ROWS.forEach((rowLetters) => {
    const rowDiv = document.createElement("div");
    rowDiv.className = "key-row";

    rowLetters.forEach((code) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "key";

      if (code === "ENTER") {
        btn.textContent = "Enter";
        btn.dataset.keycode = "ENTER";
      } else if (code === "BACK") {
        btn.textContent = "⌫";
        btn.dataset.keycode = "BACKSPACE";
      } else {
        btn.textContent = code;
        btn.dataset.keycode = code;
      }

      btn.addEventListener("click", () => handleVirtualKey(btn.dataset.keycode));
      rowDiv.appendChild(btn);
    });

    keyboardEl.appendChild(rowDiv);
  });
}

function resetKeyboardColors() {
  const keys = keyboardEl.querySelectorAll(".key");
  keys.forEach((k) => {
    k.classList.remove("correct", "present", "absent");
  });
}

function markKey(letter, state) {
  // letter: 'a', 'b', etc.
  const upper = letter.toUpperCase();
  const btn = keyboardEl.querySelector(`.key[data-keycode="${upper}"]`);
  if (!btn) return;

  if (state === "correct") {
    btn.classList.remove("present", "absent");
    btn.classList.add("correct");
  } else if (state === "present") {
    if (!btn.classList.contains("correct")) {
      btn.classList.remove("absent");
      btn.classList.add("present");
    }
  } else if (state === "absent") {
    if (
      !btn.classList.contains("correct") &&
      !btn.classList.contains("present")
    ) {
      btn.classList.add("absent");
    }
  }
}

function updateKeyboardColors(guessArr, secretWord) {
  for (let i = 0; i < guessArr.length; i++) {
    const ch = guessArr[i];
    if (!ch) continue;
    if (secretWord[i] === ch) {
      markKey(ch, "correct");
    } else if (secretWord.includes(ch)) {
      markKey(ch, "present");
    } else {
      markKey(ch, "absent");
    }
  }
}

// ===============================
//  BOARD / LOGIKA LITER
// ===============================

function initBoard() {
  boardEl.innerHTML = "";
  boardEl.style.gridTemplateColumns = `repeat(${wordLength}, 48px)`;
  board = [];
  row = 0;
  col = 0;
  gameOver = false;

  for (let r = 0; r < MAX_ROWS; r++) {
    const rowArr = [];
    for (let c = 0; c < wordLength; c++) {
      const tile = document.createElement("div");
      tile.className = "tile";
      boardEl.appendChild(tile);
      rowArr.push(tile);
    }
    board.push(rowArr);
  }
}

function pressLetter(ch) {
  if (gameOver) return;
  if (row >= MAX_ROWS) return;
  if (col >= wordLength) return;

  const tile = board[row][col];
  tile.textContent = ch.toUpperCase();
  tile.classList.add("filled");
  col++;
}

function erase() {
  if (gameOver) return;
  if (col <= 0) return;

  col--;
  const tile = board[row][col];
  tile.textContent = "";
  tile.classList.remove("filled");
}

function colorRow(r) {
  const guessArr = [];
  for (let c = 0; c < wordLength; c++) {
    guessArr[c] = board[r][c].textContent.toLowerCase();
  }

  updateKeyboardColors(guessArr, secret);

  for (let c = 0; c < wordLength; c++) {
    const tile = board[r][c];
    const ch = guessArr[c];
    if (secret[c] === ch) {
      tile.classList.add("correct");
    } else if (secret.includes(ch)) {
      tile.classList.add("present");
    } else {
      tile.classList.add("absent");
    }
  }
}

function handleGuess() {
  if (gameOver) return;
  if (row >= MAX_ROWS) return;
  if (col < wordLength) {
    setStatus("Za krótkie słowo.");
    return;
  }

  let guess = "";
  const guessArr = [];
  for (let c = 0; c < wordLength; c++) {
    const ch = board[row][c].textContent.toLowerCase();
    guess += ch;
    guessArr.push(ch);
  }

  if (!isValidWord(wordLength, guess)) {
    setStatus("Nie znam takiego słowa w słowniku.");
    return;
  }

  colorRow(row);

  if (guess === secret) {
    setStatus("Brawo! Zgadłeś słowo.");
    gameOver = true;
    registerGameResult(true);
    return;
  }

  row++;
  col = 0;

  if (row >= MAX_ROWS) {
    setStatus("Koniec prób. Słowo: " + secret.toUpperCase());
    gameOver = true;
    registerGameResult(false);
  } else {
    setStatus("");
  }
}

// ===============================
//  OBSŁUGA KLAWISZY
// ===============================

function handleVirtualKey(code) {
  if (code === "ENTER") {
    handleGuess();
    return;
  }
  if (code === "BACKSPACE") {
    erase();
    return;
  }
  if (/^[A-Z]$/.test(code)) {
    pressLetter(code.toLowerCase());
    return;
  }
}

function handlePhysicalKey(e) {
  if (e.key === "Enter") {
    e.preventDefault();
    handleGuess();
    return;
  }
  if (e.key === "Backspace") {
    e.preventDefault();
    erase();
    return;
  }
  if (/^[a-ząćęłńóśżź]$/i.test(e.key)) {
    pressLetter(e.key.toLowerCase());
    return;
  }
}

// ===============================
//  NOWA GRA
// ===============================

async function newGame() {
  try {
    if (newGameBtn) newGameBtn.disabled = true;
    setStatus("Losuję słowo...");

    // można kiedyś dodać select długości; na razie na sztywno 5
    wordLength = 5;

    secret = await getSecretWord(wordLength);

    initBoard();
    resetKeyboardColors();
    initKeyboard();

    setStatus("Zgadnij słowo!");
  } catch (e) {
    console.error("[NeonWordl] newGame error:", e);
    setStatus("Błąd ładowania słownika. Spróbuj ponownie później.");
  } finally {
    if (newGameBtn) newGameBtn.disabled = false;
  }
}

// ===============================
//  RESET STATYSTYK
// ===============================

function resetStats() {
  stats = { wins: 0, total: 0 };
  saveStats();
  updateStatsUI();
  setStatus("Statystyki wyzerowane.");
}

// ===============================
//  INICJALIZACJA
// ===============================

function initGame() {
  boardEl = document.getElementById("board");
  keyboardEl = document.getElementById("keyboard");
  newGameBtn = document.getElementById("new-game-btn");
  resetStatsBtn = document.getElementById("reset-stats-btn");
  winsEl = document.getElementById("wins");
  totalEl = document.getElementById("total");

  // Spróbujemy znaleźć element na status:
  statusEl = document.getElementById("status");
  if (!statusEl) {
    // jeśli nie ma #status – użyjemy podtytułu (pierwszy .game-subtitle)
    statusEl = document.querySelector(".game-subtitle");
  }

  if (!boardEl || !keyboardEl) {
    console.error("[NeonWordl] Brak wymaganych elementów DOM (#board, #keyboard).");
    return;
  }

  // Statystyki
  loadStats();
  updateStatsUI();

  // Klawiatura fizyczna
  document.addEventListener("keydown", handlePhysicalKey);

  // Przyciski UI
  if (newGameBtn) {
    newGameBtn.addEventListener("click", () => {
      newGame();
    });
  }

  if (resetStatsBtn) {
    resetStatsBtn.addEventListener("click", () => {
      resetStats();
    });
  }

  // Przycisk powrotu do Arcade
  if (window.ArcadeUI && ArcadeUI.addBackToArcadeButton) {
    ArcadeUI.addBackToArcadeButton({
      backUrl: "../../../arcade.html",
    });
  }

  // Pierwsza gra
  newGame();
}

document.addEventListener("DOMContentLoaded", initGame);
