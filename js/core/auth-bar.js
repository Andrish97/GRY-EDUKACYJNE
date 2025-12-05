// js/core/auth-bar.js
// Wymaga: auth.js (ArcadeAuth + ArcadeAuthUI)

(function () {
  function barHTML() {
    return `
      <div class="arcade-topbar">
        <div class="arcade-user auth-status">
          Ładuję status...
        </div>
        <div class="arcade-auth">
          <input
            type="email"
            class="arcade-input auth-email"
            placeholder="Email"
          />
          <input
            type="password"
            class="arcade-input auth-pass"
            placeholder="Hasło"
          />
          <input
            type="password"
            class="arcade-input auth-pass2"
            placeholder="Powtórz hasło"
            style="display:none"
          />

          <button class="arcade-btn auth-login">Zaloguj</button>
          <button class="arcade-btn guest auth-guest">Gość</button>
          <button class="arcade-btn auth-register">Załóż konto</button>
          <button class="arcade-btn logout auth-logout" style="display:none">
            Wyloguj
          </button>
          <button class="arcade-btn auth-forgot">Przypomnij hasło</button>

          <span class="auth-error" style="margin-left:8px;font-size:11px;color:#fca5a5;"></span>
        </div>
      </div>
    `;
  }

  function mountOne(holder) {
    holder.innerHTML = barHTML();

    const email = holder.querySelector(".auth-email");
    const pass = holder.querySelector(".auth-pass");
    const pass2 = holder.querySelector(".auth-pass2");
    const status = holder.querySelector(".auth-status");
    const error = holder.querySelector(".auth-error");
    const btnLog = holder.querySelector(".auth-login");
    const btnReg = holder.querySelector(".auth-register");
    const btnGst = holder.querySelector(".auth-guest");
    const btnOut = holder.querySelector(".auth-logout");
    const btnFgt = holder.querySelector(".auth-forgot");

    const afterLogin = holder.getAttribute("data-after-login") || null;
    const afterGuest = holder.getAttribute("data-after-guest") || null;
    const checkHash = holder.hasAttribute("data-check-signup-hash");

    const opts = {
      email,
      pass,
      pass2,
      status,
      error,
      btnLogin: btnLog,
      btnRegister: btnReg,
      btnGuest: btnGst,
      btnLogout: btnOut,
      btnForgot: btnFgt,
      checkSignupHash: checkHash,
    };

    if (afterLogin) {
      opts.onLoginSuccess = () => {
        window.location.href = afterLogin;
      };
    }
    if (afterGuest) {
      opts.onGuest = () => {
        window.location.href = afterGuest;
      };
    }

    ArcadeAuthUI.initLoginPanel(opts);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const holders = document.querySelectorAll("[data-arcade-auth-bar]");
    holders.forEach(mountOne);
  });

  // na wszelki wypadek API ręczne
  window.ArcadeAuthBar = {
    mount(holder, options = {}) {
      holder.innerHTML = barHTML();
      mountOne(holder, options);
    },
  };
})();
