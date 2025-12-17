import { loadRecipes } from "../api.js";
import { PlanStore, ShoppingStore } from "../store.js";
import { toast, formatAmount } from "../ui.js";

const DAYS = [
  { key: "mon", label: "Пн" },
  { key: "tue", label: "Вт" },
  { key: "wed", label: "Ср" },
  { key: "thu", label: "Чт" },
  { key: "fri", label: "Пт" },
  { key: "sat", label: "Сб" },
  { key: "sun", label: "Вс" }
];
const MEALS = [
  { key: "breakfast", label: "Завтрак" },
  { key: "lunch", label: "Обед" },
  { key: "dinner", label: "Ужин" },
  { key: "dessert", label: "Десерт" }
];

export async function initPlannerPage() {
  const recipes = await loadRecipes();

  const daySel = document.getElementById("planDay");
  const mealSel = document.getElementById("planMeal");
  const servingsInp = document.getElementById("planServings");
  const searchInp = document.getElementById("planSearch");
  const suggestEl = document.getElementById("planSuggest");
  const addBtn = document.getElementById("planAdd");
  const grid = document.getElementById("weekGrid");

  const btnToShop = document.getElementById("planToShopping");
  const btnClear = document.getElementById("clearPlan");

  // fill day selector
  daySel.innerHTML = DAYS.map(d => `<option value="${d.key}">${d.label}</option>`).join("");

  let pickedRecipeId = null;

  function showSuggest(list) {
    if (!list.length) {
      suggestEl.classList.add("hidden");
      suggestEl.innerHTML = "";
      return;
    }
    suggestEl.classList.remove("hidden");
    suggestEl.innerHTML = list.map(r => `
      <button type="button" class="suggest__item" data-pick="${r.id}">
        <span class="suggest__title">${escapeHtml(r.title)}</span>
        <span class="badge">⏱ ${r.time} мин</span>
      </button>
    `).join("");
  }

  function search(q) {
    const s = q.toLowerCase().trim();
    if (!s) return [];
    return recipes
      .filter(r => (r.title || "").toLowerCase().includes(s))
      .slice(0, 8);
  }

  searchInp.addEventListener("input", () => {
    pickedRecipeId = null;
    showSuggest(search(searchInp.value));
  });

  suggestEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-pick]");
    if (!btn) return;
    const id = btn.getAttribute("data-pick");
    const r = recipes.find(x => x.id === id);
    if (!r) return;
    pickedRecipeId = id;
    searchInp.value = r.title;
    showSuggest([]);
    toast("Рецепт выбран");
  });

  addBtn.addEventListener("click", () => {
    const day = daySel.value;
    const meal = mealSel.value;
    const servings = clampInt(Number(servingsInp.value || 2), 1, 20);

    const id = pickedRecipeId || guessByTitle(recipes, searchInp.value);
    if (!id) {
      toast("Выберите рецепт из подсказок");
      return;
    }

    PlanStore.addEntry({ day, meal, recipeId: id, servings });
    renderGrid(grid, recipes);
    toast("Добавлено в план");
  });

  btnClear.addEventListener("click", () => {
    PlanStore.clear();
    renderGrid(grid, recipes);
    toast("План очищен");
  });

  btnToShop.addEventListener("click", () => {
    const entries = PlanStore.getAll();
    if (!entries.length) {
      toast("План пуст");
      return;
    }

    const toAdd = [];
    for (const en of entries) {
      const r = recipes.find(x => x.id === en.recipeId);
      if (!r) continue;

      const base = Number(r.servings || 1);
      const ratio = Number(en.servings || base) / base;

      for (const ing of (r.ingredients || [])) {
        const amount = (typeof ing.amount === "number") ? ing.amount * ratio : null;
        toAdd.push({
          name: ing.name,
          amount,
          unit: ing.unit || ""
        });
      }
    }

    ShoppingStore.addMany(toAdd);
    toast("Покупки сформированы из плана");
    location.href = "shopping.html";
  });

  // initial
  renderGrid(grid, recipes);
}

function renderGrid(grid, recipes) {
  const entries = PlanStore.getAll();

  const byKey = new Map();
  for (const e of entries) {
    const k = `${e.day}|${e.meal}`;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(e);
  }

  grid.innerHTML = DAYS.map(d => `
    <div class="weekcol card pad-16">
      <div class="weekcol__title">${d.label}</div>
      ${MEALS.map(m => {
        const list = byKey.get(`${d.key}|${m.key}`) || [];
        return `
          <div class="weekslot">
            <div class="weekslot__head">
              <div class="muted small">${m.label}</div>
            </div>
            <div class="weekslot__body">
              ${
                list.length
                ? list.map(e => {
                    const r = recipes.find(x => x.id === e.recipeId);
                    return `
                      <div class="planitem">
                        <a class="planitem__title" href="recipe.html?id=${encodeURIComponent(e.recipeId)}">
                          ${escapeHtml(r ? r.title : e.recipeId)}
                        </a>
                        <div class="muted small">🍽 ${e.servings} порц.</div>
                        <button class="iconbtn" data-del="${escapeAttr(e.id)}" type="button" aria-label="Удалить">🗑</button>
                      </div>
                    `;
                  }).join("")
                : `<div class="muted small">—</div>`
              }
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `).join("");

  grid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-del]");
    if (!btn) return;
    const id = btn.getAttribute("data-del");
    PlanStore.remove(id);
    renderGrid(grid, recipes);
  }, { once: true });
}

function guessByTitle(recipes, title) {
  const s = (title || "").trim().toLowerCase();
  if (!s) return null;
  const r = recipes.find(x => (x.title || "").trim().toLowerCase() === s);
  return r ? r.id : null;
}

function clampInt(n, a, b) {
  if (!Number.isFinite(n)) return a;
  return Math.max(a, Math.min(b, Math.round(n)));
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function escapeAttr(s) { return escapeHtml(s).replaceAll("\n", " "); }
