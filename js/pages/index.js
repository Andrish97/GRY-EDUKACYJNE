// js/pages/index.js
document.addEventListener("DOMContentLoaded", () => {
  // Używamy wspólnej logiki z auth.js
  ArcadeAuthUI.initLoginPanel({
    email:      "#email",
    pass:       "#pass",
    pass2:      "#pass2",
    status:     "#subtitle",   // napis nad formularzem
    error:      "#error",
    btnLogin:   "#btn-login",
    btnRegister:"#btn-register",
    btnGuest:   "#btn-guest",
    btnLogout:  null,          // na ekranie startowym nie ma "Wyloguj"
    btnForgot:  "#btn-forgot",

    // tu mówimy: sprawdź hash z Supabase (type=signup)
    checkSignupHash: true,

    // co zrobić po poprawnym logowaniu:
    onLoginSuccess() {
      window.location.href = "arcade.html";
    },

    // co zrobić po wejściu jako gość:
    onGuest() {
      window.location.href = "arcade.html";
    }
  });
});
