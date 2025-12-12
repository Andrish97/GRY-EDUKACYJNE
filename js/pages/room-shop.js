// js/pages/room-shop.js
// Neon Room – Sklep pokoju (STABILNY, z diagnostyką)
// Wymaga: js/core/room-api.js (ArcadeRoom), coins.js, progress.jszynka DOM: #shop-categories, #shop-item-list, #shop-items-title, #shop-balance

(function () {
  "use strict";

  const ITEMS_BASE_URL = "data/items/";
  const CATEGORIES_URL = "data/room-categories.json";
  const SHOP_GAME_ID = "neon_room_shop";

  // DOM
  let categoriesEl, itemsEl, itemsTitleEl, balanceEl;
  let diagEl;

  // Data
  let categories = [];
  let itemsById = {};            // itemId -> def
  let selectedCategoryId = null;

  // State
  let roomState = null;          // cache stanu pokoju
  let currentBalance = null;

  document.addEventListener("DOMContentLoaded", init);

  function ensureDiag() {
    diagEl = document.createElement("div");
    diagEl.style.position = "sticky";
    diagEl.style.top = "0";
    diagEl.style.zIndex = "9999";
    diagEl.style.padding = "0.55rem 0.75rem";
    diagEl.style.background = "rgba(2,6,23,0.92)";
    diagEl.style.border = "1px solid rgba(56,189,248,0.35)";
    diagEl.style.backdropFilter = "blur(6px)";
    diagEl.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
    diagEl.style.fontSize = "0.85rem";
    diagEl.innerHTML = `<div style="font-weight:700;opacity:.9;">RoomShop diagnostics</div>`;
    document.body.prepend(diagEl);
  }

  function diag(msg, type = "info") {
    const line = `[RoomShop] ${msg}`;
    console[type === "error" ? "error" : "log"](line);
    if (!diagEl) return;
    const row = document.createElement("div");
    row.textContent = line;
    row.style.opacity = type === "error" ? "1" : "0.85";
    row.style.color = type === "error" ? "#fecaca" : "#e5e7eb";
    diagEl.appendChild(row);
  }

  function url(path) {
    return new URL(path, document.baseURI).toString();
  }

  async function fetchJson(path) {
    const u = url(path);
    const res = await fetch(u, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${u}`);
    return await res.json();
  }

  async function init() {
    ensureDiag();
    diag(`baseURI = ${document.baseURI}`);

    categoriesEl = document.getElementById("shop-categories");
    itemsEl = document.getElementById("shop-item-list");
    itemsTitleEl = document.getElementById("shop-items-title");
    balanceEl = document.getElementById("shop-balance");

    if (!categoriesEl) diag("Brak #shop-categories (sprawdź room-shop.html)", "error");
    if (!itemsEl) diag("Brak #shop-item-list (sprawdź room-shop.html)", "error");
    if (!itemsTitleEl) diag("Brak #shop-items-title (sprawdź room-shop.html)", "error");
    if (!balanceEl) diag("Brak #shop-balance (sprawdź room-shop.html)", "error");

    if (!categoriesEl || !itemsEl || !itemsTitleEl) {
      renderFatal("HTML sklepu nie ma wymaganych elementów (zobacz diagnostics).");
      return;
    }

    const backRoomBtn = document.getElementById("shop-btn-back-room");
    if (backRoomBtn) backRoomBtn.addEventListener("click", () => (window.location.href = "room.html"));

    if (window.ArcadeUI?.addBackToArcadeButton) {
      ArcadeUI.addBackToArcadeButton({ backUrl: "arcade.html" });
    }

    // 1) load categories + defs
    await loadCategoriesAndItems();

    // 2) load room state cache
    await loadRoomStateCache();

    // 3) load balance
    await loadBalance();

    // 4) render
    renderCategories();

    if (categories.length) {
      selectCategory(categories[0].id);
    } else {
      renderFatal("Nie wczytało żadnych kategorii (data/room-categories.json).");
    }
  }

  function renderFatal(text) {
    itemsEl.innerHTML = "";
    const box = document.createElement("div");
    box.style.padding = "0.8rem";
    box.style.borderRadius = "0.75rem";
    box.style.border = "1px solid rgba(248,113,113,0.6)";
    box.style.background = "rgba(2,6,23,0.6)";
    box.textContent = text;
    itemsEl.appendChild(box);
  }

  // ---------------- Load ----------------

  async function loadCategoriesAndItems() {
    try {
      diag(`Ładuję: ${url(CATEGORIES_URL)}`);
      const json = await fetchJson(CATEGORIES_URL);
      categories = (json.categories || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      diag(`Kategorie: ${categories.length}`);
    } catch (e) {
      diag(`Błąd kategorii: ${String(e)}`, "error");
      categories = [];
      return;
    }

    const itemIds = new Set();
    for (const c of categories) for (const id of (c.itemIds || [])) itemIds.add(id);
    diag(`ItemIDs w kategoriach: ${itemIds.size}`);

    itemsById = {};
    const results = await Promise.allSettled([...itemIds].map(loadItemDef));
    const ok = results.filter(r => r.status === "fulfilled").length;
    const bad = results.filter(r => r.status === "rejected").length;
    diag(`Item defs OK=${ok}, FAIL=${bad}`);
  }

  async function loadItemDef(itemId) {
    const path = `${ITEMS_BASE_URL}${itemId}.json`;
    diag(`Item: ${url(path)}`);

    const def = await fetchJson(path);

    if (!def.art) def.art = {};
    const isStyle = def.kind === "room_style" || def.categoryId === "walls";

    // svg tylko dla nie-style
    if (!isStyle && !def.art.svg) def.art.svg = `assets/room/${itemId}.svg`;

    itemsById[itemId] = def;
    return def;
  }

  async function loadRoomStateCache() {
    if (!window.ArcadeRoom?.loadRoomState) {
      diag("Brak ArcadeRoom.loadRoomState (czy room-api.js jest podpięty?)", "error");
      roomState = { unlockedItemTypes: {}, instances: [], roomStyleId: null };
      return;
    }
    roomState = await ArcadeRoom.loadRoomState();
    roomState.unlockedItemTypes ||= {};
    roomState.instances ||= [];
    diag("Stan pokoju załadowany.");
  }

  async function refreshRoomStateCache() {
    await loadRoomStateCache();
  }

  async function loadBalance() {
    if (!window.ArcadeCoins?.load) {
      setBalance(null);
      diag("Brak ArcadeCoins.load()", "error");
      return;
    }
    try {
      const b = await ArcadeCoins.load();
      currentBalance = b;
      setBalance(b);
      diag(`Balans: ${String(b)}`);
    } catch (e) {
      diag(`Błąd balansu: ${String(e)}`, "error");
      setBalance(null);
    }
  }

  function setBalance(v) {
    if (!balanceEl) return;
    balanceEl.textContent = (typeof v === "number" && !Number.isNaN(v)) ? String(v) : "–";
  }

  function getBalance() {
    if (window.ArcadeCoins?.getBalance) {
      const b = ArcadeCoins.getBalance();
      if (typeof b === "number" && !Number.isNaN(b)) {
        currentBalance = b;
        return b;
      }
    }
    return currentBalance;
  }

  // ---------------- Render ----------------

  function renderCategories() {
    categoriesEl.innerHTML = "";

    if (!categories.length) {
      diag("Brak kategorii do renderu.", "error");
      return;
    }

    for (const cat of categories) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "room-shop-category-btn";
      btn.textContent = cat.name || cat.id;
      btn.dataset.catId = cat.id;

      btn.addEventListener("click", () => selectCategory(cat.id));
      categoriesEl.appendChild(btn);
    }

    highlightActiveCategory();
    diag("Kategorie wyrenderowane.");
  }

  function highlightActiveCategory() {
    categoriesEl.querySelectorAll(".room-shop-category-btn").forEach(btn => {
      btn.classList.toggle("is-active", btn.dataset.catId === selectedCategoryId);
    });
  }

  function selectCategory(catId) {
    selectedCategoryId = catId;
    highlightActiveCategory();

    const cat = categories.find(c => c.id === catId);
    itemsTitleEl.textContent = cat ? (cat.name || "Przedmioty") : "Przedmioty";

    renderItemsForCategory(cat);
  }

  function renderItemsForCategory(cat) {
    itemsEl.innerHTML = "";

    if (!cat) {
      renderFatal("Nie znaleziono kategorii.");
      return;
    }

    const ids = cat.itemIds || [];
    diag(`Render: ${cat.id} (${ids.length} itemów)`);

    if (!ids.length) {
      const p = document.createElement("p");
      p.textContent = "Ta kategoria nie ma itemów (itemIds jest puste).";
      itemsEl.appendChild(p);
      return;
    }

    for (const itemId of ids) {
      const def = itemsById[itemId];
      if (!def) {
        itemsEl.appendChild(missingCard(itemId));
        continue;
      }
      itemsEl.appendChild(itemCard(def, cat));
    }
  }

  function missingCard(itemId) {
    const d = document.createElement("div");
    d.className = "room-shop-item-card";
    d.innerHTML = `
      <div class="room-shop-item-header">
        <div class="room-shop-item-name">Brak definicji</div>
        <div class="room-shop-item-sub">${itemId}</div>
      </div>
      <div class="room-shop-item-body">
        <div class="room-shop-item-info">
          <div class="room-shop-item-status">
            Brak pliku: <code>${ITEMS_BASE_URL}${itemId}.json</code>
          </div>
        </div>
      </div>
    `;
    return d;
  }

  function itemCard(item, category) {
    const isStyle =
      item.kind === "room_style" ||
      item.categoryId === "walls" ||
      category.id === "walls";

    const unlocked = !!roomState?.unlockedItemTypes?.[item.id]?.unlocked;
    const placedCount = (roomState?.instances || []).filter(i => i.itemId === item.id).length;
    const isCurrentStyle = roomState?.roomStyleId === item.id;

    const price = item.price != null ? item.price : null;

    const card = document.createElement("div");
    card.className = "room-shop-item-card";

    const header = document.createElement("div");
    header.className = "room-shop-item-header";

    const nameEl = document.createElement("div");
    nameEl.className = "room-shop-item-name";
    nameEl.textContent = item.name || item.id;

    const subEl = document.createElement("div");
    subEl.className = "room-shop-item-sub";
    subEl.textContent = category.name || category.id;

    header.appendChild(nameEl);
    header.appendChild(subEl);

    const body = document.createElement("div");
    body.className = "room-shop-item-body";

    // ✅ miniatury tylko dla NIE-style
    if (!isStyle && item.art?.svg) {
      const prev = document.createElement("div");
      prev.className = "room-shop-item-preview";

      const img = document.createElement("img");
      img.className = "room-shop-item-preview-img";
      img.src = item.art.svg;
      img.alt = item.name || item.id;

      prev.appendChild(img);
      body.appendChild(prev);
    }

    const info = document.createElement("div");
    info.className = "room-shop-item-info";

    const status = document.createElement("div");
    status.className = "room-shop-item-status";

    if (isStyle) {
      if (!unlocked && price != null) status.textContent = `Cena stylu: 💎 ${price}`;
      else if (!unlocked && price == null) status.textContent = `Styl z gry / zablokowany`;
      else status.textContent = isCurrentStyle ? "Aktywny styl pokoju" : "Odblokowany styl";
    } else {
      if (!unlocked) {
        if (price != null) status.textContent = `Cena: 💎 ${price}`;
        else if (item.source === "game") status.textContent = "Zdobywasz w grze";
        else status.textContent = "Niedostępne";
      } else {
        status.textContent = `Kupione · w pokoju: ${placedCount}`;
      }
    }

    info.appendChild(status);

    const actions = document.createElement("div");
    actions.className = "room-shop-item-actions";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "room-shop-item-btn";

    if (isStyle) {
      if (unlocked) {
        btn.textContent = isCurrentStyle ? "Ustawiony" : "Ustaw styl";
        btn.disabled = isCurrentStyle;
        if (!isCurrentStyle) btn.addEventListener("click", () => setStyle(item, category));
      } else if (price != null) {
        btn.textContent = "Kup i ustaw";
        btn.addEventListener("click", () => buyStyle(item, category));
      } else {
        btn.textContent = "Odblokuj w grze";
        btn.disabled = true;
      }
    } else {
      if (unlocked) {
        btn.textContent = "Dodaj do pokoju";
        btn.addEventListener("click", () => addToRoom(item));
      } else if (price != null) {
        btn.textContent = "Kup";
        btn.addEventListener("click", () => buyItem(item, category));
      } else if (item.source === "game") {
        btn.textContent = "Odblokuj w grze";
        btn.disabled = true;
      } else {
        btn.textContent = "Niedostępne";
        btn.disabled = true;
      }
    }

    actions.appendChild(btn);
    info.appendChild(actions);

    body.appendChild(info);

    card.appendChild(header);
    card.appendChild(body);
    return card;
  }

  // ---------------- Actions ----------------

  async function buyItem(item, category) {
    const price = item.price != null ? item.price : 0;
    const bal = getBalance();

    if (bal == null) return alert("Brak info o 💎 (zaloguj się).");
    if (bal < price) return alert("Za mało 💎.");
    if (!confirm(`Kupić "${item.name || item.id}" za 💎 ${price}?`)) return;

    if (!window.ArcadeCoins?.addForGame) return alert("Brak ArcadeCoins.addForGame");
    if (!window.ArcadeRoom?.unlockItemTypeFromShop) return alert("Brak ArcadeRoom.unlockItemTypeFromShop");

    await ArcadeCoins.addForGame(SHOP_GAME_ID, -price, { itemId: item.id, source: "shop_buy" });
    window.ArcadeAuthUI?.refreshCoins?.();
    await loadBalance();

    await ArcadeRoom.unlockItemTypeFromShop(item.id, { meta: { source: "shop" } });
    await refreshRoomStateCache();
    renderItemsForCategory(category);
  }

  async function addToRoom(item) {
    if (!window.ArcadeRoom?.createInstance) {
      alert("Brak ArcadeRoom.createInstance (sprawdź czy masz nowy js/core/room-api.js).");
      return;
    }

    const attachment = item?.art?.anchor?.attachment || item?.attachment || "floor";
    const inst = await ArcadeRoom.createInstance(item.id, { attachment });

    // ✅ od razu do pokoju + focus
    window.location.href = `room.html?focus=${encodeURIComponent(inst.instanceId)}`;
  }

  async function buyStyle(item, category) {
    const price = item.price != null ? item.price : 0;
    const bal = getBalance();

    if (bal == null) return alert("Brak info o 💎 (zaloguj się).");
    if (bal < price) return alert("Za mało 💎.");
    if (!confirm(`Kupić styl "${item.name || item.id}" za 💎 ${price}?`)) return;

    if (!window.ArcadeCoins?.addForGame) return alert("Brak ArcadeCoins.addForGame");
    if (!window.ArcadeRoom?.saveRoomState) return alert("Brak ArcadeRoom.saveRoomState");

    await ArcadeCoins.addForGame(SHOP_GAME_ID, -price, { itemId: item.id, source: "shop_style" });
    window.ArcadeAuthUI?.refreshCoins?.();
    await loadBalance();

    const s = await ArcadeRoom.loadRoomState();
    s.unlockedItemTypes ||= {};
    s.unlockedItemTypes[item.id] = { unlocked: true, fromGameId: null, meta: { source: "shop_style" } };
    s.roomStyleId = item.id;
    await ArcadeRoom.saveRoomState(s);

    await refreshRoomStateCache();
    renderItemsForCategory(category);
  }

  async function setStyle(item, category) {
    if (window.ArcadeRoom?.setRoomStyle) {
      await ArcadeRoom.setRoomStyle(item.id);
    } else {
      const s = await ArcadeRoom.loadRoomState();
      s.roomStyleId = item.id;
      await ArcadeRoom.saveRoomState(s);
    }
    await refreshRoomStateCache();
    renderItemsForCategory(category);
  }
})();
