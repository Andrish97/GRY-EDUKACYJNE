// js/pages/index.js
document.addEventListener("DOMContentLoaded", () => {
  ArcadeAuthUI.initLoginPanel({
    email:      "#email",
    pass:       "#pass",
    pass2:      "#pass2",
    status:     "#subtitle",
    error:      "#error",
    btnLogin:   "#btn-login",
    btnRegister:"#btn-register",
    btnGuest:   "#btn-guest",
    btnLogout:  null,
    btnForgot:  "#btn-forgot",

    checkSignupHash: true, // tu łapiemy #type=signup po kliknięciu linka z maila

    onLoginSuccess() {
      window.location.href = "arcade.html";
    },

    onGuest() {
      window.location.href = "arcade.html";
    }
  });
});
