// js/core/room-api.js
// Neon Room – API pokoju dla gier, sklepu i sceny
// --------------------------------------------------
// Stan zapisujemy pod kluczem "neon_room_v2" w ArcadeProgress:
//
// {
//   version: 2,
//   unlockedItemTypes: {
//     [itemId]: { unlocked: true, fromGameId: string|null, meta: any }
//   },
//   instances: [
//     {
//       instanceId: string,
//       itemId: string,
//       level: number,
//       attachment: "floor"|"wall"|"ceiling"|"surface",
//       parentInstanceId: string|null,
//       x: number,   // 0..1
//       y: number,   // 0..1
//       offsetX?: number,
//       offsetY?: number,
//       rotation?: number,
//       meta?: any
//     }
//   ],
//   roomStyleId: string|null
// }

(function () {
  "use strict";

  const ROOM_SAVE_KEY = "neon_room_v2";

  async function loadRoomState() {
    if (!window.ArcadeProgress || !ArcadeProgress.load) {
      console.warn("[ArcadeRoom] Brak ArcadeProgress – używam stanu tymczasowego.");
      return {
        version: 2,
        unlockedItemTypes: {},
        instances: [],
        roomStyleId: null
      };
    }

    try {
      const raw = (await ArcadeProgress.load(ROOM_SAVE_KEY)) || {};
      return {
        version: raw.version || 2,
        unlockedItemTypes: raw.unlockedItemTypes || {},
        instances: raw.instances || [],
        roomStyleId: typeof raw.roomStyleId === "string" ? raw.roomStyleId : null
      };
    } catch (e) {
      console.error("[ArcadeRoom] Błąd ładowania stanu pokoju:", e);
      return {
        version: 2,
        unlockedItemTypes: {},
        instances: [],
        roomStyleId: null
      };
    }
  }

  async function saveRoomState(state) {
    if (!window.ArcadeProgress || !ArcadeProgress.save) {
      console.warn("[ArcadeRoom] Brak ArcadeProgress – nie zapisuję stanu.");
      return;
    }

    const safeState = {
      version: state.version || 2,
      unlockedItemTypes: state.unlockedItemTypes || {},
      instances: state.instances || [],
      roomStyleId: state.roomStyleId || null
    };

    try {
      await ArcadeProgress.save(ROOM_SAVE_KEY, safeState);
      console.log("[ArcadeRoom] Stan pokoju zapisany.");
    } catch (e) {
      console.error("[ArcadeRoom] Błąd zapisu stanu pokoju:", e);
    }
  }

  /**
   * Odblokowanie typu przedmiotu (z gry lub sklepu).
   */
  async function unlockItemType(itemId, options = {}) {
    const { fromGameId = null, meta = null } = options;

    const state = await loadRoomState();
    state.version = state.version || 2;
    state.unlockedItemTypes = state.unlockedItemTypes || {};

    const prev = state.unlockedItemTypes[itemId] || {};

    state.unlockedItemTypes[itemId] = {
      unlocked: true,
      fromGameId: fromGameId || prev.fromGameId || null,
      meta: meta || prev.meta || null
    };

    await saveRoomState(state);

    console.log("[ArcadeRoom] Odblokowano typ przedmiotu:", itemId);
    return state.unlockedItemTypes[itemId];
  }

  /**
   * Wersja wygodna dla sklepu (tylko inne meta).
   */
  async function unlockItemTypeFromShop(itemId, options = {}) {
    const meta = Object.assign({}, options.meta, { source: "shop" });
    return unlockItemType(itemId, {
      fromGameId: options.fromGameId || null,
      meta
    });
  }

  const exported = window.ArcadeRoom || {};
  exported.loadRoomState = loadRoomState;
  exported.saveRoomState = saveRoomState;
  exported.unlockItemType = unlockItemType;
  exported.unlockItemTypeFromShop = unlockItemTypeFromShop;

  window.ArcadeRoom = exported;
})();
