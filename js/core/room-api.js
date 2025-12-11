// js/pages/room-shop.js
// Neon Room – Sklep pokoju
// --------------------------------------------------

(function () {
  "use strict";

  const ROOM_SAVE_KEY = "neon_room_v2";
  const ITEMS_BASE_URL = "data/items/";
  const CATEGORIES_URL = "data/room-categories.json";
  const SHOP_GAME_ID = "neon_room_shop";

  let itemsById = {};
  let categories = [];
  let roomState = {
    version: 2,
    unlockedItemTypes: {},
    instances: [],
    roomStyleId: null
  };

  let selectedCategoryId = null;
  let currentBalance = null;

  // DOM
  let categoriesEl = null;
  let itemsEl = null;
  let itemsTitleEl = null;
  let balanceEl = null;

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    categoriesEl = document.getElementById("shop-categories");
    itemsEl = document.getElementById("shop-item-list");
    itemsTitleEl = document.getElementById("shop-items-title");
    balanceEl = document.getElementById("shop-balance");

    const backRoomBtn = document.getElementById("shop-btn-back-room");
    if (backRoomBtn) {
      backRoomBtn.addEventListener("click", () => {
        window.location.href = "room.html";
      });
    }

    if (window.ArcadeUI && typeof ArcadeUI.addBackToArcadeButton === "function") {
      ArcadeUI.addBackToArcadeButton({ backUrl: "arcade.html" });
    }

    await loadCategoriesAndItems();
    await loadRoomState();
    await loadBalance();

    renderCategories();
    if (categories.length > 0) {
      selectCategory(categories[0].id);
    }
  }

  // --------------------------------------------------
  // ŁADOWANIE DEFINICJI (kategorie + osobne JSON-y itemów)
  // --------------------------------------------------

  async function loadCategoriesAndItems() {
    try {
      const res = await fetch(CATEGORIES_URL);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      categories = (json.categories || []).slice().sort((a, b) => {
        const oa = a.order ?? 0;
        const ob = b.order ?? 0;
        return oa - ob;
      });
    } catch (e) {
      console.error("[RoomShop] Błąd ładowania kategorii:", e);
      categories = [];
    }

    itemsById = {};

    const itemIdsSet = new Set();
    categories.forEach((cat) => {
      (cat.itemIds || []).forEach((id) => itemIdsSet.add(id));
    });

    const promises = [];
    itemIdsSet.forEach((id) => {
      promises.push(loadItemDef(id));
    });

    await Promise.all(promises);
  }

  async function loadItemDef(itemId) {
    try {
      const res = await fetch(ITEMS_BASE_URL + itemId + ".json");
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();

      if (!json.art) json.art = {};
      if (!json.art.svg) {
        json.art.svg = "assets/room/" + itemId + ".svg";
      }

      itemsById[itemId] = json;
    } catch (e) {
      console.error("[RoomShop] Błąd ładowania itemu:", itemId, e);
      // brak itemu – pomiń
    }
  }

  // --------------------------------------------------
  // STAN POKOJU + BALANS
  // --------------------------------------------------

  async function loadRoomState() {
    if (window.ArcadeRoom && typeof ArcadeRoom.loadRoomState === "function") {
      roomState = await ArcadeRoom.loadRoomState();
      if (typeof roomState.roomStyleId === "undefined") {
        roomState.roomStyleId = null;
      }
      return;
    }

    if (!window.ArcadeProgress || !ArcadeProgress.load) {
      console.warn("[RoomShop] Brak ArcadeProgress – stan tylko w pamięci.");
      roomState = {
        version: 2,
        unlockedItemTypes: {},
        instances: [],
        roomStyleId: null
      };
      return;
    }

    try {
      const raw = (await ArcadeProgress.load(ROOM_SAVE_KEY)) || {};
      roomState = {
        version: raw.version || 2,
        unlockedItemTypes: raw.unlockedItemTypes || {},
        instances: raw.instances || [],
        roomStyleId: raw.roomStyleId || null
      };
    } catch (e) {
      console.error("[RoomShop] Błąd ładowania stanu pokoju:", e);
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
      console.warn("[RoomShop] Brak ArcadeProgress – nie zapisuję stanu.");
      return;
    }

    const safeState = {
      version: roomState.version || 2,
      unlockedItemTypes: roomState.unlockedItemTypes || {},
      instances: roomState.instances || [],
      roomStyleId: roomState.roomStyleId || null
    };

    try {
      await ArcadeProgress.save(ROOM_SAVE_KEY, safeState);
    } catch (e) {
      console.error("[RoomShop] Błąd zapisu stanu pokoju:", e);
    }
  }

  async function loadBalance() {
    if (!window.ArcadeCoins || !ArcadeCoins.load) {
      setBalanceDisplay(null);
      return;
    }

    try {
      const bal = await ArcadeCoins.load();
      currentBalance = bal;
      setBalanceDisplay(currentBalance);
    } catch (e) {
      console.error("[RoomShop] Błąd ładowania 💎:", e);
      setBalanceDisplay(null);
    }
  }

  function getCurrentBalance() {
    if (!window.ArcadeCoins || !ArcadeCoins.getBalance) return currentBalance;
    const b = ArcadeCoins.getBalance();
    if (typeof b === "number" && !Number.isNaN(b)) {
      currentBalance = b;
      return b;
    }
    return currentBalance;
  }

  function setBalanceDisplay(value) {
    if (!balanceEl) return;
    if (typeof value === "number" && !Number.isNaN(value)) {
      balanceEl.textContent = String(value);
    } else {
      balanceEl.textContent = "–";
    }
  }

  // --------------------------------------------------
  // KATEGORIE
  // --------------------------------------------------

  function renderCategories() {
    if (!categoriesEl) return;
    categoriesEl.innerHTML = "";

    categories.forEach((cat) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "room-shop-category-btn";
      btn.textContent = cat.name || cat.id;

      if (cat.id === selectedCategoryId) {
        btn.classList.add("is-active");
      }

      btn.addEventListener("click", () => {
        selectCategory(cat.id);
      });

      categoriesEl.appendChild(btn);
    });
  }

  function selectCategory(catId) {
    selectedCategoryId = catId;
    const cat = categories.find((c) => c.id === catId);

    const btns = categoriesEl.querySelectorAll(".room-shop-category-btn");
    btns.forEach((b) => {
      if (b.textContent === (cat && cat.name)) {
        b.classList.add("is-active");
      } else {
        b.classList.remove("is-active");
      }
    });

    if (itemsTitleEl) {
      itemsTitleEl.textContent = cat ? cat.name : "Przedmioty";
    }

    renderItemsForCategory(cat);
  }

  // --------------------------------------------------
  // PRZEDMIOTY
  // --------------------------------------------------

  function renderItemsForCategory(cat) {
    if (!itemsEl) return;
    itemsEl.innerHTML = "";

    if (!cat) return;

    const itemIds = cat.itemIds || [];
    if (itemIds.length === 0) {
      const info = document.createElement("p");
      info.textContent = "Brak przedmiotów w tej kategorii.";
      itemsEl.appendChild(info);
      return;
    }

    itemIds.forEach((itemId) => {
      const def = itemsById[itemId];
      if (!def) return;
      const card = createItemCard(def, cat);
      itemsEl.appendChild(card);
    });
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

    if (item.art && item.art.svg) {
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

    const statusLine = document.createElement("div");
    statusLine.className = "room-shop-item-status";

    const { unlocked, placedCount } = getOwnershipInfo(item.id);
    const priceSpan = document.createElement("span");
    priceSpan.className = "room-shop-item-price";

    const isStyle = isStyleItem(item, category);
    const price = item.price != null ? item.price : null;

    if (!unlocked && price != null && !isStyle) {
      priceSpan.textContent = `Cena: 💎 ${price}`;
    } else if (!unlocked && price == null && !isStyle && item.source === "game") {
      priceSpan.textContent = "Zdobywasz w grach";
    } else if (unlocked && !isStyle) {
      priceSpan.textContent = `Kupione · w pokoju: ${placedCount}`;
    } else if (isStyle && unlocked) {
      const isCurrent = roomState.roomStyleId === item.id;
      priceSpan.textContent = isCurrent ? "Aktywny styl pokoju" : "Odblokowany styl pokoju";
    } else if (isStyle && !unlocked && price != null) {
      priceSpan.textContent = `Cena stylu: 💎 ${price}`;
    } else if (isStyle && !unlocked && price == null) {
      priceSpan.textContent = "Styl z gier";
    }

    statusLine.appendChild(priceSpan);
    info.appendChild(statusLine);

    const actions = document.createElement("div");
    actions.className = "room-shop-item-actions";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "room-shop-item-btn";

    if (isStyle) {
      setupStyleButton(button, item, unlocked, price);
    } else {
      setupNormalItemButton(button, item, unlocked, price);
    }

    actions.appendChild(button);
    info.appendChild(actions);
    body.appendChild(info);
    wrapper.appendChild(header);
    wrapper.appendChild(body);

    return wrapper;
  }

  function getOwnershipInfo(itemId) {
    const unlocked =
      !!roomState.unlockedItemTypes &&
      !!roomState.unlockedItemTypes[itemId] &&
      roomState.unlockedItemTypes[itemId].unlocked;

    const placedCount = (roomState.instances || []).filter((inst) => inst.itemId === itemId).length;

    return { unlocked, placedCount };
  }

  function isStyleItem(item, category) {
    if (item.kind === "room_style") return true;
    if (item.categoryId === "walls" || item.categoryId === "room_style") return true;
    if (category && (category.id === "walls" || category.id === "room_style")) return true;
    return false;
  }

  // --------------------------------------------------
  // BUTTONY – normalny item vs styl
  // --------------------------------------------------

  function setupNormalItemButton(button, item, unlocked, price) {
    if (!unlocked) {
      if (price != null) {
        button.textContent = "Kup";
        button.addEventListener("click", () => handleBuyItem(item));
      } else if (item.source === "game") {
        button.textContent = "Odblokuj w grze";
        button.disabled = true;
      } else {
        button.textContent = "Niedostępne";
        button.disabled = true;
      }
    } else {
      button.textContent = "Dodaj do pokoju";
      button.addEventListener("click", () => handleAddToRoom(item));
    }
  }

  function setupStyleButton(button, item, unlocked, price) {
    if (!unlocked && price != null) {
      button.textContent = "Kup i ustaw";
      button.addEventListener("click", () => handleBuyStyle(item));
    } else if (unlocked) {
      const isCurrent = roomState.roomStyleId === item.id;
      button.textContent = isCurrent ? "Ustawiony" : "Ustaw styl";
      if (!isCurrent) {
        button.addEventListener("click", () => handleSetStyle(item));
      } else {
        button.disabled = true;
      }
    } else if (!unlocked && price == null && item.source === "game") {
      button.textContent = "Styl z gier";
      button.disabled = true;
    } else {
      button.textContent = "Niedostępny";
      button.disabled = true;
    }
  }

  // --------------------------------------------------
  // LOGIKA KUPNA / DODAWANIA
  // --------------------------------------------------

  async function handleBuyItem(item) {
    const price = item.price != null ? item.price : 0;
    if (price <= 0) {
      alert("Ten przedmiot nie ma ceny albo jest tylko z gier.");
      return;
    }

    const balance = getCurrentBalance();
    if (balance == null) {
      alert("Nie mogę odczytać ilości 💎. Upewnij się, że jesteś zalogowany.");
      return;
    }

    if (balance < price) {
      alert("Za mało 💎. Zagraj w gry, żeby zdobyć więcej!");
      return;
    }

    if (!confirm(`Kupić "${item.name || item.id}" za 💎 ${price}?`)) {
      return;
    }

    try {
      if (window.ArcadeCoins && ArcadeCoins.addForGame) {
        await ArcadeCoins.addForGame(SHOP_GAME_ID, -price, {
          itemId: item.id,
          source: "shop_buy"
        });
      }
      if (window.ArcadeAuthUI && typeof ArcadeAuthUI.refreshCoins === "function") {
        ArcadeAuthUI.refreshCoins();
      }
      await loadBalance();
    } catch (e) {
      console.error("[RoomShop] Błąd odejmowania 💎:", e);
    }

    if (window.ArcadeRoom && typeof ArcadeRoom.unlockItemTypeFromShop === "function") {
      await ArcadeRoom.unlockItemTypeFromShop(item.id, {
        fromGameId: null,
        meta: { source: "shop" }
      });
      await loadRoomState();
    } else {
      roomState.unlockedItemTypes = roomState.unlockedItemTypes || {};
      roomState.unlockedItemTypes[item.id] = {
        unlocked: true,
        fromGameId: null,
        meta: { source: "shop" }
      };
      await saveRoomState();
    }

    const cat = categories.find((c) => c.id === selectedCategoryId);
    renderItemsForCategory(cat);
  }

  async function handleAddToRoom(item) {
    if (!window.ArcadeRoom || typeof ArcadeRoom.createInstance !== "function") {
      // fallback: tylko w stanie
      createInstanceInState(item);
      await saveRoomState();
      const cat = categories.find((c) => c.id === selectedCategoryId);
      renderItemsForCategory(cat);
      alert("Dodano do pokoju (fallback).");
      return;
    }

    ArcadeRoom.createInstance(item.id, {});
    await loadRoomState(); // odśwież stan
    const cat = categories.find((c) => c.id === selectedCategoryId);
    renderItemsForCategory(cat);

    if (confirm("Dodano do pokoju. Przejść do pokoju, żeby go ustawić?")) {
      window.location.href = "room.html";
    }
  }

  async function handleBuyStyle(item) {
    const price = item.price != null ? item.price : 0;
    if (price < 0) return;

    const balance = getCurrentBalance();
    if (balance == null) {
      alert("Nie mogę odczytać ilości 💎.");
      return;
    }
    if (balance < price) {
      alert("Za mało 💎 na ten styl.");
      return;
    }

    if (!confirm(`Kupić styl "${item.name || item.id}" za 💎 ${price}?`)) {
      return;
    }

    try {
      if (window.ArcadeCoins && ArcadeCoins.addForGame) {
        await ArcadeCoins.addForGame(SHOP_GAME_ID, -price, {
          itemId: item.id,
          source: "shop_style"
        });
      }
      if (window.ArcadeAuthUI && typeof ArcadeAuthUI.refreshCoins === "function") {
        ArcadeAuthUI.refreshCoins();
      }
      await loadBalance();
    } catch (e) {
      console.error("[RoomShop] Błąd odejmowania 💎 (styl):", e);
    }

    roomState.unlockedItemTypes = roomState.unlockedItemTypes || {};
    roomState.unlockedItemTypes[item.id] = {
      unlocked: true,
      fromGameId: null,
      meta: { source: "shop_style" }
    };
    roomState.roomStyleId = item.id;

    await saveRoomState();

    const cat = categories.find((c) => c.id === selectedCategoryId);
    renderItemsForCategory(cat);

    alert("Styl ustawiony. Otwórz pokój, żeby zobaczyć efekt.");
  }

  async function handleSetStyle(item) {
    roomState.roomStyleId = item.id;
    await saveRoomState();

    const cat = categories.find((c) => c.id === selectedCategoryId);
    renderItemsForCategory(cat);

    alert("Styl pokoju został zmieniony.");
  }

  // --------------------------------------------------
  // FALLBACK – tworzenie instancji, gdy nie ma RoomScene
  // --------------------------------------------------

  function createInstanceInState(item) {
    if (!item || !item.id) return null;

    roomState.instances = roomState.instances || [];

    const art = item.art || {};
    const anchor = art.anchor || {};
    const attachment = anchor.attachment || "floor";

    let x = 0.5;
    let y = 0.8;

    if (attachment === "wall") y = 0.4;
    else if (attachment === "ceiling") y = 0.15;
    else if (attachment === "floor") y = 0.9;

    const inst = {
      instanceId: generateInstanceId(item.id),
      itemId: item.id,
      level: 1,
      attachment,
      parentInstanceId: null,
      x,
      y,
      offsetX: 0,
      offsetY: -0.1,
      rotation: 0,
      meta: {}
    };

    roomState.instances.push(inst);
    return inst;
  }

  function generateInstanceId(itemId) {
    const rand = Math.random().toString(36).slice(2, 8);
    const ts = Date.now().toString(36);
    return "inst_" + itemId + "_" + ts + "_" + rand;
  }
})();
