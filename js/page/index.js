// js/pages/index.js
document.addEventListener("DOMContentLoaded", () => {
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

  // 2) Sprawdź, czy weszliśmy z linka aktywacyjnego Supabase
  // Supabase daje coś w stylu:
  //   https://andrish97.github.io/twoje-repo/#access_token=...&type=signup
  //
  // Nie bawimy się w weryfikację tokena – to już zrobił backend.
  // Jeśli widzimy type=signup w hash, to po prostu pokazujemy komunikat: "możesz się zalogować".
  (function checkSignupFromHash() {
    const rawHash = window.location.hash || "";
    const hash = rawHash.startsWith("#") ? rawHash.slice(1) : rawHash;
    if (!hash) return;

    const hashParams = new URLSearchParams(hash);
    const type = hashParams.get("type");

    if (type === "signup") {
      registerMode = false;
      updateModeUI();
      subtitleEl.textContent = "Konto aktywowane. Możesz się zalogować.";
      showError("");

      // Sprzątanie: usuń hash z paska adresu, żeby po odświeżeniu nie mielić tego znów
      history.replaceState({}, "", window.location.pathname);
    }
  })();

  // Gość
  btnGuest.onclick = () => {
    ArcadeAuth.setGuest();
    showError("");
    goToArcade();
  };

  // Logowanie (tylko w trybie logowania)
  btnLogin.onclick = async () => {
    if (registerMode) {
      // w trybie rejestracji przycisk logowania jest ukryty, ale na wszelki wypadek:
      return;
    }

    showError("");
    const email = emailInput.value.trim();
    const pass  = passInput.value;

    if (!email || !pass) {
      showError("Podaj email i hasło.");
      return;
    }

    const { error } = await ArcadeAuth.login(email, pass);
    if (error) {
      showError("Nieprawidłowy email lub hasło.");
      return;
    }

    goToArcade();
  };

  // Rejestracja:
  // 1. pierwsze kliknięcie -> wejście w tryb rejestracji
  // 2. drugie kliknięcie w tym trybie -> faktyczna rejestracja
  btnRegister.onclick = async () => {
    if (!registerMode) {
      registerMode = true;
      updateModeUI();
      return;
    }

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

    const { error } = await ArcadeAuth.register(email, pass);
    if (error) {
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

    // wyczyść hasła, żeby nie zostały w inputach
    passInput.value = "";
    pass2Input.value = "";
  };

  // Przypomnienie hasła
  btnForgot.onclick = async () => {
    showError("");
    const email = emailInput.value.trim();
    if (!email) {
      showError("Podaj email, na który wysłać link.");
      return;
    }

    const { error } = await ArcadeAuth.resetPassword(
      email,
      // przekierowanie po kliknięciu w maila z resetem
      window.location.origin + window.location.pathname.replace(/index\.html$/, "") + "index.html"
    );
    if (error) {
      showError("Nie udało się wysłać maila: " + error.message);
      return;
    }
    alert("Jeśli konto istnieje, wyślemy mail z linkiem do ustawienia nowego hasła.");
  };
});
