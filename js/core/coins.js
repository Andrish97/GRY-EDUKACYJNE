// js/core/coins.js
// Prosty system monet Neon Arcade (Supabase + tabela arcade_wallets)
//
// Wymagania:
// - globalny klient Supabase w window.supabaseClient (tworzony w auth.js)
//
// Tabela (Supabase):
//   create table arcade_wallets (
//     user_id uuid primary key references auth.users(id),
//     coins integer not null default 0,
//     updated_at timestamptz not null default now()
//   );
//
// API:
//   ArcadeCoins.load(): Promise<number|null>
//   ArcadeCoins.getBalance(): number|null
//   ArcadeCoins.addForGame(gameId, amount, meta?): Promise<number|null>
//
// Uwaga: amount może być dodatni (nagroda) lub ujemny (wydanie monet).

(function () {
  const globalObj =
    (typeof window !== "undefined" ? window : globalThis) || {};
  const ArcadeCoins = {};
  globalObj.ArcadeCoins = ArcadeCoins;

  let client = null;
  let _userId = null;
  let _balance = null;
  let _isGuest = false;
  let _hasLoaded = false;
  let _loadPromise = null;

  function getClient() {
    if (client) return client;
    if (globalObj.supabaseClient) {
      client = globalObj.supabaseClient;
      return client;
    }
    console.warn(
      "[ArcadeCoins] Brak klienta Supabase (window.supabaseClient)."
    );
    return null;
  }

  function ensureUser() {
    const c = getClient();
    if (!c) return Promise.resolve(null);

    return c.auth
      .getUser()
      .then(({ data, error }) => {
        if (error) {
          console.warn("[ArcadeCoins] getUser error:", error);
          _isGuest = true;
          _userId = null;
          return null;
        }
        if (!data || !data.user) {
          _isGuest = true;
          _userId = null;
          return null;
        }
        _isGuest = false;
        _userId = data.user.id;
        return _userId;
      })
      .catch((err) => {
        console.error("[ArcadeCoins] getUser exception:", err);
        _isGuest = true;
        _userId = null;
        return null;
      });
  }

  // -----------------------------
  // Public: load()
  // -----------------------------
  ArcadeCoins.load = function () {
    const c = getClient();
    if (!c) return Promise.resolve(null);

    if (_hasLoaded && _loadPromise === null) {
      return Promise.resolve(_balance);
    }

    if (_loadPromise) return _loadPromise;

    _loadPromise = ensureUser()
      .then((userId) => {
        if (!userId) {
          _balance = null; // gość – brak serwerowego portfela
          _hasLoaded = true;
          return null;
        }

        return c
          .from("arcade_wallets")
          .select("coins")
          .eq("user_id", userId)
          .single()
          .then(({ data, error }) => {
            if (error) {
              // PGRST116 = brak wiersza
              if (error.code === "PGRST116") {
                _balance = 0;
                // próbujemy założyć portfel w tle
                c.from("arcade_wallets")
                  .insert({ user_id: userId, coins: 0 })
                  .then(() => {})
                  .catch((e) => {
                    console.warn(
                      "[ArcadeCoins] insert wallet failed (może już istnieje):",
                      e
                    );
                  });
                return _balance;
              }

              console.error("[ArcadeCoins] select wallet error:", error);
              _balance = null;
              return null;
            }

            if (!data || typeof data.coins !== "number") {
              _balance = 0;
            } else {
              _balance = data.coins;
            }
            return _balance;
          });
      })
      .finally(() => {
        _hasLoaded = true;
        _loadPromise = null;
      });

    return _loadPromise;
  };

  // -----------------------------
  // Public: getBalance()
  // -----------------------------
  ArcadeCoins.getBalance = function () {
    return _balance;
  };

  // -----------------------------
  // Public: addForGame(gameId, amount, meta?)
  // amount > 0  -> nagroda
  // amount < 0  -> wydanie monet (np. podpowiedź)
  // amount === 0 -> brak zmian
  // -----------------------------
  ArcadeCoins.addForGame = function (gameId, amount, meta) {
    const c = getClient();
    if (!c) return Promise.resolve(_balance);

    const n = Math.floor(Number(amount) || 0);

    // ignorujemy tylko 0, ale dopuszczamy zarówno dodatnie, jak i ujemne
    if (n === 0) {
      return Promise.resolve(_balance);
    }

    return ArcadeCoins.load().then((currentBalance) => {
      if (_isGuest || !_userId) {
        console.warn(
          "[ArcadeCoins] Użytkownik niezalogowany – monety nie zostaną zapisane."
        );
        return currentBalance;
      }

      const startBalance = (typeof currentBalance === "number"
        ? currentBalance
        : 0);

      // jeśli próbujemy wydać więcej niż mamy – odrzucamy operację
      if (n < 0 && startBalance + n < 0) {
        console.warn(
          "[ArcadeCoins] Za mało monet na operację:",
          "saldo=" + startBalance,
          "zmiana=" + n
        );
        return startBalance;
      }

      const newBalance = startBalance + n;
      _balance = newBalance;

      return c
        .from("arcade_wallets")
        .upsert(
          {
            user_id: _userId,
            coins: newBalance,
          },
          { onConflict: "user_id" }
        )
        .select("coins")
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error("[ArcadeCoins] upsert error:", error);
            return _balance;
          }

          if (data && typeof data.coins === "number") {
            _balance = data.coins;
          }

          // TODO: kiedyś można dopisać log zdarzeń do osobnej tabeli
          // np. arcade_wallet_events: { user_id, game_id, amount, meta }

          return _balance;
        })
        .catch((err) => {
          console.error("[ArcadeCoins] exception during addForGame:", err);
          return _balance;
        });
    });
  };
})();
