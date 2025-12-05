// js/pages/index.js
document.addEventListener("DOMContentLoaded", () => {
  const emailInput = document.getElementById("email");
  const passInput = document.getElementById("pass");
  const pass2Input = document.getElementById("pass2");
  const btnLogin = document.getElementById("btn-login");
  const btnRegister = document.getElementById("btn-register");
  const btnGuest = document.getElementById("btn-guest");
  const btnForgot = document.getElementById("btn-forgot");
  const errorBox = document.getElementById("error");

  function showError(msg) {
    errorBox.textContent = msg || "";
  }

  function goToArcade() {
    window.location.href = "arcade.html";
  }

  btnGuest.onclick = () => {
    ArcadeAuth.setGuest();
    showError("");
    goToArcade();
  };

  btnLogin.onclick = async () => {
    showError("");
    const email = emailInput.value.trim();
    const pass = passInput.value;

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

  btnRegister.onclick = async () => {
    showError("");
    const email = emailInput.value.trim();
    const pass = passInput.value;
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

    alert("Konto utworzone. Sprawdź maila, żeby aktywować konto.");
    goToArcade();
  };

  btnForgot.onclick = async () => {
    showError("");
    const email = emailInput.value.trim();
    if (!email) {
      showError("Podaj email, na który wysłać link.");
      return;
    }
    const { error } = await ArcadeAuth.resetPassword(
      email,
      window.location.origin + "/arcade.html"
    );
    if (error) {
      showError("Nie udało się wysłać maila: " + error.message);
      return;
    }
    alert("Jeśli konto istnieje, wyślemy mail z linkiem do ustawienia nowego hasła.");
  };
});
