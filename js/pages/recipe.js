import { getQuery } from "../router.js";
import { getRecipeById, loadRecipes } from "../api.js";
import { FavoritesStore, ShoppingStore, ViewsStore } from "../store.js";
import { formatAmount, toast, recipeCard, wireFavoriteButtons } from "../ui.js";

export async function initRecipePage() {
  const root = document.getElementById("recipe-root");
  const { id } = getQuery();
  if (!root) return;

  if (!id) {
    root.innerHTML = `<div class="empty"><div class="empty__icon">⚠️</div><div class="empty__title">Нет id рецепта</div></div>`;
    return;
  }

  const recipe = await getRecipeById(id);
  if (!recipe) {
    root.innerHTML = `<div class="empty"><div class="empty__icon">😕</div><div class="empty__title">Рецепт не найден</div><a class="btn btn--primary" href="recipes.html">В каталог</a></div>`;
    return;
  }

  // bump views for popularity
  ViewsStore.bump(recipe.id);

  // servings logic
  const baseServings = Number(recipe.servings || 1);
  let servings = baseServings;

  root.innerHTML = `
    <section class="rpage">
      <div class="card rmedia">
        <img src="${recipe.image}" alt="${escapeAttr(recipe.title)}" />
      </div>

      <aside class="card rinfo">
        <h1 class="rtitle">${escapeHtml(recipe.title)}</h1>
        <div class="rsub">${escapeHtml(recipe.description || "")}</div>

        <div class="kpis">
          <div class="kpi">⏱ <b>${recipe.time}</b> мин</div>
          <div class="kpi">⚡ <b>${escapeHtml(recipe.difficulty)}</b></div>
          <div class="kpi">🍽 <b id="servings">${baseServings}</b> порц.</div>
        </div>

        <div class="row gap-8" style="flex-wrap:wrap;">
          <button id="minus" class="btn" type="button">−</button>
          <button id="plus" class="btn" type="button">+</button>
          <button id="fav" class="btn btn--primary" type="button">${FavoritesStore.has(recipe.id) ? "❤️ В избранном" : "🤍 В избранное"}</button>
          <button id="addAll" class="btn" type="button">🛒 Добавить ингредиенты</button>
        </div>

        <div class="divider"></div>

        <div style="font-weight:800; margin-bottom:10px;">Ингредиенты</div>
        <div id="ings"></div>

        <div class="row gap-8" style="flex-wrap:wrap; margin-top: 10px;">
          <button id="addSelected" class="btn" type="button">🛒 Добавить отмеченные</button>
          <button id="uncheck" class="btn btn--ghost" type="button">Снять отметки</button>
        </div>
      </aside>
    </section>

    <section class="section">
      <div class="section__head">
        <h2 class="h2">Шаги приготовления</h2>
        <a class="link" href="recipes.html">← Назад в каталог</a>
      </div>

      <div class="card pad-24">
        <ol class="list">
          ${(recipe.steps || []).map(s => `<li>${escapeHtml(s)}</li>`).join("")}
        </ol>
      </div>
    </section>

    <section class="section">
      <div class="section__head">
        <h2 class="h2">Похожие рецепты</h2>
        <span class="muted small">по тегам</span>
      </div>
      <div id="similar" class="grid grid--cards"></div>
    </section>
  `;

  const ingsEl = document.getElementById("ings");
  const servingsEl = document.getElementById("servings");
  const btnMinus = document.getElementById("minus");
  const btnPlus = document.getElementById("plus");
  const btnFav = document.getElementById("fav");
  const btnAddAll = document.getElementById("addAll");
  const btnAddSelected = document.getElementById("addSelected");
  const btnUncheck = document.getElementById("uncheck");

  function renderIngredients() {
    servingsEl.textContent = String(servings);

    const ratio = servings / baseServings;
    ingsEl.innerHTML = (recipe.ingredients || []).map((it, idx) => {
      const scaled = (typeof it.amount === "number") ? it.amount * ratio : null;
      const amountText = scaled === null ? "" : `${formatAmount(scaled)} ${it.unit || ""}`.trim();

      return `
        <div class="ing" data-idx="${idx}">
          <div class="ing__left">
            <input type="checkbox" class="ing__check" />
            <div>
              <div class="ing__name">${escapeHtml(it.name)}</div>
              <div class="ing__amt">${escapeHtml(amountText || (it.unit ? it.unit : ""))}</div>
            </div>
          </div>
          <div class="badge">${amountText ? "≈ " + escapeHtml(amountText) : "по вкусу"}</div>
        </div>
      `;
    }).join("");
  }

  renderIngredients();

  btnMinus.addEventListener("click", () => {
    servings = Math.max(1, servings - 1);
    renderIngredients();
  });
  btnPlus.addEventListener("click", () => {
    servings = Math.min(20, servings + 1);
    renderIngredients();
  });

  btnFav.addEventListener("click", () => {
    FavoritesStore.toggle(recipe.id);
    const isFav = FavoritesStore.has(recipe.id);
    btnFav.textContent = isFav ? "❤️ В избранном" : "🤍 В избранное";
    toast(isFav ? "Добавлено в избранное" : "Удалено из избранного");
  });

  function collectItems(mode) {
    const ratio = servings / baseServings;
    const checks = [...document.querySelectorAll(".ing")].map(el => el.querySelector(".ing__check"));
    const items = [];

    (recipe.ingredients || []).forEach((it, idx) => {
      const take = mode === "all" ? true : Boolean(checks[idx]?.checked);
      if (!take) return;

      const amount = (typeof it.amount === "number") ? it.amount * ratio : null;
      items.push({
        name: it.name,
        amount: amount,
        unit: it.unit || ""
      });
    });

    // normalize amount: if null -> set to 0 (or keep null); keep null for “по вкусу”
    return items.map(x => ({
      ...x,
      amount: (typeof x.amount === "number") ? smartRound(x.amount) : null
    }));
  }

  btnAddAll.addEventListener("click", () => {
    const items = collectItems("all");
    ShoppingStore.addMany(items.map(x => ({
      name: x.name,
      amount: x.amount,
      unit: x.unit
    })));
    toast("Ингредиенты добавлены в покупки");
  });

  btnAddSelected.addEventListener("click", () => {
    const items = collectItems("selected");
    if (items.length === 0) {
      toast("Сначала отметьте ингредиенты");
      return;
    }
    ShoppingStore.addMany(items.map(x => ({
      name: x.name,
      amount: x.amount,
      unit: x.unit
    })));
    toast("Отмеченные добавлены в покупки");
  });

  btnUncheck.addEventListener("click", () => {
    document.querySelectorAll(".ing__check").forEach(ch => (ch.checked = false));
    toast("Отметки сняты");
  });

  // Similar recipes
  const all = await loadRecipes();
  const tags = new Set(recipe.tags || []);
  const similar = all
    .filter(r => r.id !== recipe.id)
    .map(r => {
      const score = (r.tags || []).reduce((acc, t) => acc + (tags.has(t) ? 1 : 0), 0);
      return { r, score };
    })
    .filter(x => x.score > 0)
    .sort((a,b) => b.score - a.score)
    .slice(0, 3)
    .map(x => x.r);

  const simEl = document.getElementById("similar");
  if (simEl) {
    simEl.innerHTML = (similar.length ? similar : all.filter(r => r.id !== recipe.id).slice(0, 3))
      .map(r => recipeCard(r)).join("");
    wireFavoriteButtons(simEl, () => {
      simEl.innerHTML = (similar.length ? similar : all.filter(r => r.id !== recipe.id).slice(0, 3))
        .map(r => recipeCard(r)).join("");
    });
  }
}

function smartRound(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function escapeAttr(s) {
  return escapeHtml(s).replaceAll("\n", " ");
}
