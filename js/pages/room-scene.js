// js/pages/room-scene.js
// Neon Room – logika sceny pokoju 2D z pseudo-3D
// --------------------------------------------------
// Wymaga:
// - div#room-scene jako kontenera sceny
// - ArcadeProgress (do zapisu stanu)
// - data/room-items.json (definicje itemów)
// - room-api.js (ArcadeRoom.loadRoomState/saveRoomState – ale jak go nie ma, to też zadziała w trybie degradacji)

(function () {
  "use strict";

  const ROOM_SAVE_KEY = "neon_room_v2";
  const ITEMS_JSON_URL = "data/room-items.json";

  let sceneEl = null;
  let roomState = {
    version: 2,
    unlockedItemTypes: {},
    instances: []
  };
  let itemDefsById = {};

  // drag & drop
  let isDragging = false;
  let dragInstanceId = null;
  let dragPointerId = null;
  let dragOffset = { x: 0, y: 0 };

  function log(...args) {
    console.log("[RoomScene]", ...args);
  }

  async function init() {
    sceneEl = document.getElementById("room-scene");
    if (!sceneEl) {
      console.warn("[RoomScene] Brak elementu #room-scene");
      return;
    }

    // przycisk powrotu do arcade
    if (window.ArcadeUI && typeof ArcadeUI.addBackToArcadeButton === "function") {
      ArcadeUI.addBackToArcadeButton({ backUrl: "arcade.html" });
    }

    // podłącz przycisk zapisu
    const saveBtn = document.getElementById("room-btn-save");
    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        saveRoomState().then(() => {
          log("Pokój zapisany z przycisku.");
        });
      });
    }

    // sklep – po prostu przekierowanie
    const shopBtn = document.getElementById("room-btn-open-shop");
    if (shopBtn) {
      shopBtn.addEventListener("click", () => {
        window.location.href = "room-shop.html";
      });
    }

    // reaguj na resize – przerysowanie sceny (koordynaty są względne)
    window.addEventListener("resize", () => {
      renderScene();
    });

    await loadItemDefinitions();
    await loadRoomState();
    renderScene();
  }

  // --------------------------------------------------
  // Ładowanie definicji przedmiotów
  // --------------------------------------------------

  async function loadItemDefinitions() {
    try {
      const res = await fetch(ITEMS_JSON_URL);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      itemDefsById = {};
      (json.items || []).forEach((it) => {
        if (it && it.id) {
          itemDefsById[it.id] = it;
        }
      });
      log("Załadowano definicje przedmiotów:", Object.keys(itemDefsById).length);
    } catch (e) {
      console.error("[RoomScene] Błąd ładowania definicji przedmiotów:", e);
      itemDefsById = {};
    }
  }

  // --------------------------------------------------
  // Stan pokoju
  // --------------------------------------------------

  async function loadRoomState() {
    // jeżeli jest ArcadeRoom.loadRoomState, użyj go (spójność z API)
    if (window.ArcadeRoom && typeof ArcadeRoom.loadRoomState === "function") {
      roomState = await ArcadeRoom.loadRoomState();
      return;
    }

    // fallback bez ArcadeRoom
    if (!window.ArcadeProgress || !ArcadeProgress.load) {
      console.warn("[RoomScene] Brak ArcadeProgress – pokój będzie lokalny w pamięci.");
      roomState = {
        version: 2,
        unlockedItemTypes: {},
        instances: []
      };
      return;
    }

    try {
      const raw = (await ArcadeProgress.load(ROOM_SAVE_KEY)) || {};
      roomState = {
        version: raw.version || 2,
        unlockedItemTypes: raw.unlockedItemTypes || {},
        instances: raw.instances || []
      };
    } catch (e) {
      console.error("[RoomScene] Błąd ładowania stanu pokoju:", e);
      roomState = {
        version: 2,
        unlockedItemTypes: {},
        instances: []
      };
    }
  }

  async function saveRoomState() {
    // jeśli mamy ArcadeRoom.saveRoomState – użyj go
    if (window.ArcadeRoom && typeof ArcadeRoom.saveRoomState === "function") {
      await ArcadeRoom.saveRoomState(roomState);
      return;
    }

    if (!window.ArcadeProgress || !ArcadeProgress.save) {
      console.warn("[RoomScene] Brak ArcadeProgress – nie mogę zapisać stanu.");
      return;
    }

    const safeState = {
      version: roomState.version || 2,
      unlockedItemTypes: roomState.unlockedItemTypes || {},
      instances: roomState.instances || []
    };

    try {
      await ArcadeProgress.save(ROOM_SAVE_KEY, safeState);
    } catch (e) {
      console.error("[RoomScene] Błąd zapisu stanu pokoju:", e);
    }
  }

  // --------------------------------------------------
  // Render sceny
  // --------------------------------------------------

  function renderScene() {
    if (!sceneEl) return;

    sceneEl.innerHTML = "";

    const rect = sceneEl.getBoundingClientRect();
    const width = rect.width || 1;
    const height = rect.height || 1;

    const instances = (roomState.instances || []).slice();

    // sortowanie wg "głębokości" – im niżej (większe y), tym wyżej w z-index
    instances.sort((a, b) => (a.y || 0) - (b.y || 0));

    instances.forEach((inst) => {
      const def = itemDefsById[inst.itemId];
      if (!def) return;

      const art = def.art || {};
      const w = art.width || 80;
      const h = art.height || 80;

      const attachment = inst.attachment || (art.anchor && art.anchor.attachment) || "floor";

      // obliczamy pozycję
      let x = inst.x ?? 0.5;
      let y = inst.y ?? 0.8;

      if (attachment === "surface" && inst.parentInstanceId) {
        const parent = roomState.instances.find((p) => p.instanceId === inst.parentInstanceId);
        if (parent) {
          const baseX = parent.x ?? 0.5;
          const baseY = parent.y ?? 0.8;
          const offsetX = inst.offsetX ?? 0;
          const offsetY = inst.offsetY ?? 0;
          x = baseX + offsetX;
          y = baseY + offsetY;
        }
      }

      // clamp 0..1
      x = clamp01(x);
      y = clamp01(y);

      const pxX = x * width;
      const pxY = y * height;

      const el = document.createElement("div");
      el.className = "room2d-object room2d-object--" + attachment;
      el.dataset.instanceId = inst.instanceId || "";

      el.style.width = w + "px";
      el.style.height = h + "px";
      el.style.left = pxX - w / 2 + "px";
      el.style.top = pxY - h + "px";

      const z = 100 + Math.round(y * 100);
      el.style.zIndex = String(z);

      const img = document.createElement("img");
      img.src = art.svg || "";
      img.alt = def.name || "";
      img.className = "room2d-object-img";

      el.appendChild(img);

      // drag & drop
      attachDragHandlers(el, inst.instanceId);

      sceneEl.appendChild(el);
    });
  }

  // --------------------------------------------------
  // Drag & Drop – przesuwanie instancji
  // --------------------------------------------------

  function attachDragHandlers(el, instanceId) {
    if (!instanceId) return;

    el.addEventListener("mousedown", (ev) => {
      ev.preventDefault();
      startDrag(instanceId, ev.clientX, ev.clientY, null);
    });

    el.addEventListener("touchstart", (ev) => {
      const t = ev.changedTouches[0];
      if (!t) return;
      ev.preventDefault();
      startDrag(instanceId, t.clientX, t.clientY, t.identifier);
    }, { passive: false });
  }

  function startDrag(instanceId, clientX, clientY, pointerId) {
    if (!sceneEl) return;

    const rect = sceneEl.getBoundingClientRect();
    const pointerX = clientX - rect.left;
    const pointerY = clientY - rect.top;

    const inst = getInstanceById(instanceId);
    if (!inst) return;

    const x = (inst.x ?? 0.5) * rect.width;
    const y = (inst.y ?? 0.8) * rect.height;

    dragOffset.x = pointerX - x;
    dragOffset.y = pointerY - y;

    isDragging = true;
    dragInstanceId = instanceId;
    dragPointerId = pointerId;

    window.addEventListener("mousemove", onDragMove);
    window.addEventListener("mouseup", onDragEnd);
    window.addEventListener("touchmove", onDragMove, { passive: false });
    window.addEventListener("touchend", onDragEnd);
    window.addEventListener("touchcancel", onDragEnd);
  }

  function onDragMove(ev) {
    if (!isDragging || !sceneEl || !dragInstanceId) return;

    let clientX, clientY, touchFound = false;

    if (ev.type === "mousemove") {
      const me = /** @type {MouseEvent} */ (ev);
      clientX = me.clientX;
      clientY = me.clientY;
    } else if (ev.type === "touchmove") {
      const te = /** @type {TouchEvent} */ (ev);
      if (dragPointerId == null) {
        const t = te.changedTouches[0];
        if (!t) return;
        clientX = t.clientX;
        clientY = t.clientY;
      } else {
        for (let i = 0; i < te.changedTouches.length; i++) {
          const t = te.changedTouches[i];
          if (t.identifier === dragPointerId) {
            clientX = t.clientX;
            clientY = t.clientY;
            touchFound = true;
            break;
          }
        }
        if (!touchFound) return;
      }
      ev.preventDefault();
    }

    if (clientX == null || clientY == null) return;

    updateInstancePositionFromPointer(dragInstanceId, clientX, clientY);
    renderScene(); // szybkie przerysowanie
  }

  function onDragEnd(ev) {
    if (!isDragging) return;

    if (ev.type === "touchend" || ev.type === "touchcancel") {
      const te = /** @type {TouchEvent} */ (ev);
      if (dragPointerId != null) {
        let relevant = false;
        for (let i = 0; i < te.changedTouches.length; i++) {
          const t = te.changedTouches[i];
          if (t.identifier === dragPointerId) {
            relevant = true;
            break;
          }
        }
        if (!relevant) return;
      }
    }

    isDragging = false;
    dragInstanceId = null;
    dragPointerId = null;

    window.removeEventListener("mousemove", onDragMove);
    window.removeEventListener("mouseup", onDragEnd);
    window.removeEventListener("touchmove", onDragMove);
    window.removeEventListener("touchend", onDragEnd);
    window.removeEventListener("touchcancel", onDragEnd);

    // po zakończeniu przeciągania można od razu zapisać
    saveRoomState();
  }

  function updateInstancePositionFromPointer(instanceId, clientX, clientY) {
    const inst = getInstanceById(instanceId);
    if (!inst || !sceneEl) return;

    const rect = sceneEl.getBoundingClientRect();
    const pointerX = clientX - rect.left;
    const pointerY = clientY - rect.top;

    const worldX = pointerX - dragOffset.x;
    const worldY = pointerY - dragOffset.y;

    const xNorm = clamp01(worldX / rect.width);
    const yNorm = clamp01(worldY / rect.height);

    if (inst.attachment === "surface" && inst.parentInstanceId) {
      const parent = getInstanceById(inst.parentInstanceId);
      if (parent) {
        const baseX = parent.x ?? 0.5;
        const baseY = parent.y ?? 0.8;
        inst.offsetX = clamp01(xNorm - baseX);
        inst.offsetY = clamp01(yNorm - baseY);
        return;
      }
    }

    inst.x = xNorm;
    inst.y = yNorm;
  }

  // --------------------------------------------------
  // Pomocnicze
  // --------------------------------------------------

  function getInstanceById(instanceId) {
    return (roomState.instances || []).find((i) => i.instanceId === instanceId) || null;
  }

  function clamp01(v) {
    if (v < 0) return 0;
    if (v > 1) return 1;
    return v;
  }

  /**
   * Tworzy nową instancję przedmiotu w pokoju (np. po kupnie).
   * To jest funkcja pomocnicza – możesz jej użyć w sklepie.
   */
  function createInstance(itemId, options = {}) {
    const def = itemDefsById[itemId];
    if (!def) {
      console.warn("[RoomScene] createInstance: nie znam itemu", itemId);
      return null;
    }

    const inst = {
      instanceId: options.instanceId || generateInstanceId(itemId),
      itemId,
      level: options.level || 1,
      attachment:
        options.attachment ||
        (def.art && def.art.anchor && def.art.anchor.attachment) ||
        "floor",
      parentInstanceId: options.parentInstanceId || null,
      x: options.x != null ? options.x : 0.5,
      y: options.y != null ? options.y : 0.8,
      offsetX: options.offsetX || 0,
      offsetY: options.offsetY || 0,
      rotation: options.rotation || 0,
      meta: options.meta || {}
    };

    roomState.instances = roomState.instances || [];
    roomState.instances.push(inst);

    renderScene();
    saveRoomState();

    return inst;
  }

  function generateInstanceId(itemId) {
    const rand = Math.random().toString(36).slice(2, 8);
    const ts = Date.now().toString(36);
    return "inst_" + itemId + "_" + ts + "_" + rand;
  }

  // opcjonalnie – podwieszamy createInstance pod ArcadeRoom
  function attachToArcadeRoom() {
    const exported = window.ArcadeRoom || {};
    exported.createInstance = createInstance;
    window.ArcadeRoom = exported;
  }

  document.addEventListener("DOMContentLoaded", () => {
    attachToArcadeRoom();
    init();
  });
})();
