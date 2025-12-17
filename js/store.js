const KEY_THEME = "tp_theme";
const KEY_FAV = "tp_favorites";
const KEY_SHOP = "tp_shopping";
const KEY_VIEWS = "tp_views";

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* Theme */
export const ThemeStore = {
  get() { return localStorage.getItem(KEY_THEME) || "dark"; },
  set(theme) { localStorage.setItem(KEY_THEME, theme); }
};

/* Favorites */
export const FavoritesStore = {
  getAll() { return readJSON(KEY_FAV, []); },
  has(id) { return this.getAll().includes(id); },
  toggle(id) {
    const list = this.getAll();
    const idx = list.indexOf(id);
    if (idx >= 0) list.splice(idx, 1);
    else list.unshift(id);
    writeJSON(KEY_FAV, list);
    return list;
  }
};

/* Shopping list items: { id, name, amount, unit, checked } */
export const ShoppingStore = {
  getAll() { return readJSON(KEY_SHOP, []); },
  setAll(items) { writeJSON(KEY_SHOP, items); },

  addMany(items) {
    const cur = this.getAll();

    // мягкое объединение одинаковых позиций (по name+unit)
    for (const it of items) {
      const key = (it.name || "").toLowerCase().trim() + "|" + (it.unit || "");
      const found = cur.find(x => (x.name||"").toLowerCase().trim() + "|" + (x.unit||"") === key && !x.checked);
      if (found && typeof found.amount === "number" && typeof it.amount === "number") {
        found.amount = roundSmart(found.amount + it.amount);
      } else {
        cur.push({ ...it, id: cryptoId(), checked: false });
      }
    }
    this.setAll(cur);
    return cur;
  },

  toggleChecked(id) {
    const cur = this.getAll();
    const item = cur.find(x => x.id === id);
    if (item) item.checked = !item.checked;
    this.setAll(cur);
    return cur;
  },

  removeBought() {
    const cur = this.getAll().filter(x => !x.checked);
    this.setAll(cur);
    return cur;
  },

  clear() {
    this.setAll([]);
    return [];
  }
};

/* Views for popularity */
export const ViewsStore = {
  bump(id) {
    const map = readJSON(KEY_VIEWS, {});
    map[id] = (map[id] || 0) + 1;
    writeJSON(KEY_VIEWS, map);
    return map[id];
  },
  getAll() { return readJSON(KEY_VIEWS, {}); }
};

function cryptoId() {
  return (crypto?.randomUUID?.() || `id_${Math.random().toString(16).slice(2)}_${Date.now()}`);
}

function roundSmart(n) {
  const r = Math.round((n + Number.EPSILON) * 100) / 100;
  return r;
}
