// js/pages/room-shop.js
// Neon Room – Sklep pokoju (kategorie + itemy + kupno + dodawanie instancji + style)
// Wymaga: js/core/room-api.js, coins.js, progress.js, auth-bar.js (jak w HTML)

(function () {
  "use strict";

  const ITEMS_BASE_URL = "data/items/";
  const CATEGORIES_URL = "data/room-categories.json";
  const SHOP_GAME_ID = "neon_room_shop";

  // DOM
  let categoriesEl = null;
  let itemsEl = null;
  let itemsTitleEl = null;
  let balanceEl = null;

  // Data
  let categories = [];
  let itemsById = {}; // { [itemId]: itemDef }
  let selectedCategoryId = null;

  // cached balance
  let currentBalance = null;

  document.addEventListener("DOMContentLoaded", init);

  function url(path) {
    // ważne na GitHub Pages i subfolderach
    return new URL(path, document.baseURI).toString();
  }

  async function fetchJson(path) {
    const u = url(path);
    const res = await fetch(u, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${u}`);
    return await res.json();
  }

  async function init() {
    categoriesEl = document.getElementById("shop-categories");
    itemsEl = document.getElementById("shop-item-list");
    itemsTitleEl = document.getElementById("shop-items-title");
    balanceEl = document.getElementById("shop-balance");

    if (!categoriesEl || !itemsEl || !itemsTitleEl) {
      console.error("[RoomShop] Brak wymaganych elementów DOM (#shop-categories, #shop-item-list, #shop-items-title).");
      return;
    }

    // Back / UI
    const backRoomBtn = document.getElementById("shop-btn-back-room");
    if (backRoomBtn) backRoomBtn.addEventListener("click", () => (window.location.href = "room.html"));

    if (window.ArcadeUI && typeof ArcadeUI.addBackToArcadeButton === "function") {
      ArcadeUI.addBackToArcadeButton({ backUrl: "arcade.html" });
    }

    // Load
    await loadCategoriesAndItems();
    await loadBalance();

    renderCategories();

    if (categories.length > 0) {
      selectCategory(categories[0].id);
    } else {
      renderFatal("Brak kategorii. Sprawdź data/room-categories.json.");
    }
  }

  // ----------------------------
  // Load categories + item defs
  // ----------------------------

  async function loadCategoriesAndItems() {
    try {
      const json = await fetchJson(CATEGORIES_URL);
      categories = (json.categories || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      console.log("[RoomShop] Załadowano kategorie:", categories.length);
    } catch (e) {
      console.error("[RoomShop] Błąd ładowania kategorii:", e);
      categories = [];
      return;
    }

    // collect all itemIds from categories
    const itemIds = new Set();
    for (const cat of categories) {
      for (const id of (cat.itemIds || [])) itemIds.add(id);
    }

    itemsById = {};

    const results = await Promise.allSettled([...itemIds].map(loadItemDef));
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const bad = results.filter((r) => r.status === "rejected").length;
    console.log("[RoomShop] Item defs OK:", ok, "FAIL:", bad);
  }

  async function loadItemDef(itemId) {
    const path = `${ITEMS_BASE_URL}${itemId}.json`;
    const json = await fetchJson(path);

    // sanity: id w środku powinno się zgadzać z nazwą pliku
    if (json.id && json.id !== itemId) {
      console.warn(`[RoomShop] UWAGA: ${itemId}.json ma id="${json.id}" (nie pasuje do nazwy pliku).`);
    }

    if (!json.art) json.art = {};

    // domyślny svg tylko dla normalnych itemów (NIE dla stylów)
    const isStyle = json.kind === "room_style" || json.categoryId === "walls";
    if (!isStyle && !json.art.svg) {
      json.art.svg = `assets/room/${itemId}.svg`;
    }

    itemsById[itemId] = json;
    return json;
  }

  // ----------------------------
  // Balance
  // ----------------------------

  async function loadBalance() {
    if (!window.ArcadeCoins || typeof ArcadeCoins.load !== "function") {
      setBalanceDisplay(null);
      return;
    }

    try {
      const bal = await ArcadeCoins.load();
      currentBalance = bal;
      setBalanceDisplay(bal);
      console.log("[RoomShop] Balans:", bal);
    } catch (e) {
      console.error("[RoomShop] Błąd ładowania balansu:", e);
      setBalanceDisplay(null);
    }
  }

  function getCurrentBalance() {
    if (!window.ArcadeCoins || typeof ArcadeCoins.getBalance !== "function") return currentBalance;
    const b = ArcadeCoins.getBalance();
    if (typeof b === "number" && !Number.isNaN(b)) {
      currentBalance = b;
      return b;
    }
    return currentBalance;
  }

  function setBalanceDisplay(value) {
    if (!balanceEl) return;
    balanceEl.textContent =
      typeof value === "number" && !Number.isNaN(value) ? String(value) : "–";
  }

  // ----------------------------
  // Render
  // ----------------------------

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

  function renderCategories() {
    categoriesEl.innerHTML = "";

    for (const cat of categories) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "room-shop-category-btn";
      btn.textContent = cat.name || cat.id;

      if (cat.id === selectedCategoryId) btn.classList.add("is-active");

      btn.addEventListener("click", () => selectCategory(cat.id));
      categoriesEl.appendChild(btn);
    }
  }

  function selectCategory(catId) {
    selectedCategoryId = catId;

    // highlight active
    categoriesEl.querySelectorAll(".room-shop-category-btn").forEach((b) => {
      b.classList.toggle("is-active", b.textContent === (categories.find(c => c.id === catId)?.name || catId));
    });

    const cat = categories.find((c) => c.id === catId);
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
    if (!ids.length) {
      const p = document.createElement("p");
      p.textContent = "Ta kategoria nie ma itemów (itemIds jest puste).";
      itemsEl.appendChild(p);
      return;
    }

    for (const itemId of ids) {
      const def = itemsById[itemId];

      if (!def) {
        itemsEl.appendChild(createMissingCard(itemId));
        continue;
      }

      itemsEl.appendChild(createItemCard(def, cat));
    }
  }

  function createMissingCard(itemId) {
    const wrapper = document.createElement("div");
    wrapper.className = "room-shop-item-card";
    wrapper.innerHTML = `
      <div class="room-shop-item-header">
        <div class="room-shop-item-name">Brak definicji</div>
        <div class="room-shop-item-sub">${itemId}</div>
      </div>
      <div class="room-shop-item-body">
        <div class="room-shop-item-info">
          <div class="room-shop-item-status">
            Nie mogę znaleźć pliku: <code>${ITEMS_BASE_URL}${itemId}.json</code>
          </div>
        </div>
      </div>
    `;
    return wrapper;
  }

  function createItemCard(item, category) {
    const wrapper = document.createElement("div");
    wrapper.className = "room-shop-item-card";

    const header = document.createElement("div");
    header.className = "room-shop-item-header";

    const title = document.createElement("div");
    title.className = "room-shop-item-name";
    title.textContent = item.name || item.id;

    const subtitle = document.createElement("div");
    subtitle.className = "room-shop-item-sub";
    subtitle.textContent = category?.name || "";

    header.appendChild(title);
    header.appendChild(subtitle);

    const body = document.createElement("div");
    body.className = "room-shop-item-body";

    const isStyle =
      item.kind === "room_style" ||
      item.categoryId === "walls" ||
      (category && category.id === "walls");

    // ✅ miniaturka tylko dla nie-style
    if (!isStyle && item.art && item.art.svg) {
      const previewWrap = document.createElement("div");
      previewWrap.className = "room-shop-item-preview";

      const img = document.createElement("img");
      img.src = item.art.svg;
      img.alt = item.name || item.id;
      img.className = "room-shop-item-preview-img";

      previewWrap.appendChild(img);
      body.appendChild(previewWrap);
    }

    const info = document.createElement("div");
    info.className = "room-shop-item-info";

    // status
    const statusLine = document.createElement("div");
    statusLine.className = "room-shop-item-status";

    const price = item.price != null ? item.price : null;

    // stan odblokowania
    let state = null;
    let unlocked = false;
    let placedCount = 0;
    let currentStyle = null;

    if (window.ArcadeRoom && typeof ArcadeRoom.loadRoomState === "function") {
      // UWAGA: to jest sync w renderze? – nie, pobieramy stan wcześniej w akcjach.
      // Tu bierzemy z cache: zrobimy "lazy read" z Progress (szybko) jako fallback.
    }

    // szybki odczyt z ArcadeProgress (sync nie ma), więc robimy prostą heurystykę:
    // i tak przy klikach odświeżamy UI po save. Tu odczytamy przy każdym renderze async? nie.
    // Lepsze: po prostu wczytaj stan raz teraz:
    // (robimy to w createItemCard przez closure i immediate refresh async)
    // -> uproszczenie: odczyt stanu robimy w funkcji async i potem refresh listy.
    // Na teraz: wczytamy stan raz na klik przycisku (akcje), a w renderze pokażemy "—" jeśli nie mamy.

    // Żeby było poprawnie, pobierzemy stan synchronicznie z cache w memory:
    // trzymamy go w window.__ROOM_STATE_CACHE (ułatwia życie).
    const cache = window.__ROOM_STATE_CACHE || null;
    if (cache) {
      state = cache;
      unlocked = !!(state.unlockedItemTypes && state.unlockedItemTypes[item.id] && state.unlockedItemTypes[item.id].unlocked);
      placedCount = (state.instances || []).filter((inst) => inst.itemId === item.id).length;
      currentStyle = state.roomStyleId || null;
    }

    // jeśli nie ma cache – zainicjuj go raz (asynchronicznie) i odśwież listę
    if (!cache && window.ArcadeRoom && typeof ArcadeRoom.loadRoomState === "function") {
      ArcadeRoom.loadRoomState()
        .then((s) => {
          window.__ROOM_STATE_CACHE = s;
          // odśwież tylko jeśli nadal ta sama kategoria
          if (selectedCategoryId === category.id) renderItemsForCategory(category);
        })
        .catch(() => {});
    }

    // tekst statusu
    const statusText = document.createElement("div");

    if (isStyle) {
      if (cache) {
        if (!unlocked && price != null) statusText.textContent = `Cena stylu: 💎 ${price}`;
        else if (!unlocked && price == null) statusText.textContent = `Styl z gry / zablokowany`;
        else statusText.textContent = currentStyle === item.id ? "Aktywny styl pokoju" : "Odblokowany styl";
      } else {
        statusText.textContent = price != null ? `Cena stylu: 💎 ${price}` : "Styl pokoju";
      }
    } else {
      if (cache) {
        if (!unlocked) {
          if (price != null) statusText.textContent = `Cena: 💎 ${price}`;
          else if (item.source === "game") statusText.textContent = `Zdobywasz w grze`;
          else statusText.textContent = "Niedostępne";
        } else {
          statusText.textContent = `Kupione · w pokoju: ${placedCount}`;
        }
      } else {
        statusText.textContent = price != null ? `Cena: 💎 ${price}` : (item.source === "game" ? "Zdobywasz w grze" : "Przedmiot");
      }
    }

    statusLine.appendChild(statusText);
    info.appendChild(statusLine);

    // actions
    const actions = document.createElement("div");
    actions.className = "room-shop-item-actions";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "room-shop-item-btn";

    // domyślne: jeśli nie znamy jeszcze stanu (cache null), nie blokujemy kupna za cenę
    const canAssumeUnlocked = cache ? unlocked : false;

    if (isStyle) {
      if (cache && unlocked) {
        const isCurrent = (currentStyle === item.id);
        button.textContent = isCurrent ? "Ustawiony" : "Ustaw styl";
        button.disabled = isCurrent;
        if (!isCurrent) button.addEventListener("click", () => handleSetStyle(item, category));
      } else if (price != null) {
        button.textContent = "Kup i ustaw";
        button.addEventListener("click", () => handleBuyStyle(item, category));
      } else {
        button.textContent = "Odblokuj w grze";
        button.disabled = true;
      }
    } else {
      if (cache && canAssumeUnlocked) {
        button.textContent = "Dodaj do pokoju";
        button.addEventListener("click", () => handleAddToRoom(item));
      } else if (price != null) {
        button.textContent = "Kup";
        button.addEventListener("click", () => handleBuyItem(item, category));
      } else if (item.source === "game") {
        button.textContent = "Odblokuj w grze";
        button.disabled = true;
      } else {
        button.textContent = "Niedostępne";
        button.disabled = true;
      }
    }

    actions.appendChild(button);
    info.appendChild(actions);

    body.appendChild(info);

    wrapper.appendChild(header);
    wrapper.appendChild(body);

    return wrapper;
  }

  // ----------------------------
  // Actions
  // ----------------------------

  async function refreshRoomCache() {
    if (!window.ArcadeRoom || typeof ArcadeRoom.loadRoomState !== "function") return null;
    const s = await ArcadeRoom.loadRoomState();
    window.__ROOM_STATE_CACHE = s;
    return s;
  }

  async function handleBuyItem(item, category) {
    const price = item.price != null ? item.price : 0;
    const balance = getCurrentBalance();

    if (balance == null) return alert("Brak info o 💎 (zaloguj się).");
    if (balance < price) return alert("Za mało 💎.");
    if (!confirm(`Kupić "${item.name || item.id}" za 💎 ${price}?`)) return;

    try {
      if (!window.ArcadeCoins || typeof ArcadeCoins.addForGame !== "function") {
        alert("Brak ArcadeCoins.addForGame");
        return;
      }

      await ArcadeCoins.addForGame(SHOP_GAME_ID, -price, { itemId: item.id, source: "shop_buy" });

      if (window.ArcadeAuthUI && typeof ArcadeAuthUI.refreshCoins === "function") {
        ArcadeAuthUI.refreshCoins();
      }

      await loadBalance();
    } catch (e) {
      console.error("[RoomShop] Błąd odejmowania 💎:", e);
      return;
    }

    // odblokuj w stanie pokoju
    if (!window.ArcadeRoom || typeof ArcadeRoom.unlockItemTypeFromShop !== "function") {
      alert("Brak ArcadeRoom.unlockItemTypeFromShop (sprawdź czy ładuje się js/core/room-api.js)");
      return;
    }

    await ArcadeRoom.unlockItemTypeFromShop(item.id, { meta: { source: "shop" } });
    await refreshRoomCache();

    // odśwież UI
    renderItemsForCategory(category);
  }

  async function handleAddToRoom(item) {
    if (!window.ArcadeRoom || typeof ArcadeRoom.createInstance !== "function") {
      alert('Brak ArcadeRoom.createInstance – sprawdź js/core/room-api.js.');
      return;
    }
  
    const attachment =
      item?.art?.anchor?.attachment ||
      item?.attachment ||
      "floor";
  
    // ✅ tworzymy instancję i dostajemy instanceId
    const inst = await ArcadeRoom.createInstance(item.id, { attachment });
  
    // ✅ od razu przerzucamy do pokoju z parametrem focus
    window.location.href = `room.html?focus=${encodeURIComponent(inst.instanceId)}`;
  }


    const attachment =
      item?.art?.anchor?.attachment ||
      item?.attachment ||
      "floor";

    await ArcadeRoom.createInstance(item.id, { attachment });
    await refreshRoomCache();

    alert("Dodano do pokoju. Wejdź do pokoju i ustaw pozycję.");
  }

  async function handleBuyStyle(item, category) {
    const price = item.price != null ? item.price : 0;
    const balance = getCurrentBalance();

    if (balance == null) return alert("Brak info o 💎 (zaloguj się).");
    if (balance < price) return alert("Za mało 💎.");
    if (!confirm(`Kupić styl "${item.name || item.id}" za 💎 ${price}?`)) return;

    try {
      if (!window.ArcadeCoins || typeof ArcadeCoins.addForGame !== "function") {
        alert("Brak ArcadeCoins.addForGame");
        return;
      }

      await ArcadeCoins.addForGame(SHOP_GAME_ID, -price, { itemId: item.id, source: "shop_style" });

      if (window.ArcadeAuthUI && typeof ArcadeAuthUI.refreshCoins === "function") {
        ArcadeAuthUI.refreshCoins();
      }

      await loadBalance();
    } catch (e) {
      console.error("[RoomShop] Błąd odejmowania 💎 (styl):", e);
      return;
    }

    if (!window.ArcadeRoom || typeof ArcadeRoom.saveRoomState !== "function") {
      alert("Brak ArcadeRoom.saveRoomState (sprawdź js/core/room-api.js)");
      return;
    }

    const state = await ArcadeRoom.loadRoomState();
    state.unlockedItemTypes = state.unlockedItemTypes || {};
    state.unlockedItemTypes[item.id] = { unlocked: true, fromGameId: null, meta: { source: "shop_style" } };
    state.roomStyleId = item.id;

    await ArcadeRoom.saveRoomState(state);
    await refreshRoomCache();

    renderItemsForCategory(category);
  }

  async function handleSetStyle(item, category) {
    if (!window.ArcadeRoom || typeof ArcadeRoom.setRoomStyle !== "function") {
      // fallback jeśli nie masz setRoomStyle w API
      const state = await ArcadeRoom.loadRoomState();
      state.roomStyleId = item.id;
      await ArcadeRoom.saveRoomState(state);
    } else {
      await ArcadeRoom.setRoomStyle(item.id);
    }

    await refreshRoomCache();
    renderItemsForCategory(category);
  }
})();
