// js/core/progress.js
// Prosty, uniwersalny system progresu oparty na localStorage
// Rozróżnia zalogowanego użytkownika i gościa.

(function () {
  var STORAGE_PREFIX = "arcade:progress:";

  function getStorageKey(profileKey, gameId) {
    return STORAGE_PREFIX + profileKey + ":" + gameId;
  }

  // Ustala identyfikator profilu: user:<id> albo "guest"
  function getProfileKey() {
    if (!window.ArcadeAuth || !ArcadeAuth.getUser) {
      return Promise.resolve("guest");
    }
    return ArcadeAuth.getUser()
      .then(function (user) {
        if (user && user.id) {
          return "user:" + user.id;
        }
        return "guest";
      })
      .catch(function () {
        return "guest";
      });
  }

  function safeParse(json) {
    try {
      return JSON.parse(json);
    } catch (e) {
      return null;
    }
  }

  window.ArcadeProgress = {
    /**
     * Wczytuje zapis gry dla aktualnego profilu (użytkownik/gość).
     * Zwraca obiekt lub null.
     */
    load: function (gameId) {
      return getProfileKey().then(function (profileKey) {
        var key = getStorageKey(profileKey, gameId);
        var raw = null;
        try {
          raw = window.localStorage.getItem(key);
        } catch (e) {
          console.warn("[ArcadeProgress] localStorage getItem error:", e);
        }
        if (!raw) return null;
        var data = safeParse(raw);
        return data;
      });
    },

    /**
     * Zapis progresu gry (dowolny obiekt serializowalny do JSON).
     */
    save: function (gameId, data) {
      return getProfileKey().then(function (profileKey) {
        var key = getStorageKey(profileKey, gameId);
        try {
          var json = JSON.stringify(data || {});
          window.localStorage.setItem(key, json);
        } catch (e) {
          console.error("[ArcadeProgress] localStorage setItem error:", e);
        }
      });
    },

    /**
     * Usuwa zapis gry dla aktualnego profilu.
     */
    clear: function (gameId) {
      return getProfileKey().then(function (profileKey) {
        var key = getStorageKey(profileKey, gameId);
        try {
          window.localStorage.removeItem(key);
        } catch (e) {
          console.error("[ArcadeProgress] localStorage removeItem error:", e);
        }
      });
    },
  };
})();
