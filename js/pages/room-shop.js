// js/pages/room-shop.js
// Neon Room – Sklep pokoju (wersja z diagnostyką i bezpiecznymi ścieżkami)

(function () {
  "use strict";

  const ROOM_SAVE_KEY = "neon_room_v2";
  const ITEMS_BASE_URL = "data/items/";              // <- folder z item jsonami
  const CATEGORIES_URL = "data/room-categories.json"; // <- kategorie
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

  // panel diagnostyczny (widoczny na stronie)
  let diagEl = null;

  document.addEventListener("DOMContentLoaded", init);

  function diag(msg, type = "info") {
    const line = `[RoomShop] ${msg}`;
    console[type === "error" ? "error" : "log"](line);

    if (!diagEl) return;
    const p = document.createElement("div");
    p.textContent = line;
    p.style.margin = "0.15rem 0";
    p.style.opacity = type === "error" ? "1" : "0.85";
    p.style.color = type === "error" ? "#fecaca" : "#e5e7eb";
    diagEl.appendChild(p);
  }

  function ensureDiagPanel() {
    // wrzucamy panel na górę body, żebyś zawsze widział co nie działa
    diagEl = document.createElement("div");
    diagEl.style.position = "sticky";
    diagEl.style.top = "0";
    diagEl.style.zIndex = "9999";
    diagEl.style.padding = "0.6rem 0.8rem";
    diagEl.style.border = "1px solid rgba(248, 113, 113, 0.7)";
    diagEl.style.background = "rgba(2, 6, 23, 0.92)";
    diagEl.style.backdropFilter = "blur(6px)";
    diagEl.style.fontSize = "0.85rem";
    diagEl.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
    diagEl.innerHTML = `<div style="font-weight:700;color:#fca5a5;">RoomShop diagnostics</div>`;
    document.body.prepend(diagEl);
  }

  function url(path) {
    // krytyczne na GitHub Pages / subfolderach
    return new URL(path, document.baseURI).toString();
  }

  async function fetchJson(path) {
    const u = url(path);
    const res = await fetch(u, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${u}`);
    return await res.json();
  }

  async function init() {
    ensureDiagPanel();

    categoriesEl = document.getElementById("shop-categories");
    itemsEl = document.getElementById("shop-item-list");
    itemsTitleEl = document.getElementById("shop-items-title");
    balanceEl = document.getElementById("shop-balance");

    diag(`baseURI = ${document.baseURI}`);

    // twarde checki DOM – to najczęstszy powód "nic nie widać"
    if (!categoriesEl) diag("Brak elementu #shop-categories (HTML id się nie zgadza)", "error");
    if (!itemsEl) diag("Brak elementu #shop-item-list (HTML id się nie zgadza)", "error");
    if (!itemsTitleEl) diag("Brak elementu #shop-items-title (HTML id się nie zgadza)", "error");
    if (!balanceEl) diag("Brak elementu #shop-balance (HTML id się nie zgadza)", "error");

    // jeżeli brakuje DOM, nie ma sensu iść dalej
    if (!categoriesEl || !itemsEl || !itemsTitleEl) {
      renderFatal("Popraw id w room-shop.html (zobacz diagnostykę powyżej).");
      return;
    }

    const backRoomBtn = document.getElementById("shop-btn-back-room");
    if (backRoomBtn) backRoomBtn.addEventListener("click", () => (window.location.href = "room.html"));

    if (window.ArcadeUI && typeof ArcadeUI.addBackToArcadeButton === "function") {
      ArcadeUI.addBackToArcadeButton({ backUrl: "arcade.html" });
    }

    await loadCategoriesAndItems();
    await loadRoomState();
    await loadBalance();

    renderCategories();

    if (categories.length > 0) {
      selectCategory(categories[0].id);
    } else {
      renderFatal("Nie wczytało żadnych kategorii. Sprawdź data/room-categories.json.");
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

  // --------------------------------------------------
  // ŁADOWANIE
  // --------------------------------------------------

  async function loadCategoriesAndItems() {
    try {
      diag(`Ładuję kategorie: ${url(CATEGORIES_URL)}`);
      const json = await fetchJson(CATEGORIES_URL);
      categories = (json.categories || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      diag(`Załadowano kategorie: ${categories.length}`);
    } catch (e) {
      diag(`Błąd ładowania kategorii: ${String(e)}`, "error");
      categories = [];
      return;
    }

    itemsById = {};

    // zbierz wszystkie itemIds
    const itemIdsSet = new Set();
    for (const cat of categories) {
      for (const id of (cat.itemIds || [])) itemIdsSet.add(id);
    }
    diag(`Item IDs w kategoriach: ${itemIdsSet.size}`);

    // wczytaj każdy item JSON
    const results = await Promise.allSettled([...itemIdsSet].map(loadItemDef));

    const ok = results.filter(r => r.status === "fulfilled").length;
    const bad = results.filter(r => r.status === "rejected").length;
    diag(`Item defs OK: ${ok}, FAIL: ${bad}`);
  }

  async function loadItemDef(itemId) {
    const path = `${ITEMS_BASE_URL}${itemId}.json`;
    diag(`Ładuję item: ${url(path)}`);

    const json = await fetchJson(path);

    // sanity check: id w środku musi pasować do nazwy pliku
    if (json.id && json.id !== itemId) {
      diag(`UWAGA: plik ${itemId}.json ma id="${json.id}" (nie pasuje!)`, "error");
    }

    // domyślny art.svg tylko dla nie-style
    if (!json.art) json.art = {};
    if (!json.art.svg && json.kind !== "room_style") {
      json.art.svg = `assets/room/${itemId}.svg`;
    }

    itemsById[itemId] = json;
    return json;
  }

  async function loadRoomState() {
    if (window.ArcadeRoom && typeof ArcadeRoom.loadRoomState === "function") {
      roomState = await ArcadeRoom.loadRoomState();
      diag("Stan pokoju wczytany przez ArcadeRoom.");
      return;
    }

    if (!window.ArcadeProgress || !ArcadeProgress.load) {
      diag("Brak ArcadeProgress – stan tymczasowy.", "error");
      return;
    }

    const raw = (await ArcadeProgress.load(ROOM_SAVE_KEY)) || {};
    roomState = {
      version: raw.version || 2,
      unlockedItemTypes: raw.unlockedItemTypes || {},
      instances: raw.instances || [],
      roomStyleId: raw.roomStyleId || null
    };
    diag("Stan pokoju wczytany z ArcadeProgress.");
  }

  async function saveRoomState() {
    if (window.ArcadeRoom && typeof ArcadeRoom.saveRoomState === "function") {
      await ArcadeRoom.saveRoomState(roomState);
      return;
    }
    if (!window.ArcadeProgress || !ArcadeProgress.save) return;

    await ArcadeProgress.save(ROOM_SAVE_KEY, {
      version: roomState.version || 2,
      unlockedItemTypes: roomState.unlockedItemTypes || {},
      instances: roomState.instances || [],
      roomStyleId: roomState.roomStyleId || null
    });
  }

  async function loadBalance() {
    if (!window.ArcadeCoins || !ArcadeCoins.load) {
      setBalanceDisplay(null);
      diag("Brak ArcadeCoins.load() – balans niedostępny.", "error");
      return;
    }

    try {
      const bal = await ArcadeCoins.load();
      currentBalance = bal;
      setBalanceDisplay(currentBalance);
      diag(`Balans: ${String(bal)}`);
    } catch (e) {
      diag(`Błąd ładowania balansu: ${String(e)}`, "error");
      setBalanceDisplay(null);
    }
  }

  function setBalanceDisplay(value) {
    if (!balanceEl) return;
    balanceEl.textContent = (typeof value === "number" && !Number.isNaN(value)) ? String(value) : "–";
  }

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

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

      if (cat.id === selectedCategoryId) btn.classList.add("is-active");

      btn.addEventListener("click", () => selectCategory(cat.id));
      categoriesEl.appendChild(btn);
    }

    diag("Kategorie wyrenderowane.");
  }

  function selectCategory(catId) {
    selectedCategoryId = catId;
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
    diag(`Render kategorii "${cat.id}" – itemIds: ${ids.length}`);

    if (!ids.length) {
      const p = document.createElement("p");
      p.textContent = "Ta kategoria nie ma itemów (itemIds jest puste).";
      itemsEl.appendChild(p);
      return;
    }

    for (const itemId of ids) {
      const def = itemsById[itemId];

      // jeśli definicji nie ma – pokaż placeholder z info (to jest mega ważne w debugowaniu)
      if (!def) {
        const missing = document.createElement("div");
        missing.className = "room-shop-item-card";
        missing.innerHTML = `
          <div class="room-shop-item-header">
            <div class="room-shop-item-name">BRAK ITEM DEF</div>
            <div class="room-shop-item-sub">${cat.name || cat.id}</div>
          </div>
          <div class="room-shop-item-body">
            <div class="room-shop-item-info">
              <div class="room-shop-item-status">
                Nie mogę znaleźć definicji dla <b>${itemId}</b>.<br/>
                Sprawdź czy istnieje plik: <code>${ITEMS_BASE_URL}${itemId}.json</code>
              </div>
            </div>
          </div>
        `;
        itemsEl.appendChild(missing);
        continue;
      }

      itemsEl.appendChild(createItemCard(def, cat));
    }
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

    const unlocked =
      !!roomState.unlockedItemTypes &&
      !!roomState.unlockedItemTypes[item.id] &&
      roomState.unlockedItemTypes[item.id].unlocked;

    const placedCount = (roomState.instances || []).filter(inst => inst.itemId === item.id).length;

    const isStyle =
      item.kind === "room_style" ||
      item.categoryId === "walls" ||
      (category && category.id === "walls");

    const price = item.price != null ? item.price : null;

    const priceSpan = document.createElement("span");
    priceSpan.className = "room-shop-item-price";

    if (isStyle) {
      if (!unlocked && price != null) priceSpan.textContent = `Cena stylu: 💎 ${price}`;
      else if (!unlocked) priceSpan.textContent = "Styl z gier / zablokowany";
      else priceSpan.textContent = (roomState.roomStyleId === item.id) ? "Aktywny styl pokoju" : "Odblokowany styl";
    } else {
      if (!unlocked && price != null) priceSpan.textContent = `Cena: 💎 ${price}`;
      else if (!unlocked && price == null && item.source === "game") priceSpan.textContent = "Zdobywasz w grze";
      else if (unlocked) priceSpan.textContent = `Kupione · w pokoju: ${placedCount}`;
      else priceSpan.textContent = "Niedostępne";
    }

    statusLine.appendChild(priceSpan);
    info.appendChild(statusLine);

    const actions = document.createElement("div");
    actions.className = "room-shop-item-actions";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "room-shop-item-btn";

    if (isStyle) {
      if (!unlocked && price != null) {
        button.textContent = "Kup i ustaw";
        button.addEventListener("click", () => handleBuyStyle(item));
      } else if (unlocked) {
        const isCurrent = roomState.roomStyleId === item.id;
        button.textContent = isCurrent ? "Ustawiony" : "Ustaw styl";
        button.disabled = isCurrent;
        if (!isCurrent) button.addEventListener("click", () => handleSetStyle(item));
      } else {
        button.textContent = "Odblokuj w grze";
        button.disabled = true;
      }
    } else {
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

    actions.appendChild(button);
    info.appendChild(actions);
    body.appendChild(info);

    wrapper.appendChild(header);
    wrapper.appendChild(body);

    return wrapper;
  }

  // --------------------------------------------------
  // Akcje (kup / ustaw / dodaj)
  // --------------------------------------------------

  function getCurrentBalance() {
    if (!window.ArcadeCoins || !ArcadeCoins.getBalance) return currentBalance;
    const b = ArcadeCoins.getBalance();
    if (typeof b === "number" && !Number.isNaN(b)) {
      currentBalance = b;
      return b;
    }
    return currentBalance;
  }

  async function handleBuyItem(item) {
    const price = item.price != null ? item.price : 0;
    const balance = getCurrentBalance();

    if (balance == null) return alert("Brak info o 💎 (zaloguj się).");
    if (balance < price) return alert("Za mało 💎.");
    if (!confirm(`Kupić "${item.name || item.id}" za 💎 ${price}?`)) return;

    try {
      await ArcadeCoins.addForGame(SHOP_GAME_ID, -price, { itemId: item.id, source: "shop_buy" });
      if (window.ArcadeAuthUI?.refreshCoins) ArcadeAuthUI.refreshCoins();
      await loadBalance();
    } catch (e) {
      diag(`Błąd odejmowania 💎: ${String(e)}`, "error");
    }

    if (window.ArcadeRoom?.unlockItemTypeFromShop) {
      await ArcadeRoom.unlockItemTypeFromShop(item.id, { meta: { source: "shop" } });
      await loadRoomState();
    } else {
      roomState.unlockedItemTypes = roomState.unlockedItemTypes || {};
      roomState.unlockedItemTypes[item.id] = { unlocked: true, fromGameId: null, meta: { source: "shop" } };
      await saveRoomState();
    }

    selectCategory(selectedCategoryId);
  }

  async function handleAddToRoom(item) {
    if (window.ArcadeRoom?.createInstance) {
      ArcadeRoom.createInstance(item.id, {});
      alert("Dodano do pokoju. Otwórz pokój, żeby ustawić.");
      return;
    }
    alert("Brak ArcadeRoom.createInstance – otwórz najpierw pokój (room.html) aby zainicjalizować scenę.");
  }

  async function handleBuyStyle(item) {
    const price = item.price != null ? item.price : 0;
    const balance = getCurrentBalance();

    if (balance == null) return alert("Brak info o 💎 (zaloguj się).");
    if (balance < price) return alert("Za mało 💎.");
    if (!confirm(`Kupić styl "${item.name || item.id}" za 💎 ${price}?`)) return;

    try {
      await ArcadeCoins.addForGame(SHOP_GAME_ID, -price, { itemId: item.id, source: "shop_style" });
      if (window.ArcadeAuthUI?.refreshCoins) ArcadeAuthUI.refreshCoins();
      await loadBalance();
    } catch (e) {
      diag(`Błąd odejmowania 💎 (styl): ${String(e)}`, "error");
    }

    roomState.unlockedItemTypes = roomState.unlockedItemTypes || {};
    roomState.unlockedItemTypes[item.id] = { unlocked: true, fromGameId: null, meta: { source: "shop_style" } };
    roomState.roomStyleId = item.id;

    await saveRoomState();
    selectCategory(selectedCategoryId);
  }

  async function handleSetStyle(item) {
    roomState.roomStyleId = item.id;
    await saveRoomState();
    selectCategory(selectedCategoryId);
  }
})();
