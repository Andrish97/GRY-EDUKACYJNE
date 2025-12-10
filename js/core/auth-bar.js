// js/core/auth-bar.js
// Pasek logowania Neon Arcade + wyświetlanie monet z ArcadeCoins
//
// Użycie:
//   <div data-arcade-auth-bar
//        data-after-login="arcade.html"
//        data-after-guest="arcade.html"></div>
//
// Wymaga:
//   - auth.js (ArcadeAuth albo sam supabase)
//   - coins.js (ArcadeCoins)

(function () {
  const globalObj =
    (typeof window !== "undefined" ? window : globalThis) || {};

  function $(root, sel) {
    return root.querySelector(sel);
  }

  function getUser() {
    // Preferujemy ArcadeAuth, jeśli jest
    if (globalObj.ArcadeAuth && typeof ArcadeAuth.getUser === "function") {
      return ArcadeAuth.getUser().catch((err) => {
        console.warn("[ArcadeAuthBar] ArcadeAuth.getUser error:", err);
        return null;
      });
    }

    // Fallback na supabase auth
    if (globalObj.supabase && supabase.auth) {
      return supabase.auth
        .getUser()
        .then(({ data, error }) => {
          if (error) {
            console.warn("[ArcadeAuthBar] supabase.getUser error:", error);
            return null;
          }
          return (data && data.user) || null;
        })
        .catch((err) => {
          console.error("[ArcadeAuthBar] supabase.getUser exception:", err);
          return null;
        });
    }

    return Promise.resolve(null);
  }

  function signOut() {
    if (globalObj.ArcadeAuth && typeof ArcadeAuth.signOut === "function") {
      return ArcadeAuth.signOut();
    }

    if (globalObj.supabase && supabase.auth) {
      return supabase.auth.signOut();
    }

    return Promise.resolve();
  }

  function initBar(root) {
    const afterLogin =
      root.getAttribute("data-after-login") || "arcade.html";
    const afterGuest =
      root.getAttribute("data-after-guest") || "arcade.html";

    root.innerHTML = `
      <div class="auth-bar">
        <div class="auth-bar-left">
          <span class="auth-bar-logo">Neon Arcade</span>
        </div>

        <div class="auth-bar-center">
          <div class="auth-bar-coins">
            <span class="auth-bar-coins-label">Monety:</span>
            <span class="auth-bar-coins-value" data-auth-coins>–</span>
            <span class="auth-bar-coins-hint" data-auth-coins-hint hidden>
              Zaloguj się, aby zdobywać monety
            </span>
          </div>
        </div>

        <div class="auth-bar-right">
          <span class="auth-bar-user" data-auth-user></span>
          <div class="auth-bar-actions">
            <button type="button" class="auth-btn" data-auth-login>
              Zaloguj
            </button>
            <button type="button" class="auth-btn" data-auth-register>
              Załóż konto
            </button>
            <button type="button" class="auth-btn auth-btn-ghost" data-auth-guest>
              Gość
            </button>
            <button type="button" class="auth-btn auth-btn-danger" data-auth-logout hidden>
              Wyloguj
            </button>
          </div>
        </div>
      </div>
    `;

    const elUser = $(root, "[data-auth-user]");
    const elCoins = $(root, "[data-auth-coins]");
    const elCoinsHint = $(root, "[data-auth-coins-hint]");
    const btnLogin = $(root, "[data-auth-login]");
    const btnRegister = $(root, "[data-auth-register]");
    const btnGuest = $(root, "[data-auth-guest]");
    const btnLogout = $(root, "[data-auth-logout]");

    // --- akcje przycisków ---

    if (btnLogin) {
      btnLogin.addEventListener("click", function () {
        // ekran logowania jest w index.html
        window.location.href = "index.html";
      });
    }

    if (btnRegister) {
      btnRegister.addEventListener("click", function () {
        // też index.html – wybranie trybu rejestracji dzieje się w auth.js
        window.location.href = "index.html";
      });
    }

    if (btnGuest) {
      btnGuest.addEventListener("click", function () {
        // tryb gościa = po prostu przejście dalej
        window.location.href = afterGuest;
      });
    }

    if (btnLogout) {
      btnLogout.addEventListener("click", function () {
        signOut()
          .catch((err) => {
            console.error("[ArcadeAuthBar] signOut error:", err);
          })
          .finally(() => {
            // zawsze odśwież stronę po wylogowaniu
            window.location.reload();
          });
      });
    }

    // --- stan początkowy ---

    updateBarState(
      {
        user: null,
        elUser,
        btnLogin,
        btnRegister,
        btnGuest,
        btnLogout,
      },
      {
        elCoins,
        elCoinsHint,
      }
    );

    // pobierz użytkownika i monety
    getUser().then((user) => {
      updateBarState(
        {
          user,
          elUser,
          btnLogin,
          btnRegister,
          btnGuest,
          btnLogout,
        },
        {
          elCoins,
          elCoinsHint,
        }
      );
    });
  }

  function updateBarState(authCtx, coinsCtx) {
    const { user, elUser, btnLogin, btnRegister, btnGuest, btnLogout } =
      authCtx;
    const { elCoins, elCoinsHint } = coinsCtx;

    if (!user) {
      // GOŚĆ
      if (elUser) elUser.textContent = "Tryb gościa";

      if (btnLogin) btnLogin.hidden = false;
      if (btnRegister) btnRegister.hidden = false;
      if (btnGuest) btnGuest.hidden = false;
      if (btnLogout) btnLogout.hidden = true;

      if (elCoins) elCoins.textContent = "–";
      if (elCoinsHint) elCoinsHint.hidden = false;
      return;
    }

    // ZALOGOWANY
    if (elUser) {
      elUser.textContent = user.email || "Zalogowany";
    }

    if (btnLogin) btnLogin.hidden = true;
    if (btnRegister) btnRegister.hidden = true;
    if (btnGuest) btnGuest.hidden = true;
    if (btnLogout) btnLogout.hidden = false;

    // Monety tylko dla zalogowanych
    if (!globalObj.ArcadeCoins || typeof ArcadeCoins.load !== "function") {
      if (elCoins) elCoins.textContent = "–";
      if (elCoinsHint) elCoinsHint.hidden = false;
      return;
    }

    ArcadeCoins.load()
      .then((balance) => {
        const val =
          typeof balance === "number" && !Number.isNaN(balance)
            ? balance
            : 0;
        if (elCoins) elCoins.textContent = String(val);
        if (elCoinsHint) elCoinsHint.hidden = true;
      })
      .catch((err) => {
        console.error("[ArcadeAuthBar] load coins error:", err);
        if (elCoins) elCoins.textContent = "–";
        if (elCoinsHint) elCoinsHint.hidden = false;
      });
  }

  // ---------------------------------
  // Inicjalizacja na wszystkich stronach
  // ---------------------------------

  document.addEventListener("DOMContentLoaded", function () {
    const roots = document.querySelectorAll("[data-arcade-auth-bar]");
    if (!roots.length) return;

    roots.forEach((root) => {
      initBar(root);
    });
  });
})();
