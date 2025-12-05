// js/arcade-core.js
// Wspólny rdzeń: Supabase, tryb gościa, pasek u góry, zapis progresu

const ArcadeCore = (() => {
  const SUPABASE_URL = "https://zbcpqwugthvizqzkvurw.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiY3Bxd3VndGh2aXpxemt2dXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MTk1NDYsImV4cCI6MjA4MDQ5NTU0Nn0.fTZiJjToYxnvhthiSIpAcmJ2wo7gQ2bAko841_dh740";

  let sb = null;
  let guestMode = false;

  function ensureClient() {
    if (!sb) {
      if (typeof supabase === "undefined") {
        console.error("Supabase CDN nie jest dostępny");
        return;
      }
      sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
  }

  function loadModeFromStorage() {
    const mode = localStorage.getItem("arcade_mode");
    guestMode = mode === "guest";
  }

  function setMode(mode) {
    guestMode = mode === "guest";
    localStorage.setItem("arcade_mode", guestMode ? "guest" : "user");
  }

  async function getCurrentUser() {
    ensureClient();
    if (!sb) return null;
    const { data } = await sb.auth.getUser();
    return data.user || null;
  }

  // ---------- Progres gier ----------

  async function saveProgress(gameId, data) {
    ensureClient();
    if (!sb) {
      localStorage.setItem("progress_local_" + gameId, JSON.stringify(data));
      return;
    }

    if (guestMode) {
      localStorage.setItem("progress_guest_" + gameId, JSON.stringify(data));
      return;
    }

    const user = await getCurrentUser();
    if (!user) {
      localStorage.setItem("progress_local_" + gameId, JSON.stringify(data));
      return;
    }

    await sb
      .from("user_progress")
      .upsert({
        user_id: user.id,
        game_id: gameId,
        data,
        updated_at: new Date().toISOString()
      });
  }

  async function loadProgress(gameId) {
    ensureClient();
    if (!sb) {
      const raw = localStorage.getItem("progress_local_" + gameId);
      return raw ? JSON.parse(raw) : null;
    }

    if (guestMode) {
      const raw = localStorage.getItem("progress_guest_" + gameId);
      return raw ? JSON.parse(raw) : null;
    }

    const user = await getCurrentUser();
    if (!user) {
      const raw = localStorage.getItem("progress_local_" + gameId);
      return raw ? JSON.parse(raw) : null;
    }

    const { data } = await sb
      .from("user_progress")
      .select("data")
      .eq("user_id", user.id)
      .eq("game_id", gameId)
      .maybeSingle();

    return data ? data.data : null;
  }

  // ---------- Topbar (UI) ----------

  function renderTopBar() {
    loadModeFromStorage();
    const bar = document.createElement("div");
    bar.className = "arcade-topbar";

    bar.innerHTML = `
      <span class="arcade-user"></span>
      <div class="arcade-auth">
        <input type="email" placeholder="email" class="arcade-input email">
        <input type="password" placeholder="hasło" class="arcade-input pass">
        <button class="arcade-btn login">Zaloguj</button>
        <button class="arcade-btn register">Rejestracja</button>
        <button class="arcade-btn logout" style="display:none;">Wyloguj</button>
        <button class="arcade-btn guest">Gość</button>
      </div>
    `;

    document.body.prepend(bar);

    const email = bar.querySelector(".email");
    const pass = bar.querySelector(".pass");
    const login = bar.querySelector(".login");
    const register = bar.querySelector(".register");
    const logout = bar.querySelector(".logout");
    const guest = bar.querySelector(".guest");
    const userLabel = bar.querySelector(".arcade-user");

    async function refresh() {
      ensureClient();
      const user = await getCurrentUser();

      if (guestMode) {
        userLabel.textContent = "Tryb gościa (zapis lokalny)";
        email.style.display = "inline-block";
        pass.style.display = "inline-block";
        login.style.display = "inline-block";
        register.style.display = "inline-block";
        logout.style.display = "none";
        return;
      }

      if (user) {
        userLabel.textContent = "Zalogowany: " + (user.email || user.id);
        email.style.display = "none";
        pass.style.display = "none";
        login.style.display = "none";
        register.style.display = "none";
        logout.style.display = "inline-block";
      } else {
        userLabel.textContent = "Nie zalogowany (zapis lokalny)";
        email.style.display = "inline-block";
        pass.style.display = "inline-block";
        login.style.display = "inline-block";
        register.style.display = "inline-block";
        logout.style.display = "none";
      }
    }

    login.onclick = async () => {
      const emailVal = email.value.trim();
      const passVal = pass.value;
      const { error } = await loginUser(emailVal, passVal);
      if (error) alert("Błąd logowania: " + error.message);
      refresh();
    };

    register.onclick = async () => {
      const emailVal = email.value.trim();
      const passVal = pass.value;
      const { error } = await registerUser(emailVal, passVal);
      if (error) alert("Błąd rejestracji: " + error.message);
      refresh();
    };

    logout.onclick = async () => {
      ensureClient();
      await sb.auth.signOut();
      setMode("guest"); // po wylogowaniu traktujemy jako gościa
      refresh();
    };

    guest.onclick = () => {
      setMode("guest");
      refresh();
    };

    refresh();
  }

  function injectBackButton(backUrl) {
    const btn = document.createElement("button");
    btn.textContent = "Powrót do Arcade";
    btn.className = "arcade-backbtn";
    btn.onclick = () => {
      window.location.href = backUrl;
    };
    document.body.appendChild(btn);
  }

  // ---------- Metody auth dla index.html ----------

  async function loginUser(email, password) {
    ensureClient();
    if (!sb) return { error: new Error("Brak Supabase") };
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (!error) setMode("user");
    return { data, error };
  }

  async function registerUser(email, password) {
    ensureClient();
    if (!sb) return { error: new Error("Brak Supabase") };
    const { data, error } = await sb.auth.signUp({ email, password });
    if (!error) setMode("user");
    return { data, error };
  }

  async function resetPassword(email, redirectTo) {
    ensureClient();
    if (!sb) return { error: new Error("Brak Supabase") };
    const { data, error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo
    });
    return { data, error };
  }

  // ---------- API publiczne ----------

  return {
    // dla listy gier
    initIndex() {
      renderTopBar();
    },

    // dla gier
    async initGame({ gameId, backUrl }) {
      renderTopBar();

      const params = new URLSearchParams(window.location.search);
      const isFullscreen = params.get("fullscreen") === "1";
      if (isFullscreen) injectBackButton(backUrl);

      return {
        saveProgress: (id, data) => saveProgress(id, data),
        loadProgress: (id) => loadProgress(id)
      };
    },

    // dla ekranu startowego
    async login(email, password) {
      return loginUser(email, password);
    },
    async register(email, password) {
      return registerUser(email, password);
    },
    async resetPassword(email, redirectTo) {
      return resetPassword(email, redirectTo);
    },
    setGuest() {
      setMode("guest");
    },
    getMode() {
      loadModeFromStorage();
      return guestMode ? "guest" : "user";
    }
  };
})();
