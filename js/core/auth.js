// js/core/auth.js
// Logika auth dla Neon Arcade oparta na Supabase v2

// Dane Twojego projektu Supabase (z panelu -> Settings -> API)
const SUPABASE_URL = "https://zbcpqwugthvizqzkvurw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiY3Bxd3VndGh2aXpxemt2dXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MTk1NDYsImV4cCI6MjA4MDQ5NTU0Nn0.fTZiJjToYxnvhthiSIpAcmJ2wo7gQ2bAko841_dh740";

// Adres bazowy Twojego frontu (GitHub Pages)
const ARCADE_BASE_URL = "https://andrish97.github.io/GRY-EDUKACYJNE";

let supabaseClient = null;

// --- Inicjalizacja supabase-js v2 ---

(function initSupabase() {
  if (!window.supabase || !window.supabase.createClient) {
    console.warn(
      "[ArcadeAuth] supabase-js niezaładowany – sprawdź <script src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'>"
    );
    return;
  }
  try {
    supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    );
    // udostępniamy klienta globalnie (reset.html z tego korzysta)
    window.supabaseClient = supabaseClient;
  } catch (e) {
    console.error("[ArcadeAuth] createClient error:", e);
  }
})();

// --- Pomocnicza funkcja formatująca błędy ---

function formatAuthError(error) {
  if (!error) return "Nieznany błąd.";
  if (error.message && typeof error.message === "string") {
    const msg = error.message;
    if (msg.toLowerCase().includes("email not confirmed")) {
      return "Musisz najpierw potwierdzić adres e-mail. Sprawdź swoją skrzynkę.";
    }
    if (msg.toLowerCase().includes("invalid login credentials")) {
      return "Nieprawidłowy e-mail lub hasło.";
    }
    return msg;
  }
  return String(error);
}

// --- Główny obiekt API: ArcadeAuth ---

window.ArcadeAuth = {
  // Pobranie aktualnego użytkownika (lub null)
  async getUser() {
    if (!supabaseClient) return null;
    try {
      const { data, error } = await supabaseClient.auth.getUser();
      if (error) {
        // brak sesji – traktujemy jak niezalogowanego
        if (
          error.name === "AuthSessionMissingError" ||
          (error.message &&
            error.message.toLowerCase().includes("auth session missing"))
        ) {
          return null;
        }
        console.warn("[ArcadeAuth] getUser error:", error);
        return null;
      }
      return data.user || null;
    } catch (e) {
      if (
        e.name === "AuthSessionMissingError" ||
        (e.message &&
          typeof e.message === "string" &&
          e.message.toLowerCase().includes("auth session missing"))
      ) {
        return null;
      }
      console.error("[ArcadeAuth] getUser ERROR:", e);
      return null;
    }
  },

  // Słuchacz zmian sesji
  onAuthStateChange(callback) {
    if (!supabaseClient) return function () {};
    const { data } = supabaseClient.auth.onAuthStateChange(
      function (event, session) {
        try {
          callback(event, session);
        } catch (e) {
          console.error("[ArcadeAuth] onAuthStateChange callback error:", e);
        }
      }
    );
    return function () {
      if (data && data.subscription) {
        data.subscription.unsubscribe();
      }
    };
  },

  // Logowanie (tylko po aktywacji maila)
  async signIn(email, password) {
    if (!supabaseClient) {
      throw new Error("Brak połączenia z serwerem.");
    }
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password,
    });
    if (error) {
      throw new Error(formatAuthError(error));
    }
    var user = data.user;
    if (!user) {
      throw new Error("Nie udało się zalogować.");
    }
    // dodatkowa obrona – wymagamy potwierdzonego e-maila
    if (!user.email_confirmed_at) {
      await supabaseClient.auth.signOut();
      throw new Error(
        "Adres e-mail nie został jeszcze potwierdzony. Kliknij link aktywacyjny w mailu."
      );
    }
    return user;
  },

  // Rejestracja – wysyła mail z linkiem aktywacyjnym
  async signUp(email, password) {
    if (!supabaseClient) {
      throw new Error("Brak połączenia z serwerem.");
    }

    var redirectUrl = ARCADE_BASE_URL + "/confirm.html";

    const { data, error } = await supabaseClient.auth.signUp({
      email: email,
      password: password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      throw new Error(formatAuthError(error));
    }
    return data;
  },

  // Wylogowanie
  async signOut() {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
  },

  // Reset hasła – wysłanie maila z linkiem do zmiany hasła
  async resetPassword(email) {
    if (!supabaseClient) {
      throw new Error("Brak połączenia z serwerem.");
    }
    if (!email || !email.trim()) {
      throw new Error("Podaj adres e-mail.");
    }

    var redirectUrl = ARCADE_BASE_URL + "/reset.html";

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
};

// --- UI: ArcadeAuthUI.initLoginPanel ---

window.ArcadeAuthUI = {
  /**
   * Inicjalizacja panelu logowania / rejestracji.
   * opts:
   *  - email, pass, pass2, status, error
   *  - btnLogin, btnRegister, btnGuest, btnLogout, btnForgot
   *  - onLoginSuccess, onRegisterSuccess, onLogout, onGuest
   */
  initLoginPanel: function (opts) {
    var email = opts.email || null;
    var pass = opts.pass || null;
    var pass2 = opts.pass2 || null;
    var status = opts.status || null;
    var error = opts.error || null;
    var btnLogin = opts.btnLogin || null;
    var btnRegister = opts.btnRegister || null;
    var btnGuest = opts.btnGuest || null;
    var btnLogout = opts.btnLogout || null;
    var btnForgot = opts.btnForgot || null;

    var onLoginSuccess = opts.onLoginSuccess || null;
    var onRegisterSuccess = opts.onRegisterSuccess || null;
    var onLogout = opts.onLogout || null;
    var onGuest = opts.onGuest || null;

    if (!email || !pass || !status || !btnLogin || !btnRegister) {
      console.error("[ArcadeAuthUI] brak wymaganych elementów w panelu");
      return;
    }

    var mode = "login"; // "login" | "register"

    function setError(msg) {
      if (error) {
        error.textContent = msg || "";
      }
    }

    function setStatus(msg) {
      if (status) {
        status.textContent = msg || "";
      }
    }

    function switchToLoginMode() {
      mode = "login";
      if (pass2) {
        pass2.style.display = "none";
      }
      btnLogin.textContent = "Zaloguj";
      btnRegister.textContent = "Załóż konto";
      setError("");
    }

    function switchToRegisterMode() {
      mode = "register";
      if (pass2) {
        pass2.style.display = "inline-block";
      }
      btnLogin.textContent = "Zarejestruj";
      btnRegister.textContent = "Mam konto";
      setError("");
    }

    // Sterowanie widokiem zależnie od tego, czy user jest zalogowany
    function updateView(user) {
      var loggedIn = !!user;

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

        setStatus("Zalogowany jako: " + (user.email || "użytkownik"));
      } else {
        // Niezalogowany: pokaż pola i przyciski
        if (email) email.style.display = "inline-block";
        if (pass) pass.style.display = "inline-block";

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

    // startowo: tryb logowania
    switchToLoginMode();
    setStatus("Ładuję status...");

    // Stan początkowy
    window.ArcadeAuth.getUser().then(function (user) {
      updateView(user);
    });

    // Zmiany sesji
    window.ArcadeAuth.onAuthStateChange(function (event, session) {
      var user = (session && session.user) || null;
      if (!user) {
        window.ArcadeAuth
          .getUser()
          .then(function (u) {
            updateView(u);
          })
          .catch(function () {
            updateView(null);
          });
      } else {
        updateView(user);
      }
    });

    // Logowanie / rejestracja – ten sam przycisk
    btnLogin.addEventListener("click", function () {
      setError("");
      var mail = email.value.trim();
      var pwd = pass.value;

      if (!mail || !pwd) {
        setError("Podaj e-mail i hasło.");
        return;
      }

      if (mode === "register") {
        if (pass2 && pass2.value !== pwd) {
          setError("Hasła nie są takie same.");
          return;
        }
        // Rejestracja
        window.ArcadeAuth
          .signUp(mail, pwd)
          .then(function () {
            setStatus(
              "Sprawdź skrzynkę e-mail – wysłaliśmy link aktywacyjny."
            );
            if (onRegisterSuccess) onRegisterSuccess();
          })
          .catch(function (e) {
            console.error("[ArcadeAuthUI] register error:", e);
            setError(e.message || "Błąd rejestracji.");
          });
      } else {
        // Logowanie
        window.ArcadeAuth
          .signIn(mail, pwd)
          .then(function (user) {
            setStatus("Zalogowano.");
            updateView(user);
            if (onLoginSuccess) onLoginSuccess();
          })
          .catch(function (e) {
            console.error("[ArcadeAuthUI] login error:", e);
            setError(e.message || "Błąd logowania.");
          });
      }
    });

    // Przełącznik trybu
    btnRegister.addEventListener("click", function () {
      if (mode === "login") {
        switchToRegisterMode();
      } else {
        switchToLoginMode();
      }
      window.ArcadeAuth.getUser().then(function (user) {
        updateView(user);
      });
    });

    // Wylogowanie
    if (btnLogout) {
      btnLogout.addEventListener("click", function () {
        setError("");
        window.ArcadeAuth
          .signOut()
          .then(function () {
            setStatus("Wylogowano.");
            updateView(null);
            if (onLogout) onLogout();
          })
          .catch(function (e) {
            console.error("[ArcadeAuthUI] logout error:", e);
            setError("Błąd wylogowania.");
          });
      });
    }

    // Gość
    if (btnGuest && onGuest) {
      btnGuest.addEventListener("click", function () {
        onGuest();
      });
    }

    // Reset hasła
    if (btnForgot) {
      btnForgot.addEventListener("click", function () {
        setError("");
        var mail = email.value.trim();
        if (!mail) {
          setError("Podaj e-mail, aby zresetować hasło.");
          return;
        }
        window.ArcadeAuth
          .resetPassword(mail)
          .then(function () {
            setStatus(
              "Wysłaliśmy wiadomość z linkiem do zmiany hasła. Sprawdź skrzynkę e-mail."
            );
          })
          .catch(function (e) {
            console.error("[ArcadeAuthUI] resetPassword error:", e);
            setError(
              e.message || "Nie udało się wysłać maila resetującego hasło."
            );
          });
      });
    }
  },
};
