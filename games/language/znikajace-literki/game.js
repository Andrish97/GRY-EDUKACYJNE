// ============================
// Znikające literki – game.js
// ============================

const GAME_ID = "znikajace-literki";

let hasUnsavedChanges = false;
let LAST_SAVE_DATA = null;

// Zewnętrzne źródło słów: lista 50k najczęstszych polskich słów
// format: "słowo częstotliwość"
const WORDS_URL =
  "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/pl/pl_50k.txt";

let frequentWords = [];
let usedWords = new Set(); // unikalność w ramach sesji

// Konfiguracja światów (poziomów)
const LEVELS = [
  {
    id: 1,
    label: "1",
    minLen: 3,
    maxLen: 4,
    showMs: 3000,
    missingMin: 1,
    missingMax: 1,
    extraLetters: 0,
    targetSolved: 5
  },
  {
    id: 2,
    label: "2",
    minLen: 4,
    maxLen: 6,
    showMs: 2600,
    missingMin: 1,
    missingMax: 1,
    extraLetters: 2,
    targetSolved: 7
  },
  {
    id: 3,
    label: "3",
    minLen: 5,
    maxLen: 8,
    showMs: 2300,
    missingMin: 1,
    missingMax: 2,
    extraLetters: 3,
    targetSolved: 8
  },
  {
    id: 4,
    label: "4",
    minLen: 5,
    maxLen: 10,
    showMs: 2000,
    missingMin: 2,
    missingMax: 3,
    extraLetters: 4,
    targetSolved: 10
  }
];

// Mapowanie poziomu na zakres częstotliwości (im wyżej, tym trudniej)
const LEVEL_WORD_RANGES = {
  1: [0, 600],      // tylko bardzo częste, krótkie słowa
  2: [0, 2000],
  3: [500, 5000],
  4: [1000, 10000]
};

// Progres / statystyki
let highestUnlockedLevel = 1;
let totalSolved = 0;
let bestStreakGlobal = 0;
let statsByLevel = {}; // { [levelId]: { solved, attempts, bestStreak } }

// Stan rundy
let currentLevel = LEVELS[0];
let currentWord = null;
let currentMaskedChars = [];
let missingPositions = [];
let currentStreak = 0;

// Timer
let currentTimerTimeoutId = null;

// DOM
let levelListEl;
let highestLevelEl;
let totalSolvedEl;
let bestStreakEl;
let currentLevelLabelEl;
let levelSolvedEl;
let levelTargetEl;
let wordOriginalEl;
let wordMaskedEl;
let keyboardEl;
let messageEl;
let timerBarEl;

// ============================
// Inicjalizacja
// ============================

function initGame() {
  // DOM
  levelListEl = document.getElementById("level-list");
  highestLevelEl = document.getElementById("highest-level");
  totalSolvedEl = document.getElementById("total-solved");
  bestStreakEl = document.getElementById("best-streak");
  currentLevelLabelEl = document.getElementById("current-level-label");
  levelSolvedEl = document.getElementById("level-solved");
  levelTargetEl = document.getElementById("level-target");
  wordOriginalEl = document.getElementById("word-original");
  wordMaskedEl = document.getElementById("word-masked");
  keyboardEl = document.getElementById("keyboard");
  messageEl = document.getElementById("message");
  timerBarEl = document.getElementById("timer-bar");

  attachEvents();

  // 1) Pobranie słów z zewnętrznego źródła
  // 2) Wczytanie progresu
  // 3) Start gry
  loadWords()
    .then(loadProgress)
    .then(function () {
      renderLevels();
      updateStatsUI();
      selectLevel(currentLevel.id);

      showMessage(
        "Wybierz świat i zapamiętaj słówko, zanim znikną literki.",
        "info"
      );

      setupBeforeUnloadGuard();
      setupClickGuard();

      if (window.ArcadeUI && window.ArcadeUI.addBackToArcadeButton) {
        window.ArcadeUI.addBackToArcadeButton({
          backUrl: "../../../arcade.html"
        });
      }
    });
}

document.addEventListener("DOMContentLoaded", initGame);

// ============================
// Wczytywanie słów z internetu
// ============================

function loadWords() {
  return fetch(WORDS_URL)
    .then(function (res) {
      if (!res.ok) {
        throw new Error("Nie udało się pobrać listy słów");
      }
      return res.text();
    })
    .then(function (text) {
      frequentWords = text
        .split("\n")
        .map(function (line) {
          const first = line.split(" ")[0];
          return String(first || "")
            .trim()
            .toLowerCase();
        })
        .filter(function (w) {
          // tylko „normalne” polskie słowa, bez spacji, liczb itp.
          return /^[a-ząćęłńóśźż]+$/.test(w);
        });

      if (!frequentWords.length) {
        console.warn("[GAME] Lista słów jest pusta");
      } else {
        console.log("[GAME] Wczytano słów:", frequentWords.length);
      }
    })
    .catch(function (err) {
      console.error("[GAME] Błąd ładowania słów:", err);
      frequentWords = [];
    });
}

// ============================
// Progres – load / save / clear
// ============================

function loadProgress() {
  if (!window.ArcadeProgress || !ArcadeProgress.load) {
    console.warn("[GAME]", GAME_ID, "Brak ArcadeProgress.load");
    initStatsDefaults();
    return Promise.resolve();
  }

  return ArcadeProgress.load(GAME_ID)
    .then(function (data) {
      if (!data) {
        initStatsDefaults();
        return;
      }

      const maxLevelId = LEVELS[LEVELS.length - 1].id;

      highestUnlockedLevel =
        typeof data.highestUnlockedLevel === "number"
          ? clamp(data.highestUnlockedLevel, 1, maxLevelId)
          : 1;

      totalSolved =
        typeof data.totalSolved === "number" ? data.totalSolved : 0;

      bestStreakGlobal =
        typeof data.bestStreakGlobal === "number"
          ? data.bestStreakGlobal
          : 0;

      statsByLevel =
        data.statsByLevel && typeof data.statsByLevel === "object"
          ? data.statsByLevel
          : {};

      initStatsDefaults();
      LAST_SAVE_DATA = buildSavePayload();
      hasUnsavedChanges = false;
    })
    .catch(function (err) {
      console.error("[GAME]", GAME_ID, "Błąd load:", err);
      initStatsDefaults();
    });
}

function initStatsDefaults() {
  LEVELS.forEach(function (lvl) {
    if (!statsByLevel[lvl.id]) {
      statsByLevel[lvl.id] = {
        solved: 0,
        attempts: 0,
        bestStreak: 0
      };
    }
  });
}

function buildSavePayload() {
  return {
    highestUnlockedLevel: highestUnlockedLevel,
    totalSolved: totalSolved,
    bestStreakGlobal: bestStreakGlobal,
    statsByLevel: statsByLevel
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
      showMessage("Postęp zapisany ✨", "info");
    })
    .catch(function (err) {
      console.error("[GAME]", GAME_ID, "Błąd save:", err);
      showMessage("Nie udało się zapisać postępu.", "error");
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
      console.log("[GAME]", GAME_ID, "progress wyczyszczony");
    })
    .catch(function (err) {
      console.error("[GAME]", GAME_ID, "Błąd clear:", err);
    });
}

// ============================
// UI – przyciski główne
// ============================

function attachEvents() {
  const newGameBtn = document.getElementById("new-game-btn");
  const saveGameBtn = document.getElementById("save-game-btn");
  const resetRecordBtn = document.getElementById("reset-record-btn");

  if (newGameBtn) {
    newGameBtn.addEventListener("click", function () {
      const ok =
        !hasUnsavedChanges ||
        window.confirm(
          "Rozpocząć nową sesję? Niezapisane statystyki tej sesji zostaną utracone."
        );
      if (!ok) return;

      usedWords.clear();
      currentStreak = 0;
      showMessage("Nowa sesja – losuję świeże słówka.", "info");
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
        "Na pewno chcesz zresetować rekordy i statystyki dla tej gry?"
      );
      if (!ok) return;

      highestUnlockedLevel = 1;
      totalSolved = 0;
      bestStreakGlobal = 0;
      statsByLevel = {};
      initStatsDefaults();
      usedWords.clear();
      currentStreak = 0;
      updateStatsUI();
      renderLevels();
      clearProgress();
      showMessage("Statystyki wyzerowane.", "info");
    });
  }
}

// ============================
// Poziomy / światy
// ============================

function renderLevels() {
  levelListEl.innerHTML = "";

  LEVELS.forEach(function (lvl) {
    const btn = document.createElement("button");
    btn.className = "level-btn";
    btn.textContent = lvl.label;

    const isLocked = lvl.id > highestUnlockedLevel;

    if (isLocked) {
      btn.classList.add("level-btn--locked");
    } else if (lvl.id === currentLevel.id) {
      btn.classList.add("level-btn--active");
    }

    btn.addEventListener("click", function () {
      if (lvl.id > highestUnlockedLevel) {
        showMessage(
          "Ten świat jest jeszcze zablokowany. Ukończ więcej słówek w poprzednich światach.",
          "info"
        );
        return;
      }
      selectLevel(lvl.id);
    });

    levelListEl.appendChild(btn);
  });
}

function selectLevel(levelId) {
  const lvl = LEVELS.find(function (l) {
    return l.id === levelId;
  });
  if (!lvl) return;

  currentLevel = lvl;
  currentStreak = 0;

  // odśwież klasy active
  Array.from(levelListEl.children).forEach(function (btn, idx) {
    const levelCfg = LEVELS[idx];
    btn.classList.remove("level-btn--active");
    if (
      levelCfg.id === currentLevel.id &&
      levelCfg.id <= highestUnlockedLevel
    ) {
      btn.classList.add("level-btn--active");
    }
  });

  updateStatsUI();
  startNewRound();
}

// ============================
// Rundy gry
// ============================

function startNewRound() {
  clearTimer();

  if (!frequentWords.length) {
    wordOriginalEl.textContent = "---";
    wordMaskedEl.textContent = "---";
    keyboardEl.innerHTML = "";
    showMessage(
      "Nie udało się wczytać słów z internetu. Spróbuj odświeżyć stronę.",
      "error"
    );
    return;
  }

  showMessage("Losuję słówko…", "info");
  keyboardEl.innerHTML = "";
  wordOriginalEl.textContent = "...";
  wordMaskedEl.textContent = "...";

  const word = pickWordForLevel(currentLevel);
  if (!word) {
    wordOriginalEl.textContent = "---";
    wordMaskedEl.textContent = "---";
    showMessage(
      "Brak odpowiednich słówek dla tego świata. Spróbuj innego poziomu.",
      "error"
    );
    return;
  }

  currentWord = word;
  wordOriginalEl.textContent = word.toUpperCase();

  showTimer(currentLevel.showMs);

  currentMaskedChars = [];
  missingPositions = [];

  currentTimerTimeoutId = setTimeout(function () {
    hideLettersAndBuildKeyboard();
  }, currentLevel.showMs);
}

// wybór słowa: częstotliwość + długość + unikatowość

function pickWordForLevel(level) {
  if (!frequentWords.length) return null;

  const range = LEVEL_WORD_RANGES[level.id] || [0, 2000];

  const start = clamp(range[0], 0, frequentWords.length);
  const end = clamp(range[1], 0, frequentWords.length);
  const slice = frequentWords.slice(start, end);

  const candidates = slice.filter(function (w) {
    const len = w.length;
    return (
      len >= level.minLen &&
      len <= level.maxLen &&
      !usedWords.has(w)
    );
  });

  let pool = candidates;

  if (!pool.length) {
    // jeśli skończyły się unikalne słowa – resetujemy unikalność tylko na potrzeby wyboru
    usedWords.clear();
    const fallback = slice.filter(function (w) {
      const len = w.length;
      return len >= level.minLen && len <= level.maxLen;
    });
    pool = fallback;
  }

  if (!pool.length) return null;

  const idx = Math.floor(Math.random() * pool.length);
  const word = pool[idx];
  usedWords.add(word);
  return word;
}

// Ukrywanie liter i klawiatura

function hideLettersAndBuildKeyboard() {
  clearTimer();

  if (!currentWord) return;

  const chars = currentWord.split("");
  const len = chars.length;

  const missingCount = clamp(
    randomInt(currentLevel.missingMin, currentLevel.missingMax),
    1,
    len
  );

  const positions = [];
  while (positions.length < missingCount) {
    const pos = Math.floor(Math.random() * len);
    if (!positions.includes(pos)) {
      positions.push(pos);
    }
  }
  positions.sort(function (a, b) {
    return a - b;
  });

  missingPositions = positions;
  currentMaskedChars = chars.slice();

  positions.forEach(function (idx) {
    currentMaskedChars[idx] = "_";
  });

  renderMaskedWord();
  buildKeyboard(chars, positions);

  showMessage(
    "Klikaj literki na dole, żeby uzupełnić brakujące miejsca.",
    "info"
  );
}

function renderMaskedWord() {
  if (!currentMaskedChars.length) {
    wordMaskedEl.textContent = "---";
    return;
  }

  wordMaskedEl.textContent = currentMaskedChars
    .map(function (ch) {
      return ch === "_" ? "_" : ch.toUpperCase();
    })
    .join(" ");
}

function buildKeyboard(chars, missingPos) {
  keyboardEl.innerHTML = "";

  const missingLetters = missingPos.map(function (idx) {
    return chars[idx];
  });

  const letterSet = new Set(missingLetters);

  const alphabet = "aąbcćdeęfghijklłmnńoóprsśtuwyzźż".split("");

  while (letterSet.size < missingLetters.length + currentLevel.extraLetters) {
    const candidate =
      alphabet[Math.floor(Math.random() * alphabet.length)];
    if (!letterSet.has(candidate)) {
      letterSet.add(candidate);
    }
  }

  const lettersArray = Array.from(letterSet);
  shuffleArray(lettersArray);

  lettersArray.forEach(function (letter) {
    const btn = document.createElement("button");
    btn.className = "key-btn";
    btn.textContent = letter.toUpperCase();
    btn.addEventListener("click", function () {
      onLetterClick(letter);
    });
    keyboardEl.appendChild(btn);
  });
}

function onLetterClick(letter) {
  if (!currentWord || !currentMaskedChars.length) return;

  const idx = currentMaskedChars.indexOf("_");
  if (idx === -1) return;

  currentMaskedChars[idx] = letter;
  renderMaskedWord();

  if (!currentMaskedChars.includes("_")) {
    checkAnswer();
  }
}

function checkAnswer() {
  const candidate = currentMaskedChars.join("");
  const isCorrect =
    currentWord &&
    candidate.toLowerCase() === currentWord.toLowerCase();

  const lvlId = currentLevel.id;
  const stats = statsByLevel[lvlId];

  stats.attempts += 1;

  if (isCorrect) {
    stats.solved += 1;
    totalSolved += 1;
    currentStreak += 1;
    stats.bestStreak = Math.max(stats.bestStreak, currentStreak);
    bestStreakGlobal = Math.max(bestStreakGlobal, currentStreak);

    showMessage(
      "Dobrze! To było słowo: " + currentWord.toUpperCase() + ".",
      "success"
    );

    hasUnsavedChanges = true;
    maybeUnlockNextLevel();
    updateStatsUI();

    setTimeout(function () {
      startNewRound();
    }, 900);
  } else {
    currentStreak = 0;
    showMessage(
      "Nie tym razem. Poprawne słowo to: " +
        currentWord.toUpperCase() +
        ". Spróbuj kolejnego!",
      "error"
    );
    hasUnsavedChanges = true;
    updateStatsUI();

    setTimeout(function () {
      startNewRound();
    }, 1100);
  }
}

function maybeUnlockNextLevel() {
  const lvl = currentLevel;
  const stats = statsByLevel[lvl.id];

  if (
    stats.solved >= lvl.targetSolved &&
    lvl.id === highestUnlockedLevel &&
    lvl.id < LEVELS[LEVELS.length - 1].id
  ) {
    highestUnlockedLevel = lvl.id + 1;
    showMessage(
      "Gratulacje! Odblokowałeś świat " + highestUnlockedLevel + " 🎉",
      "success"
    );
  }

  renderLevels();
}

// ============================
// UI – statystyki, komunikaty
// ============================

function updateStatsUI() {
  highestLevelEl.textContent = highestUnlockedLevel;
  totalSolvedEl.textContent = totalSolved;
  bestStreakEl.textContent = bestStreakGlobal;

  currentLevelLabelEl.textContent = currentLevel.id;
  levelTargetEl.textContent = currentLevel.targetSolved;

  const stats = statsByLevel[currentLevel.id] || {
    solved: 0,
    attempts: 0,
    bestStreak: 0
  };
  levelSolvedEl.textContent = stats.solved;
}

function showMessage(text, type) {
  messageEl.textContent = text || "";
  messageEl.classList.remove(
    "game-message--success",
    "game-message--error",
    "game-message--info"
  );
  if (!type) return;
  messageEl.classList.add("game-message--" + type);
}

// ============================
// Timer (pasek czasu)
// ============================

function showTimer(durationMs) {
  clearTimer();

  timerBarEl.classList.remove("timer-bar--hidden");
  timerBarEl.innerHTML = "";

  const inner = document.createElement("div");
  inner.className = "timer-inner";
  timerBarEl.appendChild(inner);

  // reset
  inner.style.transform = "scaleX(1)";
  inner.style.transition = "transform " + durationMs + "ms linear";

  // pozwól przeglądarce zrenderować początkowy stan
  requestAnimationFrame(function () {
    inner.style.transform = "scaleX(0)";
  });
}

function clearTimer() {
  if (currentTimerTimeoutId !== null) {
    clearTimeout(currentTimerTimeoutId);
    currentTimerTimeoutId = null;
  }
  if (timerBarEl) {
    timerBarEl.classList.add("timer-bar--hidden");
    timerBarEl.innerHTML = "";
  }
}

// ============================
// Guardy – niezapisane zmiany
// ============================

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
        "Masz niezapisany postęp. Wyjść bez zapisywania?"
      );
      if (!ok) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  });
}

// ============================
// Helpery
// ============================

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomInt(min, max) {
  // całkowita z [min, max]
  const a = Math.ceil(min);
  const b = Math.floor(max);
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}
