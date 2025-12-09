/* ===============================
      NEON WORDL – GRA LOGICZNA
   =============================== */

const EDGE_URL = "https://zbcpqwugthvizqzkvurw.supabase.co/functions/v1/wordgen";
const MAX_ROWS = 6;

let boardEl, statusEl, lenSel;
let board = [];
let row = 0;
let col = 0;
let wordLength = 5;
let secret = "";

/* ===============================
      POBIERANIE SŁÓW
   =============================== */

async function generateWordsFromAI(len) {
  const resp = await fetch(EDGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ len })
  });
  const data = await resp.json();
  return data.words;
}

async function loadUserDict(user_id, len) {
  const { data } = await supabaseClient
    .from("user_dicts")
    .select("words")
    .eq("user_id", user_id)
    .eq("len", len)
    .maybeSingle();

  return data?.words || null;
}

async function saveUserDict(user_id, len, words) {
  await supabaseClient
    .from("user_dicts")
    .upsert({
      user_id,
      len,
      words,
      updated_at: new Date().toISOString(),
    });
}

async function getGuestSecret(len) {
  const key = "guest_dict_" + len;
  let words = JSON.parse(localStorage.getItem(key) || "[]");

  if (!words.length) {
    words = await generateWordsFromAI(len);
    localStorage.setItem(key, JSON.stringify(words));
  }

  const secret = words.shift();
  localStorage.setItem(key, JSON.stringify(words));
  return secret;
}

async function getSecretWord(len) {
  const user = await ArcadeAuth.getUser();
  if (!user) return getGuestSecret(len);

  let words = await loadUserDict(user.id, len);

  if (!words || !words.length) {
    words = await generateWordsFromAI(len);
  }

  const secret = words.shift();

  if (!words.length) {
    const refill = await generateWordsFromAI(len);
    await saveUserDict(user.id, len, refill);
  } else {
    await saveUserDict(user.id, len, words);
  }

  return secret;
}

/* ===============================
      UI – KLAWIATURA
   =============================== */

const KEYBOARD = [
  "A","Ą","B","C","Ć","D","E","Ę","F","G",
  "H","I","J","K","L","Ł","M","N","Ń","O",
  "Ó","P","R","S","Ś","T","U","W","Y","Z",
  "Ż","Ź"
];

function initKeyboard() {
  const k = document.getElementById("keyboard");
  k.innerHTML = "";
  KEYBOARD.forEach(l => {
    const b = document.createElement("div");
    b.className = "key";
    b.textContent = l;
    b.onclick = () => pressLetter(l.toLowerCase());
    k.appendChild(b);
  });
}

function updateKeyboardColors(guess, secret) {
  for (let ch of guess) {
    const idx = KEYBOARD.indexOf(ch.toUpperCase());
    if (idx === -1) continue;

    const key = document.querySelector(`#keyboard .key:nth-child(${idx+1})`);
    if (!key) continue;

    if (secret.includes(ch)) {
      if (secret.indexOf(ch) === guess.indexOf(ch)) {
        key.classList.add("correct");
      } else {
        key.classList.add("present");
      }
    } else {
      key.classList.add("absent");
    }
  }
}

/* ===============================
      LOGIKA BOARD
   =============================== */

function initBoard() {
  boardEl.innerHTML = "";
  boardEl.style.gridTemplateColumns = `repeat(${wordLength}, 50px)`;
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

function pressLetter(ch) {
  if (col >= wordLength || row >= MAX_ROWS) return;
  board[row][col].textContent = ch.toUpperCase();
  board[row][col].classList.add("filled");
  col++;
}

function erase() {
  if (col > 0) {
    col--;
    board[row][col].textContent = "";
    board[row][col].classList.remove("filled");
  }
}

function colorRow(r) {
  const guess = [];
  for (let c = 0; c < wordLength; c++) {
    guess[c] = board[r][c].textContent.toLowerCase();
  }

  updateKeyboardColors(guess, secret);

  for (let c = 0; c < wordLength; c++) {
    const tile = board[r][c];
    if (guess[c] === secret[c]) {
      tile.classList.add("correct");
    } else if (secret.includes(guess[c])) {
      tile.classList.add("present");
    } else {
      tile.classList.add("absent");
    }
  }
}

async function submitRow() {
  if (col < wordLength) return;

  let guess = "";
  for (let c = 0; c < wordLength; c++) {
    guess += board[row][c].textContent.toLowerCase();
  }

  colorRow(row);

  if (guess === secret) {
    statusEl.textContent = "Brawo!";
    row = MAX_ROWS;
    return;
  }

  row++;
  col = 0;

  if (row >= MAX_ROWS) {
    statusEl.textContent = "Porażka! Słowo: " + secret.toUpperCase();
  }
}

/* ===============================
      NOWA GRA
   =============================== */

async function newGame() {
  wordLength = parseInt(lenSel.value, 10);
  boardEl.innerHTML = "";
  statusEl.textContent = "Losuję słowo...";
  row = 0;
  col = 0;

  secret = await getSecretWord(wordLength);

  initBoard();
  initKeyboard();
  statusEl.textContent = "Zgadnij słowo!";
}

/* ===============================
      START
   =============================== */

function initGame() {
  boardEl = document.getElementById("board");
  statusEl = document.getElementById("status");
  lenSel = document.getElementById("word-len");

  document.addEventListener("keydown", e => {
    if (e.key === "Enter") submitRow();
    else if (e.key === "Backspace") erase();
    else if (/^[a-ząćęłńóśżź]$/i.test(e.key)) pressLetter(e.key.toLowerCase());
  });

  document.getElementById("new-game-btn").onclick = newGame;

  if (window.ArcadeUI) {
    ArcadeUI.addBackToArcadeButton({ backUrl: "../../../arcade.html" });
  }

  newGame();
}

document.addEventListener("DOMContentLoaded", initGame);
