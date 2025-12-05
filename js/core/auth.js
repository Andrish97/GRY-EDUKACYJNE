// js/core/auth.js
window.ArcadeAuth = (() => {
  const SUPABASE_URL = "https://zbcpqwugthvizqzkvurw.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiY3Bxd3VndGh2aXpxemt2dXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MTk1NDYsImV4cCI6MjA4MDQ5NTU0Nn0.fTZiJjToYxnvhthiSIpAcmJ2wo7gQ2bAko841_dh740";

  let sb = null;

  function ensureClient() {
    if (!sb) {
      if (typeof supabase === "undefined") {
        console.error("Supabase CDN niezaładowany");
        return;
      }
      sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
  }

  function getClient() {
    ensureClient();
    return sb;
  }

  function getMode() {
    const m = localStorage.getItem("arcade_mode");
    return m === "guest" ? "guest" : "user";
  }

  function setMode(mode) {
    localStorage.setItem("arcade_mode", mode === "guest" ? "guest" : "user");
  }

  async function getCurrentUser() {
    ensureClient();
    if (!sb) return null;
    const { data } = await sb.auth.getUser();
    return data.user || null;
  }

  async function login(email, password) {
    ensureClient();
    if (!sb) return { error: new Error("Brak Supabase") };
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (!error) setMode("user");
    return { data, error };
  }

  async function register(email, password) {
    ensureClient();
    if (!sb) return { error: new Error("Brak Supabase") };
    const { data, error } = await sb.auth.signUp({ email, password });
    if (!error) setMode("user");
    return { data, error };
  }

  async function resetPassword(email, redirectTo) {
    ensureClient();
    if (!sb) return { error: new Error("Brak Supabase") };
    const { data, error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });
    return { data, error };
  }

  async function logout() {
    ensureClient();
    if (!sb) return;
    await sb.auth.signOut();
    setMode("guest");
  }

  return {
    getClient,
    getCurrentUser,
    getMode,
    setMode,
    login,
    register,
    resetPassword,
    logout,
    setGuest() { setMode("guest"); }
  };
})();
