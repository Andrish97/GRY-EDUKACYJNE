// js/pages/room-scene.js
// Neon Room – scena pokoju 2D z pseudo-3D + tryb edycji
// --------------------------------------------------

(function () {
  "use strict";

  const ITEMS_BASE_URL = "data/items/"; // każdy item ma swój JSON: data/items/<id>.json

  let sceneEl = null;
  let editBtn = null;

  let roomState = {
    version: 2,
    unlockedItemTypes: {},
    instances: [],
    roomStyleId: null
  };

  // itemId -> definicja
  let itemDefsById = {};

  // drag & drop
  let isDragging = false;
  let dragInstanceId = null;
  let dragPointerId = null;
  let dragOffset = { x: 0, y: 0 };

  // tryb edycji (usuwanie)
  let editMode = false;

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    sceneEl = document.getElementById("room-scene");
    editBtn = document.getElementById("room-btn-edit");

    if (!sceneEl) {
      console.warn("[RoomScene] Brak elementu #room-scene");
      return;
    }

    // przycisk powrotu
    if (window.ArcadeUI && typeof ArcadeUI.addBackToArcadeButton === "function") {
      ArcadeUI.addBackToArcadeButton({ backUrl: "arcade.html" });
    }

    // przycisk trybu edycji
    if (editBtn) {
      editBtn.addEventListener("click", () => {
        editMode = !editMode;
        editBtn.classList.toggle("is-active", editMode);
        editBtn.textContent = editMode ? "Tryb edycji: ON" : "Tryb edycji";
        renderScene();
      });
    }

    // przycisk zapis
    const saveBtn = document.getElementById("room-btn-save");
    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        saveRoomState().then(() => console.log("[RoomScene] Pokój zapisany."));
      });
    }

    // przycisk sklep
    const shopBtn = document.getElementById("room-btn-open-shop");
    if (shopBtn) {
      shopBtn.addEventListener("click", () => {
        window.location.href = "room-shop.html";
      });
    }

    window.addEventListener("resize", () => {
      renderScene();
    });

    await loadRoomState();
    await loadNeededItemDefs();
    applyRoomStyleClass();
    renderScene();
    attachCreateInstanceToArcadeRoom();
  }

  // --------------------------------------------------
  // Stan pokoju
  // --------------------------------------------------

  async function loadRoomState() {
    if (window.ArcadeRoom && typeof ArcadeRoom.loadRoomState === "function") {
      roomState = await ArcadeRoom.loadRoomState();
      if (typeof roomState.roomStyleId === "undefined") {
        roomState.roomStyleId = null;
      }
      return;
    }

    // fallback
    if (!window.ArcadeProgress || !ArcadeProgress.load) {
      console.warn("[RoomScene] Brak ArcadeProgress – stan w pamięci.");
      roomState = {
        version: 2,
        unlockedItemTypes: {},
        instances: [],
        roomStyleId: null
      };
      return;
    }

    try {
      const raw = (await ArcadeProgress.load("neon_room_v2")) || {};
      roomState = {
        version: raw.version || 2,
        unlockedItemTypes: raw.unlockedItemTypes || {},
        instances: raw.instances || [],
        roomStyleId: raw.roomStyleId || null
      };
    } catch (e) {
      console.error("[RoomScene] Błąd ładowania stanu:", e);
      roomState = {
        version: 2,
        unlockedItemTypes: {},
        instances: [],
        roomStyleId: null
      };
    }
  }

  async function saveRoomState() {
    if (window.ArcadeRoom && typeof ArcadeRoom.saveRoomState === "function") {
      await ArcadeRoom.saveRoomState(roomState);
      return;
    }

    if (!window.ArcadeProgress || !ArcadeProgress.save) {
      console.warn("[RoomScene] Brak ArcadeProgress – nie zapisuję.");
      return;
    }

    const safeState = {
      version: roomState.version || 2,
      unlockedItemTypes: roomState.unlockedItemTypes || {},
      instances: roomState.instances || [],
      roomStyleId: roomState.roomStyleId || null
    };

    try {
      await ArcadeProgress.save("neon_room_v2", safeState);
    } catch (e) {
      console.error("[RoomScene] Błąd zapisu stanu:", e);
    }
  }

  // --------------------------------------------------
  // Ładowanie definicji itemów (osobne JSON-y)
  // --------------------------------------------------

  async function loadNeededItemDefs() {
    const neededIds = new Set();

    (roomState.instances || []).forEach((inst) => {
      if (inst.itemId) neededIds.add(inst.itemId);
    });
    if (roomState.roomStyleId) {
      neededIds.add(roomState.roomStyleId);
    }

    const promises = [];
    neededIds.forEach((id) => {
      promises.push(loadItemDef(id));
    });

    await Promise.all(promises);
  }

  async function loadItemDef(itemId) {
    if (itemDefsById[itemId]) return itemDefsById[itemId];

    try {
      const res = await fetch(ITEMS_BASE_URL + itemId + ".json");
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();

      // domyślne art.svg z nazwy pliku, jeśli brak
      if (!json.art) json.art = {};
      if (!json.art.svg) {
        json.art.svg = "assets/room/" + itemId + ".svg";
      }

      itemDefsById[itemId] = json;
      return json;
    } catch (e) {
      console.error("[RoomScene] Błąd ładowania definicji itemu:", itemId, e);
      return null;
    }
  }

  // --------------------------------------------------
  // Styl pokoju
  // --------------------------------------------------

  function applyRoomStyleClass() {
    const root = document.querySelector(".room2d-scene-wrapper") || sceneEl?.parentElement;
    if (!root) return;

    // wyczyść poprzednie style
    root.classList.forEach((cls) => {
      if (cls.startsWith("room-style-")) {
        root.classList.remove(cls);
      }
    });

    const styleId = roomState.roomStyleId;
    if (!styleId) return;

    const def = itemDefsById[styleId];
    if (!def || !def.style) return;

    const className = def.style.className;
    if (className) {
      root.classList.add(className);
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
    instances.sort((a, b) => (a.y || 0) - (b.y || 0));

    instances.forEach((inst) => {
      const def = itemDefsById[inst.itemId];
      if (!def) return;

      const art = def.art || {};
      const w = art.width || 80;
      const h = art.height || 80;

      const attachment =
        inst.attachment ||
        (art.anchor && art.anchor.attachment) ||
        "floor";

      let x = inst.x ?? 0.5;
      let y = inst.y ?? 0.8;

      if (attachment === "surface" && inst.parentInstanceId) {
        const parent = getInstanceById(inst.parentInstanceId);
        if (parent) {
          const baseX = parent.x ?? 0.5;
          const baseY = parent.y ?? 0.8;
          const offsetX = inst.offsetX ?? 0;
          const offsetY = inst.offsetY ?? 0;
          x = baseX + offsetX;
          y = baseY + offsetY;
        }
      }

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

      attachDragHandlers(el, inst.instanceId);

      if (editMode) {
        el.classList.add("room2d-object--editable");
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          handleDeleteInstance(inst.instanceId);
        });
      }

      sceneEl.appendChild(el);
    });
  }

  // --------------------------------------------------
  // Drag & drop
  // --------------------------------------------------

  function attachDragHandlers(el, instanceId) {
    if (!instanceId) return;

    el.addEventListener("mousedown", (ev) => {
      if (editMode) return; // w trybie edycji klik usuwa
      ev.preventDefault();
      startDrag(instanceId, ev.clientX, ev.clientY, null);
    });

    el.addEventListener(
      "touchstart",
      (ev) => {
        if (editMode) return;
        const t = ev.changedTouches[0];
        if (!t) return;
        ev.preventDefault();
        startDrag(instanceId, t.clientX, t.clientY, t.identifier);
      },
      { passive: false }
    );
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
      const me = ev;
      clientX = me.clientX;
      clientY = me.clientY;
    } else if (ev.type === "touchmove") {
      const te = ev;
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
    renderScene();
  }

  function onDragEnd(ev) {
    if (!isDragging) return;

    if (ev.type === "touchend" || ev.type === "touchcancel") {
      const te = ev;
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
        inst.offsetX = xNorm - baseX;
        inst.offsetY = yNorm - baseY;
        return;
      }
    }

    inst.x = xNorm;
    inst.y = yNorm;
  }

  // --------------------------------------------------
  // Usuwanie instancji (editMode)
  // --------------------------------------------------

  function handleDeleteInstance(instanceId) {
    const inst = getInstanceById(instanceId);
    if (!inst) return;
    const def = itemDefsById[inst.itemId];
    const name = def?.name || inst.itemId;

    if (!confirm(`Usunąć "${name}" z pokoju? (Przedmiot pozostanie kupiony)`)) {
      return;
    }

    roomState.instances = (roomState.instances || []).filter(
      (i) => i.instanceId !== instanceId
    );

    saveRoomState();
    renderScene();
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

  function generateInstanceId(itemId) {
    const rand = Math.random().toString(36).slice(2, 8);
    const ts = Date.now().toString(36);
    return "inst_" + itemId + "_" + ts + "_" + rand;
  }

  // tworzenie instancji (używane np. przez sklep)
  function createInstance(itemId, options = {}) {
    const def = itemDefsById[itemId];
    if (!def) {
      console.warn("[RoomScene] createInstance: nie znam itemu", itemId);
      return null;
    }

    roomState.instances = roomState.instances || [];

    const art = def.art || {};
    const anchor = art.anchor || {};
    const attachment = options.attachment || anchor.attachment || "floor";

    let x = options.x != null ? options.x : 0.5;
    let y = options.y != null ? options.y : 0.8;

    if (attachment === "wall" && options.y == null) {
      y = 0.4;
    } else if (attachment === "ceiling" && options.y == null) {
      y = 0.15;
    } else if (attachment === "floor" && options.y == null) {
      y = 0.9;
    }

    let parentInstanceId = options.parentInstanceId || null;
    let offsetX = options.offsetX || 0;
    let offsetY = options.offsetY || -0.1;

    if (attachment === "surface" && !parentInstanceId) {
      const parent = findSurfaceParentInstance();
      if (parent) {
        parentInstanceId = parent.instanceId;
        x = parent.x ?? 0.5;
        y = parent.y ?? 0.8;
      } else {
        // brak surface – wstaw na podłodze
        parentInstanceId = null;
      }
    }

    const inst = {
      instanceId: options.instanceId || generateInstanceId(itemId),
      itemId,
      level: options.level || 1,
      attachment: attachment === "surface" && !parentInstanceId ? "floor" : attachment,
      parentInstanceId,
      x,
      y,
      offsetX,
      offsetY,
      rotation: options.rotation || 0,
      meta: options.meta || {}
    };

    roomState.instances.push(inst);
    saveRoomState();
    renderScene();

    return inst;
  }

  function findSurfaceParentInstance() {
    const instances = roomState.instances || [];
    for (const inst of instances) {
      const def = itemDefsById[inst.itemId];
      if (!def) continue;
      if (def.placement && def.placement.canBeParentSurface) {
        return inst;
      }
    }
    return null;
  }

  function attachCreateInstanceToArcadeRoom() {
    const exported = window.ArcadeRoom || {};
    exported.createInstance = createInstance;
    window.ArcadeRoom = exported;
  }
})();
