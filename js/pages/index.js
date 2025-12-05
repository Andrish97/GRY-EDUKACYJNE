// js/pages/index.js
document.addEventListener("DOMContentLoaded", () => {
  console.log("[index.js] DOMContentLoaded");

  const emailInput   = document.getElementById("email");
  const passInput    = document.getElementById("pass");
  const pass2Input   = document.getElementById("pass2");
  const labelPass2   = document.getElementById("label-pass2");
  const btnLogin     = document.getElementById("btn-login");
  const btnRegister  = document.getElementById("btn-register");
  const btnGuest     = document.getElementById("btn-guest");
  const btnForgot    = document.getElementById("btn-forgot");
  const errorBox     = document.getElementById("error");
  const subtitleEl   = document.getElementById("subtitle");

  let registerMode = false; // false = logowanie, true = rejestracja

  function showError(msg) {
    errorBox.textContent = msg || "";
  }

  function goToArcade() {
    window.location.href = "arcade.html";
  }

  function updateModeUI() {
    if (registerMode) {
      // TRYB REJESTRACJI
      labelPass2.style.display = "block";
      pass2Input.style.display = "block";
      btnLogin.style.display = "none";
      btnRegister.textContent = "Utwórz konto";
      subtitleEl.textContent = "Wpisz dane i powtórz hasło, aby założyć konto.";
      showError("");
    } else {
      // TRYB LOGOWANIA
      labelPass2.style.display = "none";
      pass2Input.style.display = "none";
      btnLogin.style.display = "inline-block";
      btnRegister.textContent = "Załóż konto";
      subtitleEl.textContent = "Zaloguj się albo wejdź jako gość.";
      showError("");
    }
  }

  // 1) Start: domyślnie tryb logowania
  updateModeUI();

  // 2) Sprawdź, czy weszliśmy z linka aktywacyjnego Supabase (#...type=signup)
  (function checkSignupFromHash() {
    const rawHash = window.location.hash || "";
    const hash = rawHash.startsWith("#") ? rawHash.slice(1) : rawHash;
    if (!hash) return;

    const hashParams = new URLSearchParams(hash);
    const type = hashParams.get("type");
    console.log("[index.js] hash type =", type);

    if (type === "signup") {
      // niezależnie od tego, czy to pierwsze czy kolejne kliknięcie linka:
      registerMode = false;
      updateModeUI();
      subtitleEl.textContent = "Konto aktywowane. Możesz się zalogować.";
      showError("");

      // wyczyść hash, żeby po odświeżeniu nie pokazywać tego w kółko
      history.replaceState({}, "", window.location.pathname);
    }
  })();

  function ensureAuthOrShowError() {
    if (!window.ArcadeAuth) {
      console.error("[index.js] ArcadeAuth is undefined");
      showError("Błąd połączenia z serwerem logowania. Spróbuj za chwilę.");
      return null;
    }
    return window.ArcadeAuth;
  }

  // Gość
  btnGuest.onclick = () => {
    console.log("[index.js] Klik: GOŚĆ");
    const auth = ensureAuthOrShowError();
    // nawet jeśli ArcadeAuth nie działa, pozwólmy wejść jako gość
    try {
      auth && auth.setGuest && auth.setGuest();
    } catch (e) {
      console.error("Błąd ArcadeAuth.setGuest:", e);
    }
    showError("");
    goToArcade();
  };

  // Logowanie (tylko w trybie logowania)
  btnLogin.onclick = async () => {
    console.log("[index.js] Klik: ZALOGUJ, registerMode =", registerMode);
    if (registerMode) return;

    const auth = ensureAuthOrShowError();
    if (!auth) return;

    showError("");
    const email = emailInput.value.trim();
    const pass  = passInput.value;

    if (!email || !pass) {
      showError("Podaj email i hasło.");
      return;
    }

    const { error } = await auth.login(email, pass);
    if (error) {
      console.error("Błąd logowania:", error);
      showError("Nieprawidłowy email lub hasło.");
      return;
    }

    goToArcade();
  };

  // Rejestracja
  btnRegister.onclick = async () => {
    console.log("[index.js] Klik: ZAŁÓŻ KONTO, registerMode =", registerMode);

    const auth = ensureAuthOrShowError();
    if (!auth) return;

    // pierwsze kliknięcie -> wejście w tryb rejestracji
    if (!registerMode) {
      registerMode = true;
      updateModeUI();
      return;
    }

    // drugie kliknięcie -> faktyczna rejestracja
    showError("");
    const email = emailInput.value.trim();
    const pass  = passInput.value;
    const pass2 = pass2Input.value;

    if (!email || !pass || !pass2) {
      showError("Uzupełnij wszystkie pola.");
      return;
    }
    if (pass !== pass2) {
      showError("Hasła muszą być takie same.");
      return;
    }
    if (pass.length < 6) {
      showError("Hasło powinno mieć co najmniej 6 znaków.");
      return;
    }

    const { error } = await auth.register(email, pass);
    if (error) {
      console.error("Błąd rejestracji:", error);
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("already") || msg.includes("registered")) {
        showError("Taki użytkownik już istnieje. Spróbuj się zalogować.");
      } else {
        showError("Błąd rejestracji: " + error.message);
      }
      return;
    }

    alert("Konto utworzone. Sprawdź maila, żeby aktywować konto, a potem zaloguj się tutaj.");

    // wróć do trybu logowania
    registerMode = false;
    updateModeUI();

    // wyczyść hasła
    passInput.value = "";
    pass2Input.value = "";
  };

  // Przypomnienie hasła
  btnForgot.onclick = async () => {
    console.log("[index.js] Klik: PRZYPOMNIJ HASŁO");

    const auth = ensureAuthOrShowError();
    if (!auth) return;

    showError("");
    const email = emailInput.value.trim();
    if (!email) {
      showError("Podaj email, na który wysłać link.");
      return;
    }

    const redirectBase =
      window.location.origin +
      window.location.pathname.replace(/index\.html$/, "");

    const { error } = await auth.resetPassword(
      email,
      redirectBase + "index.html"
    );
    if (error) {
      console.error("Błąd resetu hasła:", error);
      showError("Nie udało się wysłać maila: " + error.message);
      return;
    }
    alert("Jeśli konto istnieje, wyślemy mail z linkiem do ustawienia nowego hasła.");
  };
});
