// js/index.js
// Logika strony logowania dla Neon Arcade

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Jeśli użytkownik jest zalogowany → od razu do arcade.html
  if (window.ArcadeAuth && typeof ArcadeAuth.getUser === "function") {
    try {
      const user = await ArcadeAuth.getUser();
      if (user) {
        window.location.href = "arcade.html";
        return;
      }
    } catch (e) {
      console.error("[index] Błąd przy sprawdzaniu użytkownika:", e);
    }
  }

  // 2. Pobierz elementy UI z index.html
  const email = document.querySelector(".auth-email");
  const pass = document.querySelector(".auth-pass");
  const pass2 = document.querySelector(".auth-pass2");
  const status = document.querySelector(".auth-status");
  const error = document.querySelector(".auth-error");
  const btnLogin = document.querySelector(".auth-login");
  const btnRegister = document.querySelector(".auth-register");
  const btnGuest = document.querySelector(".auth-guest");
  const btnLogout = document.querySelector(".auth-logout");
  const btnForgot = document.querySelector(".auth-forgot");

  if (!window.ArcadeAuthUI || typeof ArcadeAuthUI.initLoginPanel !== "function") {
    console.error("[index] Brak ArcadeAuthUI.initLoginPanel – sprawdź js/core/auth.js");
    if (status) status.textContent = "Błąd: system logowania jest niedostępny.";
    return;
  }

  // 3. Inicjalizacja panelu logowania z callbackami
  ArcadeAuthUI.initLoginPanel({
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

    // Po poprawnym logowaniu → zawsze przejście do arcade
    onLoginSuccess() {
      window.location.href = "arcade.html";
    },

    // Po rejestracji – zostajemy na stronie, user musi kliknąć link w mailu
    onRegisterSuccess() {
      if (status) {
        status.textContent =
          "Sprawdź skrzynkę e-mail – wysłaliśmy link aktywacyjny do potwierdzenia konta.";
      }
    },

    // Po wylogowaniu → odśwież index
    onLogout() {
      window.location.reload();
    },

    // Tryb gościa → też wchodzimy do arcade
    onGuest() {
      window.location.href = "arcade.html";
    },
  });
});

// 4. Obsługa powrotu strzałką „wstecz” (bfcache)
// Jeśli strona wróci z pamięci przeglądarki i user jest zalogowany → znowu do arcade
window.addEventListener("pageshow", async (event) => {
  if (!event.persisted) return;
  if (window.ArcadeAuth && typeof ArcadeAuth.getUser === "function") {
    try {
      const user = await ArcadeAuth.getUser();
      if (user) {
        window.location.href = "arcade.html";
      }
    } catch (e) {
      console.error("[index] Błąd przy sprawdzaniu użytkownika (pageshow):", e);
    }
  }
});
