// games/language/znajdz-slowo/game.js

const GAME_ID = "znajdz-slowo";

let hasUnsavedChanges = false;
let LAST_SAVE_DATA = null;

// Stałe gry
const QUESTIONS_PER_LEVEL = 6;

// Definicje światów / rund – 1:1 z poprzednią wersją
const WORLDS = [
  {
    id: "animals",
    name: "Zwierzęta",
    icon: "🐾",
    hint: "Czytaj nazwy zwierząt i znajdź właściwą.",
    rounds: [
      { emoji: "🐱", correct: "kot", others: ["pies", "mysz"] },
      { emoji: "🐶", correct: "pies", others: ["kot", "ryba"] },
      { emoji: "🐭", correct: "mysz", others: ["kot", "żaba"] },
      { emoji: "🐰", correct: "królik", others: ["pies", "koń"] },
      { emoji: "🐹", correct: "chomik", others: ["mysz", "kot"] },
      { emoji: "🐷", correct: "świnia", others: ["koza", "krowa"] },
      { emoji: "🐮", correct: "krowa", others: ["koza", "owca"] },
      { emoji: "🐴", correct: "koń", others: ["pies", "krowa"] },
      { emoji: "🐑", correct: "owca", others: ["koza", "kura"] },
      { emoji: "🐐", correct: "koza", others: ["owca", "świnia"] },
      { emoji: "🐔", correct: "kura", others: ["kaczka", "gęś"] },
      { emoji: "🦆", correct: "kaczka", others: ["kura", "gęś"] },
      { emoji: "🦢", correct: "łabędź", others: ["kaczka", "gęś"] },
      { emoji: "🦊", correct: "lis", others: ["pies", "kot"] },
      { emoji: "🐻", correct: "miś", others: ["pies", "kot"] },
      { emoji: "🐸", correct: "żaba", others: ["ryba", "mysz"] },
      { emoji: "🐟", correct: "ryba", others: ["pies", "kot"] },
      { emoji: "🐢", correct: "żółw", others: ["żaba", "ryba"] },
      { emoji: "🐝", correct: "pszczoła", others: ["motyl", "biedronka"] },
      { emoji: "🦋", correct: "motyl", others: ["pszczoła", "biedronka"] },
      { emoji: "🐞", correct: "biedronka", others: ["pszczoła", "mrówka"] },
      { emoji: "🐜", correct: "mrówka", others: ["pszczoła", "komar"] }
    ]
  },
  {
    id: "food",
    name: "Jedzenie",
    icon: "🍎",
    hint: "Znajdź nazwę owocu lub jedzenia.",
    rounds: [
      { emoji: "🍎", correct: "jabłko", others: ["gruszka", "banan"] },
      { emoji: "🍌", correct: "banan", others: ["jabłko", "pomidor"] },
      { emoji: "🍐", correct: "gruszka", others: ["jabłko", "marchewka"] },
      { emoji: "🍊", correct: "pomarańcza", others: ["cytryna", "jabłko"] },
      { emoji: "🍋", correct: "cytryna", others: ["pomarańcza", "truskawka"] },
      { emoji: "🍓", correct: "truskawka", others: ["jabłko", "malina"] },
      { emoji: "🍇", correct: "winogrono", others: ["jabłko", "banan"] },
      { emoji: "🍒", correct: "wiśnia", others: ["truskawka", "śliwka"] },
      { emoji: "🥕", correct: "marchewka", others: ["ogórek", "ziemniak"] },
      { emoji: "🥒", correct: "ogórek", others: ["marchewka", "sałata"] },
      { emoji: "🥔", correct: "ziemniak", others: ["marchewka", "ryż"] },
      { emoji: "🍅", correct: "pomidor", others: ["jabłko", "marchewka"] },
      { emoji: "🥬", correct: "sałata", others: ["kapusta", "pomidor"] },
      { emoji: "🍞", correct: "chleb", others: ["ciasto", "lody"] },
      { emoji: "🥐", correct: "rogalik", others: ["chleb", "bułka"] },
      { emoji: "🥖", correct: "bagietka", others: ["bułka", "chleb"] },
      { emoji: "🧀", correct: "ser", others: ["chleb", "masło"] },
      { emoji: "🥚", correct: "jajko", others: ["ser", "masło"] },
      { emoji: "🍕", correct: "pizza", others: ["makaron", "ryż"] },
      { emoji: "🍝", correct: "makaron", others: ["ryż", "zupa"] },
      { emoji: "🍚", correct: "ryż", others: ["makaron", "ziemniak"] },
      { emoji: "🍰", correct: "ciasto", others: ["chleb", "lody"] },
      { emoji: "🧁", correct: "babeczka", others: ["ciasto", "lody"] },
      { emoji: "🍦", correct: "lody", others: ["ciasto", "pizza"] },
      { emoji: "🥛", correct: "mleko", others: ["woda", "sok"] },
      { emoji: "🥤", correct: "sok", others: ["woda", "mleko"] },
      { emoji: "💧", correct: "woda", others: ["sok", "mleko"] }
    ]
  },
  {
    id: "home",
    name: "Dom",
    icon: "🏠",
    hint: "To rzeczy w domu. Jak się nazywają?",
    rounds: [
      { emoji: "🏠", correct: "dom", others: ["szkoła", "sklep"] },
      { emoji: "🛏️", correct: "łóżko", others: ["stół", "krzesło"] },
      { emoji: "🛋️", correct: "sofa", others: ["łóżko", "krzesło"] },
      { emoji: "🪑", correct: "krzesło", others: ["stół", "łóżko"] },
      { emoji: "🪟", correct: "okno", others: ["drzwi", "zegar"] },
      { emoji: "🚪", correct: "drzwi", others: ["okno", "stół"] },
      { emoji: "🧸", correct: "zabawka", others: ["książka", "telefon"] },
      { emoji: "📺", correct: "telewizor", others: ["telefon", "komputer"] },
      { emoji: "📱", correct: "telefon", others: ["telewizor", "zegar"] },
      { emoji: "🕰️", correct: "zegar", others: ["lampa", "okno"] },
      { emoji: "💡", correct: "lampa", others: ["zegar", "okno"] },
      { emoji: "📦", correct: "pudełko", others: ["książka", "plecak"] },
      { emoji: "🧹", correct: "miotła", others: ["zmiotka", "szufelka"] },
      { emoji: "🪣", correct: "wiadro", others: ["pudełko", "krzesło"] }
    ]
  },
  {
    id: "school",
    name: "Szkoła",
    icon: "🏫",
    hint: "Przedmioty i osoby w szkole.",
    rounds: [
      { emoji: "🏫", correct: "szkoła", others: ["dom", "sklep"] },
      { emoji: "📚", correct: "książka", others: ["zeszyt", "zabawka"] },
      { emoji: "📓", correct: "zeszyt", others: ["książka", "gazeta"] },
      { emoji: "✏️", correct: "ołówek", others: ["długopis", "nożyczki"] },
      { emoji: "🖊️", correct: "długopis", others: ["ołówek", "klej"] },
      { emoji: "✂️", correct: "nożyczki", others: ["klej", "linijka"] },
      { emoji: "📐", correct: "linijka", others: ["ołówek", "zeszyt"] },
      { emoji: "🧴", correct: "klej", others: ["nożyczki", "długopis"] },
      { emoji: "🎒", correct: "plecak", others: ["pudełko", "książka"] },
      { emoji: "🧑‍🏫", correct: "nauczyciel", others: ["tata", "kolega"] },
      { emoji: "👩‍🏫", correct: "nauczycielka", others: ["mama", "koleżanka"] },
      { emoji: "🧑‍🎓", correct: "uczeń", others: ["nauczyciel", "brat"] },
      { emoji: "🔤", correct: "litery", others: ["cyfry", "obrazki"] },
      { emoji: "🔢", correct: "cyfry", others: ["litery", "książki"] }
    ]
  },
  {
    id: "actions",
    name: "Czynności",
    icon: "🏃",
    hint: "Co robi dziecko na obrazku?",
    rounds: [
      { emoji: "🏃‍♂️", correct: "biega", others: ["śpi", "siedzi"] },
      { emoji: "😴", correct: "śpi", others: ["biega", "czyta"] },
      { emoji: "📖", correct: "czyta", others: ["pisze", "rysuje"] },
      { emoji: "✍️", correct: "pisze", others: ["czyta", "biega"] },
      { emoji: "🎨", correct: "rysuje", others: ["czyta", "gra"] },
      { emoji: "⚽", correct: "gra", others: ["śpi", "czyta"] },
      { emoji: "🥤", correct: "pije", others: ["je", "śpi"] },
      { emoji: "🍽️", correct: "je", others: ["pije", "rysuje"] },
      { emoji: "👂", correct: "słucha", others: ["czyta", "pisze"] },
      { emoji: "👀", correct: "patrzy", others: ["biega", "śpi"] },
      { emoji: "🧼", correct: "myje ręce", others: ["je", "śpi"] },
      { emoji: "🪥", correct: "myje zęby", others: ["pisze", "je"] }
    ]
  },
  {
    id: "clothes",
    name: "Ubrania",
    icon: "👗",
    hint: "Jak nazywają się części ubrania?",
    rounds: [
      { emoji: "👕", correct: "koszulka", others: ["spodnie", "sukienka"] },
      { emoji: "👖", correct: "spodnie", others: ["buty", "koszulka"] },
      { emoji: "👗", correct: "sukienka", others: ["koszulka", "spódnica"] },
      { emoji: "👟", correct: "buty", others: ["skarpetki", "czapka"] },
      { emoji: "🧦", correct: "skarpetki", others: ["buty", "spodnie"] },
      { emoji: "🧥", correct: "kurtka", others: ["koszulka", "czapka"] },
      { emoji: "🧢", correct: "czapka", others: ["kurtka", "szalik"] },
      { emoji: "🧣", correct: "szalik", others: ["czapka", "koszulka"] },
      { emoji: "🧤", correct: "rękawiczki", others: ["skarpetki", "buty"] }
    ]
  },
  {
    id: "nature",
    name: "Przyroda",
    icon: "🌿",
    hint: "Elementy przyrody i pogody.",
    rounds: [
      { emoji: "☀️", correct: "słońce", others: ["księżyc", "gwiazda"] },
      { emoji: "🌙", correct: "księżyc", others: ["słońce", "gwiazda"] },
      { emoji: "⭐", correct: "gwiazda", others: ["słońce", "chmura"] },
      { emoji: "☁️", correct: "chmura", others: ["słońce", "śnieg"] },
      { emoji: "🌧️", correct: "deszcz", others: ["słońce", "śnieg"] },
      { emoji: "❄️", correct: "śnieg", others: ["deszcz", "słońce"] },
      { emoji: "🌈", correct: "tęcza", others: ["deszcz", "słońce"] },
      { emoji: "🌳", correct: "drzewo", others: ["kwiat", "trawa"] },
      { emoji: "🌸", correct: "kwiat", others: ["drzewo", "liść"] },
      { emoji: "🍂", correct: "liść", others: ["kwiat", "trawa"] },
      { emoji: "🌊", correct: "rzeka", others: ["góra", "drzewo"] },
      { emoji: "⛰️", correct: "góra", others: ["rzeka", "dom"] }
    ]
  },
  {
    id: "transport",
    name: "Pojazdy",
    icon: "🚗",
    hint: "Jakim pojazdem jedziemy lub lecimy?",
    rounds: [
      { emoji: "🚗", correct: "samochód", others: ["rower", "autobus"] },
      { emoji: "🚌", correct: "autobus", others: ["samochód", "tramwaj"] },
      { emoji: "🚋", correct: "tramwaj", others: ["autobus", "pociąg"] },
      { emoji: "🚆", correct: "pociąg", others: ["tramwaj", "samochód"] },
      { emoji: "🚲", correct: "rower", others: ["hulajnoga", "samochód"] },
      { emoji: "🛴", correct: "hulajnoga", others: ["rower", "samochód"] },
      { emoji: "✈️", correct: "samolot", others: ["statek", "samochód"] },
      { emoji: "🚢", correct: "statek", others: ["samolot", "rower"] },
      { emoji: "🚀", correct: "rakieta", others: ["samolot", "statek"] }
    ]
  },
  {
    id: "family",
    name: "Rodzina",
    icon: "👨‍👩‍👧‍👦",
    hint: "Kto jest kim w rodzinie?",
    rounds: [
      { emoji: "👩", correct: "mama", others: ["pani", "siostra"] },
      { emoji: "👨", correct: "tata", others: ["pan", "brat"] },
      { emoji: "👵", correct: "babcia", others: ["mama", "pani"] },
      { emoji: "👴", correct: "dziadek", others: ["tata", "pan"] },
      { emoji: "👦", correct: "brat", others: ["kolega", "chłopiec"] },
      { emoji: "👧", correct: "siostra", others: ["koleżanka", "dziewczynka"] },
      { emoji: "👶", correct: "dziecko", others: ["brat", "siostra"] },
      { emoji: "👨‍👩‍👧‍👦", correct: "rodzina", others: ["klasa", "grupa"] }
    ]
  }
];

const goodMessages = [
  "Brawo! Czytasz jak mistrz.",
  "Super! Twoje oczy są szybkie jak laser.",
  "Tak jest! Świetnie dopasowane słowo.",
  "Pięknie! Litery chyba cię lubią. 😊",
  "Ekstra! Kolejny dobry wybór.",
  "Świetnie! Ten świat coraz łatwiejszy."
];

const wrongMessages = [
  "Prawie! Zwróć uwagę na pierwszą literę.",
  "Spróbuj inaczej: popatrz na koniec słowa.",
  "Nie szkodzi. Przeczytaj powoli wszystkie wyrazy.",
  "Litery czasem mylą – spróbuj jeszcze raz."
];

const levelCompleteMessages = [
  "Poziom ukończony! Odblokowujesz nowy świat!",
  "Świetnie! Ten świat jest twój.",
  "Brawo! Czas na kolejny poziom."
];

// Stan dynamiczny
let unlockedWorlds = 1;
let currentWorldIndex = 0;
let currentRound = null;
let answered = false;
let score = 0;
let streak = 0;
let bestStreakCurrentWorld = 0;
let questionInWorld = 0;

// DOM
let worldsRow;
let emojiEl;
let choicesEl;
let messageEl;
let nextBtn;
let cardEl;
let streakEl;
let progressBar;
let worldNameLabel;
let hintEl;
let scoreEl;
let unlockedWorldsLabel;
let questionCounterEl;
let questionsPerLevelLabel;

// Helpers

function $(selector) {
  return document.querySelector(selector);
}

function markDirty() {
  hasUnsavedChanges = true;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// ArcadeProgress – integracja

function buildSavePayload() {
  return {
    unlockedWorlds,
    currentWorldIndex,
    score,
    streak,
    bestStreakCurrentWorld,
    questionInWorld
  };
}

function applyLoadedState(data) {
  if (!data) return;

  if (typeof data.unlockedWorlds === "number") {
    unlockedWorlds = Math.min(Math.max(1, data.unlockedWorlds), WORLDS.length);
  }
  if (typeof data.currentWorldIndex === "number") {
    currentWorldIndex = Math.min(
      Math.max(0, data.currentWorldIndex),
      WORLDS.length - 1
    );
  }
  if (typeof data.score === "number") {
    score = data.score;
  }
  if (typeof data.streak === "number") {
    streak = data.streak;
  }
  if (typeof data.bestStreakCurrentWorld === "number") {
    bestStreakCurrentWorld = data.bestStreakCurrentWorld;
  }
  if (typeof data.questionInWorld === "number") {
    questionInWorld = data.questionInWorld;
  }

  LAST_SAVE_DATA = data;
  hasUnsavedChanges = false;
}

function loadProgress() {
  if (!window.ArcadeProgress || !ArcadeProgress.load) {
    console.warn("[ZnajdzSlowo]", GAME_ID, "Brak ArcadeProgress.load – lecimy bez chmury");
    return Promise.resolve();
  }

  return ArcadeProgress.load(GAME_ID)
    .then(function (data) {
      applyLoadedState(data);
    })
    .catch(function (err) {
      console.error("[ZnajdzSlowo]", GAME_ID, "Błąd load:", err);
    });
}

function saveCurrentSession() {
  if (!window.ArcadeProgress || !ArcadeProgress.save) {
    console.warn("[ZnajdzSlowo]", GAME_ID, "Brak ArcadeProgress.save");
    return Promise.resolve();
  }

  const payload = buildSavePayload();

  return ArcadeProgress.save(GAME_ID, payload)
    .then(function () {
      LAST_SAVE_DATA = payload;
      hasUnsavedChanges = false;
      console.log("[ZnajdzSlowo]", GAME_ID, "zapisano:", payload);
    })
    .catch(function (err) {
      console.error("[ZnajdzSlowo]", GAME_ID, "Błąd save:", err);
    });
}

function clearProgress() {
  if (!window.ArcadeProgress || !ArcadeProgress.clear) {
    console.warn("[ZnajdzSlowo]", GAME_ID, "Brak ArcadeProgress.clear");
    return Promise.resolve();
  }

  return ArcadeProgress.clear(GAME_ID)
    .then(function () {
      LAST_SAVE_DATA = null;
      hasUnsavedChanges = false;

      // pełny reset stanu gry
      unlockedWorlds = 1;
      currentWorldIndex = 0;
      score = 0;
      streak = 0;
      bestStreakCurrentWorld = 0;
      questionInWorld = 0;

      updateScoreUI();
      updateStreakDisplay();
      updateProgress();
      buildWorldButtons();
      loadWorldInfo();
      loadRound();

      console.log("[ZnajdzSlowo]", GAME_ID, "progress wyczyszczony");
    })
    .catch(function (err) {
      console.error("[ZnajdzSlowo]", GAME_ID, "Błąd clear:", err);
    });
}

// Guardy "niezapisane zmiany"

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

// UI

function updateScoreUI() {
  if (scoreEl) {
    scoreEl.textContent = String(score);
  }
  if (unlockedWorldsLabel) {
    unlockedWorldsLabel.textContent = unlockedWorlds + " / " + WORLDS.length;
  }
}

function updateStreakDisplay() {
  if (streakEl) {
    streakEl.textContent = streak;
  }
  const streakInfo = document.querySelector(".streak-info");
  if (streakInfo) {
    if (streak >= 3) {
      streakInfo.classList.add("streak-highlight");
    } else {
      streakInfo.classList.remove("streak-highlight");
    }
  }
}

function updateProgress() {
  if (!progressBar) return;
  const progress = (questionInWorld / QUESTIONS_PER_LEVEL) * 100;
  progressBar.style.width = progress + "%";
  if (questionCounterEl) {
    questionCounterEl.textContent = questionInWorld.toString();
  }
  if (questionsPerLevelLabel) {
    questionsPerLevelLabel.textContent = QUESTIONS_PER_LEVEL.toString();
  }
}

function loadWorldInfo() {
  const world = WORLDS[currentWorldIndex];
  if (worldNameLabel) {
    worldNameLabel.textContent = "Świat: " + world.name;
  }
  if (hintEl) {
    hintEl.textContent = world.hint;
  }
  updateProgress();
}

function buildWorldButtons() {
  if (!worldsRow) return;
  worldsRow.innerHTML = "";

  WORLDS.forEach((world, index) => {
    const btn = document.createElement("button");
    btn.className = "world-btn";
    if (index === currentWorldIndex) {
      btn.classList.add("active");
    }
    if (index >= unlockedWorlds) {
      btn.classList.add("locked");
    }
    btn.dataset.index = index;

    // ⬇️ TUTAJ: tylko emotka, bez nazwy
    const iconSpan = document.createElement("span");
    iconSpan.className = "world-icon";
    iconSpan.textContent = world.icon;
    btn.appendChild(iconSpan);

    btn.addEventListener("click", () => {
      if (index >= unlockedWorlds) {
        messageEl.textContent =
          "Ten świat jest jeszcze zamknięty. Ukończ najpierw poprzedni.";
        return;
      }
      if (currentWorldIndex !== index) {
        currentWorldIndex = index;
        streak = 0;
        bestStreakCurrentWorld = 0;
        questionInWorld = 0;
        updateStreakDisplay();
        updateProgress();
        loadWorldInfo();
        loadRound();
        buildWorldButtons();
        markDirty();
      }
    });

    worldsRow.appendChild(btn);
  });
}


// Rundy

function pickRandomRoundFromWorld(world) {
  return world.rounds[Math.floor(Math.random() * world.rounds.length)];
}

function loadRound() {
  answered = false;
  if (messageEl) messageEl.textContent = "";

  const world = WORLDS[currentWorldIndex];
  currentRound = pickRandomRoundFromWorld(world);

  if (emojiEl) emojiEl.textContent = currentRound.emoji;

  const options = shuffle([currentRound.correct, ...currentRound.others]);
  if (!choicesEl) return;
  choicesEl.innerHTML = "";

  options.forEach(word => {
    const btn = document.createElement("button");
    btn.textContent = word;
    btn.className = "choice-btn";
    btn.addEventListener("click", () =>
      handleChoice(btn, word === currentRound.correct)
    );
    choicesEl.appendChild(btn);
  });

  updateProgress();
  updateStreakDisplay();
  updateScoreUI();
}

function handleChoice(button, isCorrect) {
  if (answered) return;
  answered = true;

  const allButtons = document.querySelectorAll(".choice-btn");
  allButtons.forEach(b => b.classList.add("disabled"));

  if (isCorrect) {
    button.classList.add("correct");
    const msg = randomItem(goodMessages);
    messageEl.textContent = msg;

    streak++;
    bestStreakCurrentWorld = Math.max(bestStreakCurrentWorld, streak);
    const bonus = streak >= 3 ? 1 : 0;
    score += 1 + bonus;
    updateScoreUI();
    updateStreakDisplay();
    markDirty();
  } else {
    button.classList.add("wrong");
    const msg = randomItem(wrongMessages);
    messageEl.textContent = msg;
    streak = 0;
    updateStreakDisplay();
    markDirty();

    if (cardEl) {
      cardEl.classList.remove("shake");
      void cardEl.offsetWidth;
      cardEl.classList.add("shake");
    }

    allButtons.forEach(b => {
      if (b.textContent === currentRound.correct) {
        b.classList.add("correct");
      }
    });
  }
}

function completeWorldIfNeeded() {
  if (questionInWorld >= QUESTIONS_PER_LEVEL) {
    const msg = randomItem(levelCompleteMessages);
    messageEl.textContent =
      msg +
      " (Najlepsza seria w tym świecie: " +
      bestStreakCurrentWorld +
      ")";

    questionInWorld = 0;
    bestStreakCurrentWorld = 0;
    streak = 0;
    updateStreakDisplay();

    if (
      unlockedWorlds < WORLDS.length &&
      currentWorldIndex === unlockedWorlds - 1
    ) {
      unlockedWorlds++;
      messageEl.textContent += " Nowy świat odblokowany!";
    }

    markDirty();
    buildWorldButtons();
    updateScoreUI();
  }
}

function nextRound() {
  if (!answered) {
    messageEl.textContent =
      "Najpierw wybierz słowo, potem przejdź dalej. 🙂";
    return;
  }

  questionInWorld++;
  completeWorldIfNeeded();

  const allButtons = document.querySelectorAll(".choice-btn");
  allButtons.forEach(b =>
    b.classList.remove("correct", "wrong", "disabled")
  );
  if (cardEl) {
    cardEl.classList.remove("shake");
  }
  loadRound();
}

// Przyciski: Nowa gra / Zapisz / Reset

function attachEvents() {
  const newGameBtn = $("#new-game-btn");
  const saveGameBtn = $("#save-game-btn");
  const resetRecordBtn = $("#reset-record-btn");

  if (nextBtn) {
    nextBtn.addEventListener("click", nextRound);
  }

  if (newGameBtn) {
    newGameBtn.addEventListener("click", function () {
      const ok =
        !hasUnsavedChanges ||
        window.confirm(
          "Rozpocząć nową grę? Aktualny postęp tej rozgrywki nie zostanie zapisany."
        );
      if (!ok) return;

      unlockedWorlds = 1;
      currentWorldIndex = 0;
      score = 0;
      streak = 0;
      bestStreakCurrentWorld = 0;
      questionInWorld = 0;

      updateScoreUI();
      updateStreakDisplay();
      updateProgress();
      buildWorldButtons();
      loadWorldInfo();
      loadRound();

      hasUnsavedChanges = true;
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
        "Na pewno chcesz całkowicie wyczyścić postęp w tej gry?"
      );
      if (!ok) return;
      clearProgress();
    });
  }
}

// Init

function initGame() {
  // Złapanie DOM
  worldsRow = document.getElementById("worldsRow");
  emojiEl = document.getElementById("emoji");
  choicesEl = document.getElementById("choices");
  messageEl = document.getElementById("message");
  nextBtn = document.getElementById("next");
  cardEl = document.querySelector(".game-root");
  streakEl = document.getElementById("streak");
  progressBar = document.getElementById("progressBar");
  worldNameLabel = document.getElementById("worldNameLabel");
  hintEl = document.getElementById("hint");
  scoreEl = document.getElementById("score");
  unlockedWorldsLabel = document.getElementById("unlocked-worlds-label");
  questionCounterEl = document.getElementById("question-counter");
  questionsPerLevelLabel = document.getElementById("questions-per-level-label");

  if (
    !cardEl ||
    !worldsRow ||
    !emojiEl ||
    !choicesEl ||
    !messageEl ||
    !nextBtn ||
    !scoreEl
  ) {
    console.error(
      "[ZnajdzSlowo] Brak wymaganych elementów DOM – sprawdź index.html gry."
    );
    return;
  }

  loadProgress().then(function () {
    updateScoreUI();
    updateStreakDisplay();
    updateProgress();
    buildWorldButtons();
    loadWorldInfo();
    loadRound();
    attachEvents();
    setupBeforeUnloadGuard();
    setupClickGuard();

    if (window.ArcadeUI && ArcadeUI.addBackToArcadeButton) {
      ArcadeUI.addBackToArcadeButton({
        backUrl: "../../../arcade.html"
      });
    }
  });
}

document.addEventListener("DOMContentLoaded", initGame);
