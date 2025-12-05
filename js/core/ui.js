// js/core/ui.js
window.ArcadeUI = (() => {
  function renderTopBar() {
    const bar = document.createElement("div");
    bar.className = "arcade-topbar";
    bar.innerHTML = `
      <span class="arcade-user"></span>
      <div class="arcade-auth">
        <input type="email" class="arcade-input email" placeholder="email">
        <input type="password" class="arcade-input pass" placeholder="hasło">
        <button class="arcade-btn login">Zaloguj</button>
        <button class="arcade-btn register">Rejestracja</button>
        <button class="arcade-btn logout" style="display:none;">Wyloguj</button>
        <button class="arcade-btn guest">Gość</button>
      </div>
    `;
    document.body.prepend(bar);

    const email = bar.querySelector(".email");
    const pass = bar.querySelector(".pass");
    const login = bar.querySelector(".login");
    const register = bar.querySelector(".register");
    const logout = bar.querySelector(".logout");
    const guest = bar.querySelector(".guest");
    const userLabel = bar.querySelector(".arcade-user");

    async function refresh() {
      const mode = ArcadeAuth.getMode();
      const user = await ArcadeAuth.getCurrentUser();

      if (mode === "guest") {
        userLabel.textContent = "Tryb gościa (zapis lokalny)";
        email.style.display = "inline-block";
        pass.style.display = "inline-block";
        login.style.display = "inline-block";
        register.style.display = "inline-block";
        logout.style.display = "none";
        return;
      }

      if (user) {
        userLabel.textContent = "Zalogowany: " + (user.email || user.id);
        email.style.display = "none";
        pass.style.display = "none";
        login.style.display = "none";
        register.style.display = "none";
        logout.style.display = "inline-block";
      } else {
        userLabel.textContent = "Nie zalogowany (zapis lokalny)";
        email.style.display = "inline-block";
        pass.style.display = "inline-block";
        login.style.display = "inline-block";
        register.style.display = "inline-block";
        logout.style.display = "none";
      }
    }

    login.onclick = async () => {
      const e = email.value.trim();
      const p = pass.value;
      if (!e || !p) {
        alert("Podaj email i hasło.");
        return;
      }
      const { error } = await ArcadeAuth.login(e, p);
      if (error) alert("Błąd logowania: " + error.message);
      refresh();
    };

    register.onclick = async () => {
      const e = email.value.trim();
      const p = pass.value;
      if (!e || !p) {
        alert("Podaj email i hasło.");
        return;
      }
      const { error } = await ArcadeAuth.register(e, p);
      if (error) alert("Błąd rejestracji: " + error.message);
      else alert("Sprawdź maila, żeby aktywować konto.");
      refresh();
    };

    logout.onclick = async () => {
      await ArcadeAuth.logout();
      refresh();
    };

    guest.onclick = () => {
      ArcadeAuth.setGuest();
      refresh();
    };

    refresh();
  }

  function injectBackButton(backUrl) {
    const btn = document.createElement("button");
    btn.className = "arcade-backbtn";
    btn.textContent = "Powrót do Arcade";
    btn.onclick = () => (window.location.href = backUrl);
    document.body.appendChild(btn);
  }

  return {
    renderTopBar,
    injectBackButton
  };
})();
