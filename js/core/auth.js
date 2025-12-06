// js/core/auth.js
// Logika auth dla Neon Arcade oparta na Supabase v2

// UZUPEŁNIJ SWOIMI DANYMI:
const SUPABASE_URL = "https://zbcpqwugthvizqzkvurw.supabase.co"; // dokładnie Project URL
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiY3Bxd3VndGh2aXpxemt2dXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MTk1NDYsImV4cCI6MjA4MDQ5NTU0Nn0.fTZiJjToYxnvhthiSIpAcmJ2wo7gQ2bAko841_dh740"; // cały anon public key

// DODAJ TO (podmień na swój adres z GitHub Pages):
const ARCADE_BASE_URL = "https://andrish97.github.io/GRY-EDUKACYJNE";

let supabaseClient = null;

(function initSupabase() {
  if (!window.supabase || !window.supabase.createClient) {
    console.warn(
      "[ArcadeAuth] supabase-js niezaładowany – sprawdź <script src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'>"
    );
    return;
  }
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.supabaseClient = supabaseClient; // na wszelki wypadek dla innych plików
})();

function formatAuthError(error) {
  if (!error) return "Nieznany błąd.";
  if (error.message && typeof error.message === "string") {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return "Musisz najpierw potwierdzić adres e-mail. Sprawdź swoją skrzynkę.";
    }
    return error.message;
  }
  return String(error);
}

window.ArcadeAuth = {
  /**
   * Zwraca aktualnego użytkownika (lub null)
   */
  async getUser() {
    if (!supabaseClient) return null;
    try {
      const { data, error } = await supabaseClient.auth.getUser();
      if (error) {
        console.warn("[ArcadeAuth] getUser error:", error);
        return null;
      }
      return data.user || null;
    } catch (e) {
      console.error("[ArcadeAuth] getUser ERROR:", e);
      return null;
    }
  },

  /**
   * Słuchacz zmian sesji
   */
  onAuthStateChange(callback) {
    if (!supabaseClient) return () => {};
    const { data } = supabaseClient.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
    return () => data.subscription.unsubscribe();
  },

  /**
   * Logowanie (tylko po aktywacji maila)
   */
  async signIn(email, password) {
    if (!supabaseClient) {
      throw new Error("Brak połączenia z serwerem.");
    }
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      throw new Error(formatAuthError(error));
    }
    // dodatkowa obrona – jeśli mail niepotwierdzony:
    if (!data.user || !data.user.email_confirmed_at) {
      await supabaseClient.auth.signOut();
      throw new Error(
        "Adres e-mail nie został potwierdzony. Kliknij link aktywacyjny w wiadomości od nas."
      );
    }
    return data.user;
  },

  /**
   * Rejestracja – wymusza potwierdzenie mailowe.
   * Po sukcesie NIE logujemy od razu – user musi kliknąć link z maila.
   */
  async signUp(email, password) {
    if (!supabaseClient) {
      throw new Error("Brak połączenia z serwerem.");
    }
    const redirectUrl = `${window.location.origin}${window.location.pathname.replace(
      /\/[^/]*$/,
      ""
    )}/confirm.html`;

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      throw new Error(formatAuthError(error));
    }
    // tu zwykle data.user ma email_confirmed_at = null
    return data;
  },

  async signOut() {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
  },
  /**
   * Reset hasła – wysłanie maila z linkiem do zmiany hasła
   */
  async resetPassword(email) {
    if (!supabaseClient) {
      throw new Error("Brak połączenia z serwerem.");
    }

    if (!email || !email.trim()) {
      throw new Error("Podaj adres e-mail.");
    }

    // adres, na który Supabase przekieruje po kliknięciu w link z maila
    const redirectUrl = `${window.location.origin}${window.location.pathname.replace(
      /\/[^/]*$/,
      ""
    )}/reset.html`;

    const { data, error } = await supabaseClient.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: redirectUrl,
      }
    );

    if (error) {
      throw new Error(formatAuthError(error));
    }

    return data;
  },

  
  /**
   * Wymuś gościa: jeśli user zalogowany → przekieruj do arcade.
   * Używane na index.html.
   */
  async requireGuest({ redirectTo }) {
    const user = await this.getUser();
    if (user) {
      window.location.href = redirectTo;
    }
  },
};

/**
 * ArcadeAuthUI – prosty kontroler panelu logowania.
 * Działa zarówno z paskiem (auth-bar.js), jak i z index.html
 */
window.ArcadeAuthUI = {
  /**
   * @param {Object} opts
   * @param {HTMLInputElement} opts.email
   * @param {HTMLInputElement} opts.pass
   * @param {HTMLInputElement} [opts.pass2]
   * @param {HTMLElement} opts.status
   * @param {HTMLElement} opts.error
   * @param {HTMLButtonElement} opts.btnLogin
   * @param {HTMLButtonElement} opts.btnRegister
   * @param {HTMLButtonElement} [opts.btnGuest]
   * @param {HTMLButtonElement} [opts.btnLogout]
   * @param {HTMLElement} [opts.btnForgot]
   * @param {Function} [opts.onLoginSuccess]
   * @param {Function} [opts.onRegisterSuccess]
   * @param {Function} [opts.onLogout]
   * @param {Function} [opts.onGuest]
   */
window.ArcadeAuthUI = {
  initLoginPanel(opts) {
    const {
      email,
      pass,
      pass2,
      status,
      error,
      btnLogin,
      btnRegister,
      btnGuest,
      btnLogout,
      btnForgot,
      onLoginSuccess,
      onRegisterSuccess,
      onLogout,
      onGuest,
    } = opts;

    if (!email || !pass || !status || !btnLogin || !btnRegister) {
      console.error("[ArcadeAuthUI] brak wymaganych elementów w panelu");
      return;
    }

    let mode = "login"; // "login" | "register"

    function setError(msg) {
      if (error) error.textContent = msg || "";
    }

    function setStatus(msg) {
      if (status) status.textContent = msg || "";
    }

    function switchToLoginMode() {
      mode = "login";
      if (pass2) pass2.style.display = "none";
      btnLogin.textContent = "Zaloguj";
      btnRegister.textContent = "Załóż konto";
      setError("");
    }

    function switchToRegisterMode() {
      mode = "register";
      if (pass2) pass2.style.display = "inline-block";
      btnLogin.textContent = "Zarejestruj";
      btnRegister.textContent = "Mam konto";
      setError("");
    }

    // >>> KLUCZOWA FUNKCJA – steruje tym, co widać <<<
    function updateView(user) {
      const loggedIn = !!user;

      if (loggedIn) {
        // Zalogowany: ukryj pola i przyciski logowania/rejestracji
        if (email) email.style.display = "none";
        if (pass) pass.style.display = "none";
        if (pass2) pass2.style.display = "none";

        if (btnLogin) btnLogin.style.display = "none";
        if (btnRegister) btnRegister.style.display = "none";
        if (btnGuest) btnGuest.style.display = "none";
        if (btnForgot) btnForgot.style.display = "none";

        if (btnLogout) btnLogout.style.display = "inline-flex";

        setStatus(`Zalogowany jako: ${user.email}`);
      } else {
        // Niezalogowany: pokaż pola i przyciski
        if (email) email.style.display = "inline-block";
        if (pass) pass.style.display = "inline-block";

        // drugie pole hasła tylko w trybie rejestracji
        if (pass2) {
          pass2.style.display = mode === "register" ? "inline-block" : "none";
        }

        if (btnLogin) btnLogin.style.display = "inline-flex";
        if (btnRegister) btnRegister.style.display = "inline-flex";
        if (btnGuest) btnGuest.style.display = "inline-flex";
        if (btnForgot) btnForgot.style.display = "inline";

        if (btnLogout) btnLogout.style.display = "none";

        setStatus("Gość (niezalogowany)");
      }
    }

    switchToLoginMode();
    setStatus("Ładuję status...");

    // Stan początkowy
    ArcadeAuth.getUser().then((user) => {
      updateView(user);
    });

    // Zmiany sesji
    ArcadeAuth.onAuthStateChange(async (event, session) => {
      const user = session?.user || (await ArcadeAuth.getUser());
      updateView(user);
    });

    // logowanie / rejestracja – ten sam przycisk
    btnLogin.addEventListener("click", async () => {
      setError("");
      const mail = email.value.trim();
      const pwd = pass.value;

      if (!mail || !pwd) {
        setError("Podaj e-mail i hasło.");
        return;
      }

      if (mode === "register") {
        if (pass2 && pass2.value !== pwd) {
          setError("Hasła nie są takie same.");
          return;
        }
        try {
          await ArcadeAuth.signUp(mail, pwd);
          setStatus("Sprawdź skrzynkę e-mail – wysłaliśmy link aktywacyjny.");
          if (onRegisterSuccess) onRegisterSuccess();
        } catch (e) {
          console.error("[ArcadeAuthUI] register error:", e);
          setError(e.message || "Błąd rejestracji.");
        }
      } else {
        try {
          const user = await ArcadeAuth.signIn(mail, pwd);
          setStatus("Zalogowano.");
          updateView(user);
          if (onLoginSuccess) onLoginSuccess();
        } catch (e) {
          console.error("[ArcadeAuthUI] login error:", e);
          setError(e.message || "Błąd logowania.");
        }
      }
    });

    // przełącznik trybu
    btnRegister.addEventListener("click", () => {
      if (mode === "login") {
        switchToRegisterMode();
      } else {
        switchToLoginMode();
      }
      // po zmianie trybu odśwież widok pól (szczególnie pass2)
      ArcadeAuth.getUser().then((user) => updateView(user));
    });

    if (btnLogout) {
      btnLogout.addEventListener("click", async () => {
        setError("");
        try {
          await ArcadeAuth.signOut();
          setStatus("Wylogowano.");
          updateView(null);
          if (onLogout) onLogout();
        } catch (e) {
          console.error("[ArcadeAuthUI] logout error:", e);
          setError("Błąd wylogowania.");
        }
      });
    }

    if (btnGuest && onGuest) {
      btnGuest.addEventListener("click", () => {
        onGuest();
      });
    }

    if (btnForgot) {
      btnForgot.addEventListener("click", async () => {
        setError("");
        const mail = email.value.trim();
        if (!mail) {
          setError("Podaj e-mail, aby zresetować hasło.");
          return;
        }
        try {
          await ArcadeAuth.resetPassword(mail);
          setStatus(
            "Wysłaliśmy wiadomość z linkiem do zmiany hasła. Sprawdź skrzynkę e-mail."
          );
        } catch (e) {
          console.error("[ArcadeAuthUI] resetPassword error:", e);
          setError(e.message || "Nie udało się wysłać maila resetującego hasło.");
        }
      });
    }
  },
};

