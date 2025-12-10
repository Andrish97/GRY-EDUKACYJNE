// js/core/coins.js

window.ArcadeCoins = window.ArcadeCoins || {};

(function () {
  const logPrefix = "[ArcadeCoins]";
  let _balance = 0;
  let _loaded = false;
  let _loadingPromise = null;

  function getSupabase() {
    if (!window.supabase) {
      console.warn(logPrefix, "Brak window.supabase – sprawdź auth.js");
      return null;
    }
    return window.supabase;
  }

  async function requireUser(supabase) {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data || !data.user) {
      throw new Error("Użytkownik nie jest zalogowany");
    }
    return data.user;
  }

  async function loadInternal() {
    const supabase = getSupabase();
    if (!supabase) return 0;

    const user = await requireUser(supabase);

    const { data, error } = await supabase
      .from("arcade_wallets")
      .select("coins")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error(logPrefix, "Błąd odczytu:", error);
      throw error;
    }

    if (!data) {
      _balance = 0;
      _loaded = true;
      return 0;
    }

    _balance = data.coins || 0;
    _loaded = true;
    return _balance;
  }

  async function ensureLoaded() {
    if (_loaded && _loadingPromise === null) return _balance;
    if (_loadingPromise) return _loadingPromise;
    _loadingPromise = loadInternal().finally(() => {
      _loadingPromise = null;
    });
    return _loadingPromise;
  }

  async function saveDelta(amount, meta) {
    const supabase = getSupabase();
    if (!supabase) return;

    const user = await requireUser(supabase);
    const delta = Math.floor(amount);
    if (!Number.isFinite(delta) || delta === 0) return;

    // upsert z inkrementacją
    const { data, error } = await supabase.rpc("arcade_add_coins", {
      p_user_id: user.id,
      p_delta: delta
    });

    if (error) {
      console.error(logPrefix, "Błąd zapisu:", error);
      throw error;
    }

    _balance = data?.coins ?? _balance + delta;
    console.log(
      logPrefix,
      `+${delta} monet za`,
      meta || {},
      "→ saldo:",
      _balance
    );
    return _balance;
  }

  // Eksponowane API:

  /**
   * Ładuje saldo użytkownika (tylko dla zalogowanych).
   * Zwraca Promise<number>.
   */
  ArcadeCoins.load = async function () {
    try {
      return await ensureLoaded();
    } catch (e) {
      console.warn(logPrefix, "Nie udało się wczytać monet:", e);
      return 0;
    }
  };

  /**
   * Zwraca ostatnio znane saldo (bez czekania na supabase).
   */
  ArcadeCoins.getBalance = function () {
    return _balance;
  };

  /**
   * Dodaje monety za konkretną grę.
   * amount > 0, tylko dla zalogowanych użytkowników.
   */
  ArcadeCoins.addForGame = async function (gameId, amount, extraMeta) {
    const delta = Math.floor(amount);
    if (!Number.isFinite(delta) || delta <= 0) return;

    try {
      await ensureLoaded();
      return await saveDelta(delta, {
        type: "game",
        gameId: gameId,
        ...(extraMeta || {})
      });
    } catch (e) {
      console.warn(logPrefix, "Nie udało się dodać monet:", e);
    }
  };
})();
