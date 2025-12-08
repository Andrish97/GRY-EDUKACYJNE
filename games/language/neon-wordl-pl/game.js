// =========================
// Neon Wordl PL – logika gry
// =========================

const GAME_ID = "neon-wordl-pl";

let hasUnsavedChanges = false;
let LAST_SAVE_DATA = null;

// Statystyki zapisywane per użytkownik
let totalGames = 0;
let wins = 0;
let bestStreak = 0;
let currentStreak = 0;
let lastWordLength = 5;

// DOM
let statusEl;
let boardEl;
let wordLenSel;
let totalGamesEl;
let winsEl;
let bestStreakEl;
let currentStreakEl;
let newGameBtn;
let saveGameBtn;
let resetRecordBtn;

// Stan rozgrywki
let allWords = [];
let validWords = [];
let usedWords = new Set();
let secret = "";
let row = 0;
let col = 0;
let board = [];
let wordLength = 5;
const maxRows = 6;
let gameOver = false;

// Słownik PL
const DICT_URL =
  "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/pl/pl_full.txt";

// =============================
// SŁOWNIK
// =============================

function normalize(w) {
  return w
    .toLowerCase()
    .replace(/[^a-ząćęłńóśżź]/g, ""); // tylko litery PL
}

async function loadDictionary() {
  if (!statusEl) return;
  statusEl.textContent = "Pobieram słownik...";
  try {
    const resp = await fetch(DICT_URL);
    const text = await resp.text();
    const lines = text.split("\n").map((x) => normalize(x.split(" ")[0]));
    allWords = [...new Set(lines)].filter(
      (w) => w.length >= 4 && w.length <= 7
    );
    statusEl.textContent = "Słownik gotowy. Zgadnij słowo!";
  } catch (err) {
    console.error("[WORDL] Błąd pobierania słownika:", err);
    statusEl.textContent = "Błąd pobierania słownika :(";
  }
}

function chooseSecret() {
  validWords = allWords.filter((w) => w.length === wordLength);
  if (!validWords.length) {
    statusEl.textContent = "Brak słów tej długości w słowniku.";
    return "";
  }
  let w;
  let safety = 0;
  do {
    w = validWords[Math.floor(Math.random() * validWords.length)];
    safety++;
    if (safety > 500) break;
  } while (usedWords.has(w));
  usedWords.add(w);
  return w;
}

// =============================
// UI – PLANSZA
// =============================

function initBoard() {
  boardEl.innerHTML = "";
  boardEl.style.gridTemplateColumns = `repeat(${wordLength}, 42px)`;
  board = [];

  for (let r = 0; r < maxRows; r++) {
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

function resetRoundState() {
  row = 0;
  col = 0;
  gameOver = false;
  for (let r = 0; r < maxRows; r++) {
    for (let c = 0; c < wordLength; c++) {
      const tile = board[r][c];
      tile.textContent = "";
      tile.className = "tile";
    }
  }
}

function startNewRound() {
  wordLength = parseInt(wordLenSel.value, 10) || 5;
  lastWordLength = wordLength;

  if (!allWords.length) {
    statusEl.textContent = "Słownik jeszcze się ładuje...";
    return;
  }

  secret = chooseSecret();
  if (!secret) return;

  initBoard();
  row = 0;
  col = 0;
  gameOver = false;

  statusEl.textContent = "Zgadnij słowo!";
}

// =============================
// KOLOROWANIE I SPRAWDZANIE
// =============================

function colorRow(r) {
  const guess = [];
  for (let c = 0; c < wordLength; c++) {
    guess[c] = board[r][c].textContent.toLowerCase();
  }
  const secretArr = secret.split("");
  const used = Array(wordLength).fill(false);

  // zielone – dokładne dopasowania
  for (let c = 0; c < wordLength; c++) {
    if (guess[c] === secret[c]) {
      board[r][c].classList.add("correct");
      used[c] = true;
    }
  }
  // żółte / szare
  for (let c = 0; c < wordLength; c++) {
    if (board[r][c].classList.contains("correct")) continue;
    const idx = secretArr.findIndex((ch, i) => ch === guess[c] && !used[i]);
    if (idx !== -1) {
      board[r][c].classList.add("present");
      used[idx] = true;
    } else {
      board[r][c].classList.add("absent");
    }
  }
}

function submitRow() {
  if (gameOver) return;
  if (row >= maxRows) return;

  let guess = "";
  for (let c = 0; c < wordLength; c++) {
    const ch = board[row][c].textContent.toLowerCase();
    if (!ch) {
      statusEl.textContent = "Uzupełnij całe słowo.";
      return;
    }
    guess += ch;
  }

  if (guess.length !== wordLength) return;

  if (!validWords.includes(guess)) {
    statusEl.textContent = "Nie ma takiego słowa w słowniku.";
    return;
  }

  colorRow(row);

  // Trafione
  if (guess === secret) {
    statusEl.textContent = "Brawo! Trafione!";
    gameOver = true;
    totalGames++;
    wins++;
    currentStreak++;
    if (currentStreak > bestStreak) bestStreak = currentStreak;
    markUnsaved();
    updateStatsUI();
    return;
  }

  row++;
  col = 0;

  // Przegrana
  if (row >= maxRows) {
    statusEl.textContent = "Koniec! Słowo: " + secret.toUpperCase();
    gameOver = true;
    totalGames++;
    currentStreak = 0;
    markUnsaved();
    updateStatsUI();
  } else {
    statusEl.textContent = "Spróbuj dalej!";
  }
}

function pressLetter(ch) {
  if (gameOver) return;
  if (row >= maxRows) return;
  if (col >= wordLength) return;
  const tile = board[row][col];
  tile.textContent = ch.toUpperCase();
  tile.classList.add("filled");
  col++;
}

function erase() {
  if (gameOver) return;
  if (col > 0) {
    col--;
    const tile = board[row][col];
    tile.textContent = "";
    tile.classList.remove("filled");
  }
}

// =============================
// STATYSTYKI I ZAPIS
// =============================

function updateStatsUI() {
  if (totalGamesEl) totalGamesEl.textContent = totalGames;
  if (winsEl) winsEl.textContent = wins;
  if (bestStreakEl) bestStreakEl.textContent = bestStreak;
  if (currentStreakEl) currentStreakEl.textContent = currentStreak;
}

function buildSavePayload() {
  return {
    totalGames,
    wins,
    bestStreak,
    currentStreak,
    lastWordLength,
  };
}

function markUnsaved() {
  hasUnsavedChanges = true;
}

function loadProgress() {
  if (!window.ArcadeProgress || !ArcadeProgress.load) {
    console.warn("[WORDL]", GAME_ID, "Brak ArcadeProgress.load");
    return Promise.resolve();
  }

  return ArcadeProgress.load(GAME_ID)
    .then(function (data) {
      if (!data) return;

      if (typeof data.totalGames === "number") totalGames = data.totalGames;
      if (typeof data.wins === "number") wins = data.wins;
      if (typeof data.bestStreak === "number") bestStreak = data.bestStreak;
      if (typeof data.currentStreak === "number")
        currentStreak = data.currentStreak;
      if (typeof data.lastWordLength === "number")
        lastWordLength = data.lastWordLength;

      LAST_SAVE_DATA = data;
      hasUnsavedChanges = false;
    })
    .catch(function (err) {
      console.error("[WORDL]", GAME_ID, "Błąd load:", err);
    });
}

function saveCurrentSession() {
  if (!window.ArcadeProgress || !ArcadeProgress.save) {
    console.warn("[WORDL]", GAME_ID, "Brak ArcadeProgress.save");
    return Promise.resolve();
  }

  const payload = buildSavePayload();

  return ArcadeProgress.save(GAME_ID, payload)
    .then(function () {
      LAST_SAVE_DATA = payload;
      hasUnsavedChanges = false;
      console.log("[WORDL]", GAME_ID, "zapisano:", payload);
      statusEl.textContent = "Postęp zapisany.";
    })
    .catch(function (err) {
      console.error("[WORDL]", GAME_ID, "Błąd save:", err);
      statusEl.textContent = "Błąd zapisywania postępu.";
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
      hasUnsavedChanges = false;
      console.log("[WORDL]", GAME_ID, "progress wyczyszczony");
      statusEl.textContent = "Statystyki zresetowane.";
    })
    .catch(function (err) {
      console.error("[WORDL]", GAME_ID, "Błąd clear:", err);
      statusEl.textContent = "Błąd resetowania statystyk.";
    });
}

// =============================
// GUARDA NA NIEZAPISANE
// =============================

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
        "Masz niezapisany postęp statystyk. Wyjść bez zapisywania?"
      );
      if (!ok) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  });
}

// =============================
// HANDLERY UI
// =============================

function attachControls() {
  if (newGameBtn) {
    newGameBtn.addEventListener("click", function () {
      const ok =
        !hasUnsavedChanges ||
        window.confirm(
          "Masz niezapisany postęp statystyk. Rozpocząć nową grę bez zapisywania?"
        );
      if (!ok) return;

      startNewRound();
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
        "Na pewno chcesz zresetować statystyki dla tej gry?"
      );
      if (!ok) return;

      totalGames = 0;
      wins = 0;
      bestStreak = 0;
      currentStreak = 0;
      updateStatsUI();
      clearProgress();
    });
  }

  if (wordLenSel) {
    wordLenSel.addEventListener("change", function () {
      startNewRound();
    });
  }
}

function attachKeyboard() {
  document.addEventListener("keydown", function (e) {
    statusEl.textContent = "";

    if (e.key === "Enter") {
      submitRow();
      return;
    }
    if (e.key === "Backspace") {
      erase();
      return;
    }
    if (/^[a-ząćęłńóśżź]$/i.test(e.key)) {
      pressLetter(e.key.toLowerCase());
    }
  });
}

// =============================
// INIT
// =============================

function initGame() {
  statusEl = document.getElementById("status");
  boardEl = document.getElementById("board");
  wordLenSel = document.getElementById("word-len");
  totalGamesEl = document.getElementById("total-games");
  winsEl = document.getElementById("wins");
  bestStreakEl = document.getElementById("best-streak");
  currentStreakEl = document.getElementById("current-streak");
  newGameBtn = document.getElementById("new-game-btn");
  saveGameBtn = document.getElementById("save-game-btn");
  resetRecordBtn = document.getElementById("reset-record-btn");

  setupBeforeUnloadGuard();
  setupClickGuard();
  attachControls();
  attachKeyboard();

  // Uniwersalny przycisk powrotu do Arcade
  if (window.ArcadeUI && ArcadeUI.addBackToArcadeButton) {
    ArcadeUI.addBackToArcadeButton({
      backUrl: "../../../arcade.html",
    });
  }

  // Wczytaj progres, potem słownik, potem start
  loadProgress()
    .then(function () {
      updateStatsUI();
      if (wordLenSel && lastWordLength) {
        wordLenSel.value = String(lastWordLength);
      }
    })
    .then(loadDictionary)
    .then(function () {
      if (!secret) {
        startNewRound();
      }
    });
}

document.addEventListener("DOMContentLoaded", initGame);
