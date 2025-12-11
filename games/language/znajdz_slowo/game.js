const GAME_ID = "znajdz-slowo";
const QUESTIONS_PER_LEVEL = 6;

// ======================================
// ŚWIATY – TWOJA PEŁNA KONFIGURACJA
// ======================================

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

// ======================================
// STAN GRY
// ======================================

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
let scoreEl;
let messageEl;
let nextBtn;
let cardEl;
let streakEl;
let progressBar;
let worldNameLabel;
let hintEl;
let resetProgressBtn;
let hintBtn;

// ======================================
// HELPERY
// ======================================

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

function clampWorldIndex(idx) {
  if (idx < 0) return 0;
  if (idx >= WORLDS.length) return WORLDS.length - 1;
  return idx;
}

function getCurrentUserLikeThing() {
  if (!window.ArcadeAuth) return null;
  if (typeof ArcadeAuth.getUser === "function") return ArcadeAuth.getUser();
  if (typeof ArcadeAuth.getCurrentUser === "function")
    return ArcadeAuth.getCurrentUser();
  return null;
}

// ======================================
// PROGRES – ArcadeProgress
// ======================================

function loadProgress() {
  if (!window.ArcadeProgress || !ArcadeProgress.load) {
    console.warn("[ZnajdzSlowo] Brak ArcadeProgress.load");
    return Promise.resolve();
  }

  return ArcadeProgress.load(GAME_ID)
    .then((data) => {
      if (!data) return;

      if (typeof data.unlockedWorlds === "number") {
        unlockedWorlds = Math.max(1, Math.min(WORLDS.length, data.unlockedWorlds));
      }
      if (typeof data.currentWorldIndex === "number") {
        currentWorldIndex = clampWorldIndex(data.currentWorldIndex);
      }
      if (typeof data.score === "number") {
        score = data.score;
      }
    })
    .catch((err) => {
      console.error("[ZnajdzSlowo] Błąd load:", err);
    });
}

function saveProgress() {
  if (!window.ArcadeProgress || !ArcadeProgress.save) {
    console.warn("[ZnajdzSlowo] Brak ArcadeProgress.save");
    return;
  }

  const payload = {
    unlockedWorlds,
    currentWorldIndex,
    score
  };

  ArcadeProgress.save(GAME_ID, payload).catch((err) => {
    console.error("[ZnajdzSlowo] Błąd save:", err);
  });
}

// ======================================
// MONETY – ArcadeCoins
// ======================================

function awardCoins(amount, reason) {
  const delta = Math.floor(amount);
  if (!Number.isFinite(delta) || delta === 0) return;

  if (!window.ArcadeCoins || !ArcadeCoins.addForGame) {
    return;
  }

  ArcadeCoins.addForGame(GAME_ID, delta, { reason })
    .then(() => {
      if (window.ArcadeAuthUI && typeof ArcadeAuthUI.refreshCoins === "function") {
        ArcadeAuthUI.refreshCoins();
      }
    })
    .catch((err) => {
      console.warn("[ZnajdzSlowo] Nie udało się zmienić monet:", err);
    });
}

async function spendCoins(cost, meta) {
  if (
    !window.ArcadeCoins ||
    !ArcadeCoins.load ||
    !ArcadeCoins.getBalance ||
    !ArcadeCoins.addForGame
  ) {
    messageEl.textContent = "System monet jest chwilowo niedostępny.";
    return false;
  }

  try {
    await ArcadeCoins.load();
    const balance = ArcadeCoins.getBalance();
    if (typeof balance !== "number" || balance < cost) {
      messageEl.textContent = "Masz za mało diamentów (5💎).";
      return false;
    }

    await ArcadeCoins.addForGame(GAME_ID, -cost, meta);

    if (window.ArcadeAuthUI && typeof ArcadeAuthUI.refreshCoins === "function") {
      ArcadeAuthUI.refreshCoins();
    }

    return true;
  } catch (err) {
    console.warn("[ZnajdzSlowo] Błąd przy wydawaniu monet:", err);
    messageEl.textContent = "Nie udało się pobrać diamentów.";
    return false;
  }
}

// ======================================
// UI – aktualizacje
// ======================================

function updateScoreUI() {
  if (scoreEl) {
    scoreEl.textContent = "Punkty: " + score;
  }
}

function updateStreakDisplay() {
  streakEl.textContent = streak;
  const streakInfo = document.querySelector(".streak-info");
  if (!streakInfo) return;
  if (streak >= 3) {
    streakInfo.classList.add("streak-highlight");
  } else {
    streakInfo.classList.remove("streak-highlight");
  }
}

function updateProgress() {
  const progress = (questionInWorld / QUESTIONS_PER_LEVEL) * 100;
  progressBar.style.width = progress + "%";
}

function loadWorldInfo() {
  const world = WORLDS[currentWorldIndex];
  worldNameLabel.textContent = "Świat: " + world.name;
  hintEl.textContent = world.hint;
  updateProgress();
}

// ======================================
// ŚWIATY – przyciski (same emotki)
// ======================================

function buildWorldButtons() {
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

    // Tylko ikonka – dopasowane do Twojego CSS (.world-btn .icon)
    const iconSpan = document.createElement("span");
    iconSpan.className = "icon";
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
        loadWorldInfo();
        loadRound();
        buildWorldButtons();
        saveProgress();
      }
    });

    worldsRow.appendChild(btn);
  });
}

// ======================================
// RUNDA
// ======================================

function pickRandomRoundFromWorld(world) {
  return world.rounds[Math.floor(Math.random() * world.rounds.length)];
}

function loadRound() {
  answered = false;
  messageEl.textContent = "";
  const world = WORLDS[currentWorldIndex];

  currentRound = pickRandomRoundFromWorld(world);
  emojiEl.textContent = currentRound.emoji;

  const options = shuffle([currentRound.correct, ...currentRound.others]);
  choicesEl.innerHTML = "";

  options.forEach((word) => {
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
}

function handleChoice(button, isCorrect) {
  if (answered) return;
  answered = true;

  const allButtons = document.querySelectorAll(".choice-btn");
  allButtons.forEach((b) => b.classList.add("disabled"));

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

    // +1 za poprawną odpowiedź (bonus tylko jako punkty)
    awardCoins(1, "correct-answer");

    saveProgress();
  } else {
    button.classList.add("wrong");
    const msg = randomItem(wrongMessages);
    messageEl.textContent = msg;
    streak = 0;
    updateStreakDisplay();

    if (cardEl) {
      cardEl.classList.remove("shake");
      void cardEl.offsetWidth;
      cardEl.classList.add("shake");
    }

    allButtons.forEach((b) => {
      if (b.textContent === currentRound.correct) {
        b.classList.add("correct");
      }
    });
  }
}

// ======================================
// POZIOM / ŚWIAT – koniec
// ======================================

function completeWorldIfNeeded() {
  if (questionInWorld >= QUESTIONS_PER_LEVEL) {
    const msg = randomItem(levelCompleteMessages);
    messageEl.textContent =
      msg + " (Najlepsza seria w tym świecie: " + bestStreakCurrentWorld + ")";
    questionInWorld = 0;
    bestStreakCurrentWorld = 0;
    streak = 0;
    updateStreakDisplay();

    // +5 za ukończenie poziomu
    awardCoins(5, "level-complete");

    if (unlockedWorlds < WORLDS.length && currentWorldIndex === unlockedWorlds - 1) {
      unlockedWorlds++;
      messageEl.textContent += " Nowy świat odblokowany!";

      // +10 za odblokowanie nowego świata
      awardCoins(10, "world-unlock");
    }

    saveProgress();
    buildWorldButtons();
  }
}

// ======================================
// NAVIGACJA RUND
// ======================================

function nextRound() {
  if (!answered) {
    messageEl.textContent =
      "Najpierw wybierz słowo, potem przejdź dalej. 🙂";
    return;
  }

  questionInWorld++;
  completeWorldIfNeeded();

  const allButtons = document.querySelectorAll(".choice-btn");
  allButtons.forEach((b) =>
    b.classList.remove("correct", "wrong", "disabled")
  );
  if (cardEl) {
    cardEl.classList.remove("shake");
  }
  loadRound();
}

// ======================================
// RESET PROGRESU
// ======================================

function attachResetProgress() {
  if (!resetProgressBtn) return;
  resetProgressBtn.addEventListener("click", () => {
    const ok = window.confirm(
      "Na pewno chcesz wyczyścić postęp w tej grze? Odblokowane światy i punkty zostaną zresetowane, monety zostają."
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
    loadWorldInfo();
    buildWorldButtons();
    loadRound();

    if (window.ArcadeProgress && ArcadeProgress.clear) {
      ArcadeProgress.clear(GAME_ID).catch((err) => {
        console.error("[ZnajdzSlowo] Błąd clear:", err);
      });
    }
  });
}

// ======================================
// PODPOWIEDŹ ZA 5 DIAMENTÓW
// ======================================

function attachHintHandler() {
  if (!hintBtn) return;

  hintBtn.addEventListener("click", async () => {
    const user = getCurrentUserLikeThing();
    if (!user) {
      messageEl.textContent =
        "Tylko zalogowani gracze mogą korzystać z podpowiedzi.";
      return;
    }

    if (!currentRound) {
      messageEl.textContent = "Brak rundy do podpowiedzi.";
      return;
    }

    const ok = await spendCoins(5, {
      reason: "hint",
      game: GAME_ID,
      world: WORLDS[currentWorldIndex].id,
      correct: currentRound.correct
    });

    if (!ok) return;

    const buttons = document.querySelectorAll(".choice-btn");
    buttons.forEach((btn) => {
      if (btn.textContent === currentRound.correct) {
        btn.classList.add("correct");
      }
    });

    messageEl.textContent = "Podpowiedź: to właściwy wyraz. 🙂";
  });
}

// ======================================
// INIT
// ======================================

async function initZnajdzSlowo() {
  worldsRow = document.getElementById("worldsRow");
  emojiEl = document.getElementById("emoji");
  choicesEl = document.getElementById("choices");
  scoreEl = document.getElementById("score");
  messageEl = document.getElementById("message");
  nextBtn = document.getElementById("next");
  streakEl = document.getElementById("streak");
  progressBar = document.getElementById("progressBar");
  worldNameLabel = document.getElementById("worldNameLabel");
  hintEl = document.getElementById("hint");
  resetProgressBtn = document.getElementById("resetProgress");
  hintBtn = document.getElementById("hintBtn");

  // karta – dopasowana do Twojego HTML:
  cardEl =
    document.querySelector(".card.game-root") ||
    document.querySelector(".card") ||
    null;

  if (
    !worldsRow ||
    !emojiEl ||
    !choicesEl ||
    !scoreEl ||
    !messageEl ||
    !nextBtn ||
    !streakEl ||
    !progressBar ||
    !worldNameLabel ||
    !hintEl
  ) {
    console.error(
      "[ZnajdzSlowo] Brak wymaganych elementów DOM – sprawdź index.html gry."
    );
    return;
  }

  await loadProgress();

  updateScoreUI();
  updateStreakDisplay();
  buildWorldButtons();
  loadWorldInfo();
  loadRound();

  nextBtn.addEventListener("click", nextRound);
  attachResetProgress();
  attachHintHandler();

  if (window.ArcadeUI && ArcadeUI.addBackToArcadeButton) {
    ArcadeUI.addBackToArcadeButton({
      backUrl: "../../../arcade.html"
    });
  }
}

document.addEventListener("DOMContentLoaded", initZnajdzSlowo);
