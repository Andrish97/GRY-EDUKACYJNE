// js/pages/index.js
document.addEventListener("DOMContentLoaded", () => {
  ArcadeAuthUI.initLoginPanel({
    email:      "#email",
    pass:       "#pass",
    pass2:      "#pass2",
    status:     "#subtitle",   // tu wyświetlamy komunikaty nad formularzem
    error:      "#error",
    btnLogin:   "#btn-login",
    btnRegister:"#btn-register",
    btnGuest:   "#btn-guest",
    btnLogout:  null,          // na ekranie startowym nie ma wyloguj
    btnForgot:  "#btn-forgot",

    checkSignupHash: true,     // żeby po kliknięciu w link z maila pokazać "Konto aktywowane..."

    onLoginSuccess() {
      // po zalogowaniu z ekranu startowego idziemy do arcade.html
      window.location.href = "arcade.html";
    },

    onGuest() {
      // gość z ekranu startowego też idzie do arcade.html
      window.location.href = "arcade.html";
    }
  });
});
