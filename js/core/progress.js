// js/core/progress.js
window.ArcadeProgress = (() => {
  async function save(gameId, data) {
    const mode = ArcadeAuth.getMode();
    const sb = ArcadeAuth.getClient();

    if (!sb) {
      localStorage.setItem("progress_local_" + gameId, JSON.stringify(data));
      return;
    }

    if (mode === "guest") {
      localStorage.setItem("progress_guest_" + gameId, JSON.stringify(data));
      return;
    }

    const user = await ArcadeAuth.getCurrentUser();
    if (!user) {
      localStorage.setItem("progress_local_" + gameId, JSON.stringify(data));
      return;
    }

    await sb.from("user_progress").upsert({
      user_id: user.id,
      game_id: gameId,
      data,
      updated_at: new Date().toISOString()
    });
  }

  async function load(gameId) {
    const mode = ArcadeAuth.getMode();
    const sb = ArcadeAuth.getClient();

    if (!sb) {
      const raw = localStorage.getItem("progress_local_" + gameId);
      return raw ? JSON.parse(raw) : null;
    }

    if (mode === "guest") {
      const raw = localStorage.getItem("progress_guest_" + gameId);
      return raw ? JSON.parse(raw) : null;
    }

    const user = await ArcadeAuth.getCurrentUser();
    if (!user) {
      const raw = localStorage.getItem("progress_local_" + gameId);
      return raw ? JSON.parse(raw) : null;
    }

    const { data, error } = await sb
      .from("user_progress")
      .select("data")
      .eq("user_id", user.id)
      .eq("game_id", gameId)
      .maybeSingle();

    if (error) {
      console.error("Błąd loadProgress:", error);
      return null;
    }
    return data ? data.data : null;
  }

  return { save, load };
})();
