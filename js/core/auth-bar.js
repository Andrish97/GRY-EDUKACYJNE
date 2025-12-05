// js/core/auth-bar.js
// Wymaga: auth.js (ArcadeAuth + ArcadeAuthUI)

(function () {
  function barHTML() {
    return `
      <div class="arcade-auth-bar" style="
        display:flex;
        flex-wrap:wrap;
        gap:8px;
        align-items:center;
        font-size:12px;
        margin-bottom:10px;
      ">
        <span class="auth-status" style="color:#9ca3af;">
          Ładuję status...
        </span>

        <input class="auth-email" type="email" placeholder="email"
          style="padding:4px 8px;border-radius:999px;border:1px solid rgba(148,163,184,0.5);background:#020617;color:#e5e7eb;font-size:12px;min-width:160px;">

        <input class="auth-pass" type="password" placeholder="hasło"
          style="padding:4px 8px;border-radius:999px;border:1px solid rgba(148,163,184,0.5);background:#020617;color:#e5e7eb;font-size:12px;min-width:120px;">

        <input class="auth-pass2" type="password" placeholder="powtórz hasło"
          style="display:none;padding:4px 8px;border-radius:999px;border:1px solid rgba(148,163,184,0.5);background:#020617;color:#e5e7eb;font-size:12px;min-width:120px;">

        <button class="auth-login play-btn" type="button"
          style="font-size:11px;padding:4px 10px;">
          Zaloguj
        </button>

        <button class="auth-register play-btn" type="button"
          style="font-size:11px;padding:4px 10px;background:linear-gradient(135deg,#38bdf8,#0ea5e9);box-shadow:0 6px 18px rgba(56,189,248,0.55);">
          Załóż konto
        </button>

        <button class="auth-logout play-btn" type="button"
          style="font-size:11px;padding:4px 10px;display:none;background:linear-gradient(135deg,#f97316,#ea580c);box-shadow:0 6px 18px rgba(249,115,22,0.55);">
          Wyloguj
        </button>

        <button class="auth-guest play-btn" type="button"
          style="font-size:11px;padding:4px 10px;background:linear-gradient(135deg,#6b7280,#4b5563);box-shadow:0 6px 18px rgba(107,114,128,0.55);">
          Gość
        </button>

        <button class="auth-forgot" type="button"
          style="border:none;background:none;color:#9ca3af;text-decoration:underline;cursor:pointer;font-size:11px;">
          Przypomnij hasło
        </button>

        <span class="auth-error" style="color:#fca5a5;margin-left:8px;"></span>
      </div>
    `;
  }

  function mountOne(holder) {
    holder.innerHTML = barHTML();
  
    const email   = holder.querySelector(".auth-email");
    const pass    = holder.querySelector(".auth-pass");
    const pass2   = holder.querySelector(".auth-pass2");
    const status  = holder.querySelector(".auth-status");
    const error   = holder.querySelector(".auth-error");
    const btnLog  = holder.querySelector(".auth-login");
    const btnReg  = holder.querySelector(".auth-register");
    const btnGst  = holder.querySelector(".auth-guest");
    const btnOut  = holder.querySelector(".auth-logout");
    const btnFgt  = holder.querySelector(".auth-forgot");
  
    const afterLogin = holder.getAttribute("data-after-login") || null;
    const afterGuest = holder.getAttribute("data-after-guest") || null;
    const checkHash  = holder.hasAttribute("data-check-signup-hash");
  
    const opts = {
      email,
      pass,
      pass2,
      status,
      error,
      btnLogin:    btnLog,
      btnRegister: btnReg,
      btnGuest:    btnGst,
      btnLogout:   btnOut,
      btnForgot:   btnFgt,
      checkSignupHash: checkHash
    };
  
    // TYLKO jeśli chcemy przekierowanie, nadpisujemy domyślne zachowanie
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
    }
  };
})();
