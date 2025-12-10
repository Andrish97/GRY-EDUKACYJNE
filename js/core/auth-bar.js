// js/core/auth-bar.js
// Pasek logowania / rejestracji w motywie Neon Arcade
// Wymaga: auth.js (ArcadeAuth + ArcadeAuthUI)

(function () {
  function barHTML() {
    return `
        <div class="arcade-topbar">
          <div class="arcade-user">
            <span class="auth-status">Ładuję status...</span>
            <span
              class="auth-coins"
              style="margin-left:12px;font-size:11px;"
            ></span>
            <span
              class="auth-coins-hint"
              style="margin-left:6px;font-size:11px;opacity:0.8;"
            ></span>
          </div>
          <div class="arcade-auth">
            <input
              type="email"
              class="arcade-input auth-email"
              placeholder="Email"
              autocomplete="email"
            />
            <input
              type="password"
              class="arcade-input auth-pass"
              placeholder="Hasło"
              autocomplete="current-password"
            />
            <input
              type="password"
              class="arcade-input auth-pass2"
              placeholder="Powtórz hasło"
              autocomplete="new-password"
              style="display:none"
            />
  
            <button class="arcade-btn auth-login">Zaloguj</button>
            <button class="arcade-btn auth-register">Załóż konto</button>
            <button class="arcade-btn guest auth-guest">Gość</button>
            <button class="arcade-btn logout auth-logout" style="display:none">
              Wyloguj
            </button>
            <span
              class="auth-forgot"
              style="cursor:pointer;font-size:11px;opacity:0.8;"
            >
              Przypomnij hasło
            </span>
            <span class="auth-error" style="margin-left:8px;font-size:11px;"></span>
          </div>
        </div>
      `;
  }


  function initPanel(holder) {
    holder.innerHTML = barHTML();

    const email = holder.querySelector(".auth-email");
    const pass = holder.querySelector(".auth-pass");
    const pass2 = holder.querySelector(".auth-pass2");
    const status = holder.querySelector(".auth-status");
    const error = holder.querySelector(".auth-error");
    const coins = holder.querySelector(".auth-coins");
    const coinsHint = holder.querySelector(".auth-coins-hint");
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
      coins,
      coinsHint,
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
    holders.forEach(initPanel);
  });

  // ręczne API (na przyszłość)
  window.ArcadeAuthBar = {
    mount(holder) {
      initPanel(holder);
    },
  };
})();
