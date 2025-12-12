// js/core/room-api.js
// Neon Room API – stan pokoju + odblokowania + instancje
// Nie dotyka DOM. Działa na każdej stronie (room i shop).

(function () {
  "use strict";

  const ROOM_SAVE_KEY = "neon_room_v2";

  // Minimalny stan
  function defaultState() {
    return {
      version: 2,
      unlockedItemTypes: {}, // { [itemId]: { unlocked: true, fromGameId, meta } }
      instances: [], // [{ instanceId, itemId, attachment, x,y,... }]
      roomStyleId: null
    };
  }

  function deepMerge(base, patch) {
    const out = { ...base };
    for (const k of Object.keys(patch || {})) {
      const v = patch[k];
      if (v && typeof v === "object" && !Array.isArray(v)) {
        out[k] = deepMerge(base[k] || {}, v);
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  function clamp01(v) {
    if (v < 0) return 0;
    if (v > 1) return 1;
    return v;
  }

  function generateInstanceId(itemId) {
    const rand = Math.random().toString(36).slice(2, 8);
    const ts = Date.now().toString(36);
    return "inst_" + itemId + "_" + ts + "_" + rand;
  }

  async function loadRoomState() {
    // Prefer ArcadeProgress
    if (!window.ArcadeProgress || typeof ArcadeProgress.load !== "function") {
      return defaultState();
    }

    try {
      const raw = (await ArcadeProgress.load(ROOM_SAVE_KEY)) || {};
      return deepMerge(defaultState(), raw);
    } catch (e) {
      console.error("[ArcadeRoom] loadRoomState error:", e);
      return defaultState();
    }
  }

  async function saveRoomState(state) {
    if (!window.ArcadeProgress || typeof ArcadeProgress.save !== "function") return;

    const safe = deepMerge(defaultState(), state || {});
    try {
      await ArcadeProgress.save(ROOM_SAVE_KEY, safe);
    } catch (e) {
      console.error("[ArcadeRoom] saveRoomState error:", e);
    }
  }

  // Odblokowanie z gry (np. trofea)
  async function unlockItemType(itemId, options = {}) {
    const state = await loadRoomState();
    state.unlockedItemTypes = state.unlockedItemTypes || {};

    state.unlockedItemTypes[itemId] = {
      unlocked: true,
      fromGameId: options.fromGameId || options.gameId || null,
      meta: options.meta || options || {}
    };

    await saveRoomState(state);
    return state.unlockedItemTypes[itemId];
  }

  // Odblokowanie ze sklepu (kupno)
  async function unlockItemTypeFromShop(itemId, options = {}) {
    return unlockItemType(itemId, {
      fromGameId: null,
      meta: { source: "shop", ...(options.meta || {}) }
    });
  }

  function isUnlocked(state, itemId) {
    const u = state?.unlockedItemTypes?.[itemId];
    return !!(u && u.unlocked);
  }

  /**
   * ✅ KLUCZOWE: tworzy instancję itemu i zapisuje stan.
   * Działa w sklepie i w pokoju.
   */
  async function createInstance(itemId, options = {}) {
    const state = await loadRoomState();
    state.instances = state.instances || [];

    const attachment = options.attachment || "floor";

    const x = options.x != null ? options.x : 0.5;
    const y =
      options.y != null
        ? options.y
        : attachment === "ceiling"
        ? 0.15
        : attachment === "wall"
        ? 0.4
        : 0.9;

    const inst = {
      instanceId: options.instanceId || generateInstanceId(itemId),
      itemId,
      level: options.level || 1,
      attachment,
      parentInstanceId: options.parentInstanceId || null,
      x: clamp01(x),
      y: clamp01(y),
      offsetX: options.offsetX || 0,
      offsetY: options.offsetY || 0,
      rotation: options.rotation || 0,
      meta: options.meta || {}
    };

    state.instances.push(inst);
    await saveRoomState(state);
    return inst;
  }

  async function removeInstance(instanceId) {
    const state = await loadRoomState();
    state.instances = (state.instances || []).filter((i) => i.instanceId !== instanceId);
    await saveRoomState(state);
    return state;
  }

  async function setRoomStyle(styleItemId) {
    const state = await loadRoomState();
    state.roomStyleId = styleItemId || null;
    await saveRoomState(state);
    return state.roomStyleId;
  }

  const exported = {
    ROOM_SAVE_KEY,
    loadRoomState,
    saveRoomState,
    unlockItemType,
    unlockItemTypeFromShop,
    isUnlocked,
    createInstance,
    removeInstance,
    setRoomStyle
  };

  window.ArcadeRoom = exported;
})();
