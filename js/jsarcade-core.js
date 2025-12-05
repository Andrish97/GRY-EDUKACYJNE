// js/arcade-core.js

// 1. Supabase: konfiguracja
const SUPABASE_URL = "https://zbcpqwugthvizqzkvurw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiY3Bxd3VndGh2aXpxemt2dXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MTk1NDYsImV4cCI6MjA4MDQ5NTU0Nn0.fTZiJjToYxnvhthiSIpAcmJ2wo7gQ2bAko841_dh740";

// globalny klient
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// tryb gościa
let guestMode = false;

// --- Backend progresu (Supabase + localStorage) ---

async function getCurrentUser() {
  const { data } = await sb.auth.getUser();
  return data.user || null;
}

async function saveProgressInternal(gameId, progressData) {
  const user = await getCurrentUser();
  if (!user) {
    localStorage.setItem("progress_local_" + gameId, JSON.stringify(progressData));
    return;
  }

  const { error } = await sb
    .from("user_progress")
    .upsert({
      user_id: user.id,
      game_id: gameId,
      data: progressData,
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error("Błąd zapisu progresu:", error);
  }
}

async function loadProgressInternal(gameId) {
  const user = await getCurrentUser();
  if (!user) {
    const raw = localStorage.getItem("progress_local_" + gameId);
    return raw ? JSON.parse(raw) : null;
  }

  const { data, error } = await sb
    .from("user_progress")
    .select("data")
    .eq("user_id", user.id)
    .eq("game_id", gameId)
    .maybeSingle();

  if (error) {
    console.error("Błąd odczytu progresu:", error);
    return null;
  }
  return data ? data.data : null;
}

// tryb gościa nadpisuje powyższe
const ArcadeBackend = {
  sb,
  getCurrentUser,
  async saveProgress(gameId, data) {
    if (guestMode) {
      localStorage.setItem("progress_guest_" + gameId, JSON.stringify(data));
      return;
    }
    return saveProgressInternal(gameId, data);
  },
  async loadProgress(gameId) {
    if (guestMode) {
      const raw = localStorage.getItem("progress_guest_" + gameId);
      return raw ? JSON.parse(raw) : null;
    }
    return loadProgressInternal(gameId);
  }
};

// --- UI paska na górze ---

function createTopBar({ mode, backUrl }) {
  // wstawiamy na sam początek body
  const bar = document.createElement("div");
  bar.id = "arcade-topbar";
  bar.style.cssText = `
    position: sticky;
    top: 0;
    z-index: 1000;
    width: 100%;
    background: rgba(15,23,42,0.98);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid rgba(148,163,184,0.3);
    padding: 6px 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    font-size: 12px;
    color: #e5e7eb;
  `;

  bar.innerHTML = `
    <span id="auth-status" style="color:#9ca3af; white-space:nowrap;">Sprawdzam logowanie...</span>

    <input id="auth-email" type="email" placeholder="email"
      style="padding:4px 8px;border-radius:999px;border:1px solid rgba(148,163,184,0.5);background:#020617;color:#e5e7eb;font-size:12px;min-width:160px;">
    <input id="auth-pass" type="password" placeholder="hasło"
      style="padding:4px 8px;border-radius:999px;border:1px solid rgba(148,163,184,0.5);background:#020617;color:#e5e7eb;font-size:12px;min-width:120px;">

    <button id="btn-login" class="arcade-btn">Zaloguj</button>
    <button id="btn-register" class="arcade-btn arcade-btn-blue">Rejestracja</button>
    <button id="btn-logout" class="arcade-btn arcade-btn-orange" style="display:none;">Wyloguj</button>
    <button id="btn-guest" class="arcade-btn arcade-btn-gray">Graj jako gość</button>
    ${mode === "game" ? `<button id="btn-back" class="arcade-btn arcade-btn-green" style="margin-left:auto;">⟵ Powrót do Arcade</button>` : ""}
  `;

  document.body.prepend(bar);

  // bazowa klasa przycisków
  const style = document.createElement("style");
  style.textContent = `
    .arcade-btn {
      padding: 4px 10px;
      border-radius: 999px;
      border: none;
      background: linear-gradient(135deg,#22c55e,#16a34a);
      color: #052e16;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 6px 18px rgba(22,163,74,0.55);
      transition: transform 0.08s ease, box-shadow 0.08s ease, filter 0.08s ease;
      white-space: nowrap;
    }
    .arcade-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 9px 20px rgba(22,163,74,0.7);
      filter: brightness(1.05);
    }
    .arcade-btn:active {
      transform: translateY(0) scale(0.97);
      box-shadow: 0 5px 14px rgba(22,163,74,0.6);
      filter: brightness(0.97);
    }
    .arcade-btn-blue {
      background: linear-gradient(135deg,#38bdf8,#0ea5e9);
      box-shadow: 0 6px 18px rgba(56,189,248,0.55);
      color: #0b1120;
    }
    .arcade-btn-orange {
      background: linear-gradient(135deg,#f97316,#ea580c);
      box-shadow: 0 6px 18px rgba(249,115,22,0.55);
      color: #431407;
    }
    .arcade-btn-gray {
      background: linear-gradient(135deg,#6b7280,#4b5563);
      box-shadow: 0 6px 18px rgba(107,114,128,0.55);
      color: #f9fafb;
    }
    .arcade-btn-green {
      background: linear-gradient(135deg,#22c55e,#16a34a);
    }
  `;
  document.head.appendChild(style);

  if (mode === "game" && backUrl) {
    const backBtn = bar.querySelector("#btn-back");
    backBtn.onclick = () => {
      window.location.href = backUrl;
    };
  }

  setupAuthHandlers();
}

// --- Logika auth wspólna ---

async function refreshAuthBar() {
  const statusEl = document.getElementById("auth-status");
  const emailInput = document.getElementById("auth-email");
  const passInput = document.getElementById("auth-pass");
  const btnLogin = document.getElementById("btn-login");
  const btnRegister = document.getElementById("btn-register");
  const btnLogout = document.getElementById("btn-logout");

  const user = await ArcadeBackend.getCurrentUser();

  if (guestMode) {
    statusEl.textContent = "Tryb gościa: zapis lokalny";
    emailInput.style.display = "inline-block";
    passInput.style.display = "inline-block";
    btnLogin.style.display = "inline-block";
    btnRegister.style.display = "inline-block";
    btnLogout.style.display = "none";
    return;
  }

  if (user) {
    statusEl.textContent = "Zalogowany jako: " + (user.email || user.id);
    emailInput.style.display = "none";
    passInput.style.display = "none";
    btnLogin.style.display = "none";
    btnRegister.style.display = "none";
    btnLogout.style.display = "inline-block";
  } else {
    statusEl.textContent = "Nie zalogowany – progres zapisze się lokalnie.";
    emailInput.style.display = "inline-block";
    passInput.style.display = "inline-block";
    btnLogin.style.display = "inline-block";
    btnRegister.style.display = "inline-block";
    btnLogout.style.display = "none";
  }
}

function enableGuestMode() {
  guestMode = true;
  refreshAuthBar();
}

function setupAuthHandlers() {
  document.getElementById("btn-login").onclick = async () => {
    const email = document.getElementById("auth-email").value;
    const pass = document.getElementById("auth-pass").value;
    const { error } = await ArcadeBackend.sb.auth.signInWithPassword({ email, password: pass });
    if (error) alert("Błąd logowania: " + error.message);
    guestMode = false;
    await refreshAuthBar();
  };

  document.getElementById("btn-register").onclick = async () => {
    const email = document.getElementById("auth-email").value;
    const pass = document.getElementById("auth-pass").value;
    const { error } = await ArcadeBackend.sb.auth.signUp({ email, password: pass });
    if (error) alert("Błąd rejestracji: " + error.message);
    else alert("Sprawdź maila, żeby potwierdzić konto.");
    guestMode = false;
    await refreshAuthBar();
  };

  document.getElementById("btn-logout").onclick = async () => {
    await ArcadeBackend.sb.auth.signOut();
    guestMode = false;
    await refreshAuthBar();
  };

  document.getElementById("btn-guest").onclick = () => {
    enableGuestMode();
  };

  refreshAuthBar();
}

// --- Publiczne API rdzenia ---

window.ArcadeCore = {
  backend: ArcadeBackend,

  // index: pokaż pasek + poinformuj, kiedy user/guest wybrany
  async initIndex({ onReady } = {}) {
    createTopBar({ mode: "index" });
    // czekamy chwilę aż Supabase odczyta sesję, ale nie blokujemy na sztywno
    await refreshAuthBar();
    if (onReady) onReady();
  },

  // gra: pasek + przycisk powrotu
  async initGame({ gameId, backUrl }) {
    createTopBar({ mode: "game", backUrl });
    await refreshAuthBar();
    // zwracamy backend, żeby łatwo destrukturyzować
    return ArcadeBackend;
  }
};
