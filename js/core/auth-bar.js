// js/core/auth-bar.js
// Neon Arcade – Auth Bar (responsive, back button, coins, mobile drawer via status click)
// Wymaga: auth.js (ArcadeAuth + ArcadeAuthUI) oraz opcjonalnie coins.js

(function () {
  function barHTML(backUrl) {
    return `
      <div class="arcade-topbar">
        <div class="arcade-topbar-inner">

          <div class="arcade-left">
            ${
              backUrl
                ? `<button class="arcade-back" type="button" data-back>
                     <span class="ico">←</span>
                     <span class="label">Arcade</span>
                   </button>`
                : ``
            }

            <!-- Status jest klikalny na mobile -->
            <button class="arcade-user" type="button" data-auth-toggle aria-expanded="false">
              <span class="auth-status">Ładuję…</span>
              <span class="auth-coins" title="Diamenty">💎 –</span>
            </button>
          </div>

          <div class="arcade-auth" data-auth-drawer>
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

            <button class="arcade-btn auth-login" type="button">Zaloguj</button>
            <button class="arcade-btn auth-register" type="button">Załóż konto</button>

            <button class="arcade-btn logout auth-logout" type="button" style="display:none">
              Wyloguj
            </button>

            <button class="auth-forgot" type="button">Przypomnij hasło</button>
            <span class="auth-error"></span>
          </div>

        </div>
      </div>
    `;
  }

  function initPanel(holder) {
    const backUrl = holder.getAttribute("data-back-url") || "";
    holder.innerHTML = barHTML(backUrl);

    const q = (s) => holder.querySelector(s);

    const topbar = q(".arcade-topbar");
    const toggleBtn = q("[data-auth-toggle]");
    const drawer = q("[data-auth-drawer]");

    const email = q(".auth-email");
    const pass = q(".auth-pass");
    const pass2 = q(".auth-pass2");
    const status = q(".auth-status");
    const error = q(".auth-error");
    const coins = q(".auth-coins");

    const btnLogin = q(".auth-login");
    const btnRegister = q(".auth-register");
    const btnLogout = q(".auth-logout");
    const btnForgot = q(".auth-forgot");

    // Back
    const backBtn = q("[data-back]");
    if (backBtn && backUrl) {
      backBtn.addEventListener("click", () => (window.location.href = backUrl));
    }

    function isMobile() {
      return window.matchMedia("(max-width: 520px)").matches;
    }

    function setDrawer(open) {
      if (!topbar) return;
      topbar.classList.toggle("drawer-open", !!open);
      if (toggleBtn) toggleBtn.setAttribute("aria-expanded", open ? "true" : "false");
      if (open && email) setTimeout(() => email.focus(), 0);
    }

    // Na mobile klik statusu otwiera/zamyka panel auth
    toggleBtn?.addEventListener("click", () => {
      if (!isMobile()) return; // desktop: status nie steruje drawerem
      const open = topbar.classList.contains("drawer-open");
      setDrawer(!open);
    });

    // Klik poza topbarem zamyka drawer na mobile
    document.addEventListener("click", (e) => {
      if (!isMobile()) return;
      if (!topbar.classList.contains("drawer-open")) return;
      if (topbar.contains(e.target)) return;
      setDrawer(false);
    });

    // Ustaw klasę body.auth-logged (żeby CSS mógł reagować)
    async function syncLoggedClass() {
      try {
        const user = await window.ArcadeAuth?.getUser?.();
        document.body.classList.toggle("auth-logged", !!user);
      } catch {
        document.body.classList.remove("auth-logged");
      }
    }

    // Init UI (bez guest)
    ArcadeAuthUI.initLoginPanel({
      email,
      pass,
      pass2,
      status,
      error,
      coins,
      btnLogin,
      btnRegister,
      btnLogout,
      btnForgot,

      // wg Twojej zasady: zawsze refresh po akcjach
      onLoginSuccess: () => window.location.reload(),
      onRegisterSuccess: () => window.location.reload(),
      onLogout: () => window.location.reload(),
    });

    // Reaguj na zmiany sesji
    syncLoggedClass();
    if (window.ArcadeAuth?.onAuthStateChange) {
      window.ArcadeAuth.onAuthStateChange(() => {
        syncLoggedClass();
        setDrawer(false); // po zmianie sesji zamknij panel na mobile
      });
    }

    // Jeśli przejdziesz z mobile->desktop, panel niech się sam „odklei”
    window.addEventListener("resize", () => {
      if (!isMobile()) setDrawer(false);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-arcade-auth-bar]").forEach(initPanel);
  });
})();
